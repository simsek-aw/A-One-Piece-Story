# A One Piece Story 🏴‍☠️

Ein CRPG-artiges Textabenteuer in der Welt von **One Piece**. Du spielst neben
dem Manga-Zeitstrang – die Geschichte beginnt kurz nach der Hinrichtung des
Piratenkönigs, zu Beginn des großen Piratenzeitalters. Claude übernimmt (später)
die Rolle des **Spielleiters**: Storytelling, NPCs mit Gedächtnis, Plot-Twists,
Rekrutierung.

> **Status:** Erste Ausbaustufe – Solo-Story-Kern. Läuft sofort mit einer
> deterministischen Platzhalter-Engine (kein API-Key nötig). Die echte
> Claude-Anbindung ist vorbereitet und per Umgebungsvariable zuschaltbar.
> Multiplayer ist im Datenmodell vorbereitet, aber noch nicht implementiert
> (siehe `docs/ROADMAP.md`).

## Schnellstart

```bash
npm install
npm start
# -> http://localhost:3000
```

Standardmäßig läuft der **Mock-Spielleiter** (`AI_PROVIDER=mock`), damit alles
ohne API-Key spielbar ist.

### Claude als echten Spielleiter aktivieren

```bash
cp .env.example .env
# in .env setzen:
#   AI_PROVIDER=anthropic
#   ANTHROPIC_API_KEY=sk-ant-...
npm start
```

Der Provider nutzt das Modell `claude-opus-4-8` mit adaptivem Thinking und
**strukturierter Ausgabe** (JSON-Schema), damit der Spielleiter garantiert im
richtigen Format antwortet.

## Was schon funktioniert

- **Charaktererstellung**: 3 Archetypen als Start (Marine-Soldat, angehender
  Piratenkapitän, Barkeeper) – niemand ist an seine Rolle gebunden.
- **Attribute & Skills** (Fallout/Baldur's-Gate-Stil): 7 Attribute, Point-Buy,
  Skill-Ränge, Perks.
- **Skill-Checks**: 1W20 + Attribut-Modifikator + Skill-Rang gegen DC,
  deterministisch von der Engine gewürfelt (nicht von der KI).
- **Story-Loop**: Szene → Auswahl (mit optionalen Checks) oder Freitext →
  Fortsetzung. Zeit vergeht in Tagen ("Episoden-Pacing").
- **NPC-Gedächtnis**: Figuren merken sich Begegnungen und Entscheidungen; ihre
  Gesinnung entwickelt sich und beeinflusst spätere Szenen.
- **Rekrutierung**: Begleiter über einen Überzeugen-Check gewinnen; sie
  erscheinen in deiner Crew/Party.
- **Kanon-Koexistenz**: Hintergrund-Ereignisse aus der One-Piece-Timeline werden
  als Gerüchte eingestreut.
- **Persistenz**: Spielstände als JSON; Fortsetzen per `?game=<id>`-Link.

## Projektstruktur

```
server/
  index.js              Express-Server + API
  config.js             Konfiguration (.env-Parser)
  store.js              Persistenz (JSON-Dateien)
  content/
    lore.js             Weltwissen + Kanon-Timeline
    startingScenarios.js Archetypen + Startorte
  engine/               Deterministischer Spielkern
    character.js        Attribute, Skills, Perks, Erstellung, Level
    dice.js             Skill-Check-System
    gameState.js        Aufbau des Spielzustands
    memory.js           NPC-Gedächtnis + Flags
    schema.js           GM-Antwort-Vertrag + Validierung + JSON-Schema
    turn.js             Zug-Orchestrierung
  ai/                   KI-Schicht (austauschbar)
    provider.js         Fabrik (mock | anthropic)
    systemPrompt.js     Spielleiter-Regeln (Deutsch)
    mockProvider.js     Platzhalter-Engine
    anthropicProvider.js Echter Claude-Spielleiter
  public/               Frontend (Vanilla JS, kein Build-Schritt)
docs/                   Architektur, Spieldesign, Roadmap
```

## Mitwirken / Weiterbauen

Siehe `docs/ARCHITEKTUR.md` (wie alles zusammenhängt), `docs/SPIELDESIGN.md`
(Regeln & Balancing) und `docs/ROADMAP.md` (nächste Schritte, u. a. Multiplayer).
