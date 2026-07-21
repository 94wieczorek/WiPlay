import {
  MAX_WORLD_DEPTH,
  pickUndergroundTile,
} from '../deep-drill-shared/ore-generation';
import { GameStatus } from '../../../core/models/game-controller.model';
import {
  DEFAULT_CARGO_MAX,
  DIG_COST,
  DeepDrillV2State,
  DrillDirection,
  FUEL_PACK_AMOUNT,
  FUEL_PACK_COST,
  Point,
  REPAIR_PACK_AMOUNT,
  REPAIR_PACK_COST,
  ROCK_HP_DAMAGE,
  STARTING_MONEY,
  SURFACE_ROWS,
  TILE_VALUES,
  TILE_WEIGHT,
  TileType,
  getDigMoveCooldown,
  getDrillPower,
  getDrillUpgradeCost,
  getFuelTankCapacity,
  getFuelTankUpgradeCost,
  getHitsRequired,
  getTile,
  getTileHardness,
  isOnSurface,
  isSolidTile,
  tileIndex,
} from './deep-drill-v2.models';

/** height = MAX_WORLD_DEPTH + 1 so deepest tile y === MAX_WORLD_DEPTH */
export const DEFAULT_WORLD_HEIGHT = MAX_WORLD_DEPTH + 1;

export function createInitialDeepDrillV2State(
  width = 16,
  height = DEFAULT_WORLD_HEIGHT,
  maxFuel = getFuelTankCapacity(1),
  maxHp = 100,
  seed = Date.now(),
): DeepDrillV2State {
  const tiles = generateWorld(width, height, seed);
  const player: Point = { x: Math.floor(width / 2), y: 1 };
  const fuelTankLevel = 1;
  const tankCapacity = getFuelTankCapacity(fuelTankLevel);

  return {
    width,
    height,
    tiles,
    player,
    fuel: Math.min(maxFuel, tankCapacity),
    maxFuel: tankCapacity,
    hp: maxHp,
    maxHp,
    money: STARTING_MONEY,
    score: 0,
    cargoValue: 0,
    cargoWeight: 0,
    cargoMax: DEFAULT_CARGO_MAX,
    depth: 0,
    drillLevel: 1,
    fuelTankLevel,
    status: 'idle',
    message: 'Naciśnij Start — sprzedawaj, tankuj i ulepszaj w sklepie na powierzchni',
    tickMs: 90,
    moveCooldown: 0,
    queuedDirection: null,
    tileHits: {},
  };
}

export function startDeepDrillV2(state: DeepDrillV2State): DeepDrillV2State {
  if (state.status === 'running') {
    return state;
  }

  return {
    ...state,
    status: 'running',
    message: 'Kop w bok i w dół. W górę tylko pustym szybem.',
  };
}

export function pauseDeepDrillV2(state: DeepDrillV2State): DeepDrillV2State {
  if (state.status !== 'running') {
    return state;
  }

  return {
    ...state,
    status: 'paused',
    message: 'Pauza',
  };
}

export function resumeDeepDrillV2(state: DeepDrillV2State): DeepDrillV2State {
  if (state.status !== 'paused') {
    return state;
  }

  return {
    ...state,
    status: 'running',
    message: 'Wznów kopanie',
  };
}

export function restartDeepDrillV2(state: DeepDrillV2State, seed = Date.now()): DeepDrillV2State {
  return createInitialDeepDrillV2State(state.width, state.height, getFuelTankCapacity(1), 100, seed);
}

export function queueDeepDrillV2Move(
  state: DeepDrillV2State,
  direction: DrillDirection,
): DeepDrillV2State {
  if (state.status !== 'running') {
    return state;
  }

  return {
    ...state,
    queuedDirection: direction,
  };
}

export function tickDeepDrillV2(state: DeepDrillV2State): DeepDrillV2State {
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
  };
}

/** Sell cargo at the surface shop. */
export function sellCargo(state: DeepDrillV2State): DeepDrillV2State {
  if (!canUseShop(state)) {
    return {
      ...state,
      message: 'Sklep dostępny tylko na powierzchni',
    };
  }

  if (state.cargoValue <= 0) {
    return {
      ...state,
      message: 'Brak ładunku do sprzedaży',
    };
  }

  const earned = state.cargoValue;

  return {
    ...state,
    money: state.money + earned,
    score: state.score + earned,
    cargoValue: 0,
    cargoWeight: 0,
    message: `Sprzedano ładunek: +${earned} $`,
  };
}

