// Echter Spielleiter über die Google-Gemini-API — kostenlose Alternative zu
// OpenAI/Anthropic (Gemini hat einen großzügigen kostenlosen Kontingent-Tarif
// über Google AI Studio, siehe docs/DEPLOY.md).
//
// Im Auswahlmenü verfügbar, sobald ein GEMINI_API_KEY vorliegt.
// Das SDK ("@google/genai") wird nur bei Bedarf (lazy) geladen.
//
// JSON-Modus über responseMimeType statt einem vollen JSON-Schema (Gemini nutzt
// dafür ein eigenes, engeres Teilformat) — die Antwort wird wie bei den anderen
// Providern von engine/schema.js validiert/normalisiert.

import { buildSystemPrompt } from "./systemPrompt.js";
import { MockProvider } from "./mockProvider.js";
import { jsonrepair } from "jsonrepair";

export class GeminiProvider {
  constructor({ apiKey, model }) {
    this.apiKey = apiKey;
    this.model = model || "gemini-2.5-flash";
    this.system = buildSystemPrompt();
    this._client = null;
    this.fallback = new MockProvider();
  }

  async client() {
    if (this._client) return this._client;
    let GoogleGenAI;
    try {
      ({ GoogleGenAI } = await import("@google/genai"));
    } catch {
      throw new Error(
        "Das Paket '@google/genai' ist nicht installiert. Führe `npm install` aus oder nutze AI_PROVIDER=mock.",
      );
    }
    this._client = new GoogleGenAI({ apiKey: this.apiKey });
    return this._client;
  }

  async generateScene(context) {
    try {
      const client = await this.client();
      const userMessage = this.buildUserMessage(context);
      const response = await client.models.generateContent({
        model: this.model,
        contents: userMessage,
        config: {
          systemInstruction: this.system,
          responseMimeType: "application/json",
          temperature: 0.7,
        },
      });

      const text = response.text;
      if (!text) throw new Error("Gemini-Antwort ohne Inhalt.");
      try {
        return JSON.parse(text);
      } catch {
        return JSON.parse(jsonrepair(text));
      }
    } catch (error) {
      console.warn(`[ai] Gemini-Fallback auf Mock: ${error.message}`);
      const fallback = await this.fallback.generateScene(context);
      return {
        ...fallback,
        providerNotice: {
          provider: "Gemini",
          type: "fallback",
          message: friendlyFallbackReason(error),
        },
      };
    }
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

function friendlyFallbackReason(error) {
  const message = String(error?.message || "");
  if (/429|quota|rate.?limit|resource_exhausted/i.test(message)) return "Kontingent oder Anfragelimit vorübergehend erreicht";
  if (/json|parse|syntax/i.test(message)) return "Antwortformat war ungültig";
  if (/timeout|timed out|aborted/i.test(message)) return "Anfrage hat zu lange gedauert";
  return "Anfrage konnte nicht verarbeitet werden";
}
