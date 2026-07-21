# Deep Drill — roadmapa (Motherload → v2)

Cel: systematycznie zbliżać **Deep Drill v2** do oryginalnego *Motherload* (Miniclip), bez przebudowy portalu.

**Aktywna gra:** `deep-drill-v2` (kafelek: „Deep Drill”)  
**Ukryta:** `deep-drill` (v1) — kod zostaje, nie widać na głównej

---

## Status bazowy (już w v2)

| Element | Status |
|---------|--------|
| Kopanie siatkowe (dół / boki) | ✅ |
| Powrót tylko pustym szybem (bez kopania w górę) | ✅ |
| Paliwo | ✅ |
| HP / uszkodzenia (kamień) | ✅ |
| Ładunek + sprzedaż na powierzchni | ✅ |
| Minerały z krzywą głębokości (miedź → srebro → złoto → platyna) | ✅ |
| Kamień (twardszy, 2 uderzenia) | ✅ |
| Lawa (śmierć) | ✅ |
| Proceduralna mapa | ✅ |

---

## Elementy z oryginalnego Motherload — kolejka dodawania

### Faza A — fundament ekonomii i survival

| # | Element Motherload | Opis | Priorytet |
|---|--------------------|------|-----------|
| A1 | **Sklep / baza na powierzchni** | Osobny UI: sprzedaż, tankowanie, naprawy | ✅ |
| A2 | **Tankowanie paliwa za kasę** | Kupno paliwa zamiast darmowego doładowania | ✅ |
| A3 | **Naprawa kadłuba (HP) za kasę** | Naprawa w bazie | ✅ |
| A4 | **Pojemność ładunku (cargo limit)** | Limit kg/slotów — trzeba wracać częściej | ✅ |
| A5 | **Pieniądze (osobne od score)** | Gotówka do sklepu; wynik/rekord osobno | ✅ |

### Faza B — ulepszenia wiertnicy (jak w Motherload)

| # | Element | Opis | Priorytet |
|---|---------|------|-----------|
| B1 | **Drill (wiertło)** | Szybsze / mocniejsze kopanie (1-hit rock na wyższych poziomach) | ✅ |
| B2 | **Engine (silnik)** | Szybszy ruch, niższe zużycie paliwa | Wysoki |
| B3 | **Hull / Armor** | Więcej max HP, mniej dmg od kamienia/lawy | Wysoki (wstrzymane) |
| B4 | **Fuel tank** | Większy bak | ✅ |
| B5 | **Cargo bay** | Większy limit ładunku | Średni |
| B6 | **Radiator / cooling** | Odporność na ciepło / lawę w pobliżu | Średni |

### Faza C — świat i minerały (rozszerzenie)

| # | Element | Opis | Priorytet |
|---|---------|------|-----------|
| C1 | **Więcej minerałów Motherload** | np. iron, emerald, diamond, amazonite, moonstone, alien bone… | Średni |
| C2 | **Warstwy geologiczne** | Różne „biomy” głębokości (piasek, skała, magma) | Średni |
| C3 | **Gaz / kieszenie gazu** | Eksplozja / obrażenia przy wkopaniu | Średni |
| C4 | **Dynamit / bomby** | Niszczenie obszaru, kosztowne | Średni |
| C5 | **Teleporter / warp** | Szybki powrót na powierzchnię (drogi) | Niski |
| C6 | **Boss / alien / artefakty** | Głębokie eventy jak w Motherload | Niski |

### Faza D — polish i feel gry

| # | Element | Opis | Priorytet |
|---|---------|------|-----------|
| D1 | **Lepsza grafika wiertnicy + sprite’y kafelków** | Czytelniejsze minerały | Wysoki |
| D2 | **Dźwięki** | Kopanie, zbieranie, lawa, sklep | Średni |
| D3 | **Zapis postępu (localStorage)** | Ulepszenia + pieniądze między sesjami | Wysoki |
| D4 | **Misje / cele** | „Zbierz X złota”, „zejdź na głębokość Y” | Niski |
| D5 | **Death screen + podsumowanie runu** | Zarobek, głębokość, strata | Średni |

---

## Proponowana kolejność implementacji (najbliższe kroki)

1. ~~**Pieniądze + limit ładunku + sklep (tankuj / napraw)** — Faza A~~ ✅  
2. **Pierwsze upgrade’y: Drill + Fuel tank** — Faza B ✅ (Hull wstrzymany; Engine później)  
3. **Zapis postępu w localStorage** — D3  
4. **Kolejne minerały + warstwy** — Faza C  
5. **Dynamit, gaz, teleporter** — Faza C  
6. **Grafika + dźwięk** — Faza D  

---

## Mapowanie minerałów (obecne Wiplay ↔ Motherload)

| Deep Drill (teraz) | Strefa głębokości | Punkty |
|--------------------|-------------------|--------|
| Miedź (brąz) | 0–15 (tylko), potem nadal obecna | 10 |
| Srebro | bufor 15–25, pełne od 25 | 22 |
| Złoto | bufor 35–50, pełne od 50 | 55 |
| Platyna | od 75 | 110 |
| Kamień | od 100 | — |

Później dodamy osobne ID 1:1 bliższe oryginałowi (emerald, diamond, itd.).

---

## Zasada rozwoju

- **Nie ruszamy v1** (zostaje ukryte).  
- Każdy duży element = osobny etap + commit (`feat(games/deep-drill-v2): ...`).  
- Najpierw gameplay (sklep, upgrade’y), potem content (więcej rud), na końcu polish.
