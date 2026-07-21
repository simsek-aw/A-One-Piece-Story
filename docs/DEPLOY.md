# Online stellen (kostenlos)

Für „zwei Leute spielen zum Spaß" braucht es keine große Infrastruktur. Wichtig
ist nur zu wissen: **die App ist ein laufender Node-Server**, kein statischer
Export. Sie schreibt Spielstände als JSON-Dateien nach `data/games/`.

Deshalb passt **Vercel** hier eher schlecht: Vercel ist serverless (Funktionen,
kein dauerhafter Prozess, kein beschreibbares Dateisystem). Das würde einen
Umbau der Speicherung auf eine Datenbank erzwingen. Für 2 Personen ist ein
klassischer „kleiner Server" einfacher.

## Empfehlung

| Plattform | Kostenlos | Aufwand | Spielstände bleiben erhalten? |
|-----------|-----------|---------|-------------------------------|
| **Render** (Web Service) | ✅ | sehr gering (dieses Repo verbinden) | ❌ ohne Datenbank; ✅ mit Supabase |
| **Fly.io** (+ Volume) | ✅ (Kreditkarte hinterlegen) | mittel | ✅ (Volume für `data/`) |
| Vercel | ✅ | hoch (Umbau auf DB nötig) | nur mit externer DB |

**Für den Anfang: Render.** Ein Klick-Deploy aus GitHub, öffentliche
`https://…`-URL, keine Codeänderung. Zwei Eigenheiten des Free-Tiers:

1. Der Dienst **schläft nach ~15 Min ohne Besucher ein** → der erste Aufruf
   danach dauert ~30–60 s (Aufwachen). Danach ist er wieder flott.
2. Das **Dateisystem ist flüchtig** → bei jedem Redeploy/Neustart ist der
   Ordner `data/` (die Spielstände) wieder leer. Zum gemeinsamen Ausprobieren
   meist okay; wer Spielstände dauerhaft behalten will, nimmt Fly.io (unten).

   Mit der eingebauten Supabase-Anbindung bleiben Spielstände auf Render
   dauerhaft erhalten: Tabelle und Umgebungsvariablen gemäß
   [`SUPABASE.md`](SUPABASE.md) einrichten.

## Render einrichten (empfohlen)

1. Konto auf <https://render.com> anlegen und GitHub verbinden.
2. **New + → Blueprint** wählen, dieses Repository auswählen. Render liest die
   mitgelieferte `render.yaml` und legt den Web-Service automatisch an.
   (Alternativ **New + → Web Service** manuell: Build `npm install`,
   Start `npm start`, Plan *Free*.)
3. Deploy abwarten → du bekommst eine URL wie
   `https://a-one-piece-story.onrender.com`. Diese teilst du dem 2. Spieler.
