import { Signal } from '@angular/core';

export type GameStatus = 'idle' | 'running' | 'paused' | 'over';

export interface GameController {
  readonly status: Signal<GameStatus>;
  readonly score: Signal<number>;
  readonly bestScore: Signal<number>;
  start(): void;
  pause(): void;
  resume(): void;
  restart(): void;
}

export function isGameController(value: unknown): value is GameController {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as GameController;
  return (
    typeof candidate.start === 'function' &&
    typeof candidate.pause === 'function' &&
    typeof candidate.resume === 'function' &&
    typeof candidate.restart === 'function' &&
    typeof candidate.status === 'function' &&
    typeof candidate.score === 'function' &&
    typeof candidate.bestScore === 'function'
  );
}
