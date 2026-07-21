// Echter Spielleiter über OpenRouter — ein Gateway zu sehr vielen Modellen
// (Claude, GPT, Gemini, Llama, DeepSeek, Mistral, …) über EINEN API-Key,
// inklusive mehrerer kostenloser Modelle (Modell-IDs mit ":free"-Endung).
// Aktiv, wenn AI_PROVIDER=openrouter gesetzt ist UND ein OPENROUTER_API_KEY
// vorliegt. Freie Modellwahl über OPENROUTER_MODEL — siehe
// https://openrouter.ai/models (Filter "Free" für aktuell kostenlose Modelle).
//
// OpenRouter ist API-kompatibel zur OpenAI-API (nur andere Basis-URL), darum
// wird hier bewusst dasselbe "openai"-Paket wiederverwendet statt eines
// eigenen HTTP-Clients — keine zusätzliche Abhängigkeit nötig.
//
// Nicht jedes Modell hinter OpenRouter unterstützt strikten JSON-Modus; daher
// robustes Parsen mit Fallback (Markdown-Codezäune entfernen, ersten/letzten
// geschweiften Klammer-Block herausschneiden), bevor engine/schema.js die
// Antwort validiert/normalisiert.

import { buildSystemPrompt } from "./systemPrompt.js";
import { MockProvider } from "./mockProvider.js";
import { jsonrepair } from "jsonrepair";

export class OpenRouterProvider {
  constructor({ apiKey, model, siteUrl, siteName }) {
    this.apiKey = apiKey;
    this.model = model || "openai/gpt-4o-mini";
    this.siteUrl = siteUrl || "";
    this.siteName = siteName || "";
    this.system = buildSystemPrompt();
    this._client = null;
    this.fallback = new MockProvider();
  }

  async client() {
    if (this._client) return this._client;
    let OpenAI;
    try {
      ({ default: OpenAI } = await import("openai"));
    } catch {
      throw new Error(
        "Das Paket 'openai' ist nicht installiert. Führe `npm install` aus oder nutze AI_PROVIDER=mock.",
      );
    }
    // OpenRouter empfiehlt optionale Referer/Title-Header fürs eigene Ranking —
    // rein informativ, keine Pflicht.
    const defaultHeaders = {};
    if (this.siteUrl) defaultHeaders["HTTP-Referer"] = this.siteUrl;
    if (this.siteName) defaultHeaders["X-Title"] = this.siteName;
    this._client = new OpenAI({
      apiKey: this.apiKey,
      baseURL: "https://openrouter.ai/api/v1",
      defaultHeaders,
    });
    return this._client;
  }

  async generateScene(context) {
    try {
      const client = await this.client();
      const userMessage = this.buildUserMessage(context);
      // Etwas weniger Temperatur verbessert bei wechselnden Free-Modellen
      // Grammatik und JSON-Treue, ohne die Szenen völlig glattzubügeln.
      const firstText = await this.requestCompletion(client, userMessage, 0.7);
      try {
        return parseJsonLoose(firstText);
      } catch (firstError) {
        // Der Free-Router wechselt Modelle. Manche liefern trotz JSON-Modus
        // gelegentlich einen fehlenden Trenner oder eine Vorrede. Ein zweiter,
        // nüchterner Versuch verhindert, dass dadurch der ganze Zug scheitert.
        const retryMessage =
          userMessage +
          `\n\nDeine vorige Antwort war kein valides JSON (${firstError.message}). ` +
          "Erzeuge die Szene erneut. Gib ausschließlich ein valides JSON-Objekt aus: keine Markdown-Codeblöcke, keine Kommentare, keine Vorrede.";
        const retryText = await this.requestCompletion(client, retryMessage, 0.2);
        return parseJsonLoose(retryText);
      }
    } catch (error) {
      // Ein fehlerhaftes/überlastetes Free-Modell darf nie einen kompletten
      // Spielzug blockieren. Die Szene fällt sauber auf die lokale Engine zurück.
      console.warn(`[ai] OpenRouter-Fallback auf Mock: ${error.message}`);
      return this.fallback.generateScene(context);
    }
  }

  async requestCompletion(client, userMessage, temperature) {
    const response = await client.chat.completions.create({
      model: this.model,
      response_format: { type: "json_object" },
      temperature,
      max_tokens: 2200,
      messages: [
        { role: "system", content: this.system },
        { role: "user", content: userMessage },
      ],
    });

    const text = response.choices?.[0]?.message?.content;
    if (!text) throw new Error("OpenRouter-Antwort ohne Inhalt.");
    return text;
  }

  buildUserMessage(context) {
    const intro =
      context.kind === "start"
        ? "Erzeuge die ERSTE Szene des Abenteuers passend zu Ort und Archetyp."
        : context.kind === "recruit"
          ? "Der Spieler versucht eine Rekrutierung. Spiele das übergebene checkResult aus."
          : "Setze die Geschichte anhand der Spieleraktion und des checkResult fort.";

    return (
      intro +
      "\n\nAktueller Spielzustand (JSON):\n" +
      JSON.stringify(context, null, 2) +
      "\n\nAntworte ausschließlich mit einem JSON-Objekt im vorgegebenen Format."
    );
  }
}

// Manche Modelle hinter OpenRouter halten sich nicht strikt an den JSON-Modus
// und betten die Antwort z. B. in ```json ... ``` oder mit Vorrede ein.
function parseJsonLoose(text) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  const extracted = start !== -1 && end > start ? text.slice(start, end + 1) : null;
  const candidates = [text, fenced, extracted].filter(Boolean);
  let lastError;
  for (const candidate of candidates) {
    try { return parseObject(candidate); } catch (error) { lastError = error; }
    try { return parseObject(jsonrepair(candidate)); } catch (error) { lastError = error; }
  }
  throw lastError || new Error("OpenRouter-Antwort war kein valides JSON.");
}

function parseObject(text) {
  const value = JSON.parse(text);
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("OpenRouter-Antwort war kein JSON-Objekt.");
  }
  return value;
}
