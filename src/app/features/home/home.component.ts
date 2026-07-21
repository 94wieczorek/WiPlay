import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { GamesService } from '../../core/services/games.service';
import { GameTileComponent } from '../../shared/components/game-tile/game-tile.component';

@Component({
  selector: 'app-home',
  imports: [GameTileComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent {
  private readonly gamesService = inject(GamesService);

  readonly games = this.gamesService.getAvailableGames();
}
