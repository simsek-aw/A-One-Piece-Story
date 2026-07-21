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
