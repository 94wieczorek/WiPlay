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

export interface DeepDrillV2State {
  width: number;
  height: number;
  tiles: TileType[];
  player: Point;
  fuel: number;
  maxFuel: number;
  hp: number;
  maxHp: number;
  /** Current spendable cash. */
  money: number;
  /** Total earnings this run (for score / best). */
  score: number;
  /** Current cargo sale value. */
  cargoValue: number;
  /** Current cargo weight. */
  cargoWeight: number;
  cargoMax: number;
  depth: number;
  /** Drill upgrade level (1–MAX). */
  drillLevel: number;
  /** Fuel tank upgrade level (1–MAX). */
  fuelTankLevel: number;
  status: GameStatus;
  message: string;
  tickMs: number;
  moveCooldown: number;
  queuedDirection: DrillDirection | null;
  /** Accumulated dig hits per tile key "x,y". */
  tileHits: Record<string, number>;
}

export const DEEP_DRILL_V2_BEST_SCORE_KEY = 'wiplay_deep_drill_v2_best';
export const ROCK_HP_DAMAGE = 15;
export const SURFACE_ROWS = 2;
export const DEFAULT_CARGO_MAX = 60;
export const STARTING_MONEY = 40;

export const MAX_DRILL_LEVEL = 4;
export const MAX_FUEL_TANK_LEVEL = 4;

/** Dig power by drill level. */
export const DRILL_POWER: Readonly<Record<number, number>> = {
  1: 1,
  2: 2,
  3: 3,
  4: 4,
};

/** Max fuel by tank level. */
export const FUEL_TANK_CAPACITY: Readonly<Record<number, number>> = {
  1: 120,
  2: 160,
  3: 220,
  4: 300,
};

/** Cost to upgrade FROM level → level+1 (index 0 = 1→2). */
export const DRILL_UPGRADE_COSTS: readonly number[] = [45, 90, 160];
export const FUEL_TANK_UPGRADE_COSTS: readonly number[] = [40, 80, 140];

/** Shop consumables */
export const FUEL_PACK_AMOUNT = 30;
export const FUEL_PACK_COST = 18;
export const REPAIR_PACK_AMOUNT = 25;
export const REPAIR_PACK_COST = 22;

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

/** Weight toward cargo capacity. */
export const TILE_WEIGHT: Readonly<Record<TileType, number>> = {
  empty: 0,
  surface: 0,
  dirt: 0,
  rock: 0,
  copper: 4,
  silver: 6,
  gold: 8,
  platinum: 12,
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

export function getTile(state: DeepDrillV2State, x: number, y: number): TileType | null {
  if (x < 0 || y < 0 || x >= state.width || y >= state.height) {
    return null;
  }

  return state.tiles[tileIndex(state.width, x, y)] ?? null;
}

export function isSolidTile(tile: TileType): boolean {
  return tile !== 'empty' && tile !== 'surface' && tile !== 'lava';
}

export function isOnSurface(state: DeepDrillV2State): boolean {
  return state.player.y < SURFACE_ROWS;
}

export function getDrillPower(drillLevel: number): number {
  return DRILL_POWER[drillLevel] ?? 1;
}

export function getFuelTankCapacity(fuelTankLevel: number): number {
  return FUEL_TANK_CAPACITY[fuelTankLevel] ?? FUEL_TANK_CAPACITY[1];
}

/** Soft ground hardness by absolute depth (HUD / tile y). */
export function getBaseHardness(depth: number): number {
  if (depth < 25) {
    return 1;
  }
  if (depth < 50) {
    return 2;
  }
  if (depth < 75) {
    return 3;
  }
  if (depth < 100) {
    return 4;
  }
  return 5;
}

export function getTileHardness(tile: TileType, depth: number): number {
  if (!isSolidTile(tile)) {
    return 0;
  }

  const base = getBaseHardness(depth);
  return tile === 'rock' ? base + 2 : base;
}

export function getHitsRequired(hardness: number, drillPower: number): number {
  return Math.max(1, Math.ceil(hardness / Math.max(1, drillPower)));
}

/**
 * Dig / move pacing: overpowered drill digs faster;
 * underpowered drill waits longer between swings.
 */
export function getDigMoveCooldown(hardness: number, drillPower: number): number {
  const surplus = drillPower - hardness;
  if (surplus >= 2) {
    return 0;
  }
  if (surplus >= 0) {
    return 1;
  }
  return 2;
}

export function getDrillUpgradeCost(currentLevel: number): number | null {
  if (currentLevel >= MAX_DRILL_LEVEL) {
    return null;
  }
  return DRILL_UPGRADE_COSTS[currentLevel - 1] ?? null;
}

export function getFuelTankUpgradeCost(currentLevel: number): number | null {
  if (currentLevel >= MAX_FUEL_TANK_LEVEL) {
    return null;
  }
  return FUEL_TANK_UPGRADE_COSTS[currentLevel - 1] ?? null;
}
