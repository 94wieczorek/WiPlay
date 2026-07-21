import {
  Component,
  ComponentRef,
  DestroyRef,
  inject,
  signal,
  viewChild,
  ViewContainerRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { GameController, isLevelAwareGameController, LevelAwareGameController } from '../../core/models/game-controller.model';
import { GameDefinition } from '../../core/models/game-definition.model';
import {
  hasGameLoader,
  loadGameComponent,
} from '../../core/services/game-route-registry';
import { GamesService } from '../../core/services/games.service';

@Component({
  selector: 'app-game-shell',
  imports: [RouterLink],
  templateUrl: './game-shell.component.html',
  styleUrl: './game-shell.component.scss',
})
export class GameShellComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly gamesService = inject(GamesService);
  private readonly title = inject(Title);
  private readonly destroyRef = inject(DestroyRef);

  private readonly gameHost = viewChild('gameHost', { read: ViewContainerRef });

  readonly slug = signal('');
  readonly game = signal<GameDefinition | null>(null);
  readonly controller = signal<GameController | null>(null);
  readonly loadError = signal(false);
  readonly isMounting = signal(false);
  readonly viewportScale = signal(1);
  readonly minViewportScale = 1;
  readonly maxViewportScale = 2;
  readonly viewportScaleStep = 0.1;

  private gameComponentRef: ComponentRef<GameController> | null = null;
  private mountToken = 0;
  private mountInFlight = false;

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const slug = params.get('slug') ?? '';
      void this.initializeGame(slug);
    });
  }

  startGame(): void {
    this.controller()?.start();
    this.focusGameArea();
  }

  pauseGame(): void {
    this.controller()?.pause();
  }

  resumeGame(): void {
    this.controller()?.resume();
  }

  restartGame(): void {
    this.controller()?.restart();
    this.focusGameArea();
  }

  levelController(): LevelAwareGameController | null {
    const controller = this.controller();
    return isLevelAwareGameController(controller) ? controller : null;
  }

  setGameLevel(level: number): void {
    this.levelController()?.setLevel(level);
  }

  onLevelSliderInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.setGameLevel(Number(input.value));
  }

  onViewportScaleInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const raw = Number(input.value);
    if (!Number.isFinite(raw)) {
      return;
    }

    const clamped = Math.min(
      this.maxViewportScale,
      Math.max(this.minViewportScale, Math.round(raw * 10) / 10),
    );
    this.viewportScale.set(clamped);
  }

  viewportScaleLabel(): string {
    return `${this.viewportScale().toFixed(1)}×`;
  }

  viewportCanvasMaxPx(): string {
    return `${Math.round(520 * this.viewportScale())}px`;
  }

  focusGameArea(): void {
    const hostElement = this.gameHost()?.element.nativeElement as HTMLElement | undefined;
    hostElement
      ?.querySelector<HTMLElement>('app-snake, app-deep-drill, app-deep-drill-v2')
      ?.focus();
  }

  statusLabel(): string {
    const status = this.controller()?.status();
    switch (status) {
      case 'running':
        return 'W trakcie';
      case 'paused':
        return 'Pauza';
      case 'over':
        return 'Koniec gry';
      default:
        return 'Gotowa';
    }
  }

  private async initializeGame(slug: string): Promise<void> {
    const token = ++this.mountToken;

    this.loadError.set(false);
    this.isMounting.set(false);
    this.viewportScale.set(1);
    this.clearGameHost();

    const definition = this.gamesService.getBySlug(slug);
    if (!definition || !definition.isAvailable || !hasGameLoader(slug)) {
      void this.router.navigate(['/404']);
      return;
    }

    if (token !== this.mountToken) {
      return;
    }

    this.title.setTitle(`${definition.title} — Wiplay`);
    this.slug.set(slug);
    this.game.set(definition);
    this.isMounting.set(true);

    await this.waitForGameHost();
    await this.mountGameComponent(slug, token);
  }

  private async waitForGameHost(maxAttempts = 20): Promise<ViewContainerRef | null> {
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const host = this.gameHost();
      if (host) {
        return host;
      }

      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => resolve());
      });
    }

    return null;
  }

  private async mountGameComponent(slug: string, token: number): Promise<void> {
    if (this.mountInFlight || token !== this.mountToken) {
      return;
    }

    const host = this.gameHost();
    if (!host) {
      if (token === this.mountToken) {
        this.loadError.set(true);
        this.isMounting.set(false);
      }
      return;
    }

    const loader = loadGameComponent(slug);
    if (!loader) {
      if (token === this.mountToken) {
        this.loadError.set(true);
        this.isMounting.set(false);
      }
      return;
    }

    this.mountInFlight = true;

    try {
      const componentType = await loader;

      if (token !== this.mountToken || this.slug() !== slug) {
        return;
      }

      host.clear();
      this.gameComponentRef = host.createComponent(componentType);
      this.controller.set(this.gameComponentRef.instance);
      this.loadError.set(false);
      this.isMounting.set(false);
      this.focusGameArea();
    } catch (error) {
      console.error('Failed to load game component', error);
      if (token === this.mountToken && !this.controller()) {
        this.loadError.set(true);
        this.isMounting.set(false);
      }
    } finally {
      this.mountInFlight = false;
    }
  }

  private clearGameHost(): void {
    this.slug.set('');
    this.controller.set(null);
    this.gameComponentRef?.destroy();
    this.gameComponentRef = null;
    this.gameHost()?.clear();
    this.game.set(null);
    this.mountInFlight = false;
  }
}
