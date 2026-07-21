// Echte KI-Bild-Panels über die OpenAI-Bild-API — nicht-blockierend und mit
// Fallback: Das Spiel zeigt sofort das stilisierte SVG-Panel; erst wenn hier ein
// echtes Bild fertig (und gecacht) ist, tauscht das Frontend es aus.
//
// Design:
//   - AN nur, wenn OPENAI_IMAGES=1 UND ein OPENAI_API_KEY vorliegt.
//   - Gecacht auf Platte (data/panels/<hash>.png) und über /panels/ ausgeliefert.
//     Wiederholte Motive kosten dann nichts mehr.
//   - Schlüssel bewusst grob (Szene: Ort+Tag/Nacht; Moment: nur die Art), damit
//     die Gesamtkosten für 2 Gelegenheitsspieler winzig bleiben.
//   - Jeder Fehler (kein Guthaben, Modell gesperrt, Timeout) => null => SVG bleibt.
//
// Stil: strenges Schwarz-Weiß-Manga, passend zum UI-Look.

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { config, DATA_DIR } from "../config.js";
import { LOCATIONS } from "../content/map.js";

export const PANELS_DIR = path.join(DATA_DIR, "panels");

export function imagesEnabled() {
  return !!(config.openai.images && config.openai.apiKey);
}

const STYLE =
  "black and white manga panel, screentone shading, bold ink linework, " +
  "dynamic composition, high contrast, dramatic, no text, no speech bubbles, no lettering, no watermark";

const MOMENT_DESC = {
  ankunft: "a lone traveler arriving at a new harbor town, establishing entrance",
  spannung: "everyone in a tavern turning to stare at a newcomer in the doorway, tense silence",
  explosion: "a massive explosion with debris and smoke, shockwave lines",
  duell: "two figures facing off in a tense duel, weapons drawn",
  crew: "a small pirate crew standing together beneath a flag, low-angle heroic shot",
  enthuellung: "a shocking revelation, dramatic light falling on an ancient stone with carvings",
  nacht: "a quiet moonlit night over rooftops, stars and deep shadows",
  see: "a small sailing ship on the open sea, big sky, distant horizon",
  sieg: "a victorious figure standing triumphant, arms raised, radiating lines",
};

function scenePrompt(game) {
  const loc = LOCATIONS[game.world.location];
  const name = loc?.name || game.world.locationName || "a harbor town";
  const type = loc?.type || "town";
  const night = (game.world.day || 1) % 4 === 0;
  return {
    key: `scene_${game.world.location}_${night ? "night" : "day"}`,
    prompt: `Wide establishing shot of ${name}, a ${type} in a pirate-age world, ${night ? "at night" : "in daylight"}. ${STYLE}.`,
  };
}

function momentPrompt(kind) {
  const desc = MOMENT_DESC[kind] || MOMENT_DESC.spannung;
  return { key: `moment_${kind || "spannung"}`, prompt: `${desc}. ${STYLE}.` };
}

function hashName(key) {
  return crypto.createHash("md5").update(key).digest("hex") + ".png";
}

function cachedSrc(file) {
  return fs.existsSync(path.join(PANELS_DIR, file)) ? `/panels/${file}` : null;
}

// Läuft, damit dasselbe Motiv nicht mehrfach gleichzeitig generiert wird.
const inFlight = new Map();
let _client = null;

async function client() {
  if (_client) return _client;
  const { default: OpenAI } = await import("openai");
  _client = new OpenAI({ apiKey: config.openai.apiKey });
  return _client;
}

// Liefert { src } (Pfad unter /panels/...) oder { src: null } bei Aus/Fehler.
export async function getPanelImage(game, { scope, kind } = {}) {
  if (!imagesEnabled()) return { src: null };
  const { key, prompt } = scope === "moment" ? momentPrompt(kind) : scenePrompt(game);
  const file = hashName(key);

  const hit = cachedSrc(file);
  if (hit) return { src: hit };

  if (inFlight.has(key)) return { src: await inFlight.get(key) };

  const task = (async () => {
    try {
      const c = await client();
      const result = await c.images.generate({
        model: config.openai.imageModel || "gpt-image-1",
        prompt,
        size: "1536x1024",
        quality: config.openai.imageQuality || "low",
        n: 1,
      });
      const b64 = result?.data?.[0]?.b64_json;
      if (!b64) return null;
      fs.mkdirSync(PANELS_DIR, { recursive: true });
      fs.writeFileSync(path.join(PANELS_DIR, file), Buffer.from(b64, "base64"));
      return `/panels/${file}`;
    } catch (err) {
      console.warn("[img] Panel-Generierung fehlgeschlagen:", err.message);
      return null;
    } finally {
      inFlight.delete(key);
    }
  })();

  inFlight.set(key, task.then((src) => src));
  return { src: await task };
}
