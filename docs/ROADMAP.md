# Roadmap

Reihenfolge grob nach Abhängigkeit/Wert. Der Solo-Story-Kern steht; die
folgenden Punkte bauen darauf auf.

## Erledigt (Ausbaustufe 2)

- [x] Echtzeit-Tagestakt (Aktionen pro Tag + Cooldown), konfigurierbar
- [x] Kopfgeld- & Marine-Heat-System mit Begegnungs-Konsequenzen
- [x] Teufelsfrüchte (finden, essen, Fähigkeit + Schwimm-Nachteil)
- [x] Ausbildungspfade (Dojo, Marine-Drill, Bücherwurm, Unterwelt, Arbeiten, Meditation)
- [x] Karte & Reisen (Schiff/Passage), Fortbewegungsart in der UI
- [x] Anime-Panel-Slot pro Szene (Platzhalter-SVG)
- [x] Multiplayer-Datenmodell (Tages-Takt, Den-Den-Mushi, Raum) + UI-Slots

## Erledigt (Ausbaustufe 3)

- [x] Levelaufstieg: Skillpunkte verteilen (Endpoint + UI)
- [x] Party-Boni wirksam: Begleiter geben je nach Rolle Bonus auf passende Checks
- [x] „Lücke in der Geschichte"-Handlungsstrang: lore_fortschritt-Schwellen lösen
      Chronik-Enthüllungen aus (Void-Century-Faden für Bücherwürmer)

## Erledigt (Ausbaustufe 4)

- [x] Rundenbasiertes Kampfsystem: Angriff/Verteidigen/Spezial/Fliehen, Crew
      kämpft mit, Gegner-Vorlagen, Sieg/Flucht/Niederlage mit Konsequenzen
      (EP/Beri/Kopfgeld/Heat); von der KI ausgelöst und ausgespielt, Runden
      rein deterministisch

## Erledigt (Ausbaustufe 5)

- [x] "Teil des Canons werden": Beitritt zu kanonischen Crews/Fraktionen
      (content/canonCrews.js, engine/canon.js). Aufnahme-Chance aus der
      Offenheit der Crew (Big Mom leicht ↔ Strohhüte extrem wählerisch +
      Ära-Gate), Voraussetzungen (Level, kein Kopfgeld für die Marine),
      Mitgliedschafts-Effekte (Marine-Schutz/Rang); UI-Panel + /join-canon

## Erledigt (Ausbaustufe 6)

- [x] Viele weitere Crews: große Kanon-Crews (Kaido/Beasts, Buggy, Riesen/Elbaf)
      und kleinere no-name-Gruppen (Rookies, Schmuggler, Kopfgeldjäger, Wirte).
      Kanon generell schwerer beizutreten (DC-Aufschlag) als kleine Gruppen,
      abgestuft nach Crew-Persönlichkeit.
- [x] Weltgeschehen/Zeitung ("News-Möwe"): Tagesausgabe mit Ereignissen
      außerhalb der Spieler-Bubble + eigenem Kopfgeld/Crew; als Kontext an den
      Spielleiter übergeben, damit er die große Welt einwebt.

## Erledigt (Ausbaustufe 7)

- [x] Immersiver Tagesablauf mit Tageszeit-System statt „1 Aktion/Tag":
      Stunden-Uhr mit Phasen (Morgen/Mittag/Nachmittag/Abend/Nacht), mehrere
      Aktionen pro Tag, zeitkostende Handlungen. Zeitfenster für Aktivitäten
      (Dojo/Marine-Drill/Bücherwurm tagsüber, Unterwelt abends/nachts,
      Arbeiten mittags–abends). Nachts erzwungenes Rasten; „Rasten"-Aktion
      (Gasthaus gegen Beri = volle Heilung, oder Freiluft = Teilheilung + Heat)
      startet den nächsten Morgen.
- [x] Key-Moment-Panels: gezeichnete Manga/Anime-Panels für Schlüsselmomente
      (Ankunft, Spannung, Explosion, Duell, Crew, Enthüllung, Nacht, See, Sieg),
      1–2 Panels mitten im oder am Ende des Textes; vom Spielleiter über das
      JSON-Feld `panels` gesetzt, deterministisch als stilisiertes SVG gerendert.
