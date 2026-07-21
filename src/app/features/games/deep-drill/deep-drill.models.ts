import { GameStatus } from '../../../core/models/game-controller.model';

export type DrillDirection = 'up' | 'down' | 'left' | 'right';

export type TileType =
  | 'empty'
  | 'surface'
  | 'dirt'
  | 'rock'
  | 'copper'
  | 'silver'
  | 'gold'
  | 'platinum'
  | 'lava';

export interface Point {
  x: number;
  y: number;
}

export interface DeepDrillState {
  width: number;
  height: number;
  tiles: TileType[];
  player: Point;
  fuel: number;
  maxFuel: number;
  cargo: number;
  score: number;
  depth: number;
  status: GameStatus;
  message: string;
  tickMs: number;
  moveCooldown: number;
  queuedDirection: DrillDirection | null;
  rockHits: Record<string, number>;
}

export const DEEP_DRILL_BEST_SCORE_KEY = 'wiplay_deep_drill_best';

export const TILE_VALUES: Readonly<Record<TileType, number>> = {
  empty: 0,
  surface: 0,
  dirt: 0,
  rock: 0,
  copper: 10,
  silver: 22,
  gold: 55,
  platinum: 110,
  lava: 0,
};

export const DIG_COST: Readonly<Record<TileType, number>> = {
  empty: 0,
  surface: 0,
  dirt: 1,
  rock: 3,
  copper: 2,
  silver: 2,
  gold: 2,
  platinum: 3,
  lava: 0,
};

export function tileIndex(width: number, x: number, y: number): number {
  return y * width + x;
}

export function getTile(state: DeepDrillState, x: number, y: number): TileType | null {
  if (x < 0 || y < 0 || x >= state.width || y >= state.height) {
    return null;
  }

  return state.tiles[tileIndex(state.width, x, y)] ?? null;
}
