// Echter Spielleiter über die OpenAI-API. Aktiv, wenn AI_PROVIDER=openai gesetzt
// ist UND ein OPENAI_API_KEY vorliegt.
//
// Das SDK wird nur bei Bedarf (lazy) geladen, damit der Mock-Modus ganz ohne
// installiertes "openai" läuft.
//
// Wir nutzen den JSON-Modus (response_format: json_object). Die Antwort wird
// anschließend von engine/schema.js validiert/normalisiert — dieselbe Prüfung
// wie beim Mock und bei Anthropic. Dadurch bleiben wir robust gegenüber kleinen
// Abweichungen und müssen das Schema nicht auf den strengen Structured-Output-
// Teilstandard von OpenAI trimmen.
//
// Prompt-Caching: OpenAI cacht Prompt-Präfixe ab 1024 Token automatisch, ohne
// Code-Änderung nötig — der System-Prompt (system-Message) ist bei jedem Zug
// identisch und damit ein stabiles Präfix. Kein manuelles cache_control wie
// bei Anthropic nötig/verfügbar.

import { buildSystemPrompt } from "./systemPrompt.js";

export class OpenAIProvider {
  constructor({ apiKey, model }) {
    this.apiKey = apiKey;
    this.model = model || "gpt-4o-mini";
    this.system = buildSystemPrompt();
    this._client = null;
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
    this._client = new OpenAI({ apiKey: this.apiKey });
    return this._client;
  }

  async generateScene(context) {
    const client = await this.client();
    const userMessage = this.buildUserMessage(context);

    const response = await client.chat.completions.create({
      model: this.model,
      response_format: { type: "json_object" },
      temperature: 0.85,
      max_tokens: 2200,
      messages: [
        { role: "system", content: this.system },
        { role: "user", content: userMessage },
      ],
    });

    const text = response.choices?.[0]?.message?.content;
    if (!text) throw new Error("OpenAI-Antwort ohne Inhalt.");
    return JSON.parse(text);
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
