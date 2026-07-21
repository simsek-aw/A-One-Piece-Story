# Architektur

## Leitidee: deterministischer Kern + austauschbarer Erzähler

Die zentrale Design-Entscheidung ist die **Trennung zwischen dem, was
deterministisch sein muss, und dem, was die KI frei erzählen darf**:

- **Der deterministische Kern (`server/engine/`)** verwaltet alles Regelhafte:
  Charakterwerte, Würfelproben, Inventar, Weltzeit, Level, und vor allem das
  **Gedächtnis** (NPCs + Flags). Diese Dinge dürfen nicht dem Zufall einer
  Texterzeugung überlassen werden.
- **Der Erzähler (`server/ai/`)** liefert Stimmung, Dialog, Beschreibung und
  Vorschläge für Auswahlmöglichkeiten. Er bekommt bei jedem Zug eine kompakte
  Zusammenfassung des Zustands und antwortet in einem **festen JSON-Vertrag**.

Beide sind über eine schmale Schnittstelle verbunden:

```
Spieler-Aktion
   │
   ▼
turn.js ──(1) würfelt Skill-Check deterministisch
   │     ──(2) baut Kontext (Charakter, Welt, Gedächtnis, Historie)
   ▼
provider.generateScene(context)   ← Mock ODER Claude
   │     liefert GM-JSON
   ▼
schema.validateGmResponse(...)     ← normalisiert/säubert
   │
   ▼
turn.applyGmResponse(...)          ← wendet Zustandsänderungen deterministisch an
   │     (HP/Beri/XP/Level clampen, Inventar, Flags, NPC-Gedächtnis, Historie)
   ▼
Persistenz (store.js)  +  Szenen-Ansicht ans Frontend
```

## Der GM-Antwort-Vertrag (`engine/schema.js`)

Jeder Provider liefert dasselbe Objekt:

```jsonc
{
  "narration": "Erzähltext …",
  "choices": [ { "id": "a", "text": "…", "skillCheck": null | { "skill": "…", "dc": 12 } } ],
  "stateChanges": {
    "timeAdvanceDays": 1, "hpDelta": 0, "beriDelta": 0, "xpDelta": 20,
    "location": null, "itemsAdded": [], "itemsRemoved": [], "flagsSet": {}
  },
  "npcs": [ { "id": "…", "name": "…", "role": "…", "disposition": 0, "note": "…" } ],
  "recruitable": [ { "id": "…", "name": "…", "role": "…", "reason": "…" } ]
}
```

- `validateGmResponse` erzwingt Typen, klemmt Wertebereiche ab und wirft nur bei
  grobem Unfug – so bleibt die Engine robust, egal wer erzählt.
- Dasselbe Objekt existiert als **JSON-Schema** (`GM_JSON_SCHEMA`) und wird an
  die Claude-API als `output_config.format` übergeben. Damit liefert der echte
  Spielleiter garantiert passendes JSON.

## Warum die Skill-Checks in der Engine liegen

Erfolg/Misserfolg würfelt `engine/dice.js` (1W20 + Attribut-Mod + Skill-Rang vs.
DC). Die KI erfährt das **Ergebnis** und spielt es nur aus. Das verhindert, dass
die Erzählung Proben "schummelt", und macht Werte spürbar relevant.

## KI-Provider (`server/ai/`)

- `provider.js` wählt anhand von `AI_PROVIDER` den Provider und fällt sauber auf
  Mock zurück, wenn der Key fehlt.
- `mockProvider.js` erfüllt den Vertrag deterministisch aus Textbausteinen – kein
  API-Key, überall lauffähig, ideal für Tests & Onboarding.
- `anthropicProvider.js` nutzt `claude-opus-4-8`, adaptives Thinking und
  strukturierte Ausgabe. Das SDK wird **lazy** geladen, damit der Mock-Modus
  ganz ohne installiertes SDK funktioniert.

Neue Provider (z. B. lokal, andere Anbieter) müssen nur `generateScene(context)`
implementieren.

## Persistenz (`server/store.js`)

Ein JSON pro Spielstand unter `data/games/<id>.json`. Bewusst ohne Datenbank
gehalten, damit `npm install && npm start` überall reicht. Weil nur `store.js`
die Dateien anfasst, ist der Wechsel zu SQLite/Postgres später lokal begrenzt.

## Frontend (`server/public/`)

Reines HTML/CSS/JS ohne Build-Schritt. Redet ausschließlich über `/api` mit dem
Server; es enthält keine Spiellogik. Das hält die Angriffsfläche klein und macht
die Regeln serverseitig autoritativ (wichtig für späteren Multiplayer).
