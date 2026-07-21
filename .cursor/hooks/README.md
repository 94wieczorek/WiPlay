# Wiplay — auto-commit hook

Po każdej zakończonej sesji agenta (lub subagenta) Cursor uruchamia skrypt `auto-commit.mjs`.

## Co robi

1. Sprawdza, czy są niezacommitowane zmiany
2. Pomija pliki wrażliwe (`.env`, klucze, `dist/`, `node_modules/`)
3. Tworzy commit w stylu **conventional commits**, np.:
   - `feat(games/snake): update src/app/features/games/snake/...`
   - `fix(game-shell): update ...`
   - `chore(cursor): update .cursor/hooks/...`

## Kiedy się uruchamia

| Zdarzenie | Opis |
|-----------|------|
| `stop` | Agent zakończył pracę |
| `subagentStop` | Subagent w tle zakończył pracę |

## Wymagania

- Node.js w PATH
- Repozytorium git z skonfigurowanym `user.name` i `user.email`

## Uwagi

- Hook **nie robi push** — tylko lokalny commit
- Jeśli nie ma zmian, nic nie robi
- Po edycji `hooks.json` Cursor przeładowuje hooki automatycznie (ew. restart IDE)

## Wyłączenie

Usuń wpisy z `.cursor/hooks.json` lub zmień nazwę pliku `auto-commit.mjs`.

## Test ręczny

```bash
node .cursor/hooks/auto-commit.mjs
```

(w katalogu projektu, gdy są niezacommitowane zmiany)