/** Buy a fuel pack at the surface shop. */
export function buyFuelPack(state: DeepDrillV2State): DeepDrillV2State {
  if (!canUseShop(state)) {
    return { ...state, message: 'Sklep dostępny tylko na powierzchni' };
  }

  if (state.fuel >= state.maxFuel) {
    return { ...state, message: 'Bak jest pełny' };
  }

  if (state.money < FUEL_PACK_COST) {
    return { ...state, message: `Za mało kasy (paliwo: ${FUEL_PACK_COST} $)` };
  }

  const before = state.fuel;
  const fuel = Math.min(state.maxFuel, state.fuel + FUEL_PACK_AMOUNT);

  return {
    ...state,
    money: state.money - FUEL_PACK_COST,
    fuel,
    message: `Zatankowano +${fuel - before} paliwa (−${FUEL_PACK_COST} $)`,
  };
}

/** Buy a repair pack at the surface shop. */
export function buyRepairPack(state: DeepDrillV2State): DeepDrillV2State {
  if (!canUseShop(state)) {
    return { ...state, message: 'Sklep dostępny tylko na powierzchni' };
  }

  if (state.hp >= state.maxHp) {
    return { ...state, message: 'Wiertnica jest sprawna' };
  }

  if (state.money < REPAIR_PACK_COST) {
    return { ...state, message: `Za mało kasy (naprawa: ${REPAIR_PACK_COST} $)` };
  }

  const before = state.hp;
  const hp = Math.min(state.maxHp, state.hp + REPAIR_PACK_AMOUNT);

  return {
    ...state,
    money: state.money - REPAIR_PACK_COST,
    hp,
    message: `Naprawiono +${hp - before} HP (−${REPAIR_PACK_COST} $)`,
  };
}

/** Upgrade drill power at the surface shop. */
export function buyDrillUpgrade(state: DeepDrillV2State): DeepDrillV2State {
  if (!canUseShop(state)) {
    return { ...state, message: 'Sklep dostępny tylko na powierzchni' };
  }

  const cost = getDrillUpgradeCost(state.drillLevel);
  if (cost === null) {
    return { ...state, message: 'Wiertło jest już na max poziomie' };
  }

  if (state.money < cost) {
    return { ...state, message: `Za mało kasy (wiertło: ${cost} $)` };
  }

  const drillLevel = state.drillLevel + 1;

  return {
    ...state,
    money: state.money - cost,
    drillLevel,
    message: `Wiertło ↑${drillLevel} (moc ${getDrillPower(drillLevel)}) (−${cost} $)`,
  };
}

/** Upgrade fuel tank capacity at the surface shop. */
export function buyFuelTankUpgrade(state: DeepDrillV2State): DeepDrillV2State {
  if (!canUseShop(state)) {
    return { ...state, message: 'Sklep dostępny tylko na powierzchni' };
  }

  const cost = getFuelTankUpgradeCost(state.fuelTankLevel);
  if (cost === null) {
    return { ...state, message: 'Bak jest już na max poziomie' };
  }

  if (state.money < cost) {
    return { ...state, message: `Za mało kasy (bak: ${cost} $)` };
  }

  const fuelTankLevel = state.fuelTankLevel + 1;
  const maxFuel = getFuelTankCapacity(fuelTankLevel);

  return {
    ...state,
    money: state.money - cost,
    fuelTankLevel,
    maxFuel,
    message: `Bak ↑${fuelTankLevel} (poj. ${maxFuel}) (−${cost} $)`,
  };
}

export function canUseShop(state: DeepDrillV2State): boolean {
  return (
    isOnSurface(state) &&
    (state.status === 'running' || state.status === 'paused' || state.status === 'idle')
  );
}

function tryMove(state: DeepDrillV2State, direction: DrillDirection): DeepDrillV2State {
  const target = movePoint(state.player, direction);
  const tile = getTile(state, target.x, target.y);

  if (tile === null) {
    return { ...state, moveCooldown: 1 };
  }

  if (direction === 'up' && isSolidTile(tile)) {
    return {
      ...state,
      moveCooldown: 1,
      message: 'Nie da się kopać w górę — wróć pustym szybem',
    };
  }

  if (tile === 'lava') {
    return {
      ...state,
      player: target,
      hp: 0,
      status: 'over' as GameStatus,
      message: 'Wpadłeś w lawę!',
      depth: Math.max(state.depth, target.y),
      moveCooldown: 0,
    };
  }

  if (tile === 'empty' || tile === 'surface') {
    return applyMove(state, target, state.tiles, 1, 0, 1);
  }

  return digSolidTile(state, target, tile);
}

