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
| **Render** (Web Service) | ✅ | sehr gering (dieses Repo verbinden) | ❌ werden bei Redeploy/Aufwachen zurückgesetzt |
| **Fly.io** (+ Volume) | ✅ (Kreditkarte hinterlegen) | mittel | ✅ (Volume für `data/`) |
| Vercel | ✅ | hoch (Umbau auf DB nötig) | nur mit externer DB |

**Für den Anfang: Render.** Ein Klick-Deploy aus GitHub, öffentliche
`https://…`-URL, keine Codeänderung. Zwei Eigenheiten des Free-Tiers:

1. Der Dienst **schläft nach ~15 Min ohne Besucher ein** → der erste Aufruf
   danach dauert ~30–60 s (Aufwachen). Danach ist er wieder flott.
2. Das **Dateisystem ist flüchtig** → bei jedem Redeploy/Neustart ist der
   Ordner `data/` (die Spielstände) wieder leer. Zum gemeinsamen Ausprobieren
   meist okay; wer Spielstände dauerhaft behalten will, nimmt Fly.io (unten).

## Render einrichten (empfohlen)

1. Konto auf <https://render.com> anlegen und GitHub verbinden.
2. **New + → Blueprint** wählen, dieses Repository auswählen. Render liest die
   mitgelieferte `render.yaml` und legt den Web-Service automatisch an.
   (Alternativ **New + → Web Service** manuell: Build `npm install`,
   Start `npm start`, Plan *Free*.)
3. Deploy abwarten → du bekommst eine URL wie
   `https://a-one-piece-story.onrender.com`. Diese teilst du dem 2. Spieler.
4. Optional den **echten KI-Spielleiter** aktivieren: im Render-Dashboard
   unter *Environment* setzen. **Mit OpenAI-Key:**
   - `AI_PROVIDER = openai`
   - `OPENAI_API_KEY = <dein Schlüssel>` (als Secret)
   - `OPENAI_MODEL = gpt-4o-mini` (optional; `gpt-4o` = mehr Qualität, teurer)

   Alternativ mit Anthropic/Claude: `AI_PROVIDER = anthropic` +
   `ANTHROPIC_API_KEY`. Ohne diese Variablen läuft der deterministische
   Mock-Spielleiter (kostenlos, kein Schlüssel nötig).

5. Optional **echte KI-Bild-Panels** (Szenen, Schlüsselmomente, Profilbild)
   dazuschalten — kostet OpenAI-Guthaben pro generiertem Bild, ist aber
   gecacht (Wiederholungen sind gratis):
   - `OPENAI_IMAGES = 1`
   - `OPENAI_IMAGE_MODEL = gpt-image-1` (optional)
   - `OPENAI_IMAGE_QUALITY = low` (optional; `medium`/`high` = teurer, schärfer)
   Ohne `OPENAI_IMAGES=1` bleiben die schnellen, kostenlosen SVG-Panels aktiv.

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
