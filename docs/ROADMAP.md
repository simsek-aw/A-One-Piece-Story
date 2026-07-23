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

## Erledigt (Ausbaustufe 25) — Assistent-Feinschliff, Kopfleiste, Aufräumen

Direktes Feedback nach dem ersten Wizard-Durchlauf: eine Übersicht vor dem
Start fehlte, Fortschritts-Zahlen waren nicht klickbar, die Charakterauswahl
lebte noch in einem separaten Popup, ein Textbaustein wirkte deplatziert,
und die Kopfleiste hatte ungenutzten Platz.

- [x] **Schritt 7 · Übersicht**: zeigt alle sechs Angaben (Name, Herkunft,
      Attribute, Talent, Startort, Aussehen) als klickbare Zeilen — Klick
      springt direkt zum passenden Schritt zurück. "Schnellstart" landet
      jetzt hier statt auf Schritt 6, damit man das Ergebnis einmal komplett
      sieht, bevor man startet.
- [x] **Fortschritts-Zahlen klickbar**: `state.wizardMaxStep` verfolgt den je
      erreichten Höchststand getrennt vom aktuell angezeigten Schritt —
      Springt man von der Übersicht zurück, um z. B. die Herkunft zu ändern,
      bleiben alle bereits erreichten Schritte (inkl. der Übersicht selbst)
      weiter anklickbar, statt sich erneut durchklicken zu müssen. Noch nicht
      erreichte Schritte bleiben bewusst gesperrt (fehlende Vorschritt-Daten).
- [x] **Charakterauswahl-Popup entfernt**: `#characterOverlay` komplett
      gestrichen — die gespeicherten Charaktere stehen jetzt direkt unter dem
      Namensfeld in Schritt 1 ("Oder setze ein bestehendes Abenteuer fort").
      "Neuer Charakter"/"Zur Charakterauswahl" im Spielmenü führen beide auf
      dieselbe, jetzt vereinheitlichte Stelle.
- [x] Root-Cause-Fix für einen Umlaut-Bug dabei entdeckt: die Charakterkarte
      zeigte die interne Archetyp-ID ("kopfgeldjaeger") statt des echten
      Anzeigenamens ("Kopfgeldjäger") — jetzt wird der Name aus
      `state.meta.archetypes` aufgelöst statt die rohe ID anzuzeigen.
- [x] **Deplatzierten Zufalls-Text entfernt**: der Mock-Provider hängte mit
      12 % Chance auf JEDE Szene ein "Spannung"-Panel mit der fixen
      Bildunterschrift "Alle Blicke richten sich auf dich." an — unabhängig
      vom tatsächlichen Szeneninhalt, wirkte dadurch beliebig/nicht
      aktualisiert. Key-Moment-Panels lösen jetzt nur noch bei echten
      Ereignissen aus (Kampfbeginn, Teufelsfrucht-Fund).
- [x] **Kopfleiste nutzt den freien Platz neben Logo/Menü**: zeigt vor dem
      ersten Zug die Ära-Tagline, sobald ein Spiel läuft Name/Level/Tag —
      aktualisiert sich live mit jeder neuen Szene (`renderTopbarContext()`),
      damit es (anders als der entfernte Text oben) nie veraltet wirkt.
- [x] Per Playwright verifiziert: Übersicht + Klick-Navigation, Rücksprung
      und erneutes Vorspringen ohne erneutes Durchklicken, Charakterauswahl
      ohne Popup samt Fortsetzen-Fluss, Umlaut-Anzeige, Kopfleiste live in
      beiden Zuständen (Ära-Tagline / Name-Level-Tag).

## Erledigt (Ausbaustufe 24) — Charaktererstellung als Schritt-für-Schritt-Assistent

Bisher war die Charaktererstellung eine lange, scrollende Seite mit allen
sechs Abschnitten gleichzeitig sichtbar. Jetzt ein echter Assistent: ein
Schritt pro Bildschirm, Fortschrittsanzeige, Zurück/Weiter-Navigation und
Validierung genau dort, wo sie hingehört.