function digSolidTile(state: DeepDrillV2State, target: Point, tile: TileType): DeepDrillV2State {
  const digCost = DIG_COST[tile];
  if (state.fuel < digCost) {
    return outOfFuel(state);
  }

  const weight = TILE_WEIGHT[tile];
  const value = TILE_VALUES[tile];

  if (weight > 0 && state.cargoWeight + weight > state.cargoMax) {
    return {
      ...state,
      moveCooldown: 1,
      message: `Ładunek pełny (${state.cargoWeight}/${state.cargoMax}) — wróć sprzedać`,
    };
  }

  const hardness = getTileHardness(tile, target.y);
  const power = getDrillPower(state.drillLevel);
  const required = getHitsRequired(hardness, power);
  const cooldown = getDigMoveCooldown(hardness, power);
  const key = `${target.x},${target.y}`;
  const hits = (state.tileHits[key] ?? 0) + 1;

  let hp = state.hp;
  let message = `Kopanie… ${hits}/${required}`;

  if (tile === 'rock') {
    hp = Math.max(0, state.hp - ROCK_HP_DAMAGE);
    if (hp <= 0) {
      return {
        ...state,
        fuel: state.fuel - digCost,
        hp: 0,
        status: 'over',
        message: 'Wiertnica zniszczona przez kamień!',
        depth: Math.max(state.depth, target.y),
        moveCooldown: 0,
      };
    }
    message =
      hits < required
        ? `Kamień ${hits}/${required} — −${ROCK_HP_DAMAGE} HP`
        : `Kamień rozbity (−${ROCK_HP_DAMAGE} HP)`;
  } else if (hits < required) {
    message = `Twarde podłoże ${hits}/${required} (głęb. ${target.y})`;
  }

  if (hits < required) {
    return {
      ...state,
      fuel: state.fuel - digCost,
      hp,
      tileHits: { ...state.tileHits, [key]: hits },
      message,
      depth: Math.max(state.depth, target.y),
      moveCooldown: cooldown,
    };
  }

  const tiles = [...state.tiles];
  tiles[tileIndex(state.width, target.x, target.y)] = 'empty';
  const tileHits = { ...state.tileHits };
  delete tileHits[key];

  return applyMove(
    {
      ...state,
      tiles,
      tileHits,
      fuel: state.fuel - digCost,
      hp,
      cargoValue: state.cargoValue + value,
      cargoWeight: state.cargoWeight + weight,
      message: tile === 'rock' ? message : state.message,
    },
    target,
    tiles,
    0,
    value,
    cooldown,
  );
}

function applyMove(
  state: DeepDrillV2State,
  target: Point,
  tiles: TileType[],
  moveFuelCost: number,
  oreGainValue: number,
  moveCooldown: number,
): DeepDrillV2State {
  if (state.fuel < moveFuelCost) {
    return outOfFuel(state);
  }

  const fuel = state.fuel - moveFuelCost;
  let message =
    oreGainValue > 0
      ? `+${oreGainValue} $ ładunku (${state.cargoWeight}/${state.cargoMax})`
      : state.message;

  const onSurface = target.y < SURFACE_ROWS;
  if (onSurface) {
    message =
      state.cargoValue > 0
        ? 'Powierzchnia — sprzedaj ładunek w sklepie'
        : 'Powierzchnia — sklep: tankuj / ulepszaj';
  }

  if (fuel <= 0 && target.y >= SURFACE_ROWS) {
    return {
      ...state,
      tiles,
      player: target,
      fuel: 0,
      depth: Math.max(state.depth, target.y),
      status: 'over',
      message: 'Skończyło się paliwo pod ziemią!',
      moveCooldown: 0,
    };
  }

  return {
    ...state,
    tiles,
    player: target,
    fuel,
    depth: Math.max(state.depth, target.y),
    message,
    status: 'running',
    moveCooldown,
  };
}

function outOfFuel(state: DeepDrillV2State): DeepDrillV2State {
  return {
    ...state,
    fuel: 0,
    status: 'over',
    message: 'Brak paliwa — wróć wcześniej pustym szybem!',
    moveCooldown: 0,
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
