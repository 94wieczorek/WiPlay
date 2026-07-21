import {
  createInitialSnakeState,
  queueSnakeDirection,
  restartSnake,
  startSnake,
  tickSnake,
} from './snake.engine';
import {
  getSnakeLevelConfig,
  getSnakePointsPerFood,
  getSnakeTickMs,
  parseSnakeLevel,
} from './snake.models';

describe('SnakeEngine', () => {
  it('creates initial snake in idle state with default level', () => {
    const state = createInitialSnakeState(10);

    expect(state.status).toBe('idle');
    expect(state.snake.length).toBe(3);
    expect(state.score).toBe(0);
    expect(state.level).toBe(5);
    expect(state.pointsPerFood).toBe(5);
    expect(state.tickMs).toBe(getSnakeTickMs(5));
  });

  it('applies level 1 config (slowest, lowest points)', () => {
    const state = createInitialSnakeState(10, 1);

    expect(state.level).toBe(1);
    expect(state.tickMs).toBe(200);
    expect(state.pointsPerFood).toBe(1);
  });

  it('applies level 10 config (fastest, highest points)', () => {
    const state = createInitialSnakeState(10, 10);

    expect(state.level).toBe(10);
    expect(state.tickMs).toBe(60);
    expect(state.pointsPerFood).toBe(10);
  });

  it('scales tickMs linearly between level 1 and 10', () => {
    expect(getSnakeTickMs(1)).toBe(200);
    expect(getSnakeTickMs(10)).toBe(60);
    expect(getSnakeTickMs(5)).toBe(138);
  });

  it('sets pointsPerFood equal to level', () => {
    expect(getSnakePointsPerFood(3)).toBe(3);
    expect(getSnakePointsPerFood(7)).toBe(7);
    expect(getSnakeLevelConfig(8).pointsPerFood).toBe(8);
  });

  it('clamps invalid levels when parsing', () => {
    expect(parseSnakeLevel(0)).toBe(1);
    expect(parseSnakeLevel(99)).toBe(10);
    expect(parseSnakeLevel('4')).toBe(4);
  });

  it('moves snake forward on tick', () => {
    const initial = startSnake(createInitialSnakeState(10));
    const headBefore = initial.snake[0];

    const next = tickSnake(initial);

    expect(next.snake[0]).toEqual({ x: headBefore.x + 1, y: headBefore.y });
  });

  it('prevents reversing direction instantly', () => {
    const running = startSnake(createInitialSnakeState(10));
    const queued = queueSnakeDirection(running, 'left');

    expect(queued.queuedDirection).toBe('right');
  });

  it('ends game when snake hits wall', () => {
    let state = startSnake(createInitialSnakeState(6, 10));
    state = {
      ...state,
      snake: [{ x: 5, y: 2 }, { x: 4, y: 2 }],
      direction: 'right',
      queuedDirection: 'right',
    };

    const next = tickSnake(state);

    expect(next.status).toBe('over');
  });

  it('increases score by level points when food is eaten on level 1', () => {
    let state = startSnake(createInitialSnakeState(8, 1));
    const head = state.snake[0];
    state = {
      ...state,
      food: { x: head.x + 1, y: head.y },
      direction: 'right',
      queuedDirection: 'right',
    };

    const next = tickSnake(state);

    expect(next.score).toBe(1);
  });

  it('increases score by level points when food is eaten on level 5', () => {
    let state = startSnake(createInitialSnakeState(8, 5));
    const head = state.snake[0];
    state = {
      ...state,
      food: { x: head.x + 1, y: head.y },
      direction: 'right',
      queuedDirection: 'right',
    };

    const next = tickSnake(state);

    expect(next.score).toBe(5);
  });

  it('increases score by level points when food is eaten on level 10', () => {
    let state = startSnake(createInitialSnakeState(8, 10));
    const head = state.snake[0];
    state = {
      ...state,
      food: { x: head.x + 1, y: head.y },
      direction: 'right',
      queuedDirection: 'right',
    };

    const next = tickSnake(state);

    expect(next.score).toBe(10);
  });

  it('resets state on restart while keeping level', () => {
    let state = startSnake(createInitialSnakeState(12, 8));
    state = { ...state, score: 24, status: 'over' };

    const reset = restartSnake(state);

    expect(reset.status).toBe('idle');
    expect(reset.score).toBe(0);
    expect(reset.level).toBe(8);
    expect(reset.tickMs).toBe(getSnakeTickMs(8));
    expect(reset.pointsPerFood).toBe(8);
  });

  it('queues valid direction changes', () => {
    const running = startSnake(createInitialSnakeState(10));
    const queued = queueSnakeDirection(running, 'up');

    expect(queued.queuedDirection).toBe('up');
  });

  it('does not queue direction when game is not running', () => {
    const idle = createInitialSnakeState(10);
    const queued = queueSnakeDirection(idle, 'up');

    expect(queued.queuedDirection).toBe('right');
    expect(queued).toBe(idle);
  });
});