- [x] `server/public/index.html`: jede Karte (`.card`) ist jetzt ein
      `.wizard-step[data-step="N"]`, nur der aktuelle sichtbar (`hidden`-
      Attribut). Neue Fortschrittsanzeige (`#wizardProgress`) und eine feste
      Zurück/Weiter-Navigationsleiste (`#wizardBack`/`#wizardNext`), auf dem
      letzten Schritt ersetzt `#startBtn` den "Weiter"-Knopf.
- [x] `server/public/app.js`: `goToWizardStep()`/`wizardValidationError()`
      steuern Navigation und Validierung pro Schritt (Name ≥ 2 Zeichen,
      Herkunft gewählt, Attributpunkte vollständig verteilt, Startort
      gewählt — Talent und Aussehen bleiben optional, "Keiner" ist beim
      Talent-Schritt als gültige Vorauswahl schon markiert).
      Reihenfolge exakt wie gewünscht: 1 Name (+ Schnellstart direkt hier),
      2 Herkunft, 3 Attribute, 4 Talent, 5 Startort, 6 Aussehen.
- [x] Eigene "🎲 Zufällig"-Knöpfe je Schritt für Attribute, Talent und
      Startort (würfeln NUR dieses Feld) — zusätzlich zum bestehenden
      "Schnellstart", der weiterhin den kompletten Charakter auswürfelt und
      jetzt direkt zum letzten Schritt springt, damit man Name/Aussehen vor
      dem Start noch sieht/anpassen kann.
- [x] Content erweitert (wie gewünscht "vielleicht auch noch weitere"):
      **4 neue Archetypen** (Schiffszimmerer, Gelehrte, Musikant, Fischer,
      macht 11 insgesamt) und **6 neue Talente** (Hünenblut, Tänzerklinge,
      Tierflüsterer, Nagelfeste Hände, Gespür für alte Schrift, Klangzauber,
      macht 19 insgesamt).
- [x] Fortschritts-Dots bewusst OHNE Farbe unterschieden (aktuell/erledigt/
      offen über Größe + Ring statt Farbton) — der Akzentton ist im Papier-
      Theme praktisch identisch mit Tinte-Schwarz, ein farbbasierter Ansatz
      wäre hier unsichtbar gewesen.
- [x] Per Playwright verifiziert: jede Validierung blockiert/lässt korrekt
      durch, alle Zufällig-Knöpfe funktionieren, Schnellstart landet auf
      Schritt 6 und startet erfolgreich ein Spiel, Zurück-Navigation
      funktioniert.

## Erledigt (Ausbaustufe 23) — Automatische Gemini-Kontingent-Kette

Bisher musste man bei einem limitierten Gemini-Modell manuell im Menü ein
anderes auswählen. Da Lite-Varianten auf dem kostenlosen Tarif i. d. R. ein
deutlich höheres Tageskontingent (RPD) haben als das "Haupt"-Modell, ist ein
automatischer Wechsel spürbar hilfreicher als eine rein manuelle Auswahl.

- [x] `server/ai/geminiProvider.js`: `GeminiProvider` nimmt jetzt eine
      priorisierte `models`-Liste statt nur eines einzelnen Modells.
      `generateScene()` probiert sie der Reihe nach durch — meldet ein
      Modell ein Kontingent-/Ratenlimit (429), wird automatisch das nächste
      versucht. Andere Fehlerarten (ungültiger Key, kaputte Antwort, Timeout)
      brechen weiterhin sofort zum Mock-Fallback ab, da ein Modellwechsel
      dort nicht hilft.
- [x] `server/ai/provider.js`: "Gemini" (ohne Modell-Suffix) ist jetzt die
      automatische Kette (Standardwahl im Menü, **"Gemini · Automatisch"**);
      `gemini:<model>` bleibt eine gezielte Einzel-Auswahl ohne Auto-Wechsel,
      für alle, die bewusst ein bestimmtes Modell pinnen wollen.
      Bestehende `AI_PROVIDER=gemini`-Deployments profitieren automatisch
      vom neuen Verhalten, keine Konfigurationsänderung nötig.
- [x] Per Node-Skript verifiziert: Kaskade wechselt bei 429-artigen Fehlern
      korrekt durch die Modell-Liste; nicht-Kontingent-Fehler brechen sofort
      (ohne unnötige Kaskade) zum Mock ab.

