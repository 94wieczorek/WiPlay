import { GameStatus } from '../../../core/models/game-controller.model';

export type Direction = 'up' | 'down' | 'left' | 'right';

export interface Point {
  x: number;
  y: number;
}

export interface SnakeLevelConfig {
  level: number;
  tickMs: number;
  pointsPerFood: number;
}

export interface SnakeState {
  gridSize: number;
  snake: Point[];
  direction: Direction;
  queuedDirection: Direction;
  food: Point;
  score: number;
  status: GameStatus;
  tickMs: number;
  pointsPerFood: number;
  level: number;
}

export const SNAKE_MIN_LEVEL = 1;
export const SNAKE_MAX_LEVEL = 10;
export const SNAKE_DEFAULT_LEVEL = 5;
export const SNAKE_LEVEL_KEY = 'wiplay_snake_level';

/** tickMs at level 1 (slowest) and level 10 (fastest) */
export const SNAKE_TICK_MS_MIN = 200;
export const SNAKE_TICK_MS_MAX = 60;

export function clampSnakeLevel(level: number): number {
  return Math.min(SNAKE_MAX_LEVEL, Math.max(SNAKE_MIN_LEVEL, Math.round(level)));
}

export function getSnakeTickMs(level: number): number {
  const clamped = clampSnakeLevel(level);
  const progress = (clamped - SNAKE_MIN_LEVEL) / (SNAKE_MAX_LEVEL - SNAKE_MIN_LEVEL);
  return Math.round(SNAKE_TICK_MS_MIN - progress * (SNAKE_TICK_MS_MIN - SNAKE_TICK_MS_MAX));
}

export function getSnakePointsPerFood(level: number): number {
  return clampSnakeLevel(level);
}

export function getSnakeLevelConfig(level: number): SnakeLevelConfig {
  const clamped = clampSnakeLevel(level);

  return {
    level: clamped,
    tickMs: getSnakeTickMs(clamped),
    pointsPerFood: getSnakePointsPerFood(clamped),
  };
}

export function getSnakeBestScoreKey(level: number): string {
  return `wiplay_snake_best_${clampSnakeLevel(level)}`;
}

export function parseSnakeLevel(value: string | number, fallback = SNAKE_DEFAULT_LEVEL): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return clampSnakeLevel(parsed);
}

export const SNAKE_LEVELS: readonly number[] = Array.from(
  { length: SNAKE_MAX_LEVEL },
  (_, index) => index + 1,
);
