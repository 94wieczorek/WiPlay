import { GameDefinition } from '../models/game-definition.model';

export const GAMES_CATALOG: readonly GameDefinition[] = [
  {
    id: 'snake',
    slug: 'snake',
    title: 'Snake',
    description: 'Klasyczny wąż — zbieraj jedzenie, unikaj ścian i własnego ogona.',
    thumbnailUrl: '/images/snake-thumbnail.png',
    category: 'Arcade',
    controls: [
      'Pasek nad grą — poziom 1–10 (wyższy = szybciej i więcej punktów)',
      'Strzałki lub WASD — ruch',
      'Spacja — pauza',
      'R — restart po zakończeniu gry',
      'Powiększ — suwak skali 1.0×–2.0×',
    ],
    isAvailable: true,
  },
  {
    id: 'deep-drill',
    slug: 'deep-drill',
    title: 'Deep Drill v1',
    description: 'Starsza wersja Deep Drill (ukryta — rozwój idzie na v2).',
    thumbnailUrl: '/images/deep-drill-thumbnail.png',
    category: 'Adventure',
    controls: [
      'Strzałki lub WASD — ruch / kopanie',
      'Wróć na powierzchnię — sprzedaż ładunku + doładowanie paliwa',
    ],
    isAvailable: false,
  },
];