## Erledigt (Ausbaustufe 22) — Kampf vertiefen

Bisher: Gegner griffen IMMER nur den Spieler an (Begleiter waren im Kampf
unverwundbar, hatten nicht mal ein HP-Feld), die Reihenfolge war starr fix
(Spieler → Crew → Gegner) und es gab keine Statuseffekte oder eine
Heilmöglichkeit im Kampf.

- [x] `server/engine/party.js`: `companionMaxHp(level)` + `ensurePartyStats(game)`
      — Begleiter bekommen jetzt persistente HP (wie der Spieler: Wunden
      bleiben bis zur nächsten Rast bestehen, kein automatischer Reset pro
      Kampf). Ältere Spielstände werden beim ersten Kampf automatisch
      nachgerüstet, keine Migration nötig.
- [x] `server/engine/combat.js` (großteils neu):
      - **Initiative**: pro Runde ein Wurf Spielerseite (Geschick) vs.
        Gegnerseite (Ø-Angriffsbonus) — gewinnt die Gegnerseite, greift sie
        VOR der Spieleraktion an ("⚡ Die Gegner sind schneller!").
      - **Begleiter als echte Ziele**: Gegner wählen zufällig zwischen
        Spieler und lebenden Begleitern. Ein niedergeschlagener Begleiter
        (0 HP) scheidet für den Rest des Kampfes aus Angriff/Ziel-Auswahl
        aus, stirbt aber nicht dauerhaft — dieselbe "kein permanenter Tod"-
        Logik wie beim Spieler (Revival auf 1 HP nach Kampfende).
      - **Statuseffekte**: "vergiftet" (Schaden über 2 Rundenenden) und
        "betäubt" (setzt die nächste Aktion aus) — manche Gegner-Vorlagen
        (`content/enemies.js`: `inflicts`) können sie bei einem Treffer
        auslösen. Wichtige Design-Entscheidung: die Betäubung wird erst am
        ANFANG der FOLGERUNDE konsumiert, nicht sofort — sonst wäre der
        Status-Badge im UI nie sichtbar gewesen (im selben Funktionsaufruf
        zugefügt und verbraucht).
      - **Verarzten (Heilen)**: neue Kampf-Aktion, nutzt den Medizin-Skill
        (bisher ohne jede Kampf-Wirkung), heilt sich selbst oder eine*n
        Begleiter*in, kostet die Runde wie ein Angriff.
- [x] Frontend: eigene Begleiter-Zeilen im Kampf-Overlay (HP-Balken,
      Status-Badges, ✚-Knopf pro Person), "✚ Verarzten (selbst)"-Aktions-
      Knopf. Rasten heilt jetzt auch die Crew (proportional wie beim Spieler).
- [x] Item-Verbrauch im Kampf bewusst NICHT umgesetzt: das Inventar besteht
      aktuell nur aus frei benannten KI-Items ohne mechanische Eigenschaften
      (keine "Heilmenge" o. ä. hinterlegt) — eine echte Item-Nutzung braucht
      zuerst ein strukturiertes Item-/Tränke-System (siehe "Inventar-Nutzung"
      weiter unten), sonst wäre der Kampf-Knopf nur Attrappe.
- [x] Getestet: `test/combat.test.js` (Backfill, canHeal, Verarzten-Ziel-
      wahl, Downed-Begleiter-Verhalten, statistischer Test über viele
      simulierte Runden) + manuelle Playwright-Verifikation (HP-Balken,
      Status-Badge sichtbar für genau eine Runde, Verarzten-Knopf).

## Erledigt (Ausbaustufe 21) — Prompt-Caching für den System-Prompt

Der System-Prompt (Regeln/Formatvorgabe, ~4000 Token) ist bei jedem Zug
identisch — nur der Spielzustand in der User-Message ändert sich. Cachen
spart bei jedem Zug erneut dieselben Token an Kosten/Latenz.

