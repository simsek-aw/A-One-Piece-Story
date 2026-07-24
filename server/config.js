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

function commaList(value) {
  return [...new Set(String(value || "").split(",").map((entry) => entry.trim()).filter(Boolean))];
}

const configuredOpenRouterModels = commaList(process.env.OPENROUTER_MODELS);
const defaultOpenRouterModel = process.env.OPENROUTER_MODEL || configuredOpenRouterModels[0] || "openai/gpt-4o-mini";
const openRouterModels = [...new Set([defaultOpenRouterModel, ...configuredOpenRouterModels])];

// Jedes Gemini-Modell hat auf Google AI Studio ein EIGENES kostenloses
// Tageskontingent. Ist das Standardmodell gerade limitiert, hilft nur ein
// Wechsel auf ein anderes Modell mit noch freier Quote — darum erscheinen
// (wie bei OpenRouter) mehrere Modelle einzeln im Spielleiter-Menü statt nur
// eines fix konfigurierten. GEMINI_MODELS um weitere/neuere Modell-IDs
// ergänzen (z. B. eine neuere Generation, sobald in AI Studio verfügbar).
//
// Stand Sommer 2026 zusätzlich zur bewährten 2.5-Generation: die neuere
// 3.x-Generation, bei der (wie schon bei 2.5) die "Lite"-Varianten ein
// deutlich höheres Tageskontingent haben als die Hauptmodelle. Reihenfolge:
// beste Qualität zuerst (3.5/3 Flash), dann die kontingentstarken Lite-
// Varianten, dann die 2.5/2.0-Generation als letztes Sicherheitsnetz, bevor
// überhaupt auf den lokalen Mock-Erzähler zurückgefallen wird. Die genauen
// Modell-IDs sind nach Googles Namensmuster abgeleitet (siehe das
// "gemini-3-pro-image-preview"-Beispiel im @google/genai-SDK) — bei
// Abweichung in Google AI Studio nachsehen und per GEMINI_MODELS überschreiben.
const configuredGeminiModels = commaList(process.env.GEMINI_MODELS);
const defaultGeminiModel = process.env.GEMINI_MODEL || configuredGeminiModels[0] || "gemini-3.5-flash";
const geminiModels = [...new Set([
  defaultGeminiModel,
  ...configuredGeminiModels,
  "gemini-3.5-flash",
  "gemini-3-flash",
  "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite",
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-2.0-flash",
])];

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
    model: defaultGeminiModel,
    // Mehrere Modelle erscheinen einzeln im Spielleiter-Menü (siehe oben) —
    // jedes mit eigenem Kontingent. GEMINI_MODEL bleibt als Standard und für
    // bestehende Deployments kompatibel.
    models: geminiModels,
    // Bildgenerierung über Gemini (z. B. "gemini-2.5-flash-image"). Hat oft
    // ein eigenes, kleineres Kontingent als Text — separat zuschaltbar.
    images: process.env.GEMINI_IMAGES === "1" || process.env.GEMINI_IMAGES === "true",
    imageModel: process.env.GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image",
  },
  openrouter: {
    apiKey: process.env.OPENROUTER_API_KEY || "",
    // Freie Modellwahl, z. B. ein Modell mit ":free"-Endung — siehe
    // https://openrouter.ai/models?max_price=0 für die aktuell kostenlosen.
    model: defaultOpenRouterModel,
    // Mehrere Modelle erscheinen einzeln im Spielleiter-Menü. OPENROUTER_MODEL
    // bleibt als Standard und für bestehende Deployments kompatibel.
    models: openRouterModels,
    // Optional, nur fürs OpenRouter-eigene Ranking (nicht sicherheitsrelevant).
    siteUrl: process.env.OPENROUTER_SITE_URL || "",
    siteName: process.env.OPENROUTER_SITE_NAME || "A One Piece Story",
  },
  deepseek: {
    apiKey: process.env.DEEPSEEK_API_KEY || "",
    model: process.env.DEEPSEEK_MODEL || "deepseek-v4-flash",
  },
  krea: {
    apiKey: process.env.KREA_API_KEY || process.env.KREA_API_TOKEN || "",
    images: process.env.KREA_IMAGES === "1" || process.env.KREA_IMAGES === "true",
    imageModel: process.env.KREA_IMAGE_MODEL || "image/krea/krea-2/medium",
    creativity: process.env.KREA_CREATIVITY || "low",
  },
  // Optional: dauerhafte Spielstände in Supabase. Der Secret-/service_role-Key
  // bleibt ausschließlich auf dem Node-Server und wird nie ans Frontend gegeben.
  supabase: {
    url: process.env.SUPABASE_URL || "",
    secretKey: process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  },
};