- [x] Mobile-UI + installierbare PWA: touch-freundliches Layout, Hamburger
      oben links / Swipe-Left öffnet das Menü als Off-Canvas-Drawer,
      `manifest.json` + Service-Worker (Offline-Shell, /api network-first),
      App-Icons — Grundlage für späteres 2-Spieler-Handy-Multiplayer.

## Erledigt (Ausbaustufe 8)

- [x] Perspektiven-/Wissenssystem (Spielersicht statt Admin-Allwissen):
      Im Spiel sieht man nicht mehr die komplette Crew-Liste, sondern nur, was
      der Charakter kennt (engine/knowledge.js, world.knownCrews). Gerichtete
      Beziehung: „gehört" (nur aus der Zeitung/Gerücht — Einbahnwissen),
      „begegnet" (in Person getroffen, gegenseitig), „mitglied". Daraus folgt
      das gegenseitige Gedächtnis: Kaido/Big Mom & Co. erinnern sich nur an den
      Spieler, wenn es eine echte Begegnung gab. News verlinken Weltgrößen
      (worldEvents.crews) → man hört von ihnen, ohne dass sie einen kennen.
      Spielleiter-Prompt um „Perspektive & Wissen" ergänzt; UI zeigt
      „Begegnet / vor Ort" vs. „Nur vom Hörensagen".

## Erledigt (Ausbaustufe 9)

- [x] Manga-Panel-Look: strenges Schwarz-Weiß statt des blauen Themes. Dicke
      Tusche-Rahmen mit harten versetzten Schatten (Panel-Kästen), Screentone-
      Punktraster im Hintergrund, gotische Versal-Überschriften (keine
      Comic-Schrift), monochrome Bild-Panels (grayscale-Filter), Outline-Chips,
      Invert-Hover auf Auswahlzellen. Voll invertierbar über einen Theme-Umschalter
      (◑, „paper" ↔ „ink", in localStorage gemerkt, flackerfrei im <head> gesetzt).
      Rein CSS/variablenbasiert — die gesamte Palette hängt an --ink/--bg/--line.

## Erledigt (Ausbaustufe 10)

- [x] OpenAI als Spielleiter-Provider (server/ai/openaiProvider.js): dritte,
      austauschbare KI-Anbindung neben Mock/Anthropic. AI_PROVIDER=openai +
      OPENAI_API_KEY aktivieren; ohne Key sauberer Fallback auf Mock.
- [x] Echte KI-Bild-Panels (server/ai/imageProvider.js): Szenen- und
      Key-Moment-Panels werden bei aktivem OPENAI_IMAGES über die
      OpenAI-Bild-API im Manga-S/W-Stil erzeugt, auf Platte gecacht
      (data/panels/) und im Frontend nicht-blockierend gegen das
      Sofort-SVG getauscht ("wird gezeichnet …"). Fällt komplett zurück auf
      SVG, wenn aus oder fehlerhaft.
- [x] Charakter-Profilbild: optionales Aussehen-Freitextfeld bei der
      Erstellung → generiertes Schulter-aufwärts-Porträt im selben
      Manga-S/W-Stil, im Charakter-Kopf der Seitenleiste angezeigt (gecacht
      pro Charakter, am Spielstand gespeichert).
- [x] Comic-Display-Schrift (Bangers, OFL, selbst gehostet) für Überschriften.
- [x] Charaktererstellung erweitert: 4 neue Herkünfte (Kopfgeldjäger,
      Schiffskoch, Schiffsarzt, Diebin & Navigatorin), 8 neue Talente mit
      One-Piece-Anspielungen (Dreischwert-Ambition, Schwarzbein-Tritt,
      Wetternase, Langnasen-Latte, Kind des Gerüchts, Fassweise, Vorahnung,
      Grinsen am Galgen), 2 neue Startorte (Orangen-Hafen, Windmühlendorf).
- [x] Deployment: render.yaml + docs/DEPLOY.md, live auf Render (Free-Tier).

## Erledigt (Ausbaustufe 11)

- [x] Gemini als dritter Spielleiter-Provider (server/ai/geminiProvider.js):
      kostenlose Alternative zu OpenAI/Anthropic über Google AI Studio.
      AI_PROVIDER=gemini + GEMINI_API_KEY aktivieren; ohne Key sauberer
      Fallback auf Mock. imageProvider.js unterstützt zusätzlich Gemini als
      Bild-Backend (gemini-2.5-flash-image, GEMINI_IMAGES=1) neben OpenAI —
      austauschbar, beide gecacht.
