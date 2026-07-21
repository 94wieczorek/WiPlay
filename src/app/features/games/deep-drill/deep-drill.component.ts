import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  NgZone,
  OnDestroy,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { GameController, GameStatus } from '../../../core/models/game-controller.model';
import { LocalStorageService } from '../../../core/services/local-storage.service';
import {
  createInitialDeepDrillState,
  pauseDeepDrill,
  queueDeepDrillMove,
  restartDeepDrill,
  resumeDeepDrill,
  startDeepDrill,
  tickDeepDrill,
} from './deep-drill.engine';
import {
  DEEP_DRILL_BEST_SCORE_KEY,
  DeepDrillState,
  DrillDirection,
  TileType,
} from './deep-drill.models';

const TILE_COLORS: Record<TileType, string> = {
  empty: '#0a1024',
  surface: '#3f3358',
  dirt: '#6b4423',
  rock: '#6b7280',
  copper: '#b45309',
  silver: '#cbd5e1',
  gold: '#fbbf24',
  platinum: '#e2e8f0',
  lava: '#ef4444',
};

@Component({
  selector: 'app-deep-drill',
  imports: [],
  templateUrl: './deep-drill.component.html',
  styleUrl: './deep-drill.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'deep-drill-game',
    tabindex: '0',
    '(click)': 'focusGame()',
  },
})
export class DeepDrillComponent implements GameController, AfterViewInit, OnDestroy {
  private readonly localStorage = inject(LocalStorageService);
  private readonly ngZone = inject(NgZone);
  private readonly elementRef = inject(ElementRef<HTMLElement>);

  @ViewChild('canvas', { static: true })
  private readonly canvasRef!: ElementRef<HTMLCanvasElement>;

  readonly status = signal<GameStatus>('idle');
  readonly score = signal(0);
  readonly bestScore = signal(0);
  readonly fuel = signal(0);
  readonly maxFuel = signal(120);
  readonly cargo = signal(0);
  readonly depth = signal(0);
  readonly message = signal('');

  private state: DeepDrillState = createInitialDeepDrillState();
  private animationFrameId = 0;
  private lastTickAt = 0;
  private resizeObserver: ResizeObserver | null = null;
  private cameraY = 0;

  constructor() {
    this.bestScore.set(this.localStorage.getNumber(DEEP_DRILL_BEST_SCORE_KEY));
    this.syncFromState(this.state);
  }

  ngAfterViewInit(): void {
    this.setupCanvas();
    this.draw();

    this.resizeObserver = new ResizeObserver(() => {
      this.setupCanvas();
      this.draw();
    });

    this.resizeObserver.observe(
      this.canvasRef.nativeElement.parentElement ?? this.canvasRef.nativeElement,
    );

    const viewport = this.canvasRef.nativeElement.closest('.game-shell__viewport');
    if (viewport) {
      this.resizeObserver.observe(viewport);
    }

    this.focusGame();
  }

  ngOnDestroy(): void {
    this.stopLoop();
    this.resizeObserver?.disconnect();
  }

  start(): void {
    this.state = startDeepDrill(this.state);
    this.syncFromState(this.state);
    this.focusGame();
    this.beginLoop();
  }

  pause(): void {
    this.state = pauseDeepDrill(this.state);
    this.syncFromState(this.state);
    this.stopLoop();
    this.draw();
  }

  resume(): void {
    this.state = resumeDeepDrill(this.state);
    this.syncFromState(this.state);
    this.beginLoop();
  }

  restart(): void {
    this.stopLoop();
    this.state = restartDeepDrill(this.state);
    this.cameraY = 0;
    this.syncFromState(this.state);
    this.draw();
  }

  setDirection(direction: DrillDirection): void {
    this.state = queueDeepDrillMove(this.state, direction);
  }

  focusGame(): void {
    this.elementRef.nativeElement.focus({ preventScroll: true });
  }

  @HostListener('document:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    if (!this.isGameKey(event)) {
      return;
    }

