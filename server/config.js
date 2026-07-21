// Zentrale Konfiguration. Liest optional eine .env-Datei ein (ohne externe
// Abhängigkeit), damit das Projekt auch ohne "dotenv" läuft.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT_DIR = path.resolve(__dirname, "..");
export const DATA_DIR = path.join(ROOT_DIR, "data");
export const PUBLIC_DIR = path.join(__dirname, "public");

// Minimaler .env-Parser: KEY=VALUE pro Zeile, # als Kommentar.
function loadDotEnv() {
  const envPath = path.join(ROOT_DIR, ".env");
  if (!fs.existsSync(envPath)) return;
  const text = fs.readFileSync(envPath, "utf8");
  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    const value = line.slice(eq + 1).trim();
    if (!(key in process.env)) process.env[key] = value;
  }
}
loadDotEnv();

export const config = {
  port: Number(process.env.PORT || 3000),
  aiProvider: (process.env.AI_PROVIDER || "mock").toLowerCase(),
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY || "",
    model: process.env.ANTHROPIC_MODEL || "claude-opus-4-8",
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY || "",
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    // Bildgenerierung (Panels). Standard aus, weil sie Zeit/Geld kostet.
    images: process.env.OPENAI_IMAGES === "1" || process.env.OPENAI_IMAGES === "true",
    imageModel: process.env.OPENAI_IMAGE_MODEL || "gpt-image-1",
    imageQuality: process.env.OPENAI_IMAGE_QUALITY || "low", // low|medium|high
  },
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "",
    model: process.env.GEMINI_MODEL || "gemini-2.0-flash",
    // Bildgenerierung über Gemini (z. B. "gemini-2.5-flash-image"). Hat oft
    // ein eigenes, kleineres Kontingent als Text — separat zuschaltbar.
    images: process.env.GEMINI_IMAGES === "1" || process.env.GEMINI_IMAGES === "true",
    imageModel: process.env.GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image",
  },
};
