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

## Als Nächstes (Solo vertiefen)

- [ ] **Perk-Wahl beim Aufstieg**: zusätzlich zu Skillpunkten gelegentlich einen
      neuen Perk wählen dürfen.
- [ ] **Party-Loyalität dynamisch**: Loyalität steigt/fällt mit Entscheidungen
      und schaltet eigene Begleiter-Plots frei.
- [ ] **Haki-Ausbau**: Meditation/Willens-Pfad zu echten Haki-Fähigkeiten führen.
- [ ] **Kampf-Substruktur**: leichtgewichtiges Runden-/Initiative-System für
      größere Konfrontationen (aktuell abstrakt über Checks).
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
