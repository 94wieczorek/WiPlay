import { pickUndergroundTile } from '../deep-drill-shared/ore-generation';
import { GameStatus } from '../../../core/models/game-controller.model';
import {
  DIG_COST,
  DeepDrillState,
  DrillDirection,
  Point,
  TILE_VALUES,
  TileType,
  getTile,
  tileIndex,
} from './deep-drill.models';

const SURFACE_ROWS = 2;

export function createInitialDeepDrillState(
  width = 16,
  height = 42,
  maxFuel = 120,
  seed = Date.now(),
): DeepDrillState {
  const tiles = generateWorld(width, height, seed);
  const player: Point = { x: Math.floor(width / 2), y: 1 };

  return {
    width,
    height,
    tiles,
    player,
    fuel: maxFuel,
    maxFuel,
    cargo: 0,
    score: 0,
    depth: 0,
    status: 'idle',
    message: 'Naciśnij Start i zacznij kopać w głąb',
    tickMs: 90,
    moveCooldown: 0,
    queuedDirection: null,
    rockHits: {},
  };
}

export function startDeepDrill(state: DeepDrillState): DeepDrillState {
  if (state.status === 'running') {
    return state;
  }

  return {
    ...state,
    status: 'running',
    message: 'Kop w dół, zbieraj minerały, wróć na powierzchnię',
  };
}

export function pauseDeepDrill(state: DeepDrillState): DeepDrillState {
  if (state.status !== 'running') {
    return state;
  }

  return {
    ...state,
    status: 'paused',
    message: 'Pauza',
  };
}

export function resumeDeepDrill(state: DeepDrillState): DeepDrillState {
  if (state.status !== 'paused') {
    return state;
  }

  return {
    ...state,
    status: 'running',
    message: 'Wznów kopanie',
  };
}

export function restartDeepDrill(state: DeepDrillState, seed = Date.now()): DeepDrillState {
  return createInitialDeepDrillState(state.width, state.height, state.maxFuel, seed);
}

export function queueDeepDrillMove(
  state: DeepDrillState,
  direction: DrillDirection,
): DeepDrillState {
  if (state.status !== 'running') {
    return state;
  }

  return {
    ...state,
    queuedDirection: direction,
  };
}

export function tickDeepDrill(state: DeepDrillState): DeepDrillState {
  if (state.status !== 'running') {
    return state;
  }

  if (state.moveCooldown > 0) {
    return {
      ...state,
      moveCooldown: state.moveCooldown - 1,
    };
  }

  if (!state.queuedDirection) {
    return state;
  }

  const direction = state.queuedDirection;
  const next = tryMove(state, direction);

  return {
    ...next,
    queuedDirection: null,
    moveCooldown: next.status === 'running' ? 1 : 0,
  };
}

function tryMove(state: DeepDrillState, direction: DrillDirection): DeepDrillState {
  const target = movePoint(state.player, direction);
  const tile = getTile(state, target.x, target.y);

  if (tile === null) {
    return state;
  }

  if (tile === 'lava') {
    return {
      ...state,
      player: target,
      status: 'over' as GameStatus,
      message: 'Wpadłeś w lawę!',
      depth: Math.max(state.depth, target.y),
    };
  }

  if (tile === 'empty' || tile === 'surface') {
    return applyMove(state, target, state.tiles, 1, 0);
  }

  if (tile === 'rock') {
    const key = `${target.x},${target.y}`;
    const hits = (state.rockHits[key] ?? 0) + 1;
    const fuelCost = DIG_COST.rock;

    if (state.fuel < fuelCost) {
      return outOfFuel(state);
    }

    if (hits < 2) {
      return {
        ...state,
        fuel: state.fuel - fuelCost,
        rockHits: { ...state.rockHits, [key]: hits },
        message: 'Kamień — jeszcze jedno uderzenie',
        depth: Math.max(state.depth, target.y),
      };
    }

    const tiles = [...state.tiles];
    tiles[tileIndex(state.width, target.x, target.y)] = 'empty';
    const rockHits = { ...state.rockHits };
    delete rockHits[key];

    return applyMove(
      {
        ...state,
        tiles,
        rockHits,
        fuel: state.fuel - fuelCost,
      },
      target,
      tiles,
      0,
      0,
    );
  }

  const digCost = DIG_COST[tile];
  if (state.fuel < digCost) {
    return outOfFuel(state);
  }

  const tiles = [...state.tiles];
  tiles[tileIndex(state.width, target.x, target.y)] = 'empty';
  const oreValue = TILE_VALUES[tile];

  return applyMove(
    {
      ...state,
      tiles,
      fuel: state.fuel - digCost,
    },
    target,
    tiles,
    0,
    oreValue,
  );
}

function applyMove(
  state: DeepDrillState,
  target: Point,
  tiles: TileType[],
  moveFuelCost: number,
  oreGain: number,
): DeepDrillState {
  if (state.fuel < moveFuelCost) {
    return outOfFuel(state);
  }

  let fuel = state.fuel - moveFuelCost;
  let cargo = state.cargo + oreGain;
  let score = state.score;
  let message = oreGain > 0 ? `+${oreGain} do ładunku` : state.message;

  const onSurface = target.y < SURFACE_ROWS;
  if (onSurface && cargo > 0) {
    score += cargo;
    message = `Sprzedano ładunek: +${cargo} pkt`;
    cargo = 0;
    fuel = Math.min(state.maxFuel, fuel + Math.floor(state.maxFuel * 0.35));
  } else if (onSurface) {
    message = 'Powierzchnia — tankuj i schodź po więcej';
    fuel = Math.min(state.maxFuel, fuel + 1);
  }

  if (fuel <= 0 && target.y >= SURFACE_ROWS) {
    return {
      ...state,
      tiles,
      player: target,
      fuel: 0,
      cargo,
      score,
      depth: Math.max(state.depth, target.y),
      status: 'over',
      message: 'Skończyło się paliwo pod ziemią!',
    };
  }

  return {
    ...state,
    tiles,
    player: target,
    fuel,
    cargo,
    score,
    depth: Math.max(state.depth, target.y),
    message,
    status: 'running',
  };
}

function outOfFuel(state: DeepDrillState): DeepDrillState {
  return {
    ...state,
    fuel: 0,
    status: 'over',
    message: 'Brak paliwa — wróć wcześniej na powierzchnię!',
  };
}

function movePoint(point: Point, direction: DrillDirection): Point {
  switch (direction) {
    case 'up':
      return { x: point.x, y: point.y - 1 };
    case 'down':
      return { x: point.x, y: point.y + 1 };
    case 'left':
      return { x: point.x - 1, y: point.y };
    case 'right':
      return { x: point.x + 1, y: point.y };
  }
}

function generateWorld(width: number, height: number, seed: number): TileType[] {
  const random = mulberry32(seed);
  const tiles: TileType[] = [];

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (y < SURFACE_ROWS) {
        tiles.push(y === SURFACE_ROWS - 1 ? 'surface' : 'empty');
        continue;
      }

      const picked = pickUndergroundTile(y, random);
      tiles.push(picked.kind);
    }
  }

  // Clear a small shaft under the spawn so the first dig is readable.
  const spawnX = Math.floor(width / 2);
  for (let y = SURFACE_ROWS; y < SURFACE_ROWS + 2; y += 1) {
    tiles[tileIndex(width, spawnX, y)] = 'dirt';
  }

  return tiles;
}

function mulberry32(seed: number): () => number {
  let value = seed >>> 0;

  return () => {
    value += 0x6d2b79f5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
