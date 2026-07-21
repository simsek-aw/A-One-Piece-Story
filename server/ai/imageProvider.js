// Echte KI-Bild-Panels — nicht-blockierend und mit Fallback: Das Spiel zeigt
// sofort das stilisierte SVG-Panel; erst wenn hier ein echtes Bild fertig
// (und gecacht) ist, tauscht das Frontend es aus. Drei austauschbare Backends:
// OpenAI (gpt-image-1) oder Gemini (gemini-2.5-flash-image, kostenloses
// Kontingent über Google AI Studio) oder Krea — welches aktiv ist, entscheidet
// die Config.
//
// Design:
//   - AN nur, wenn ein Backend aktiviert ist (KREA_IMAGES, OPENAI_IMAGES oder GEMINI_IMAGES)
//     UND der passende API-Key vorliegt.
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

// Welches Bild-Backend ist aktiv? Ein explizit aktiviertes Krea-Konto zuerst,
// danach die bisherigen Backends.
function activeImageBackend() {
  if (config.krea.images && config.krea.apiKey) return "krea";
  if (config.gemini.images && config.gemini.apiKey) return "gemini";
  if (config.openai.images && config.openai.apiKey) return "openai";
  return null;
}

export function imagesEnabled() {
  return !!activeImageBackend();
}

export function activeImageBackendName() {
  return { krea: "Krea", gemini: "Gemini", openai: "OpenAI" }[activeImageBackend()] || null;
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

function avatarPrompt(game) {
  const c = game.character || {};
  const look = c.appearance && c.appearance.trim()
    ? c.appearance.trim()
    : `a determined young ${c.archetype || "adventurer"}`;
  // Pro Charakter ein eigenes Porträt (Schlüssel = Spiel-ID).
  return {
    key: `avatar_${game.id}`,
    prompt:
      `Character portrait, shoulder-up, facing the viewer: ${look}. ` +
      `One Piece anime/manga style, expressive face, ${STYLE}.`,
    size: "1024x1024",
  };
}

function hashName(key) {
  return crypto.createHash("md5").update(key).digest("hex") + ".png";
}

function cachedSrc(file) {
  return fs.existsSync(path.join(PANELS_DIR, file)) ? `/panels/${file}` : null;
}

// Läuft, damit dasselbe Motiv nicht mehrfach gleichzeitig generiert wird.
const inFlight = new Map();
let _openaiClient = null;
let _geminiClient = null;

async function openaiClient() {
  if (_openaiClient) return _openaiClient;
  const { default: OpenAI } = await import("openai");
  _openaiClient = new OpenAI({ apiKey: config.openai.apiKey });
  return _openaiClient;
}

async function geminiClient() {
  if (_geminiClient) return _geminiClient;
  const { GoogleGenAI } = await import("@google/genai");
  _geminiClient = new GoogleGenAI({ apiKey: config.gemini.apiKey });
  return _geminiClient;
}

async function generateOpenAI(prompt, size) {
  const c = await openaiClient();
  const result = await c.images.generate({
    model: config.openai.imageModel || "gpt-image-1",
    prompt,
    size: size || "1536x1024",
    quality: config.openai.imageQuality || "low",
    n: 1,
  });
  return result?.data?.[0]?.b64_json || null;
}

async function generateGemini(prompt) {
  const c = await geminiClient();
  const response = await c.models.generateContent({
    model: config.gemini.imageModel || "gemini-2.5-flash-image",
    contents: prompt,
  });
  const parts = response?.candidates?.[0]?.content?.parts || [];
  const imgPart = parts.find((p) => p.inlineData?.data);
  return imgPart?.inlineData?.data || null;
}

export async function generateKrea(prompt, size) {
  const modelPath = String(config.krea.imageModel || "image/krea/krea-2/medium").replace(/^\/+/, "");
  if (!/^image\/[a-z0-9._/-]+$/i.test(modelPath)) throw new Error("Ungültiger Krea-Modellpfad.");
  const creativity = ["raw", "low", "medium", "high"].includes(config.krea.creativity) ? config.krea.creativity : "low";
  const headers = { Authorization: `Bearer ${config.krea.apiKey}`, "Content-Type": "application/json" };
  const createdResponse = await fetch(`https://api.krea.ai/generate/${modelPath}`, {
    method: "POST",
    headers,
    signal: AbortSignal.timeout(30_000),
    body: JSON.stringify({
      prompt,
      aspect_ratio: size === "1024x1024" ? "1:1" : "3:2",
      resolution: "1K",
      creativity,
    }),
  });
  if (!createdResponse.ok) throw new Error(`Krea-Auftrag fehlgeschlagen (${createdResponse.status}).`);
  const created = await createdResponse.json();
  if (!created.job_id) throw new Error("Krea-Antwort ohne Job-ID.");

  const deadline = Date.now() + 90_000;
  let imageUrl = null;
  while (Date.now() < deadline) {
    const jobResponse = await fetch(`https://api.krea.ai/jobs/${encodeURIComponent(created.job_id)}`, {
      headers: { Authorization: `Bearer ${config.krea.apiKey}` },
      signal: AbortSignal.timeout(30_000),
    });
    if (!jobResponse.ok) throw new Error(`Krea-Jobstatus fehlgeschlagen (${jobResponse.status}).`);
    const job = await jobResponse.json();
    if (job.status === "completed") {
      imageUrl = job.result?.urls?.[0] || null;
      break;
    }
    if (["failed", "canceled", "cancelled"].includes(job.status)) throw new Error(`Krea-Job ${job.status}.`);
    await new Promise((resolve) => setTimeout(resolve, 2500));
  }
  if (!imageUrl) throw new Error("Krea-Bildgenerierung hat das Zeitlimit überschritten.");
  const parsedUrl = new URL(imageUrl);
  if (parsedUrl.protocol !== "https:") throw new Error("Krea lieferte eine unsichere Bild-URL.");
  if (parsedUrl.hostname !== "krea.ai" && !parsedUrl.hostname.endsWith(".krea.ai")) {
    throw new Error("Krea lieferte eine Bild-URL außerhalb der Krea-Domain.");
  }
  const imageResponse = await fetch(parsedUrl, { signal: AbortSignal.timeout(30_000) });
  if (!imageResponse.ok) throw new Error(`Krea-Bilddownload fehlgeschlagen (${imageResponse.status}).`);
  const contentType = imageResponse.headers.get("content-type") || "";
  if (!contentType.startsWith("image/")) throw new Error("Krea lieferte keine Bilddatei.");
  const bytes = Buffer.from(await imageResponse.arrayBuffer());
  if (bytes.length > 20 * 1024 * 1024) throw new Error("Das Krea-Bild ist größer als 20 MB.");
  return bytes.toString("base64");
}

// Liefert { src } (Pfad unter /panels/...) oder { src: null } bei Aus/Fehler.
export async function getPanelImage(game, { scope, kind } = {}) {
  const backend = activeImageBackend();
  if (!backend) return { src: null };
  const spec = scope === "moment" ? momentPrompt(kind) : scope === "avatar" ? avatarPrompt(game) : scenePrompt(game);
  const { key, prompt } = spec;
  const file = hashName(`${backend}_${key}`);

  const hit = cachedSrc(file);
  if (hit) return { src: hit };

  if (inFlight.has(key)) return { src: await inFlight.get(key) };

  const task = (async () => {
    try {
      const b64 = backend === "krea"
        ? await generateKrea(prompt, spec.size)
        : backend === "gemini"
          ? await generateGemini(prompt)
          : await generateOpenAI(prompt, spec.size);
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