4. Optional den **echten KI-Spielleiter** aktivieren: im Render-Dashboard
   unter *Environment* setzen.

   **Empfehlung ohne OpenAI-Guthaben: Google Gemini** (kostenloser
   Kontingent-Tarif über [Google AI Studio](https://aistudio.google.com/apikey)):
   - `AI_PROVIDER = gemini`
   - `GEMINI_API_KEY = <dein Schlüssel>` (als Secret)
   - `GEMINI_MODEL = gemini-2.5-flash` (optional; stabiles Flash-Modell)

   **Oder OpenRouter** — ein Key, Zugriff auf sehr viele Modelle (Claude, GPT,
   Gemini, Llama, DeepSeek, Mistral, …), darunter mehrere komplett kostenlose
   (Modell-IDs mit `:free`-Endung):
   - `AI_PROVIDER = openrouter`
   - `OPENROUTER_API_KEY = <dein Schlüssel>` (als Secret) —
     [openrouter.ai/keys](https://openrouter.ai/keys)
   - `OPENROUTER_MODEL = meta-llama/llama-3.1-8b-instruct:free` (Beispiel;
     aktuelle kostenlose Modelle unter
     [openrouter.ai/models?max_price=0](https://openrouter.ai/models?max_price=0) —
     die Liste ändert sich, einfach eine `:free`-ID eintragen)
   - Nicht jedes Modell hinter OpenRouter hält sich strikt an JSON-Ausgabe;
     der Provider parst deshalb robust (Markdown-Codezäune, Vor-/Nachrede
     werden entfernt) — bei Ausfall eines Modells einfach ein anderes
     `:free`-Modell eintragen.

   **Mit OpenAI-Key:**
   - `AI_PROVIDER = openai`
   - `OPENAI_API_KEY = <dein Schlüssel>` (als Secret)
   - `OPENAI_MODEL = gpt-4o-mini` (optional; `gpt-4o` = mehr Qualität, teurer)

   Alle Anbieter mit gesetztem API-Key erscheinen gleichzeitig im
   Spielleiter-Menü der Web-App. `AI_PROVIDER` bestimmt lediglich die
   Vorauswahl; der gewählte Anbieter wird pro Spielstand gespeichert.

   Alternativ mit Anthropic/Claude: `AI_PROVIDER = anthropic` +
   `ANTHROPIC_API_KEY`. Ohne diese Variablen läuft der deterministische
   Mock-Spielleiter (kostenlos, kein Schlüssel nötig).

5. Optional **echte KI-Bild-Panels** (Szenen, Schlüsselmomente, Profilbild)
   dazuschalten. Zwei Backends, unabhängig vom Text-Spielleiter wählbar:

   **Gemini** (`gemini-2.5-flash-image`, oft im freien Kontingent enthalten —
   Verfügbarkeit/Limits in Google AI Studio prüfen, da sich das ändern kann):
   - `GEMINI_IMAGES = 1`
   - `GEMINI_API_KEY` (derselbe Schlüssel wie oben reicht)
   - `GEMINI_IMAGE_MODEL = gemini-2.5-flash-image` (optional)

   **OpenAI** (`gpt-image-1`, kostet Guthaben pro Bild):
   - `OPENAI_IMAGES = 1`
   - `OPENAI_IMAGE_MODEL = gpt-image-1` (optional)
   - `OPENAI_IMAGE_QUALITY = low` (optional; `medium`/`high` = teurer, schärfer)

   Ist Gemini-Bildgenerierung aktiv, hat sie Vorrang vor OpenAI. Alle Panels
   werden gecacht (Wiederholungen kosten nichts mehr). Ohne aktives Backend
   bleiben die schnellen, kostenlosen SVG-Panels aktiv.

`PORT` musst du nicht setzen — Render gibt ihn vor, die App liest ihn aus.

## Fly.io (wenn Spielstände bleiben sollen)

Fly kann den gleichen Server laufen lassen und ein **kostenloses Volume** an
`data/` hängen, sodass Spielstände Neustarts überleben — ohne Codeänderung.

1. [`flyctl` installieren](https://fly.io/docs/hands-on/install-flyctl/), dann
   `fly auth signup` (Kreditkarte wird hinterlegt, im Free-Kontingent kostenlos).
2. Im Projektordner: `fly launch` (Node wird erkannt; noch **nicht** deployen,
   wenn gefragt). Region wählen.
3. Volume anlegen und im generierten `fly.toml` mounten:
   ```
   fly volumes create ops_data --size 1
   ```
   ```toml
   [[mounts]]
     source = "ops_data"
     destination = "/app/data"
   ```
4. `fly deploy`. Öffentliche URL kommt von `fly open`.
5. Echten Spielleiter analog per `fly secrets set AI_PROVIDER=anthropic ANTHROPIC_API_KEY=…`.

## Hinweis Multiplayer

Aktuell ist der Solo-Kern online spielbar; „gemeinsam im selben Spiel" (geteilte
Welt/Räume in Echtzeit) ist im Datenmodell vorbereitet, aber noch nicht
umgesetzt (siehe ROADMAP.md → Multiplayer). Zwei Personen können aber schon
jetzt je ein eigenes Abenteuer auf derselben URL spielen.
