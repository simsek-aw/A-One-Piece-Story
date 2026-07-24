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

Voraussetzung: **Node.js 22 oder neuer** (benötigt von der aktuellen
Supabase-Anbindung).

```bash
npm install
npm start
# -> http://localhost:3000
```

Standardmäßig läuft der **Mock-Spielleiter** (`AI_PROVIDER=mock`), damit alles
ohne API-Key spielbar ist.

### Echten KI-Spielleiter aktivieren

Mehrere austauschbare Provider können gleichzeitig konfiguriert werden. Jeder
Anbieter mit hinterlegtem API-Key erscheint oben in der Web-App; `AI_PROVIDER`
legt nur die Vorauswahl für neue bzw. ältere Spielstände fest:

```bash
cp .env.example .env
# Empfehlung ohne OpenAI-Guthaben — Google Gemini (kostenloses Kontingent):
#   AI_PROVIDER=gemini
#   GEMINI_API_KEY=...        # https://aistudio.google.com/apikey
#   GEMINI_MODEL=gemini-2.5-flash
#   GEMINI_MODELS=gemini-2.5-flash,gemini-2.5-flash-lite,gemini-2.0-flash
#     (Reihenfolge = Priorität, bestes zuerst; eigenes Tageskontingent pro
#     Modell. "Gemini · Automatisch" im Menü wechselt bei 429/Kontingent-
#     Limit selbstständig zum nächsten Modell der Liste. Jedes Modell
#     erscheint zusätzlich einzeln zum gezielten Pinnen ohne Auto-Wechsel.)
#
# Oder OpenRouter (ein Key, viele Modelle, auch kostenlose ":free"-IDs):
#   AI_PROVIDER=openrouter
#   OPENROUTER_API_KEY=sk-or-...   # https://openrouter.ai/keys
#   OPENROUTER_MODEL=google/gemma-4-26b-a4b-it:free  # Standard
#   OPENROUTER_MODELS=google/gemma-4-26b-a4b-it:free,poolside/laguna-s-2.1:free
#
# Oder DeepSeek direkt:
#   AI_PROVIDER=deepseek
#   DEEPSEEK_API_KEY=...
#   DEEPSEEK_MODEL=deepseek-v4-flash
#
# Oder OpenAI:
#   AI_PROVIDER=openai
#   OPENAI_API_KEY=sk-...
#
# Oder Claude/Anthropic:
#   AI_PROVIDER=anthropic
#   ANTHROPIC_API_KEY=sk-ant-...
npm start
```

Der Anthropic-Provider nutzt `claude-opus-4-8` mit adaptivem Thinking und
**strukturierter Ausgabe** (JSON-Schema); OpenAI, Gemini, DeepSeek und OpenRouter laufen
über deren JSON-Modus (OpenRouter zusätzlich mit robustem Fallback-Parsing,
da nicht jedes Modell dahinter JSON-Modus strikt einhält). Alle fünf füllen
denselben Vertrag (`engine/schema.js`), damit der Spielleiter garantiert im
richtigen Format antwortet — ohne Key läuft automatisch der deterministische
Mock-Spielleiter.

## Was schon funktioniert

- **Charaktererstellung als Schritt-für-Schritt-Assistent**: Name, Herkunft,
  Attribute, Talent, Startort, Aussehen, dann eine **Übersicht** — je ein
  Bildschirm mit Fortschrittsanzeige (Zahlen sind klickbar, um direkt zu
  einem bereits erreichten Schritt zurückzuspringen), Zurück/Weiter-
  Navigation und eigenen "🎲 Zufällig"-Knöpfen pro Schritt. Die Übersicht
  zeigt alle Angaben als klickbare Zeilen zum schnellen Anpassen vor dem
  Start. Alternativ "Schnellstart" würfelt den kompletten Charakter auf
  einmal aus. Gespeicherte Charaktere stehen direkt in Schritt 1 zum
  Fortsetzen bereit (kein separates Auswahl-Popup mehr). 11 Archetypen als
  Start (u. a. Marine-Soldat, angehender Piratenkapitän, Barkeeper,
  Schiffszimmerer, Gelehrte, Musikant, Fischer) – niemand ist an seine Rolle
  gebunden.
