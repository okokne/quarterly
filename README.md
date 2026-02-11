# 12‑Week‑Year Planner (Simple Like Paper)

Minimalistische Single‑User Web‑App nach dem 12‑Week‑Year‑Prinzip. Fokus: Ziele → Wochenziele → Tagesplan → tägliche Ausführung. Alles lokal gespeichert.

## Starten

```bash
npm install
npm run dev
```

## Flow

1. **Zyklus starten**
   - Startdatum wählen (Woche 1 = Startdatum + 6 Tage, insgesamt 12 Wochen)
   - Bis zu 3 Ziele anlegen
   - Vision optional

2. **Woche**
   - Weekly Targets festlegen (Titel, Zielmenge, Einheit)
   - Fortschritt direkt per +/- pflegen
   - Weekly Review + 12‑Wochen‑Review

3. **Heute**
   - Tagesplan mit Zeitblöcken anlegen und abhaken
   - Sieh, was diese Woche noch offen ist
   - Daily Review direkt im Heute‑Tab

## Datenhaltung

Alle Daten werden lokal in `localStorage` gespeichert.
Zusätzlich erstellt die App automatische lokale Snapshots (rotierend, letzte 30), damit du bei einem Defekt leichter wiederherstellen kannst.
In den Einstellungen gibt es Import/Export sowie Download der letzten Autosicherung.

## Optional: Account + Sync (Supabase)

Um Login + Cloud-Sync zu aktivieren, setze folgende Vite-Umgebungsvariablen:

```bash
VITE_SYNC_ENABLED=true
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

SQL-Schema fuer `planner_state` liegt in `supabase/planner_state.sql`.

Danach sind zwei Login-Wege verfuegbar:
- E-Mail + Passwort
- Magic-Link per E-Mail (passwortlos)

Fuer Magic-Link muss in Supabase unter `Authentication -> URL Configuration`
deine App-URL als Redirect erlaubt sein (z. B. `http://localhost:5173`).

## Migration

Wenn alte Daten gefunden werden, erscheint ein Hinweis. Du kannst die alten Daten löschen und neu starten.