    switch (event.key) {
      case 'ArrowUp':
      case 'w':
      case 'W':
        event.preventDefault();
        this.setDirection('up');
        break;
      case 'ArrowDown':
      case 's':
      case 'S':
        event.preventDefault();
        this.setDirection('down');
        break;
      case 'ArrowLeft':
      case 'a':
      case 'A':
        event.preventDefault();
        this.setDirection('left');
        break;
      case 'ArrowRight':
      case 'd':
      case 'D':
        event.preventDefault();
        this.setDirection('right');
        break;
      case ' ':
      case 'Spacebar':
        event.preventDefault();
        if (this.status() === 'running') {
          this.pause();
        } else if (this.status() === 'paused') {
          this.resume();
        }
        break;
      case 'r':
      case 'R':
        if (this.status() === 'over') {
          event.preventDefault();
          this.restart();
          this.start();
        }
        break;
      default:
        break;
    }
  }

  private isGameKey(event: KeyboardEvent): boolean {
    return [
      'ArrowUp',
      'ArrowDown',
      'ArrowLeft',
      'ArrowRight',
      'w',
      'W',
      'a',
      'A',
      's',
      'S',
      'd',
      'D',
      ' ',
      'Spacebar',
      'r',
      'R',
    ].includes(event.key);
  }

  private beginLoop(): void {
    if (this.animationFrameId !== 0 || this.status() !== 'running') {
      return;
    }

    this.lastTickAt = 0;

    this.ngZone.runOutsideAngular(() => {
      const loop = (timestamp: number) => {
        if (this.status() !== 'running') {
          this.animationFrameId = 0;
          return;
        }

        if (this.lastTickAt === 0) {
          this.lastTickAt = timestamp;
        }

        const elapsed = timestamp - this.lastTickAt;
        if (elapsed >= this.state.tickMs) {
          this.lastTickAt = timestamp;
          this.state = tickDeepDrill(this.state);
          this.syncFromState(this.state);

          if (this.status() === 'over') {
            this.persistBestScore();
            this.draw();
            this.animationFrameId = 0;
            return;
          }
        }

        this.draw();
        this.animationFrameId = requestAnimationFrame(loop);
      };

      this.animationFrameId = requestAnimationFrame(loop);
    });
  }

  private stopLoop(): void {
    if (this.animationFrameId !== 0) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = 0;
    }
  }

  private syncFromState(state: DeepDrillState): void {
    this.status.set(state.status);
    this.score.set(state.score);
    this.fuel.set(state.fuel);
    this.maxFuel.set(state.maxFuel);
    this.cargo.set(state.cargo);
    this.depth.set(state.depth);
    this.message.set(state.message);
  }

  private persistBestScore(): void {
    if (this.score() > this.bestScore()) {
      this.bestScore.set(this.score());
      this.localStorage.setNumber(DEEP_DRILL_BEST_SCORE_KEY, this.score());
    }
  }

  private setupCanvas(): void {
    const canvas = this.canvasRef.nativeElement;
    const container = canvas.parentElement;
    if (!container) {
      return;
    }

    const viewport = container.closest('.game-shell__viewport') as HTMLElement | null;
    const maxSizeRaw = viewport
      ? getComputedStyle(viewport).getPropertyValue('--game-canvas-max').trim()
      : '520px';
    const maxWidth = Number.parseInt(maxSizeRaw, 10) || 520;
    const width = Math.min(container.clientWidth, maxWidth);
    const height = Math.round(width * 0.85);
    const dpr = window.devicePixelRatio || 1;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
  }

  private draw(): void {
    const canvas = this.canvasRef.nativeElement;
    const context = canvas.getContext('2d');
    if (!context) {
      return;
    }

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.width / dpr;
    const height = canvas.height / dpr;
    const tileSize = width / this.state.width;
    const visibleRows = Math.ceil(height / tileSize) + 1;

    const targetCamera = Math.max(0, this.state.player.y * tileSize - height * 0.35);
    this.cameraY += (targetCamera - this.cameraY) * 0.18;
    const startRow = Math.max(0, Math.floor(this.cameraY / tileSize) - 1);
    const endRow = Math.min(this.state.height - 1, startRow + visibleRows);

    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.clearRect(0, 0, width, height);

    // Sky / depth gradient
    const gradient = context.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#1a1040');
    gradient.addColorStop(0.35, '#0b1028');
    gradient.addColorStop(1, '#050814');
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);

    for (let y = startRow; y <= endRow; y += 1) {
      for (let x = 0; x < this.state.width; x += 1) {
        const tile = this.state.tiles[y * this.state.width + x];
        const px = x * tileSize;
        const py = y * tileSize - this.cameraY;

        this.drawTile(context, tile, px, py, tileSize, x, y);
      }
    }

    // Player drill
    const playerX = this.state.player.x * tileSize + tileSize * 0.15;
    const playerY = this.state.player.y * tileSize - this.cameraY + tileSize * 0.1;
    const playerSize = tileSize * 0.7;

    context.fillStyle = '#a855f7';
    context.shadowColor = '#c084fc';
    context.shadowBlur = 12;
    context.fillRect(playerX, playerY, playerSize, playerSize);
    context.shadowBlur = 0;

    context.fillStyle = '#22d3ee';
    context.fillRect(
      playerX + playerSize * 0.25,
      playerY + playerSize * 0.55,
      playerSize * 0.5,
      playerSize * 0.35,
    );

    // Fuel bar overlay
    const barWidth = width * 0.34;
    const fuelRatio = this.state.maxFuel === 0 ? 0 : this.state.fuel / this.state.maxFuel;
    context.fillStyle = 'rgba(0, 0, 0, 0.45)';
    context.fillRect(12, 12, barWidth, 10);
    context.fillStyle = fuelRatio > 0.25 ? '#22d3ee' : '#f87171';
    context.fillRect(12, 12, barWidth * fuelRatio, 10);

    if (this.status() === 'idle') {
      this.drawOverlay(context, width, height, 'Naciśnij Start — kop, zbieraj, wracaj na powierzchnię');
    } else if (this.status() === 'paused') {
      this.drawOverlay(context, width, height, 'Pauza');
    } else if (this.status() === 'over') {
      this.drawOverlay(context, width, height, `${this.message()} — R aby zagrać ponownie`);
    }
  }

  private drawTile(
    context: CanvasRenderingContext2D,
    tile: TileType,
    x: number,
    y: number,
    size: number,
    tileX: number,
    tileY: number,
  ): void {
    context.fillStyle = TILE_COLORS[tile];
    context.fillRect(x + 0.5, y + 0.5, size - 1, size - 1);

    if (tile === 'gold' || tile === 'silver' || tile === 'copper' || tile === 'platinum') {
      context.fillStyle = tile === 'platinum' ? 'rgba(125, 211, 252, 0.55)' : 'rgba(255, 255, 255, 0.35)';
      context.fillRect(x + size * 0.25, y + size * 0.25, size * 0.2, size * 0.2);
    }

    if (tile === 'lava') {
      context.fillStyle = 'rgba(251, 146, 60, 0.55)';
      context.fillRect(x + size * 0.15, y + size * 0.55, size * 0.7, size * 0.25);
    }

    if (tile === 'rock') {
      const hits = this.state.rockHits[`${tileX},${tileY}`] ?? 0;
      if (hits > 0) {
        context.strokeStyle = '#f8fafc';
        context.lineWidth = 1;
        context.beginPath();
        context.moveTo(x + size * 0.2, y + size * 0.3);
        context.lineTo(x + size * 0.8, y + size * 0.7);
        context.stroke();
      }
    }

    if (tile === 'surface') {
      context.fillStyle = 'rgba(168, 85, 247, 0.25)';
      context.fillRect(x, y, size, 3);
    }
  }

  private drawOverlay(
    context: CanvasRenderingContext2D,
    width: number,
    height: number,
    message: string,
  ): void {
    context.fillStyle = 'rgba(7, 11, 26, 0.72)';
    context.fillRect(0, 0, width, height);
    context.fillStyle = '#f8fafc';
    context.font = '600 15px system-ui, sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    wrapText(context, message, width / 2, height / 2, width * 0.8, 20);
  }
}

function wrapText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
): void {
  const words = text.split(' ');
  const lines: string[] = [];
  let line = '';

  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (context.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }

  if (line) {
    lines.push(line);
  }

  const startY = y - ((lines.length - 1) * lineHeight) / 2;
  lines.forEach((entry, index) => {
    context.fillText(entry, x, startY + index * lineHeight);
  });
}