- **Attribute & Skills** (Fallout/Baldur's-Gate-Stil): 7 Attribute, Point-Buy,
  Skill-Ränge, 19 Perks/Talente.
- **Skill-Checks**: 1W20 + Attribut-Modifikator + Skill-Rang gegen DC,
  deterministisch von der Engine gewürfelt (nicht von der KI).
- **Tageszeit-Ablauf**: statt „1 Aktion pro Tag" hast du einen realistischen
  Tag mit Uhr und Phasen (Morgen/Mittag/Nachmittag/Abend/Nacht). Jede Handlung
  kostet Zeit, du machst mehrere pro Tag. Aktivitäten haben Öffnungszeiten
  (Dojo tagsüber, Unterwelt nachts, …). Nachts musst du **rasten** — im
  Gasthaus (Beri → volle Heilung) oder unter freiem Himmel (Teilheilung +
  etwas Heat) — und startest in den nächsten Morgen.
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
  Sitzt du gerade in einer Zelle/im Gefängnis fest, ist Reisen serverseitig
  gesperrt (kein Klick-Ausbruch per Karten-Chip).
- **8-Bit-Retro-Panel pro Szene**: ortsabhängige Pixel-Grafik im Game-Boy-Look
  (160×144, 4-Ton-Schwarz-Weiß-Palette passend zum Tusche-Manga-Look,
  Tag/Nacht-Umschaltung) — deterministisch als inline SVG erzeugt, bewusst
  dauerhaft im Retro-Stil statt durch KI-Bilder ersetzbar.
- **Key-Moment-Panels**: für Schlüsselmomente (Ankunft, Duell, Explosion,
  Enthüllung, Crew, Sieg …) blendet der Spielleiter 1–2 gezeichnete
  Manga/Anime-Panels mitten im oder am Ende des Textes ein — stilisiertes SVG,
  vom Spielleiter über ein JSON-Feld gesetzt. Optional (mit OpenAI-Bild-Key)
  werden echte KI-Bilder im Manga-S/W-Stil nachgeladen und tauschen das SVG
  aus, sobald fertig — gecacht, nicht-blockierend.
- **Charakter-Profilbild**: optionale Freitext-Beschreibung bei der Erstellung
  → generiertes Schulter-aufwärts-Porträt im selben Manga-Stil.
- **Story-Loop**: Szene → Auswahl (mit optionalen Checks) oder Freitext →
  Fortsetzung.
- **NPC-Gedächtnis**: Figuren merken sich Begegnungen und Entscheidungen; ihre
  Gesinnung entwickelt sich und beeinflusst spätere Szenen. In den Listen
  „Bekannte Gesichter" und Crew bekommt jede Person ein deterministisches
  Mini-Portrait (Chibi-Kopf, Frisur + Ausdruck aus Name/Gesinnung abgeleitet) —
  kein KI-Bild, immer dasselbe Gesicht für dieselbe Person.
- **Rekrutierung & Crew-Boni**: Begleiter über einen Überzeugen-Check gewinnen;
  sie geben je nach Rolle Bonus auf passende Checks (Navigator → Navigation,
  Söldner → Nahkampf, …).
- **Levelaufstieg**: pro Stufe ein Skillpunkt, den du frei auf Fertigkeiten
  verteilst.
- **Lore-Chronik**: der „Lücke in der Geschichte"-Handlungsstrang schaltet über
  Recherche (Bücherwurm) nach und nach Fragmente frei (Void-Century-Faden).
- **Teil des Canons werden**: vielen Crews/Fraktionen beitreten — große
  Kanon-Crews (Big Mom, Kaido, Whitebeard, Riesen, Buggy, Marine, …) und
  kleinere/no-name-Gruppen (Rookies, Schmuggler, Kopfgeldjäger, Wirte-Gilde).
  Die Aufnahme-Chance hängt von der Offenheit der Crew ab und ist bei den
  berühmten Kanon-Crews generell schwerer als bei den kleinen — außer bei den
  "Sammlern" Big Mom/Kaido (leicht). Riesen & Strohhüte sind sehr schwer bzw.
  in dieser frühen Ära noch gar nicht beitretbar. Die Marine lehnt Gesuchte ab.
  Mitgliedschaft bringt Schutz (weniger Marine-Ärger) bzw. einen Rang.
- **Perspektiven-/Wissenssystem**: du siehst nur, wem du begegnet bist oder von
  wem du gehört hast (Zeitung/Gerücht) — Einbahn-Wissen: du weißt von Kaido/Big
  Mom & Co., sie wissen nicht von dir, solange keine echte Begegnung stattfand.
  Ein Beitritt (auch bei der Marine) braucht deshalb einen GERADE lebendigen
  Ansprechpartner, nicht nur eine alte Erinnerung: ortsgebundene Fraktionen wie
  die Marine nur, solange du tatsächlich an einem ihrer Standorte bist,
  story-vermittelte Crews nur bei einem gerade aktiven Angebot des
  Spielleiters — beides läuft ab, sobald du weiterreist. Kein Sofort-Beitritt
  per Klick von irgendwo auf der Karte aus.
- **Weltgeschehen & News-Möwe**: eine Tageszeitung ("Die Windrose") berichtet,
  was außerhalb deiner Bubble im Kanon passiert (Kaiser, Marine, Riesen, das
  "fehlende Jahrhundert") — plus dein eigenes Kopfgeld und deine Crew. Der
  Spielleiter webt dieses Weltgeschehen in die Erzählung ein.
- **Rundenbasiertes Kampfsystem**: Angriff mit Waffen-Skills, Verteidigen,
  Verarzten (Medizin-Skill, selbst oder Crew), Teufelsfrucht-/Haki-Spezial
  (Flächenschaden), Fliehen; die Crew kämpft mit — und hat jetzt eigene,
  persistente HP: Gegner greifen zufällig Spieler ODER Begleiter an, ein
  niedergeschlagener Begleiter scheidet für den Rest des Kampfes aus (kein
  permanenter Tod, erholt sich nach dem Kampf). Initiative (wer ist diese
  Runde schneller?) und Statuseffekte (vergiftet, betäubt) sorgen für
  taktische Wendungen. Gegner mit HP-Balken; Sieg/Flucht/Niederlage wirken
  auf EP, Beri, Kopfgeld und Heat. Runden laufen ohne KI-Aufruf, nur Beginn
  und Ausgang werden erzählt.
- **Kanon-Koexistenz**: Hintergrund-Ereignisse aus der One-Piece-Timeline werden
  als Gerüchte eingestreut.
- **Haki-Ausbau**: der Willenskraft-/Meditations-Pfad führt zu echten
  Fähigkeiten — Beobachtungshaki (Rang 1, passiver Bonus auf Wahrnehmung/
  Heimlichkeit), Rüstungshaki (Rang 3, echter Kampf-Spezialangriff statt
  bloßer Flavor), Haoshoku/Überwältigungswille (extrem selten, kleine Chance
  bei Rang 6 + hoher Willenskraft — einmal pro Kampf einsetzbar, schwächere
  Gegner brechen sofort zusammen).
- **Manga-Panel-Look**: strenges Schwarz-Weiß mit dicken Tusche-Rahmen, harten
  Panel-Schatten, Screentone-Raster und gotischen Versal-Überschriften.
  Voll invertierbar per Umschalter (◑ „paper" ↔ „ink"); die Wahl wird gemerkt.
- **Sprachausgabe (optional)**: liest neue Erzähltexte per Gemini-TTS
  (Stimme "Orus") vor, sobald der 🔊-Umschalter im Menü aktiv ist — nicht-
  blockierend wie die KI-Bild-Panels: der Text steht sofort da, die Stimme
  trifft kurz danach ein. Vorträgt im Stil eines Dungeons-and-Dragons-
  Spielleiters (Regieanweisung, konfigurierbar über `GEMINI_TTS_STYLE`).
  Braucht `GEMINI_TTS=1` + `GEMINI_API_KEY` auf dem Server; die Wahl des
  Spielers wird lokal gemerkt.
- **Mobil & installierbar (PWA)**: touch-freundliches Layout; oben links per
  Hamburger oder per Swipe-Left öffnet sich das Menü als Off-Canvas-Drawer.
  Als Web-App installierbar (`manifest.json` + Service-Worker mit Offline-Shell,
  App-Icons) — Grundlage für späteres 2-Spieler-Handy-Multiplayer. Kritische/
  gefährliche Momente (Kampf, kritischer Erfolg/Patzer, entdecktes Risiko)
  geben auf unterstützten Geräten kurzes Haptik-Feedback (`navigator.vibrate`).
- **Kopfleiste & Logbuch**: zwei Icons neben dem Burger-Menü — ein Profil-Icon
  (Kurzstatus als Popover: Name/TP/EP/Heat/Kopfgeld, ohne die ganze Schublade
  zu öffnen) und ein Fähigkeits-Icon, das aufleuchtet, sobald ein Skillpunkt
  zu verteilen ist. Im Logbuch selbst ist die Schnellzugriff-Leiste eine echte
  Tab-Leiste: von den 13 Bereichen (Charakter, Karte, Skills, Crew, Fraktionen,
  Inventar, …) ist immer nur einer sichtbar statt alle gleichzeitig gestapelt.
- **Multiplayer vorbereitet**: geteilter Tages-Takt, Den-Den-Mushi- & Raum-
  Datenmodell, UI-Slots — noch ohne Echtzeit-Vernetzung (siehe Roadmap).
- **Persistenz**: Spielstände als JSON; Fortsetzen per `?game=<id>`-Link.
- **Dauerhafte Spielstände & Charakterwahl**: optional über Supabase; jeder Zug
  wird in der Datenbank gespeichert und bekannte Charaktere lassen sich am
  Startbildschirm fortsetzen (Einrichtung: `docs/SUPABASE.md`).

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
    haki.js             Haki-Erwachungen (Beobachtung/Rüstung/Haoshoku)
    knowledge.js         Perspektiven-/Wissenssystem (wer kennt wen)
    canon.js            Kanon-Crew-Beitritt (DC, Verfügbarkeit)
    gameState.js        Aufbau des Spielzustands
    memory.js           NPC-Gedächtnis + Flags
    schema.js           GM-Antwort-Vertrag + Validierung + JSON-Schema
    turn.js             Zug-Orchestrierung (alle Aktionstypen)
  ai/                   KI-Schicht (austauschbar)
    provider.js         Fabrik (mock | anthropic | openai | gemini | openrouter | deepseek)
    systemPrompt.js     Spielleiter-Regeln (Deutsch)
    mockProvider.js     Platzhalter-Engine
    anthropicProvider.js Echter Claude-Spielleiter
    openaiProvider.js   Echter Spielleiter über OpenAI
    geminiProvider.js   Echter Spielleiter über Google Gemini (kostenlos)
    openrouterProvider.js Echter Spielleiter über OpenRouter (viele Modelle, ein Key)
    deepseekProvider.js Echter Spielleiter über die DeepSeek API
    artProvider.js      8-Bit-Retro-Szenenpanel (SVG) + Key-Moment-Panels
    imageProvider.js    Echte KI-Bild-Panels für Key-Moments (Krea/OpenAI/Gemini, gecacht)
  public/               Frontend (Vanilla JS, kein Build-Schritt)
docs/                   Architektur, Spieldesign, Roadmap
```

## Mitwirken / Weiterbauen

Siehe `docs/ARCHITEKTUR.md` (wie alles zusammenhängt), `docs/SPIELDESIGN.md`
(Regeln & Balancing) und `docs/ROADMAP.md` (nächste Schritte, u. a. Multiplayer).
