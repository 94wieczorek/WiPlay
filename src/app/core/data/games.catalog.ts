import { GameDefinition } from '../models/game-definition.model';

export const GAMES_CATALOG: readonly GameDefinition[] = [
  {
    id: 'snake',
    slug: 'snake',
    title: 'Snake',
    description: 'Klasyczny wąż — zbieraj jedzenie, unikaj ścian i własnego ogona.',
    category: 'Arcade',
    controls: [
      'Strzałki lub WASD — ruch',
      'Spacja — pauza',
      'R — restart po zakończeniu gry',
    ],
    isAvailable: true,
  },
  {
    id: 'memory',
    slug: 'memory',
    title: 'Memory',
    description: 'Dopasowuj pary kart. Wkrótce dostępne.',
    category: 'Logiczne',
    controls: ['Klik — odkryj kartę'],
    isAvailable: false,
  },
  {
    id: 'dodge',
    slug: 'dodge',
    title: 'Dodge Run',
    description: 'Unikaj przeszkód i utrzymaj się jak najdłużej. Wkrótce.',
    category: 'Arcade',
    controls: ['Strzałki — ruch w lewo/prawo'],
    isAvailable: false,
  },
];
