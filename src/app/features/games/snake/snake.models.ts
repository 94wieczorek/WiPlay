import { GameStatus } from '../../../core/models/game-controller.model';

export type Direction = 'up' | 'down' | 'left' | 'right';

export interface Point {
  x: number;
  y: number;
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
}

export const SNAKE_BEST_SCORE_KEY = 'wiplay_snake_best';
