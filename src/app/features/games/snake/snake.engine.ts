import { GameStatus } from '../../../core/models/game-controller.model';
import { Direction, Point, SnakeState } from './snake.models';

const OPPOSITE_DIRECTION: Record<Direction, Direction> = {
  up: 'down',
  down: 'up',
  left: 'right',
  right: 'left',
};

export function createInitialSnakeState(gridSize = 20, tickMs = 140): SnakeState {
  const center = Math.floor(gridSize / 2);
  const snake: Point[] = [
    { x: center, y: center },
    { x: center - 1, y: center },
    { x: center - 2, y: center },
  ];

  return {
    gridSize,
    snake,
    direction: 'right',
    queuedDirection: 'right',
    food: spawnFood(gridSize, snake),
    score: 0,
    status: 'idle',
    tickMs,
  };
}

export function queueSnakeDirection(state: SnakeState, direction: Direction): SnakeState {
  if (state.status !== 'running') {
    return state;
  }

  if (OPPOSITE_DIRECTION[direction] === state.direction) {
    return state;
  }

  return {
    ...state,
    queuedDirection: direction,
  };
}

export function startSnake(state: SnakeState): SnakeState {
  if (state.status === 'running') {
    return state;
  }

  return {
    ...state,
    status: 'running',
  };
}

export function pauseSnake(state: SnakeState): SnakeState {
  if (state.status !== 'running') {
    return state;
  }

  return {
    ...state,
    status: 'paused',
  };
}

export function resumeSnake(state: SnakeState): SnakeState {
  if (state.status !== 'paused') {
    return state;
  }

  return {
    ...state,
    status: 'running',
  };
}

export function restartSnake(state: SnakeState): SnakeState {
  return createInitialSnakeState(state.gridSize, state.tickMs);
}

export function tickSnake(state: SnakeState): SnakeState {
  if (state.status !== 'running') {
    return state;
  }

  const direction = state.queuedDirection;
  const head = state.snake[0];
  const nextHead = movePoint(head, direction);

  if (isOutOfBounds(nextHead, state.gridSize) || hitsSnakeBody(nextHead, state.snake)) {
    return {
      ...state,
      direction,
      status: 'over',
    };
  }

  const ateFood = nextHead.x === state.food.x && nextHead.y === state.food.y;
  const snake = ateFood
    ? [nextHead, ...state.snake]
    : [nextHead, ...state.snake.slice(0, -1)];

  return {
    ...state,
    direction,
    snake,
    food: ateFood ? spawnFood(state.gridSize, snake) : state.food,
    score: ateFood ? state.score + 1 : state.score,
    status: 'running' as GameStatus,
  };
}

function movePoint(point: Point, direction: Direction): Point {
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

function isOutOfBounds(point: Point, gridSize: number): boolean {
  return point.x < 0 || point.y < 0 || point.x >= gridSize || point.y >= gridSize;
}

function hitsSnakeBody(point: Point, snake: Point[]): boolean {
  return snake.some((segment) => segment.x === point.x && segment.y === point.y);
}

function spawnFood(gridSize: number, snake: Point[]): Point {
  const occupied = new Set(snake.map((segment) => `${segment.x},${segment.y}`));
  const freeCells: Point[] = [];

  for (let y = 0; y < gridSize; y += 1) {
    for (let x = 0; x < gridSize; x += 1) {
      const key = `${x},${y}`;
      if (!occupied.has(key)) {
        freeCells.push({ x, y });
      }
    }
  }

  if (freeCells.length === 0) {
    return { x: 0, y: 0 };
  }

  const index = Math.floor(Math.random() * freeCells.length);
  return freeCells[index];
}