- [x] `server/ai/anthropicProvider.js`: System-Prompt als eigener
      `cache_control: { type: "ephemeral", ttl: "1h" }`-Textblock statt
      einfachem String — 1h-TTL statt 5-Minuten-Standard, weil zwischen zwei
      Spielzügen (Nachdenken, Tippen) leicht mehr Zeit vergeht. Kurzes Log
      bei Cache-Treffer/-Anlage über `usage.cache_read_input_tokens` /
      `cache_creation_input_tokens`, sonst bliebe die Ersparnis unsichtbar.
- [x] Andere Provider geprüft und dokumentiert statt blind Code ergänzt:
      OpenAI cacht Präfixe ab 1024 Token automatisch (kein Code nötig),
      Gemini 2.x cacht implizit automatisch, DeepSeek cacht automatisch
      (Context Caching on Disk, meldet Treffer über
      `prompt_cache_hit_tokens`). Nur Anthropics stabile API verlangt
      explizites `cache_control` — deshalb einziger Code-Eingriff dort.

## Erledigt (Ausbaustufe 20) — Mehrere Gemini-Modelle einzeln wählbar

Spieler-Feedback: das aktuelle Standard-Gemini-Modell ist im kostenlosen
Kontingent von Google AI Studio schnell limitiert (429) — jedes Gemini-Modell
hat dort aber ein EIGENES, unabhängiges Tageskontingent.

- [x] `server/config.js`: `GEMINI_MODELS` (kommagetrennt, analog zu
      `OPENROUTER_MODELS`) — Standard-Set `gemini-2.5-flash`,
      `gemini-2.5-flash-lite`, `gemini-2.0-flash`, erweiterbar um neuere
      Modell-IDs sobald in AI Studio verfügbar.
- [x] `server/ai/provider.js`: `geminiProviderId()`/`geminiModelFromProvider()`
      — dieselbe Mehrfach-Modell-Fabrik wie bei OpenRouter (`gemini:<model>`
      als eigene Provider-ID). Jedes konfigurierte Modell erscheint einzeln
      im Spielleiter-Menü; kein Frontend-Code nötig, die Provider-Liste im
      UI war schon vollständig generisch.
      Ist das eine Modell limitiert, einfach im Menü auf ein anderes
      wechseln statt zu warten oder auf den lokalen Mock-Fallback
      zurückzufallen.

## Erledigt (Ausbaustufe 19) — Skill-Check für Freitext-Aktionen