- [x] Haki-Ausbau (server/engine/haki.js): drei echte Stufen statt reinem
      Flavor. Beobachtungshaki (Rang 1, passiver Bonus auf Wahrnehmung/
      Heimlichkeit in dice.js), Rüstungshaki (Rang 3, schaltet den
      Kampf-Spezialangriff erst jetzt echt frei statt schon ab Rang 1),
      Haoshoku/Überwältigungswille (Rang 6 + hohe Willenskraft, kleine
      Zufallschance pro Trainingsereignis, einmal pro Kampf einsetzbar —
      schwächere Gegner brechen sofort zusammen). Erwachungen laufen
      deterministisch über Meditation oder Skillpunkt-Verteilung, der
      Spielleiter erzählt sie nur aus.
- [x] Immersions-Fix „Crew-Beitritt aus dem Nichts": die Marine war zuvor ab
      Spielbeginn überall sofort beitretbar (initialRelation "begegnet").
      Jetzt kennt man die Marine nur vom Hörensagen, bis man tatsächlich einen
      Marine-Standort (Garnisonsstadt/Vorposten) besucht — erst dann zeigt die
      Seitenleiste "Beitreten versuchen". Zusätzlich serverseitig abgesichert:
      doJoinCanon prüft die tatsächliche Beziehung (crewRelation) VOR dem
      Versuch, statt sie rückwirkend zu setzen — kein Bypass über die API
      möglich, nicht nur ein UI-Verstecken.

## Erledigt (Ausbaustufe 12)

- [x] OpenRouter als vierter Spielleiter-Provider (server/ai/openrouterProvider.js):
      ein API-Key, Zugriff auf sehr viele Modelle (Claude, GPT, Gemini, Llama,
      DeepSeek, Mistral, …), darunter mehrere komplett kostenlose (Modell-IDs
      mit ":free"-Endung). API-kompatibel zur OpenAI-API (nur andere
      Basis-URL) — nutzt darum bewusst dasselbe "openai"-Paket weiter statt
      einer neuen Abhängigkeit. Robustes Fallback-Parsing (Markdown-Codezäune,
      Vor-/Nachrede entfernen), da nicht jedes Modell dahinter JSON-Modus
      strikt einhält. AI_PROVIDER=openrouter + OPENROUTER_API_KEY aktivieren;
      ohne Key sauberer Fallback auf Mock.
- [x] DeepSeek als direkter fünfter Spielleiter-Provider mit JSON-Reparatur,
      lokalem Fallback und Auswahl pro Spielstand (`DEEPSEEK_API_KEY`).
- [x] Krea als drittes echtes Bild-Backend für Avatar- und Szenenpanels;
      asynchrone Jobs werden serverseitig gepollt und anschließend gecacht.

## Erledigt (Ausbaustufe 13) — Kontinuität & roter Faden

Direkte Antwort auf Spieler-Feedback: Szenen wirkten teils steckengeblieben
(Text wiederholt sich, Auswahl bestätigt nur mit kleinem Zusatz), und Orts-
wechsel waren schwer nachzuvollziehen ("Bin ich von A nach B gegangen?").

- [x] Deterministische Ortsspur (engine/turn.js: `recordLocationTrail`,
      `game.world.locationTrail`, `game.lastLocationChange`): jeder echte
      Ortswechsel (Reise oder Szenenwechsel) wird unabhängig von der
      KI-Formulierung festgehalten. UI zeigt sowohl einen permanenten
      "🧭 Weitergezogen: A → B"-Eintrag im Story-Log als auch eine laufende
      Breadcrumb-Spur im Schauplatz-Kontext — macht "wo war ich, wo bin ich
      jetzt" immer eindeutig sichtbar, egal wie klar der Erzähltext ist.
- [x] Kontinuitäts-Wächter (engine/continuityDirector.js) um zwei Muster
      erweitert, die sich wie Stillstand anfühlen, aber vom bisherigen
      Absatz-Wiederholungs-Check nicht erfasst wurden: fast unveränderte
      Auswahlmöglichkeiten (`choicesBarelyChanged`) und Entwürfe, die zwar
      "neu" sind, aber kaum Substanz hinzufügen (`newParagraphLength` mit
      abgestuftem Schwellenwert).
