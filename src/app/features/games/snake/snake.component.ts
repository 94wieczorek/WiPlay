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
  createInitialSnakeState,
  pauseSnake,
  queueSnakeDirection,
  restartSnake,
  resumeSnake,
  startSnake,
  tickSnake,
} from './snake.engine';
import { Direction, SNAKE_BEST_SCORE_KEY, SnakeState } from './snake.models';

@Component({
  selector: 'app-snake',
  imports: [],
  templateUrl: './snake.component.html',
  styleUrl: './snake.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'snake-game',
    tabindex: '0',
    '(click)': 'focusGame()',
  },
})
export class SnakeComponent implements GameController, AfterViewInit, OnDestroy {
  private readonly localStorage = inject(LocalStorageService);
  private readonly ngZone = inject(NgZone);
  private readonly elementRef = inject(ElementRef<HTMLElement>);

  @ViewChild('canvas', { static: true })
  private readonly canvasRef!: ElementRef<HTMLCanvasElement>;

  readonly status = signal<GameStatus>('idle');
  readonly score = signal(0);
  readonly bestScore = signal(0);

  private state: SnakeState = createInitialSnakeState();
  private animationFrameId = 0;
  private lastTickAt = 0;
  private resizeObserver: ResizeObserver | null = null;

  constructor() {
    this.bestScore.set(this.localStorage.getNumber(SNAKE_BEST_SCORE_KEY));
    this.syncFromState(this.state);
  }

  ngAfterViewInit(): void {
    this.setupCanvas();
    this.draw();

    this.resizeObserver = new ResizeObserver(() => {
      this.setupCanvas();
      this.draw();
    });

    this.resizeObserver.observe(this.canvasRef.nativeElement.parentElement ?? this.canvasRef.nativeElement);
    this.focusGame();
  }

  ngOnDestroy(): void {
    this.stopLoop();
    this.resizeObserver?.disconnect();
  }

  start(): void {
    this.state = startSnake(this.state);
    this.syncFromState(this.state);
    this.focusGame();
    this.beginLoop();
  }

  pause(): void {
    this.state = pauseSnake(this.state);
    this.syncFromState(this.state);
    this.stopLoop();
  }

  resume(): void {
    this.state = resumeSnake(this.state);
    this.syncFromState(this.state);
    this.beginLoop();
  }

  restart(): void {
    this.stopLoop();
    this.state = restartSnake(this.state);
    this.syncFromState(this.state);
    this.draw();
  }

  setDirection(direction: Direction): void {
    this.state = queueSnakeDirection(this.state, direction);
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
    const gameKeys = new Set([
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
    ]);

    return gameKeys.has(event.key);
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
          this.state = tickSnake(this.state);
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

  private syncFromState(state: SnakeState): void {
    this.status.set(state.status);
    this.score.set(state.score);
  }

  private persistBestScore(): void {
    const currentBest = this.bestScore();
    if (this.score() > currentBest) {
      this.bestScore.set(this.score());
      this.localStorage.setNumber(SNAKE_BEST_SCORE_KEY, this.score());
    }
  }

  private setupCanvas(): void {
    const canvas = this.canvasRef.nativeElement;
    const container = canvas.parentElement;
    if (!container) {
      return;
    }

    const size = Math.min(container.clientWidth, 520);
    const dpr = window.devicePixelRatio || 1;

    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
  }

  private draw(): void {
    const canvas = this.canvasRef.nativeElement;
    const context = canvas.getContext('2d');
    if (!context) {
      return;
    }

    const dpr = window.devicePixelRatio || 1;
    const size = canvas.width;
    const cellSize = size / this.state.gridSize;

    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);

    context.fillStyle = '#0b1028';
    context.fillRect(0, 0, canvas.width / dpr, canvas.height / dpr);

    context.fillStyle = '#ef4444';
    context.beginPath();
    context.arc(
      this.state.food.x * cellSize + cellSize / 2,
      this.state.food.y * cellSize + cellSize / 2,
      cellSize * 0.35,
      0,
      Math.PI * 2,
    );
    context.fill();

    this.state.snake.forEach((segment, index) => {
      context.fillStyle = index === 0 ? '#a855f7' : '#6d4aff';
      context.fillRect(
        segment.x * cellSize + 1,
        segment.y * cellSize + 1,
        cellSize - 2,
        cellSize - 2,
      );
    });

    if (this.status() === 'idle') {
      this.drawOverlay(context, canvas, dpr, 'Naciśnij Start');
    } else if (this.status() === 'paused') {
      this.drawOverlay(context, canvas, dpr, 'Pauza');
    } else if (this.status() === 'over') {
      this.drawOverlay(context, canvas, dpr, 'Koniec gry — R aby zagrać ponownie');
    }
  }

  private drawOverlay(
    context: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    dpr: number,
    message: string,
  ): void {
    const width = canvas.width / dpr;
    const height = canvas.height / dpr;

    context.fillStyle = 'rgba(7, 11, 26, 0.72)';
    context.fillRect(0, 0, width, height);

    context.fillStyle = '#f8fafc';
    context.font = '600 16px system-ui, sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(message, width / 2, height / 2);
  }
}