Spieler-Feedback: frei getippte Aktionen fühlten sich folgenlos an ("hat
keinen Wert, was man eingibt"). Root Cause gefunden — nicht die KI-Qualität:
`playTurn()` würfelte einen Skill-Check NUR, wenn eine vorformulierte
Auswahlmöglichkeit ein `skillCheck`-Feld hatte. Freitext hatte so ein Feld nie
und bekam deshalb NIE einen Wurf, unabhängig vom Provider (Mock wie auch
echte KI) — "Die Engine würfelt Folgen, nicht der Erzähler" (siehe
eavesdropping.js) galt für Freitext schlicht nicht.

- [x] `server/engine/turn.js`: `inferFreeTextCheck(text)` ordnet Freitext
      deterministisch per Stichwort-Muster einen Skill+DC zu (Kampf,
      Schleichen, Überzeugen, Medizin, Kochen, Schwimmen, Navigation,
      Wahrnehmung, …), inkl. einiger trennbarer Verben ("ich greife … an",
      "ich ziehe mich … zurück"). Zurückhaltende/sichere Formulierungen
      (abwarten, zurückziehen) bekommen bewusst keinen Check; alles andere
      bekommt mindestens eine kleine, faire Standard-Hürde (Wahrnehmung DC 10)
      statt komplett folgenlos zu bleiben.
      Der Freitext-Pfad in `playTurn()` würfelt jetzt genau wie strukturierte
      Auswahlmöglichkeiten VOR dem KI-Aufruf, sodass der Check-Banner,
      kritische Erfolge/Patzer und die Konsequenz-Systeme (Verdacht, Ruf)
      genauso greifen wie bei einer vorformulierten Auswahl.
- [x] Nebenbei gefundenen Bug behoben: `eavesdropping.js` verglich
      `actionSkill === "einschüchtern"` (mit Umlaut) gegen die tatsächliche
      Skill-ID `einschuechtern` (ASCII) — der Vergleich war nie wahr.
- [x] Per Node-Skript und Playwright verifiziert: Freitext löst jetzt
      sichtbar den Check-Banner, die Erzählung des Wurfergebnisses und (bei
      kritischem Erfolg/Kampf) die Manga-FX/Haptik aus — identisch zu
      strukturierten Auswahlmöglichkeiten.

## Erledigt (Ausbaustufe 18) — NPC-Mini-Portraits ("Bekannte Gesichter")

- [x] `server/public/app.js`: `npcFaceSvg(seed, disposition)` erzeugt einen
      deterministischen Chibi-Kopf (Kreis, 4 Frisur-Varianten per Hash,
      Augen leicht versetzt, Mund abhängig von Gesinnung
      lächelnd/neutral/finster) — rein client-seitig, kein Server-Request,
      kein KI-Bild. Dieselbe Person (Name/ID) bekommt über den Hash immer
      dasselbe Gesicht.
- [x] `fill="currentColor"`/`stroke="currentColor"` statt fixer Hex-Töne ->
      passt sich automatisch dem Papier/Tinte-Theme an wie der Rest des UI.
- [x] Eingebunden in Crew- (`#party`) und Gedächtnis-Liste (`#memory`,
      „Bekannte Gesichter") — Crew gilt pauschal als wohlgesinnt, NPCs nutzen
      ihre echte gespeicherte Gesinnung (`n.gesinnung`).

## Erledigt (Ausbaustufe 17) — Mobile Haptik bei kritischen Momenten

- [x] `server/public/app.js`: `playSceneMangaFx()` klassifiziert bereits jede
      dramatische Szene (Kampf/Duell/Explosion, kritischer Erfolg/Sieg,
      kritischer Patzer/entdecktes Risiko, Enthüllung, Ortswechsel) für das
      Manga-FX-Overlay. Dieselbe Einstufung löst jetzt zusätzlich
      `navigator.vibrate(...)` aus — kurzer Doppel-Puls bei "impact"
      (Kampf/Krit-Erfolg), ein längerer Puls bei "danger" (Krit-Patzer/
      entdeckt). Enthüllung/Ortswechsel bleiben rein erzählerisch (keine
      Vibration). Keine doppelte Erkennungslogik, reines No-Op auf Geräten
      ohne Vibration-API (Desktop, iOS Safari).

## Erledigt (Ausbaustufe 16) — Kapitel-Überschriften im Logbuch

Der Story-Log war eine reine Zug-für-Zug-Liste ohne Struktur.

- [x] `server/public/app.js`: `renderScene()` erkennt Tageswechsel
      (`view.day !== lastChapterDay`) und fügt eine Kapitel-Überschrift
      („Kapitel N · Ort" + optionaler Untertitel mit dem aktiven Story-Hook
      am aktuellen Ort) ins Logbuch ein — rein deterministisch, kein
      KI-Text nötig. Feuert genau einmal pro Tag (auch beim ersten Rendern
      nach Spielstart/Wiedereinstieg), nicht bei jedem einzelnen Zug.
- [x] CSS: Kapitel-Trenner im Manga-Bandtitel-Look (gepunktete Linien links/
      rechts vom Titel in Bangers-Schrift, kursiver Untertitel).

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
- [x] **Kampf vertiefen** (siehe Ausbaustufe 22): Gegner können auch Begleiter
      angreifen; Initiative; Statuseffekte; Verarzten im Kampf. Item-Verbrauch
      im Kampf bewusst zurückgestellt (siehe dort, warum).
- [ ] **Inventar-Nutzung**: Items im Zug einsetzen (heilen, Werkzeuge),
      Feilschen/Handel an Orten.
- [ ] **Eigenes Schiff ausbauen**: Werft, Upgrades, Crew-Positionen an Bord.
- [ ] **Speichern/Laden-UI**: Mehrere Spielstände pro Nutzer.

## Claude-Spielleiter härten

- [ ] **Streaming** der Erzählung ins Frontend (schnelleres Gefühl).
- [x] **Prompt-Caching** des System-Prompts (siehe Ausbaustufe 21).
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