- [x] Transparenz statt stillem Sicherheitsnetz: `continuityNotice` wird
      jetzt über `currentSceneView` exponiert; greift der Kontinuitäts-Wächter
      zweimal in Folge nicht durch und fällt auf die neutrale Übergangsszene
      zurück, bekommt der Spieler das im Story-Log klar erklärt, statt es wie
      einen unerklärten Aussetzer wirken zu lassen.
- [x] Root-Cause-Fix im Mock-Provider: `genericChoices()` und mehrere
      Erzähl-Bausteine (Orts-Stimmungsbilder, NPC-Präsenz-Zeile,
      Skill-Check-Ergebnis) nutzten nur 1–3 feste Formulierungen, die sich
      bei mehreren Zügen am selben Ort fast garantiert wortgleich
      wiederholten. Jetzt 5–6 Varianten pro Ort + mehrere Formulierungs-
      Varianten pro Baustein.
- [x] System-Prompt (für echte KI-Provider) um explizite Anti-Füllsatz- und
      Auswahl-Varianz-Regeln ergänzt: jede Szene muss mindestens ein neues,
      konkretes Element bringen; Choices dürfen sich nicht nur umformulieren.

## Erledigt (Ausbaustufe 15) — "Bisher geschah..."-Rückblick

Der Story-Log lebt nur im Browser (`storyBuffer`) und ist nach einem Reload
oder "Fortsetzen" eines gespeicherten Charakters leer — man landet ohne
Kontext in einer laufenden Geschichte.

- [x] `server/engine/turn.js`: `recapFor(game)` leitet rein deterministisch
      (keine KI) einen kompakten Rückblick aus dem Spielzustand ab — Ortsspur
      der letzten Wechsel, Crew, Teufelsfrucht, Kopfgeld, offener Story-Hook
      am aktuellen Ort. Wird über `currentSceneView` als `recap` exponiert.
- [x] Guard gegen Fehlalarm direkt nach Charaktererstellung: zählt nur echte
      Spielzüge (`game.history` mit `action`-Feld); die Eröffnungsszene beim
      Spielstart erzeugt sonst schon einen Ortsspur-Eintrag, der fälschlich
      wie eine "Historie" aussehen würde.
- [x] Frontend: dismissible Banner im Manga-Panel-Look (`#recapBanner`),
      nur beim (Wieder-)Einstieg über `enterGame()` gezeigt — nicht bei
      jedem Zug. Verschwindet automatisch, sobald der Spieler die erste
      echte Aktion ausführt, oder per ×-Button sofort.

## Erledigt (Ausbaustufe 14) — 8-Bit-Retro-Szenenpanel

Spieler-Vorschlag: statt (Platzhalter-)Bild-Generierung fürs Szenenpanel auf
einen bewusst deklarierten Retro-Stil setzen — "wie ein altes Pokémon-Game".

- [x] `server/ai/artProvider.js`: `panelFor(game)` erzeugt jetzt ein
      deterministisches 8-Bit-Panel (160×144, klassische Game-Boy-Auflösung,
      4-Ton-Schwarz-Weiß-Palette statt Farbe) statt der bisherigen Skyline-
      Silhouette. Kein externer Bild-Request, kein API-Kontingent.
- [x] Palette nachträglich von Grün auf monochromes Schwarz-Weiß (Tinte/
      Papier-Creme statt sterilem Grau) umgestellt — passt jetzt zum
      Tusche-Manga-Look der Key-Moment-Panels statt zwei getrennte Farbwelten
      nebeneinander zu haben.
- [x] Tag/Nacht-Umschaltung über bestehendes `isNight(game)`: Himmel-, Boden-
      und Kontrastton tauschen die Rolle (`sky`/`mid`/`ink`), sodass
      Silhouetten und Bodentextur in beiden Modi gleich gut lesbar bleiben.
- [x] Zwei Szenen-Layouts (Hafenstadt/Marine vs. Dorf) mit einfachen
      Block-Silhouetten (Häuser, Kai, Mast, Windmühle) sowie einem kleinen
      Figuren-Sprite auf offenem Boden.
