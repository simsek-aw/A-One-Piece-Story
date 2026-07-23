// Echter Spielleiter über die Google-Gemini-API — kostenlose Alternative zu
// OpenAI/Anthropic (Gemini hat einen großzügigen kostenlosen Kontingent-Tarif
// über Google AI Studio, siehe docs/DEPLOY.md).
//
// Im Auswahlmenü verfügbar, sobald ein GEMINI_API_KEY vorliegt.
// Das SDK ("@google/genai") wird nur bei Bedarf (lazy) geladen.
//
// Kontingent-Kette: `models` ist eine priorisierte Liste (bestes Modell
// zuerst). Meldet ein Modell ein Kontingent-/Ratenlimit (429), wird
// automatisch das nächste Modell der Liste versucht — Lite-Varianten haben
// auf dem kostenlosen Tarif i. d. R. ein deutlich höheres Tageskontingent
// (RPD) als das "Haupt"-Modell, sind also eine sinnvolle Ausweich-Stufe statt
// gleich auf den lokalen Mock-Erzähler zurückzufallen. Andere Fehlerarten
// (ungültige Antwort, Timeout, falscher Key) brechen sofort zum Mock ab —
// die würden bei jedem Modell gleichermaßen auftreten, ein Modellwechsel
// hilft dort nicht.
//
// JSON-Modus über responseMimeType statt einem vollen JSON-Schema (Gemini nutzt
// dafür ein eigenes, engeres Teilformat) — die Antwort wird wie bei den anderen
// Providern von engine/schema.js validiert/normalisiert.
//
// Prompt-Caching: Gemini 2.x cacht wiederholte Prompt-Präfixe implizit und
// automatisch (kein Aufpreis fürs Anlegen, kein eigener Code nötig) — der
// stets identische systemInstruction-Block profitiert davon von selbst.
// Explizites Context-Caching (eigene CachedContent-Ressource) würde eine
// separate Verwaltungslogik brauchen und lohnt sich hier nicht zusätzlich.

import { buildSystemPrompt } from "./systemPrompt.js";
import { MockProvider } from "./mockProvider.js";
import { jsonrepair } from "jsonrepair";

export class GeminiProvider {
  constructor({ apiKey, model, models }) {
    this.apiKey = apiKey;
    // "models" ist die eigentliche Kontingent-Kette; ein einzelnes "model"
    // bleibt für Abwärtskompatibilität/gezielt gepinnte Auswahl unterstützt.
    this.models = models && models.length ? models : [model || "gemini-2.5-flash"];
    this.model = this.models[0];
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
    const userMessage = this.buildUserMessage(context);
    let lastError = null;

    for (let i = 0; i < this.models.length; i++) {
      const model = this.models[i];
      try {
        const client = await this.client();
        const response = await client.models.generateContent({
          model,
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
        lastError = error;
        const isQuotaError = isQuotaExceeded(error);
        const hasNextModel = i < this.models.length - 1;
        if (isQuotaError && hasNextModel) {
          console.warn(`[ai] Gemini-Modell ${model} limitiert (${error.message}), wechsle zu ${this.models[i + 1]}.`);
          continue;
        }
        break; // andere Fehlerarten oder letztes Modell -> Mock-Fallback
      }
    }

    console.warn(`[ai] Gemini-Fallback auf Mock: ${lastError?.message}`);
    const fallback = await this.fallback.generateScene(context);
    return {
      ...fallback,
      providerNotice: {
        provider: "Gemini",
        type: "fallback",
        message: friendlyFallbackReason(lastError),
      },
    };
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

const QUOTA_PATTERN = /429|quota|rate.?limit|resource_exhausted/i;

function isQuotaExceeded(error) {
  return QUOTA_PATTERN.test(String(error?.message || ""));
}

function friendlyFallbackReason(error) {
  const message = String(error?.message || "");
  if (QUOTA_PATTERN.test(message)) return "Kontingent oder Anfragelimit bei allen konfigurierten Modellen vorübergehend erreicht";
  if (/json|parse|syntax/i.test(message)) return "Antwortformat war ungültig";
  if (/timeout|timed out|aborted/i.test(message)) return "Anfrage hat zu lange gedauert";
  return "Anfrage konnte nicht verarbeitet werden";
}
