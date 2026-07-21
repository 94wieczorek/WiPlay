import {
  Component,
  ComponentRef,
  DestroyRef,
  effect,
  inject,
  signal,
  untracked,
  viewChild,
  ViewContainerRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { GameController } from '../../core/models/game-controller.model';
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

  private gameComponentRef: ComponentRef<GameController> | null = null;
  private mountToken = 0;

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const slug = params.get('slug') ?? '';
      void this.initializeGame(slug);
    });

    effect(() => {
      const slug = this.slug();
      const definition = this.game();
      const host = this.gameHost();

      if (!slug || !definition || !host) {
        return;
      }

      untracked(() => {
        void this.mountGameComponent(slug, host);
      });
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

  focusGameArea(): void {
    const hostElement = this.gameHost()?.element.nativeElement as HTMLElement | undefined;
    hostElement?.querySelector<HTMLElement>('app-snake')?.focus();
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

    this.slug.set('');
    this.loadError.set(false);
    this.isMounting.set(false);
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
    this.isMounting.set(true);
    this.game.set(definition);
    this.slug.set(slug);
  }

  private async mountGameComponent(slug: string, host: ViewContainerRef): Promise<void> {
    const token = this.mountToken;

    if (this.gameComponentRef) {
      return;
    }

    const loader = loadGameComponent(slug);
    if (!loader) {
      this.loadError.set(true);
      this.isMounting.set(false);
      return;
    }

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
      if (token === this.mountToken) {
        this.loadError.set(true);
        this.isMounting.set(false);
      }
    }
  }

  private clearGameHost(): void {
    this.controller.set(null);
    this.gameComponentRef?.destroy();
    this.gameComponentRef = null;
    this.gameHost()?.clear();
    this.game.set(null);
  }
}
