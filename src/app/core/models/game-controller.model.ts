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

export interface LevelAwareGameController extends GameController {
  readonly level: Signal<number>;
  readonly canChangeLevel: Signal<boolean>;
  readonly levelMeta: Signal<string>;
  readonly levels: readonly number[];
  readonly minLevel: number;
  readonly maxLevel: number;
  setLevel(level: number): void;
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

export function isLevelAwareGameController(
  value: GameController | null,
): value is LevelAwareGameController {
  if (!value) {
    return false;
  }

  const candidate = value as LevelAwareGameController;
  return (
    typeof candidate.setLevel === 'function' &&
    typeof candidate.level === 'function' &&
    typeof candidate.canChangeLevel === 'function' &&
    typeof candidate.levelMeta === 'function'
  );
}
