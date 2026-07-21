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
  {
    id: 'deep-drill-v2',
    slug: 'deep-drill-v2',
    title: 'Deep Drill',
    description:
      'Kop w głąb ziemi w stylu Motherload: zarządzaj paliwem, HP i ładunkiem, sprzedawaj minerały w sklepie na powierzchni.',
    thumbnailUrl: '/images/deep-drill-thumbnail.png',
    category: 'Adventure',
    controls: [
      'Strzałki / WASD — ruch; w górę tylko pustym szybem (bez kopania w górę)',
      'Start: 100 HP, gotówka i limit ładunku — kopanie kamienia zabiera HP',
      'Strefy: 0–15 miedź; 15–25 bufor srebra; od 25 srebro; 35–50 bufor złota; od 50 złoto; od 75 platyna; kamienie od 100',
      'Sklep: sprzedaż, paliwo, naprawa, ulepszenia wiertła i baku',
      'Im głębiej, tym twardsze podłoże — lepsze wiertło kopie szybciej',
      'Lawa, 0 HP lub brak paliwa = koniec gry',
      'Spacja — pauza, R — restart',
    ],
    isAvailable: true,
  },
];
