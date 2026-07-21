import { Injectable } from '@angular/core';
import { GAMES_CATALOG } from '../data/games.catalog';
import { GameDefinition } from '../models/game-definition.model';

@Injectable({ providedIn: 'root' })
export class GamesService {
  private readonly games: readonly GameDefinition[] = GAMES_CATALOG;

  getGames(): readonly GameDefinition[] {
    return this.games;
  }

  getAvailableGames(): readonly GameDefinition[] {
    return this.games.filter((game) => game.isAvailable);
  }

  getBySlug(slug: string): GameDefinition | undefined {
    return this.games.find((game) => game.slug === slug);
  }

  isPlayable(slug: string): boolean {
    const game = this.getBySlug(slug);
    return Boolean(game?.isAvailable);
  }
}
