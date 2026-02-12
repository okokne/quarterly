# Quarterly (12‑Wochen‑Planer)

Quarterly ist ein 12‑Wochen‑Planer fuer fokussierte Quartalsziele.  
Fokus: Quarterly Planning -> Weekly Targets -> Daily Tracking -> Journal.

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
VITE_AUTH_REDIRECT_URL=https://deine-domain.tld
```

SQL-Schema fuer `planner_state` liegt in `supabase/planner_state.sql`.

Danach sind zwei Login-Wege verfuegbar:
- E-Mail + Passwort
- Magic-Link per E-Mail (passwortlos)

Fuer Magic-Link und Domain-Setup:

1. Domain in Vercel verbinden (`Project -> Settings -> Domains`).
2. In Vercel die Environment-Variablen setzen:
   - `VITE_SYNC_ENABLED=true`
   - `VITE_SUPABASE_URL=...`
   - `VITE_SUPABASE_ANON_KEY=...`
   - `VITE_AUTH_REDIRECT_URL=https://deine-domain.tld`
3. In Supabase unter `Authentication -> URL Configuration` setzen:
   - `Site URL`: `https://deine-domain.tld`
   - `Redirect URLs`:
     - `https://deine-domain.tld`
     - `https://www.deine-domain.tld` (falls genutzt)
     - `http://localhost:5173` (lokal)
     - `https://*.vercel.app` (optional fuer Preview-Deploys)
4. Nach Env-Aenderungen in Vercel neu deployen.

Die App zeigt im Login/Settings den aktuell verwendeten Magic-Link-Redirect an.

## Migration

Wenn alte Daten gefunden werden, erscheint ein Hinweis. Du kannst die alten Daten löschen und neu starten.
