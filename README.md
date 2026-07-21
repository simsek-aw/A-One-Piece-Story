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
- **Echtzeit-Tagestakt**: begrenzte Aktionen pro In-Game-Tag; der nächste Tag
  schaltet erst nach einem echten Cooldown frei (konfigurierbar). Multiplayer-
  freundlich, weil sich später alle denselben Takt teilen können.
- **Kopfgeld & Marine-„Heat"**: Aktionen heben/senken beides; hohes Kopfgeld/Heat
  = mehr Ärger (häufigere, härtere Marine-Begegnungen), niedrig = ruhiger.
- **Teufelsfrüchte**: findbar & essbar. Geben eine Fähigkeit (+Bonus auf passende
  Checks) und den klassischen Nachteil: nie wieder schwimmen (Schwimm-Proben
  scheitern katastrophal).
- **Ausbildungspfade**: Dojo, Marine-Drill, Bücherwurm (Recherche zur „Lücke in
  der Geschichte"), Unterwelt, Arbeiten, Meditation — kosten eine Tagesaktion,
  trainieren Skills bis zum Rang-Aufstieg, mit Nebeneffekten (Beri/Heat/Lore).
- **Karte & Reisen**: Ortsnetz mit Koordinaten; Seereisen brauchen ein eigenes
  Schiff oder bezahlte Passage. UI zeigt Position, Fortbewegungsart und Crew.
- **Anime-Panel pro Szene**: ortsabhängige Platzhalter-Grafik (inline SVG);
  echte KI-Bild-Generierung ist als Provider-Slot vorbereitet.
- **Story-Loop**: Szene → Auswahl (mit optionalen Checks) oder Freitext →
  Fortsetzung.
- **NPC-Gedächtnis**: Figuren merken sich Begegnungen und Entscheidungen; ihre
  Gesinnung entwickelt sich und beeinflusst spätere Szenen.
- **Rekrutierung & Crew-Boni**: Begleiter über einen Überzeugen-Check gewinnen;
  sie geben je nach Rolle Bonus auf passende Checks (Navigator → Navigation,
  Söldner → Nahkampf, …).
- **Levelaufstieg**: pro Stufe ein Skillpunkt, den du frei auf Fertigkeiten
  verteilst.
- **Lore-Chronik**: der „Lücke in der Geschichte"-Handlungsstrang schaltet über
  Recherche (Bücherwurm) nach und nach Fragmente frei (Void-Century-Faden).
- **Rundenbasiertes Kampfsystem**: Angriff mit Waffen-Skills, Verteidigen,
  Teufelsfrucht-/Haki-Spezial (Flächenschaden), Fliehen; die Crew kämpft mit;
  Gegner mit HP-Balken; Sieg/Flucht/Niederlage wirken auf EP, Beri, Kopfgeld
  und Heat (Niederlage ist kein permanenter Tod). Runden laufen ohne KI-Aufruf,
  nur Beginn und Ausgang werden erzählt.
- **Kanon-Koexistenz**: Hintergrund-Ereignisse aus der One-Piece-Timeline werden
  als Gerüchte eingestreut.
- **Multiplayer vorbereitet**: geteilter Tages-Takt, Den-Den-Mushi- & Raum-
  Datenmodell, UI-Slots — noch ohne Echtzeit-Vernetzung (siehe Roadmap).
- **Persistenz**: Spielstände als JSON; Fortsetzen per `?game=<id>`-Link.

## Projektstruktur

```
server/
  index.js              Express-Server + API
  config.js             Konfiguration (.env-Parser)
  store.js              Persistenz (JSON-Dateien)
  content/
    lore.js             Weltwissen + Kanon-Timeline
    map.js              Weltkarte: Orte (Koordinaten) + Reisewege
    startingScenarios.js Archetypen + Startorte (aus der Karte)
    activities.js       Ausbildungs-/Fortschritts-Aktivitäten
    devilFruits.js      Teufelsfrucht-Katalog
  engine/               Deterministischer Spielkern
    character.js        Attribute, Skills, Perks, Erstellung, Level
    dice.js             Skill-Check-System (inkl. Schwimm-Schwäche)
    clock.js            Echtzeit-Tagestakt (Aktionen + Cooldown)
    bounty.js           Kopfgeld & Marine-Heat + Konsequenzen
    progression.js      Aktivitäten anwenden (Skill-Aufstieg)
    travel.js           Reisen zwischen Orten (Schiff/Passage)
    devilfruit.js       Teufelsfrucht essen + Nachteile
    gameState.js        Aufbau des Spielzustands
    memory.js           NPC-Gedächtnis + Flags
    schema.js           GM-Antwort-Vertrag + Validierung + JSON-Schema
    turn.js             Zug-Orchestrierung (alle Aktionstypen)
  ai/                   KI-Schicht (austauschbar)
    provider.js         Fabrik (mock | anthropic)
    systemPrompt.js     Spielleiter-Regeln (Deutsch)
    mockProvider.js     Platzhalter-Engine
    anthropicProvider.js Echter Claude-Spielleiter
    artProvider.js      Anime-Panel (Platzhalter-SVG, echte Bilder später)
  public/               Frontend (Vanilla JS, kein Build-Schritt)
docs/                   Architektur, Spieldesign, Roadmap
```

## Mitwirken / Weiterbauen

Siehe `docs/ARCHITEKTUR.md` (wie alles zusammenhängt), `docs/SPIELDESIGN.md`
(Regeln & Balancing) und `docs/ROADMAP.md` (nächste Schritte, u. a. Multiplayer).
