import { createInitialSnakeState, queueSnakeDirection, restartSnake, startSnake, tickSnake } from './snake.engine';

describe('SnakeEngine', () => {
  it('creates initial snake in idle state', () => {
    const state = createInitialSnakeState(10);

    expect(state.status).toBe('idle');
    expect(state.snake.length).toBe(3);
    expect(state.score).toBe(0);
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
    let state = startSnake(createInitialSnakeState(6, 100));
    state = {
      ...state,
      snake: [{ x: 5, y: 2 }, { x: 4, y: 2 }],
      direction: 'right',
      queuedDirection: 'right',
    };

    const next = tickSnake(state);

    expect(next.status).toBe('over');
  });

  it('increases score when food is eaten', () => {
    let state = startSnake(createInitialSnakeState(8, 100));
    const head = state.snake[0];
    state = {
      ...state,
      food: { x: head.x + 1, y: head.y },
      direction: 'right',
      queuedDirection: 'right',
    };

    const next = tickSnake(state);

    expect(next.score).toBe(1);
    expect(next.snake.length).toBe(state.snake.length + 1);
  });

  it('resets state on restart', () => {
    let state = startSnake(createInitialSnakeState(12, 120));
    state = { ...state, score: 7, status: 'over' };

    const reset = restartSnake(state);

    expect(reset.status).toBe('idle');
    expect(reset.score).toBe(0);
    expect(reset.snake.length).toBe(3);
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
