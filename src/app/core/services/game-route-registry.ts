import { Type } from '@angular/core';
import { GameController } from '../models/game-controller.model';

export type GameComponentLoader = () => Promise<Type<GameController>>;

export const GAME_ROUTE_LOADERS: Readonly<Record<string, GameComponentLoader>> = {
  snake: () =>
    import('../../features/games/snake/snake.component').then(
      (module) => module.SnakeComponent,
    ),
  'deep-drill': () =>
    import('../../features/games/deep-drill/deep-drill.component').then(
      (module) => module.DeepDrillComponent,
    ),
  'deep-drill-v2': () =>
    import('../../features/games/deep-drill-v2/deep-drill-v2.component').then(
      (module) => module.DeepDrillV2Component,
    ),
};

export function hasGameLoader(slug: string): boolean {
  return slug in GAME_ROUTE_LOADERS;
}

export function loadGameComponent(slug: string): Promise<Type<GameController>> | null {
  const loader = GAME_ROUTE_LOADERS[slug];
  return loader ? loader() : null;
}
