# Wiplay — plan projektu MVP

> Portal przeglądarkowych gier. Angular, TypeScript, standalone components, bez backendu w pierwszej wersji.

**Status:** Etapy 1–8 ukończone (MVP gotowe). Kolejny krok: kolejne gry / backend / konta.

---

## 1. Założenia projektu

### Cel

Użytkownik otwiera stronę Wiplay, wybiera grę z kafelków, gra w przeglądarce, wraca do listy.

### Przepływ MVP

1. Użytkownik otwiera stronę.
2. Na stronie głównej widzi kafelki z grami.
3. Każdy kafelek: nazwa, krótki opis, grafika/placeholder, przycisk „Zagraj”.
4. Klik → strona gry `/play/:slug`.
5. Gra uruchamia się w przeglądarce.
6. Użytkownik może wrócić do listy.

**Kluczowy cel:** strona się otwiera → widać gry → wybór → gra działa.

### Stack

- Angular 19 (standalone components)
- TypeScript (strict mode)
- Angular Router (lazy loading)
- SCSS + CSS variables
- HTML Canvas (gry)
- Angular signals (stan UI)
- Angular CLI

### Poza zakresem MVP

- Logowanie / rejestracja / konta
- Rankingi online
- Backend / baza danych
- Płatności, czat, panel admina
- NgRx, ciężkie biblioteki UI

### Przygotowanie pod przyszłość

Architektura ma umożliwić dodanie kont, rankingów i backendu bez przebudowy — przez `GamesService`, `GameController` i osobne moduły gier.

---

## 2. Decyzje architektoniczne

| Decyzja | Wybór | Uzasadnienie |
|---------|-------|--------------|
| Katalog gier | Stała TypeScript + `GamesService` | Typowanie, brak async; później podmiana na HTTP |
| Shell ↔ Gra | Interfejs `GameController` + sygnały | Shell nie zna logiki gry |
| Lazy loading | Trasy + rejestr `GAME_ROUTES` | Kod gier nie ładuje się przy starcie |
| Stan aplikacji | Signals + małe serwisy | Prosto, bez NgRx |
| Logika gry | Czysta klasa (np. `SnakeEngine`) | Testowalna, oddzielona od Angulara |
| localStorage | Best score, wyciszenie | Nie zastępuje backendu |
| Thumbnails | Opcjonalne URL + fallback CSS | Brak blokady na grafikach |

### Kontrakt gry (`GameController`)

```typescript
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
```

Shell renderuje UI (start, pauza, restart, wynik) i woła metody kontrolera. Gra implementuje interfejs i trzyma logikę w sobie.

### Rejestr tras gier (osobno od katalogu danych)

```typescript
export const GAME_ROUTES: Record<string, () => Promise<Type<GameController>>> = {
  snake: () =>
    import('./features/games/snake/snake.component').then((m) => m.SnakeComponent),
};
```

Walidacja `/play/:slug`: slug w katalogu + `isAvailable: true` + wpis w `GAME_ROUTES`.

---

## 3. Mapa stron i routing

| Route | Komponent | Opis |
|-------|-----------|------|
| `/` | `HomeComponent` | Kafelki, nagłówek, footer |
| `/play/:slug` | `GameShellComponent` | Shell + dynamicznie ładowana gra |
| `/**` | `NotFoundComponent` | 404 + link do `/` |

---

## 4. Struktura katalogów

```text
src/app/
  core/
    models/
      game-definition.model.ts
      game-controller.model.ts
    services/
      games.service.ts
      game-route-registry.ts
      local-storage.service.ts
  shared/
    components/
      game-tile/
  layout/
    header/
    footer/
  features/
    home/
    game-shell/
    not-found/
    games/
      snake/
        snake.component.ts
        snake.component.html
        snake.component.scss
        snake.engine.ts
        snake.models.ts
        snake.engine.spec.ts
  app.component.*
  app.config.ts
  app.routes.ts
src/styles/
  _variables.scss
  _layout.scss
public/
  .htaccess          # fallback SPA (Apache)
  _redirects         # fallback SPA (Netlify)
```

---

## 5. Modele danych

```typescript
export interface GameDefinition {
  id: string;
  slug: string;
  title: string;
  description: string;
  thumbnailUrl?: string;
  category: string;
  controls: string[];
  isAvailable: boolean;
}

export type GameStatus = 'idle' | 'running' | 'paused' | 'over';

export interface Point {
  x: number;
  y: number;
}

export type Direction = 'up' | 'down' | 'left' | 'right';

export interface SnakeState {
  gridSize: number;
  snake: Point[];
  direction: Direction;
  food: Point;
  score: number;
  status: GameStatus;
}
```

---

## 6. Komponenty i odpowiedzialności

### `AppComponent`
- **Odpowiedzialność:** root, `<router-outlet>`
- **Serwisy:** brak

### `HeaderComponent`
- **Odpowiedzialność:** logo „Wiplay”, nawigacja do `/`

### `FooterComponent`
- **Odpowiedzialność:** prosta stopka

### `HomeComponent`
- **Odpowiedzialność:** siatka kafelków z katalogu
- **Serwisy:** `GamesService`

