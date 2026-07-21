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
  buyDrillUpgrade,
  buyFuelPack,
  buyFuelTankUpgrade,
  buyRepairPack,
  canUseShop,
  createInitialDeepDrillV2State,
  pauseDeepDrillV2,
  queueDeepDrillV2Move,
  restartDeepDrillV2,
  resumeDeepDrillV2,
  sellCargo,
  startDeepDrillV2,
  tickDeepDrillV2,
} from './deep-drill-v2.engine';
import {
  DEEP_DRILL_V2_BEST_SCORE_KEY,
  DeepDrillV2State,
  DrillDirection,
  FUEL_PACK_AMOUNT,
  FUEL_PACK_COST,
  MAX_DRILL_LEVEL,
  MAX_FUEL_TANK_LEVEL,
  REPAIR_PACK_AMOUNT,
  REPAIR_PACK_COST,
  TileType,
  getDrillUpgradeCost,
  getFuelTankUpgradeCost,
} from './deep-drill-v2.models';

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
  selector: 'app-deep-drill-v2',
  imports: [],
  templateUrl: './deep-drill-v2.component.html',
  styleUrl: './deep-drill-v2.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'deep-drill-v2-game',
    tabindex: '0',
    '(click)': 'focusGame()',
  },
})
export class DeepDrillV2Component implements GameController, AfterViewInit, OnDestroy {
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
  readonly hp = signal(100);
  readonly maxHp = signal(100);
  readonly money = signal(0);
  readonly cargoValue = signal(0);
  readonly cargoWeight = signal(0);
  readonly cargoMax = signal(60);
  readonly depth = signal(0);
  readonly drillLevel = signal(1);
  readonly fuelTankLevel = signal(1);
  readonly message = signal('');
  readonly shopAvailable = signal(false);
  readonly drillUpgradeCost = signal<number | null>(null);
  readonly fuelTankUpgradeCost = signal<number | null>(null);

  readonly fuelPackCost = FUEL_PACK_COST;
  readonly fuelPackAmount = FUEL_PACK_AMOUNT;
  readonly repairPackCost = REPAIR_PACK_COST;
  readonly repairPackAmount = REPAIR_PACK_AMOUNT;
  readonly maxDrillLevel = MAX_DRILL_LEVEL;
  readonly maxFuelTankLevel = MAX_FUEL_TANK_LEVEL;

  private state: DeepDrillV2State = createInitialDeepDrillV2State();
  private animationFrameId = 0;
  private lastTickAt = 0;
  private resizeObserver: ResizeObserver | null = null;
  private cameraY = 0;

  constructor() {
    this.bestScore.set(this.localStorage.getNumber(DEEP_DRILL_V2_BEST_SCORE_KEY));
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
    this.state = startDeepDrillV2(this.state);
    this.syncFromState(this.state);
    this.focusGame();
    this.beginLoop();
  }

  pause(): void {
    this.state = pauseDeepDrillV2(this.state);
    this.syncFromState(this.state);
    this.stopLoop();
    this.draw();
  }

  resume(): void {
    this.state = resumeDeepDrillV2(this.state);
    this.syncFromState(this.state);
    this.beginLoop();
  }

  restart(): void {
    this.stopLoop();
    this.state = restartDeepDrillV2(this.state);
    this.cameraY = 0;
    this.syncFromState(this.state);
    this.draw();
  }

  setDirection(direction: DrillDirection): void {
    this.state = queueDeepDrillV2Move(this.state, direction);
  }

  sellAtShop(): void {
    if (!canUseShop(this.state)) {
      return;
    }

    this.state = sellCargo(this.state);
    this.syncFromState(this.state);
    this.draw();
  }

  buyFuel(): void {
    if (!canUseShop(this.state)) {
      return;
    }

    this.state = buyFuelPack(this.state);
    this.syncFromState(this.state);
    this.draw();
  }

  buyRepair(): void {
    if (!canUseShop(this.state)) {
      return;
    }

    this.state = buyRepairPack(this.state);
    this.syncFromState(this.state);
    this.draw();
  }

  upgradeDrill(): void {
    if (!canUseShop(this.state)) {
      return;
    }

    this.state = buyDrillUpgrade(this.state);
    this.syncFromState(this.state);
    this.draw();
  }

  upgradeFuelTank(): void {
    if (!canUseShop(this.state)) {
      return;
    }

    this.state = buyFuelTankUpgrade(this.state);
    this.syncFromState(this.state);
    this.draw();
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
          this.state = tickDeepDrillV2(this.state);
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

  private syncFromState(state: DeepDrillV2State): void {
    this.status.set(state.status);
    this.score.set(state.score);
    this.fuel.set(state.fuel);
    this.maxFuel.set(state.maxFuel);
    this.hp.set(state.hp);
    this.maxHp.set(state.maxHp);
    this.money.set(state.money);
    this.cargoValue.set(state.cargoValue);
    this.cargoWeight.set(state.cargoWeight);
    this.cargoMax.set(state.cargoMax);
    this.depth.set(state.depth);
    this.drillLevel.set(state.drillLevel);
    this.fuelTankLevel.set(state.fuelTankLevel);
    this.message.set(state.message);
    this.shopAvailable.set(canUseShop(state));
    this.drillUpgradeCost.set(getDrillUpgradeCost(state.drillLevel));
    this.fuelTankUpgradeCost.set(getFuelTankUpgradeCost(state.fuelTankLevel));
  }

  private persistBestScore(): void {
    if (this.score() > this.bestScore()) {
      this.bestScore.set(this.score());
      this.localStorage.setNumber(DEEP_DRILL_V2_BEST_SCORE_KEY, this.score());
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

    const barWidth = width * 0.28;
    const fuelRatio = this.state.maxFuel === 0 ? 0 : this.state.fuel / this.state.maxFuel;
    const hpRatio = this.state.maxHp === 0 ? 0 : this.state.hp / this.state.maxHp;

    context.fillStyle = 'rgba(0, 0, 0, 0.45)';
    context.fillRect(12, 12, barWidth, 8);
    context.fillStyle = hpRatio > 0.3 ? '#4ade80' : '#f87171';
    context.fillRect(12, 12, barWidth * hpRatio, 8);

    context.fillStyle = 'rgba(0, 0, 0, 0.45)';
    context.fillRect(12, 24, barWidth, 8);
    context.fillStyle = fuelRatio > 0.25 ? '#22d3ee' : '#f87171';
    context.fillRect(12, 24, barWidth * fuelRatio, 8);

    if (this.status() === 'idle') {
      this.drawOverlay(
        context,
        width,
        height,
        'Naciśnij Start — kop w dół/bok, wracaj tylko pustym szybem',
      );
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

    const hits = this.state.tileHits[`${tileX},${tileY}`] ?? 0;
    if (hits > 0 && tile !== 'empty' && tile !== 'surface' && tile !== 'lava') {
      context.strokeStyle = '#f8fafc';
      context.lineWidth = 1;
      context.beginPath();
      context.moveTo(x + size * 0.2, y + size * 0.3);
      context.lineTo(x + size * 0.8, y + size * 0.7);
      context.stroke();
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
