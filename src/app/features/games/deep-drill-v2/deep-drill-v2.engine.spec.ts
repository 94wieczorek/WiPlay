import {
  buyDrillUpgrade,
  buyFuelPack,
  buyFuelTankUpgrade,
  buyRepairPack,
  createInitialDeepDrillV2State,
  queueDeepDrillV2Move,
  sellCargo,
  startDeepDrillV2,
  tickDeepDrillV2,
} from './deep-drill-v2.engine';
import {
  DRILL_UPGRADE_COSTS,
  FUEL_PACK_AMOUNT,
  FUEL_PACK_COST,
  FUEL_TANK_CAPACITY,
  FUEL_TANK_UPGRADE_COSTS,
  REPAIR_PACK_AMOUNT,
  REPAIR_PACK_COST,
  ROCK_HP_DAMAGE,
  STARTING_MONEY,
  TILE_VALUES,
  TILE_WEIGHT,
  getHitsRequired,
  getTileHardness,
} from './deep-drill-v2.models';

describe('DeepDrillV2Engine', () => {
  it('starts with money, empty cargo, drill/tank level 1 and 100 HP', () => {
    const state = createInitialDeepDrillV2State(10, 16, 100, 100, 1);
    expect(state.hp).toBe(100);
    expect(state.maxHp).toBe(100);
    expect(state.money).toBe(STARTING_MONEY);
    expect(state.cargoValue).toBe(0);
    expect(state.cargoWeight).toBe(0);
    expect(state.drillLevel).toBe(1);
    expect(state.fuelTankLevel).toBe(1);
    expect(state.maxFuel).toBe(FUEL_TANK_CAPACITY[1]);
  });

  it('blocks digging upward through solid tiles', () => {
    let state = startDeepDrillV2(createInitialDeepDrillV2State(8, 12, 100, 100, 2));
    state = {
      ...state,
      player: { x: 3, y: 4 },
      tiles: state.tiles.map((tile, index) => {
        const y = Math.floor(index / 8);
        const x = index % 8;
        if (x === 3 && y === 3) {
          return 'dirt';
        }
        return tile;
      }),
    };

    state = queueDeepDrillV2Move(state, 'up');
    state = { ...state, moveCooldown: 0 };
    const next = tickDeepDrillV2(state);

    expect(next.player.y).toBe(4);
    expect(next.message.toLowerCase()).toContain('gór');
  });

  it('allows climbing up through empty shaft', () => {
    let state = startDeepDrillV2(createInitialDeepDrillV2State(8, 12, 100, 100, 3));
    state = {
      ...state,
      player: { x: 3, y: 4 },
      tiles: state.tiles.map((tile, index) => {
        const y = Math.floor(index / 8);
        const x = index % 8;
        if (x === 3 && y === 3) {
          return 'empty';
        }
        return tile;
      }),
    };

    state = queueDeepDrillV2Move(state, 'up');
    state = { ...state, moveCooldown: 0 };
    const next = tickDeepDrillV2(state);

    expect(next.player).toEqual({ x: 3, y: 3 });
  });

  it('damages HP when digging rock', () => {
    let state = startDeepDrillV2(createInitialDeepDrillV2State(8, 12, 100, 100, 4));
    state = {
      ...state,
      player: { x: 2, y: 3 },
      tiles: state.tiles.map((tile, index) => {
        const y = Math.floor(index / 8);
        const x = index % 8;
        if (x === 2 && y === 4) {
          return 'rock';
        }
        return tile;
      }),
      tileHits: {},
    };

    state = queueDeepDrillV2Move(state, 'down');
    state = { ...state, moveCooldown: 0 };
    const next = tickDeepDrillV2(state);

    expect(next.hp).toBe(100 - ROCK_HP_DAMAGE);
    expect(next.player.y).toBe(3);
  });

  it('ends game when rock destroys drill HP', () => {
    let state = startDeepDrillV2(createInitialDeepDrillV2State(8, 12, 100, 100, 5));
    state = {
      ...state,
      hp: ROCK_HP_DAMAGE,
      player: { x: 2, y: 3 },
      tiles: state.tiles.map((tile, index) => {
        const y = Math.floor(index / 8);
        const x = index % 8;
        if (x === 2 && y === 4) {
          return 'rock';
        }
        return tile;
      }),
    };

    state = queueDeepDrillV2Move(state, 'down');
    state = { ...state, moveCooldown: 0 };
    const next = tickDeepDrillV2(state);

    expect(next.status).toBe('over');
    expect(next.hp).toBe(0);
  });

  it('adds ore to cargo and blocks dig when cargo is full', () => {
    let state = startDeepDrillV2(createInitialDeepDrillV2State(8, 12, 100, 100, 6));
    state = {
      ...state,
      player: { x: 2, y: 3 },
      cargoMax: TILE_WEIGHT.copper,
      cargoWeight: 0,
      cargoValue: 0,
      tiles: state.tiles.map((tile, index) => {
        const y = Math.floor(index / 8);
        const x = index % 8;
        if (x === 2 && y === 4) {
          return 'copper';
        }
        return tile;
      }),
    };

    state = queueDeepDrillV2Move(state, 'down');
    state = { ...state, moveCooldown: 0 };
    const afterDig = tickDeepDrillV2(state);

    expect(afterDig.cargoWeight).toBe(TILE_WEIGHT.copper);
    expect(afterDig.cargoValue).toBe(TILE_VALUES.copper);
    expect(afterDig.player.y).toBe(4);

    let blocked = {
      ...afterDig,
      tiles: afterDig.tiles.map((tile, index) => {
        const y = Math.floor(index / 8);
        const x = index % 8;
        if (x === 2 && y === 5) {
          return 'copper';
        }
        return tile;
      }),
    };
    blocked = queueDeepDrillV2Move(blocked, 'down');
    blocked = { ...blocked, moveCooldown: 0 };
    const next = tickDeepDrillV2(blocked);

    expect(next.player.y).toBe(4);
    expect(next.message.toLowerCase()).toContain('ładunek');
  });

  it('sells cargo and buys fuel/repair only on surface', () => {
    let state = startDeepDrillV2(createInitialDeepDrillV2State(8, 12, 100, 100, 7));
    state = {
      ...state,
      player: { x: 2, y: 4 },
      cargoValue: 50,
      cargoWeight: 10,
      money: STARTING_MONEY,
      fuel: 10,
      hp: 40,
    };

    const undergroundSell = sellCargo(state);
    expect(undergroundSell.money).toBe(STARTING_MONEY);
    expect(undergroundSell.cargoValue).toBe(50);

    state = { ...state, player: { x: 2, y: 1 } };
    const sold = sellCargo(state);
    expect(sold.money).toBe(STARTING_MONEY + 50);
    expect(sold.score).toBe(state.score + 50);
    expect(sold.cargoValue).toBe(0);
    expect(sold.cargoWeight).toBe(0);

    const fueled = buyFuelPack({ ...sold, fuel: 10 });
    expect(fueled.money).toBe(sold.money - FUEL_PACK_COST);
    expect(fueled.fuel).toBe(10 + FUEL_PACK_AMOUNT);

    const repaired = buyRepairPack({ ...fueled, hp: 40 });
    expect(repaired.money).toBe(fueled.money - REPAIR_PACK_COST);
    expect(repaired.hp).toBe(40 + REPAIR_PACK_AMOUNT);
  });

  it('requires more hits on deeper ground with default drill', () => {
    const hardness = getTileHardness('dirt', 40);
    expect(hardness).toBe(2);
    expect(getHitsRequired(hardness, 1)).toBe(2);

    let state = startDeepDrillV2(createInitialDeepDrillV2State(8, 50, 100, 100, 8));
    state = {
      ...state,
      drillLevel: 1,
      player: { x: 2, y: 39 },
      tiles: state.tiles.map((tile, index) => {
        const y = Math.floor(index / 8);
        const x = index % 8;
        if (x === 2 && y === 40) {
          return 'dirt';
        }
        return tile;
      }),
      tileHits: {},
    };

    state = queueDeepDrillV2Move(state, 'down');
    state = { ...state, moveCooldown: 0 };
    const first = tickDeepDrillV2(state);

    expect(first.player.y).toBe(39);
    expect(first.tileHits['2,40']).toBe(1);

    let second = queueDeepDrillV2Move(first, 'down');
    second = { ...second, moveCooldown: 0 };
    const broken = tickDeepDrillV2(second);

    expect(broken.player.y).toBe(40);
    expect(broken.tileHits['2,40']).toBeUndefined();
  });

  it('breaks deep ground in one hit with stronger drill', () => {
    let state = startDeepDrillV2(createInitialDeepDrillV2State(8, 50, 100, 100, 9));
    state = {
      ...state,
      drillLevel: 2,
      player: { x: 2, y: 39 },
      tiles: state.tiles.map((tile, index) => {
        const y = Math.floor(index / 8);
        const x = index % 8;
        if (x === 2 && y === 40) {
          return 'dirt';
        }
        return tile;
      }),
      tileHits: {},
    };

    state = queueDeepDrillV2Move(state, 'down');
    state = { ...state, moveCooldown: 0 };
    const next = tickDeepDrillV2(state);

    expect(next.player.y).toBe(40);
  });

  it('upgrades drill and fuel tank on surface', () => {
    let state = startDeepDrillV2(createInitialDeepDrillV2State(8, 12, 100, 100, 10));
    state = {
      ...state,
      player: { x: 2, y: 1 },
      money: 500,
    };

    const drilled = buyDrillUpgrade(state);
    expect(drilled.drillLevel).toBe(2);
    expect(drilled.money).toBe(500 - DRILL_UPGRADE_COSTS[0]);

    const tanked = buyFuelTankUpgrade(drilled);
    expect(tanked.fuelTankLevel).toBe(2);
    expect(tanked.maxFuel).toBe(FUEL_TANK_CAPACITY[2]);
    expect(tanked.money).toBe(drilled.money - FUEL_TANK_UPGRADE_COSTS[0]);
  });
});
