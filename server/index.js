// Express-Server: liefert das Frontend aus und stellt die Spiel-API bereit.
import express from "express";
import { config, PUBLIC_DIR } from "./config.js";
import { loadGame, saveGame } from "./store.js";
import { createGame } from "./engine/gameState.js";
import {
  startScene,
  playTurn,
  attemptRecruit,
  doActivity,
  doTravel,
  doEatFruit,
  currentSceneView,
} from "./engine/turn.js";
import { createProvider, activeProviderName } from "./ai/provider.js";
import { listArchetypes, listStartLocations } from "./content/startingScenarios.js";
import { creationRules } from "./engine/character.js";
import { ERA } from "./content/lore.js";
import { locationsForMap, mapEdges } from "./content/map.js";
import { listActivities } from "./content/activities.js";
import { listDevilFruits } from "./content/devilFruits.js";
import { clockConfig } from "./engine/clock.js";

const app = express();
app.use(express.json({ limit: "256kb" }));

const provider = createProvider();
console.log(`[ai] Aktiver Spielleiter-Provider: ${activeProviderName()}`);

// Kleiner Helfer: async-Route mit sauberer Fehlerbehandlung.
const wrap = (fn) => (req, res) => {
  Promise.resolve(fn(req, res)).catch((err) => {
    console.error("[api] Fehler:", err.message);
    res.status(400).json({ error: err.message || "Unbekannter Fehler" });
  });
};

// --- Meta: alles, was das Erstellungs-UI braucht ---
app.get(
  "/api/meta",
  wrap(async (_req, res) => {
    res.json({
      provider: activeProviderName(),
      era: ERA,
      archetypes: listArchetypes(),
      startLocations: listStartLocations(),
      creation: creationRules(),
      map: { locations: locationsForMap(), edges: mapEdges() },
      activities: listActivities(),
      devilFruits: listDevilFruits(),
      clock: clockConfig(),
    });
  }),
);

// --- Neues Spiel anlegen (+ erste Szene) ---
app.post(
  "/api/games",
  wrap(async (req, res) => {
    const { character, startLocationId } = req.body || {};
    const game = createGame({ character, startLocationId });
    await startScene(game, provider);
    saveGame(game);
    res.json(currentSceneView(game));
  }),
);

// --- Spielstand abrufen ---
app.get(
  "/api/games/:id",
  wrap(async (req, res) => {
    const game = loadGame(req.params.id);
    if (!game) return res.status(404).json({ error: "Spielstand nicht gefunden." });
    res.json(currentSceneView(game));
  }),
);

// --- Zug spielen (Auswahl oder Freitext) ---
app.post(
  "/api/games/:id/turn",
  wrap(async (req, res) => {
    const game = loadGame(req.params.id);
    if (!game) return res.status(404).json({ error: "Spielstand nicht gefunden." });
    const { choiceId, freeText } = req.body || {};
    const view = await playTurn(game, provider, { choiceId, freeText });
    saveGame(game);
    res.json(view);
  }),
);

// --- Rekrutierungsversuch ---
app.post(
  "/api/games/:id/recruit",
  wrap(async (req, res) => {
    const game = loadGame(req.params.id);
    if (!game) return res.status(404).json({ error: "Spielstand nicht gefunden." });
    const { npcId } = req.body || {};
    const view = await attemptRecruit(game, provider, { npcId });
    saveGame(game);
    res.json(view);
  }),
);

// --- Ausbildungs-/Fortschritts-Aktivität ---
app.post(
  "/api/games/:id/activity",
  wrap(async (req, res) => {
    const game = loadGame(req.params.id);
    if (!game) return res.status(404).json({ error: "Spielstand nicht gefunden." });
    const view = await doActivity(game, provider, { activityId: req.body?.activityId });
    saveGame(game);
    res.json(view);
  }),
);

// --- Reise zu einem verbundenen Ort ---
app.post(
  "/api/games/:id/travel",
  wrap(async (req, res) => {
    const game = loadGame(req.params.id);
    if (!game) return res.status(404).json({ error: "Spielstand nicht gefunden." });
    const view = await doTravel(game, provider, { destId: req.body?.destId });
    saveGame(game);
    res.json(view);
  }),
);

// --- Teufelsfrucht essen ---
app.post(
  "/api/games/:id/eat-fruit",
  wrap(async (req, res) => {
    const game = loadGame(req.params.id);
    if (!game) return res.status(404).json({ error: "Spielstand nicht gefunden." });
    const view = await doEatFruit(game, provider, { fruitId: req.body?.fruitId });
    saveGame(game);
    res.json(view);
  }),
);

// --- Statisches Frontend ---
app.use(express.static(PUBLIC_DIR));

app.listen(config.port, () => {
  console.log(`\n  A One Piece Story läuft:  http://localhost:${config.port}\n`);
});
