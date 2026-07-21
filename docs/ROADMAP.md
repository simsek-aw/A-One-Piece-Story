# Roadmap

Reihenfolge grob nach Abhängigkeit/Wert. Der Solo-Story-Kern steht; die
folgenden Punkte bauen darauf auf.

## Als Nächstes (Solo vertiefen)

- [ ] **Levelaufstieg-UI**: Beim Aufstieg Skill-Punkte/Perk wählen (Backend
      unterstützt Level bereits; UI + Endpoint fehlen).
- [ ] **Party-Boni wirksam machen**: Begleiter geben je nach Rolle Bonus auf
      passende Checks (Kampf/Erkundung/sozial/Handwerk). Loyalität steigt/fällt
      mit Entscheidungen und kann zu eigenen Begleiter-Plots führen.
- [ ] **Kampf-Substruktur**: Aktuell abstrakt über Checks. Optional ein
      leichtgewichtiges Runden-/Initiative-System für größere Konfrontationen.
- [ ] **Inventar-Nutzung**: Items im Zug einsetzen (heilen, Werkzeuge,
      Verbrauchsgüter), Feilschen/Handel an Orten.
- [ ] **Reise & Karte**: Orte bereisen (Schiff nötig), Reisezeit, ortsgebundene
      Ereignisse und wiederkehrende Schauplätze.
- [ ] **Speichern/Laden-UI**: Mehrere Spielstände pro Nutzer, Übersicht statt
      nur `?game=<id>`-Link.

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