- [x] Bewusste Stil-Trennung beibehalten: Schlüsselmoment-Panels
      (`momentPanel`, Duell/Explosion/…) bleiben im Tusche-Manga-Look als
      dramatischer Kontrast zum ruhigen 8-Bit-Erkunden — zwei Bildsprachen,
      eine für Ruhe/Exploration, eine für Drama.
- [x] Frontend: Szenenpanel ist jetzt dauerhaft Retro (kein KI-Bild-Upgrade
      mehr für den Szenen-Slot); eigener CSS-Pfad mit `image-rendering:
      pixelated` statt Tusche-Filter, plus "🎮 RETRO-MODUS"-Badge. Die
      Game-Boy-Palette bleibt unabhängig vom Papier/Tusche-Theme fix (ein
      Handheld-Bildschirm sieht immer gleich aus).

## Als Nächstes (Solo vertiefen)

- [ ] **Perk-Wahl beim Aufstieg**: zusätzlich zu Skillpunkten gelegentlich einen
      neuen Perk wählen dürfen.
- [ ] **Crew-Aufträge & Aufstieg**: als Mitglied Missionen der eigenen Crew
      (Big Mom/Kaido/…) erhalten, Rang steigen, Crew verlassen.
- [ ] **Party-Loyalität dynamisch**: Loyalität steigt/fällt mit Entscheidungen
      und schaltet eigene Begleiter-Plots frei.
- [ ] **Haki-Ausbau**: Meditation/Willens-Pfad zu echten Haki-Fähigkeiten führen
      (auch im Kampf als eigene Spezial-Optionen).
- [ ] **Kampf vertiefen**: Gegner können auch Begleiter angreifen; Initiative;
      Statuseffekte; Items/Heilen im Kampf.
- [ ] **Inventar-Nutzung**: Items im Zug einsetzen (heilen, Werkzeuge),
      Feilschen/Handel an Orten.
- [ ] **Eigenes Schiff ausbauen**: Werft, Upgrades, Crew-Positionen an Bord.
- [ ] **Speichern/Laden-UI**: Mehrere Spielstände pro Nutzer.

## Claude-Spielleiter härten

- [ ] **Streaming** der Erzählung ins Frontend (schnelleres Gefühl).
- [ ] **Prompt-Caching** des System-Prompts + Weltwissen (Kosten/Latenz).
- [ ] **Kohärenz-Wächter**: gelegentliche Zusammenfassung langer Historien, damit
      der Kontext kompakt bleibt (Compaction/Context-Editing).
- [ ] **Twist-Steuerung**: explizite Spannungs-/Twist-Kurve über Flags im Prompt.

## Multiplayer (im Datenmodell vorbereitet)

Der Spielstand hat bereits ein `roomCode`-Feld. Skizze der geplanten Umsetzung:

- [ ] **Räume + Einladungs-Code**: `POST /api/rooms` erzeugt einen Code; Beitritt
      per Code bindet einen Charakter an den Raum.
- [ ] **Geteilte Weltzeit & Szene**: Ein Raum teilt Tag, Ort und Gedächtnis; der
      Spielleiter adressiert mehrere Spieler.
- [ ] **Echtzeit** über WebSockets: Aktionen und Szenen werden an alle im Raum
      gepusht (Server bleibt autoritativ – Frontend enthält keine Regeln).
- [ ] **Zwei Modi**:
      1. *Begegnung* – Spieler treffen sich punktuell in der Story eines Hosts.
      2. *Ko-op-Kampagne* – gemeinsame Reise, Züge abwechselnd oder parallel.
- [ ] **Konfliktauflösung**: Reihenfolge/Locking der Züge, damit zwei Aktionen
      denselben Zustand nicht gleichzeitig verändern.

## Technisch

- [ ] **Persistenz** von JSON-Dateien auf SQLite umstellen (nur `store.js`
      betroffen), wenn Nutzer-/Raum-Zahlen wachsen.
- [ ] **Tests**: Unit-Tests für `dice`, `character`, `schema`, `memory`;
      Integrationstest der Zug-Schleife.
- [ ] **Auth** (leichtgewichtig), sobald Spielstände einem Nutzer gehören sollen.