### `GameTileComponent`
- **Input:** `game: GameDefinition`
- **Output:** brak (link przez router)
- **Odpowiedzialność:** kafelek, placeholder grafiki, stan „Wkrótce” gdy `!isAvailable`

### `GameShellComponent`
- **Odpowiedzialność:** nagłówek gry, powrót, instrukcja, wynik, start/pauza/restart, `<ng-content>` dla canvas
- **Serwisy:** `GamesService`, `Title`

### `NotFoundComponent`
- **Odpowiedzialność:** komunikat 404, link do `/`

### `SnakeComponent`
- **Odpowiedzialność:** canvas, wejście, implementacja `GameController`
- **Serwisy:** `SnakeEngine`, `LocalStorageService`

---

## 7. System stylów

### Kolory (CSS variables)

```scss
--color-bg-primary: #070b1a;
--color-bg-surface: #111633;
--color-accent: #6d4aff;
--color-accent-light: #a855f7;
--color-text-primary: #f8fafc;
--color-text-muted: #94a3b8;
```

### Gradient tła

```scss
background: linear-gradient(135deg, #070b1a 0%, #111633 45%, #35145f 100%);
```

### Kafelki

- Tło: `#111633`
- Border-radius: ~12px
- Delikatny cień i obramowanie
- Hover: lekkie uniesienie, jaśniejszy border (bez ciężkich animacji)

### Responsywność (CSS Grid)

| Urządzenie | Kolumny |
|------------|---------|
| Desktop | 3–4 |
| Tablet | 2 |
| Telefon | 1 |

### Stany interakcji

- `:hover` — uniesienie kafelka
- `:focus-visible` — widoczny outline
- `.disabled` / „Wkrótce” — wyszarzone, brak linku „Zagraj”

---

## 8. Plan pierwszej gry — Snake

### Dlaczego Snake

- Używa **Canvas** (zgodnie ze stackiem)
- Ma pętlę gry, wynik, game over, restart
- Obsługuje klawiaturę i mobile (swipe / 4 przyciski)
- Najlepiej weryfikuje flow: kafelek → routing → gra → wynik → restart

### Zasady

- Wąż porusza się po siatce
- Jedzenie = +1 punkt, wąż rośnie
- Kolizja ze ścianą lub ciałem = koniec gry

### Architektura

- `SnakeEngine` — czysta klasa TS (bez Angulara)
- `tick(state, input): SnakeState` — deterministyczna logika
- `SnakeComponent` — canvas, pętla `requestAnimationFrame`, implementacja `GameController`

### Pętla gry

- `requestAnimationFrame` + akumulacja czasu
- Anulowanie w `ngOnDestroy` (brak wycieków)
- Pauza = zatrzymanie ticka
- Opcjonalnie: `NgZone.runOutsideAngular` dla pętli

### Sterowanie

- Desktop: strzałki / WASD
- Mobile: swipe lub 4 przyciski kierunku

### Wynik

- `score` — bieżąca gra
- `bestScore` — localStorage (`wiplay_snake_best`)

---

## 9. Etapy implementacji

### Etap 1 — Projekt + routing ✅ UKOŃCZONY

**Cel:** Szkielet aplikacji z trzema trasami.

**Pliki:** `app.routes.ts`, `features/home`, `features/game-shell`, `features/not-found`, `styles.scss`

**Kryteria akceptacji:**
- [x] `npm start` działa
- [x] `/` — strona główna
- [x] `/play/test` — placeholder gry
- [x] nieznana ścieżka — 404
- [x] lazy loading tras
- [x] build produkcyjny przechodzi

---

### Etap 2 — Layout + motyw ✅ UKOŃCZONY

**Cel:** Header, footer, pełny motyw Wiplay.

**Pliki:** `layout/header`, `layout/footer`, `styles/_variables.scss`, `styles/_layout.scss`

**Kryteria akceptacji:**
- [x] Spójny nagłówek ze logo na wszystkich stronach
- [x] Footer na dole
- [x] Gradient i kolory zgodne z planem

---

### Etap 3 — Katalog gier ✅ UKOŃCZONY

**Cel:** Centralna lista gier + serwis + rejestr tras.

**Pliki:** `core/models/game-definition.model.ts`, `core/services/games.service.ts`, `core/services/game-route-registry.ts`

**Kryteria akceptacji:**
- [x] `GamesService.getGames()` zwraca listę
- [x] `GamesService.getBySlug(slug)` działa
- [x] Rejestr `GAME_ROUTES` mapuje slug → komponent

---

### Etap 4 — Kafelki na stronie głównej ✅ UKOŃCZONY

**Cel:** Dynamiczna siatka kafelków z katalogu.

**Pliki:** `shared/components/game-tile`, aktualizacja `home`

**Kryteria akceptacji:**
- [x] Kafelki generowane z katalogu (nie hardcoded HTML)
- [x] `isAvailable: false` → kafelek „Wkrótce”
- [x] Responsywna siatka 1/2/3–4 kolumny

---

### Etap 5 — Game Shell (pełny) ✅ UKOŃCZONY

**Cel:** Wspólny UI strony gry z kontraktem `GameController`.

