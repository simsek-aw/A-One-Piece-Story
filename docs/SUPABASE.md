# Dauerhafte Spielstände mit Supabase

Die App speichert jeden Spielzug serverseitig. Sobald `SUPABASE_URL` und
`SUPABASE_SECRET_KEY` gesetzt sind, nutzt sie statt lokaler JSON-Dateien die
Tabelle `aops_games`. Ohne diese Variablen bleibt der lokale JSON-Speicher als
Fallback aktiv.

## 1. Projekt und Tabelle anlegen

1. Erstelle ein Projekt bei [Supabase](https://supabase.com/dashboard).
2. Öffne **SQL Editor** und führe dieses SQL aus:

```sql
create table if not exists public.aops_games (
  id text primary key,
  character_name text not null,
  character_archetype text not null,
  updated_at timestamptz not null default now(),
  game jsonb not null
);

alter table public.aops_games enable row level security;
```

Die Anwendung spricht die Datenbank nur vom Node-Server aus an. Es gibt deshalb
bewusst keine öffentliche RLS-Policy: Der serverseitige Secret-Key darf die
Tabelle verwalten, Browser erhalten keinen direkten Datenbankzugriff.

## 2. Umgebungsvariablen setzen

Lokal in `.env` oder bei Render unter **Environment**:

```env
SUPABASE_URL=https://DEIN-PROJEKT.supabase.co
SUPABASE_SECRET_KEY=sb_secret_...
```

Den Secret-/`service_role`-Key niemals in Frontend-Dateien, Git oder
Client-seitige Umgebungsvariablen schreiben. Die App akzeptiert zusätzlich den
Legacy-Namen `SUPABASE_SERVICE_ROLE_KEY`, falls dein Projekt diesen noch zeigt.

## 3. Charaktere fortsetzen

Nach dem ersten Speichern zeigt der Startbildschirm im selben Browser die
bekannten Charaktere zum Fortsetzen an. Die Auswahl ist nur eine lokale Liste
von Spielstand-IDs; der eigentliche Spielstand liegt in Supabase. „Aus Liste
entfernen" löscht daher nur den Eintrag auf diesem Gerät, nicht den Spielstand.

Für echte getrennte Benutzerkonten ist Supabase Auth der nächste Ausbau. Bis
dahin sollten Spielstand-Links wie Passwörter behandelt und nicht öffentlich
geteilt werden.

Bereits lokale Spielstände werden beim ersten Öffnen nach dem Einrichten von
Supabase automatisch in die Datenbank übernommen.
