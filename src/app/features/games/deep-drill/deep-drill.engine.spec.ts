import {
  createInitialDeepDrillState,
  pauseDeepDrill,
  queueDeepDrillMove,
  restartDeepDrill,
  resumeDeepDrill,
  startDeepDrill,
  tickDeepDrill,
} from './deep-drill.engine';

describe('DeepDrillEngine', () => {
  it('creates idle world with player on surface', () => {
    const state = createInitialDeepDrillState(12, 20, 100, 42);

    expect(state.status).toBe('idle');
    expect(state.player.y).toBe(1);
    expect(state.fuel).toBe(100);
    expect(state.tiles.length).toBe(12 * 20);
  });

  it('starts, pauses and resumes', () => {
    const started = startDeepDrill(createInitialDeepDrillState(10, 16, 80, 7));
    expect(started.status).toBe('running');

    const paused = pauseDeepDrill(started);
    expect(paused.status).toBe('paused');

    const resumed = resumeDeepDrill(paused);
    expect(resumed.status).toBe('running');
  });

  it('queues move only while running', () => {
    const idle = createInitialDeepDrillState(10, 16, 80, 3);
    expect(queueDeepDrillMove(idle, 'down').queuedDirection).toBeNull();

    const running = startDeepDrill(idle);
    expect(queueDeepDrillMove(running, 'down').queuedDirection).toBe('down');
  });

  it('digs downward into dirt and spends fuel', () => {
    let state = startDeepDrill(createInitialDeepDrillState(10, 20, 100, 99));
    state = {
      ...state,
      player: { x: 5, y: 1 },
      tiles: state.tiles.map((tile, index) => {
        const y = Math.floor(index / 10);
        const x = index % 10;
        if (x === 5 && y === 2) {
          return 'dirt';
        }
        return tile;
      }),
    };

    state = queueDeepDrillMove(state, 'down');
    state = { ...state, moveCooldown: 0 };
    const next = tickDeepDrill(state);

    expect(next.player).toEqual({ x: 5, y: 2 });
    expect(next.fuel).toBeLessThan(100);
  });

  it('sells cargo on surface and increases score', () => {
    let state = startDeepDrill(createInitialDeepDrillState(8, 12, 100, 11));
    state = {
      ...state,
      player: { x: 4, y: 2 },
      cargo: 40,
      fuel: 50,
      tiles: state.tiles.map((tile, index) => {
        const y = Math.floor(index / 8);
        const x = index % 8;
        if (x === 4 && y === 1) {
          return 'surface';
        }
        return tile;
      }),
    };

    state = queueDeepDrillMove(state, 'up');
    state = { ...state, moveCooldown: 0 };
    const next = tickDeepDrill(state);

    expect(next.player.y).toBe(1);
    expect(next.cargo).toBe(0);
    expect(next.score).toBe(40);
    expect(next.fuel).toBeGreaterThan(50);
  });

  it('ends game on lava', () => {
    let state = startDeepDrill(createInitialDeepDrillState(8, 12, 100, 5));
    state = {
      ...state,
      player: { x: 3, y: 3 },
      tiles: state.tiles.map((tile, index) => {
        const y = Math.floor(index / 8);
        const x = index % 8;
        if (x === 3 && y === 4) {
          return 'lava';
        }
        return tile;
      }),
    };

    state = queueDeepDrillMove(state, 'down');
    state = { ...state, moveCooldown: 0 };
    const next = tickDeepDrill(state);

    expect(next.status).toBe('over');
    expect(next.message.toLowerCase()).toContain('law');
  });

  it('requires two hits to break rock', () => {
    let state = startDeepDrill(createInitialDeepDrillState(8, 12, 100, 8));
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
      rockHits: {},
    };

    state = queueDeepDrillMove(state, 'down');
    state = { ...state, moveCooldown: 0 };
    const first = tickDeepDrill(state);
    expect(first.player.y).toBe(3);
    expect(first.rockHits['2,4']).toBe(1);

    let second = queueDeepDrillMove(first, 'down');
    second = { ...second, moveCooldown: 0 };
    second = tickDeepDrill(second);
    expect(second.player.y).toBe(4);
  });

  it('resets world on restart', () => {
    let state = startDeepDrill(createInitialDeepDrillState(10, 16, 90, 1));
    state = { ...state, score: 120, cargo: 30, status: 'over' };
    const reset = restartDeepDrill(state, 2);

    expect(reset.status).toBe('idle');
    expect(reset.score).toBe(0);
    expect(reset.cargo).toBe(0);
  });
});
