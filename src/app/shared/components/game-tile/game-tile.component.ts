import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { GameDefinition } from '../../../core/models/game-definition.model';

@Component({
  selector: 'app-game-tile',
  imports: [RouterLink],
  templateUrl: './game-tile.component.html',
  styleUrl: './game-tile.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GameTileComponent {
  readonly game = input.required<GameDefinition>();

  readonly initials = () => {
    const title = this.game().title.trim();
    return title ? title.charAt(0).toUpperCase() : '?';
  };
}
