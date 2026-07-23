// DeepSeek-Spielleiter über die OpenAI-kompatible Chat-Completions-API.
// Im Auswahlmenü verfügbar, sobald DEEPSEEK_API_KEY gesetzt ist.
//
// Prompt-Caching: DeepSeek cacht wiederholte Prompt-Präfixe automatisch
// (Context Caching on Disk) und meldet Cache-Treffer über
// prompt_cache_hit_tokens/prompt_cache_miss_tokens im usage-Objekt — kein
// eigener Code nötig, der stets identische System-Prompt profitiert von selbst.

import { buildSystemPrompt } from "./systemPrompt.js";
import { MockProvider } from "./mockProvider.js";
import { jsonrepair } from "jsonrepair";

export class DeepSeekProvider {
  constructor({ apiKey, model }) {
    this.apiKey = apiKey;
    this.model = model || "deepseek-v4-flash";
    this.system = buildSystemPrompt();
    this._client = null;
    this.fallback = new MockProvider();
  }

  async client() {
    if (this._client) return this._client;
    const { default: OpenAI } = await import("openai");
    this._client = new OpenAI({ apiKey: this.apiKey, baseURL: "https://api.deepseek.com" });
    return this._client;
  }

  async generateScene(context) {
    try {
      const client = await this.client();
      const userMessage = this.buildUserMessage(context);
      const firstText = await this.requestCompletion(client, userMessage, 0.7);
      try {
        return parseDeepSeekJson(firstText);
      } catch (firstError) {
        const retryMessage = `${userMessage}\n\nDie vorige Antwort war leer oder kein valides JSON (${firstError.message}). Erzeuge sie erneut und gib ausschließlich das JSON-Objekt aus.`;
        return parseDeepSeekJson(await this.requestCompletion(client, retryMessage, 0.2));
      }
    } catch (error) {
      console.warn(`[ai] DeepSeek-Fallback auf Mock: ${error.message}`);
      return this.fallback.generateScene(context);
    }
  }

  async requestCompletion(client, userMessage, temperature) {
    const response = await client.chat.completions.create({
      model: this.model,
      response_format: { type: "json_object" },
      temperature,
      max_tokens: 2600,
      thinking: { type: "disabled" },
      messages: [
        { role: "system", content: this.system },
        { role: "user", content: userMessage },
      ],
    });
    return response.choices?.[0]?.message?.content || "";
  }

  buildUserMessage(context) {
    const intro = context.kind === "start"
      ? "Erzeuge die ERSTE Szene des Abenteuers passend zu Ort und Archetyp."
      : context.kind === "recruit"
        ? "Der Spieler versucht eine Rekrutierung. Spiele das übergebene checkResult aus."
        : "Setze die Geschichte anhand der Spieleraktion und des checkResult fort.";
    return `${intro}\n\nAktueller Spielzustand (JSON):\n${JSON.stringify(context, null, 2)}\n\nAntworte ausschließlich mit einem validen JSON-Objekt im vorgegebenen Format.`;
  }
}

function parseDeepSeekJson(text) {
  if (!text) throw new Error("DeepSeek-Antwort ohne Inhalt.");
  try {
    return JSON.parse(text);
  } catch {
    return JSON.parse(jsonrepair(text));
  }
}