**Pliki:** rozbudowa `game-shell`, `core/models/game-controller.model.ts`

**Kryteria akceptacji:**
- [x] Przyciski start / pauza / restart
- [x] Wyświetlanie wyniku i best score
- [x] Instrukcja sterowania z katalogu
- [x] Powrót do `/`
- [x] Dynamiczne ładowanie gry po slug

---

### Etap 6 — Snake: logika ✅ UKOŃCZONY

**Cel:** Czysta logika gry + testy jednostkowe.

**Pliki:** `snake.engine.ts`, `snake.models.ts`, `snake.engine.spec.ts`

**Kryteria akceptacji:**
- [x] Ruch węża, jedzenie, kolizje
- [x] Game over
- [x] Testy logiki przechodzą

---

### Etap 7 — Snake: UI + integracja ✅ UKOŃCZONY

**Cel:** Działająca gra end-to-end.

**Pliki:** `snake.component.*`

**Kryteria akceptacji:**
- [x] Gra startuje z Shell
- [x] Wynik i restart działają
- [x] Klawiatura + mobile
- [x] Best score w localStorage

---

### Etap 8 — Polish + responsywność ✅ UKOŃCZONY

**Cel:** Dopracowanie UX i mobile.

**Kryteria akceptacji:**
- [x] Focus na obszarze gry po wejściu (tabindex na hoście gry)
- [x] `Title` service — tytuł zakładki per gra
- [x] 404 gdy slug nie istnieje w katalogu
- [x] Build produkcyjny bez błędów

---

## 10. Komendy

```bash
# Instalacja (po sklonowaniu)
npm install

# Dev
npm start

# Build produkcyjny (do wrzucenia na hosting)
npm run build

# Testy
npm test

# Generowanie komponentów (kolejne etapy)
ng generate component layout/header --standalone --change-detection=OnPush
ng generate component layout/footer --standalone --change-detection=OnPush
ng generate component shared/game-tile --standalone --change-detection=OnPush
ng generate service core/services/games
ng generate component features/games/snake --standalone --change-detection=OnPush
```

---

## 11. Kryteria ukończenia MVP (checklist)

- [x] `/` pokazuje kafelki z katalogu
- [x] Klik „Zagraj” → `/play/snake`
- [x] Snake: start, gra, wynik, game over, restart
- [x] Powrót do listy gier
- [x] Nieznany slug → 404
- [x] `isAvailable: false` → kafelek „Wkrótce”
- [x] Responsywność (desktop / tablet / mobile)
- [x] Best score w localStorage
- [x] Brak backendu, brak logowania
- [x] Build produkcyjny przechodzi

---

## 12. Dalszy rozwój (poza MVP)

- Kolejne gry (clicker, memory, unikanie przeszkód)
- Gry typu Motherload (patrz sekcja poniżej)
- Profile użytkowników + logowanie
- Rankingi online + backend (API: `saveProgress`, `submitScore`)
- Osiągnięcia, zapisy postępu w chmurze
- Panel zarządzania grami
- PWA (offline, instalacja)
- Multiplayer

---

## Motherload — czy da się zrobić na Wiplay?

**Tak, technicznie da się** — jako osobna gra w `features/games/motherload/` z Canvas/WebGL, tak jak Snake.

**Ale to zupełnie inna skala niż MVP:**

| Aspekt | Snake (MVP) | Motherload |
|--------|-------------|------------|
| Czas dev (1 osoba) | 2–5 dni | 1–3 miesiące+ |
| Mapa / świat | Siatka 20×20 | Proceduralna mapa w głąb, tysiące kafelków |
| Mechaniki | Ruch, jedzenie, kolizja | Kopanie, grawitacja, lawa, paliwo, sklep, ulepszenia |
| Ekonomia | Punkty | Minerały, sprzedaż, upgrade'y |
| Grafika | Proste kwadraty | Sprite'y, animacje, tileset |
| Zapis | localStorage (best score) | Pełny save gry (pozycja, ekwipunek, ulepszenia) |
| Dźwięk | Opcjonalny | Muzyka + efekty |

**Oryginalny Motherload** był grą Flash — nie osadzisz go 1:1. Trzeba **przepisać od zera** w HTML5.

**Rekomendacja:** najpierw dokończ MVP (Snake + architektura), potem dodawaj coraz większe gry. Motherload to projekt na osobny etap, nie na start.

---

## Wdrożenie na hosting

### Build

```bash
npm run build
```

Wynik: folder `dist/wiplay/browser/` — **całą zawartość tego folderu** wrzuć na serwer (FTP, Netlify, GitHub Pages itd.).

### Ważne: routing SPA

Angular to SPA — bezpośrednie wejście na `/play/snake` wymaga przekierowania na `index.html`.

- **Apache:** plik `public/.htaccess` (kopiowany do buildu)
- **Netlify:** plik `public/_redirects`
- **Nginx:** `try_files $uri $uri/ /index.html;`
- **Podkatalog** (np. `example.com/gry/`): build z `--base-href /gry/`

### GitHub Pages (root)

```bash
ng build --base-href https://twoj-user.github.io/wiplay/
```
