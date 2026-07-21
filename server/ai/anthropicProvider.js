// Echter Spielleiter über die Claude-API. Vorbereitet, aber erst aktiv, wenn
// AI_PROVIDER=anthropic gesetzt ist UND ein ANTHROPIC_API_KEY vorliegt.
//
// Das SDK wird nur bei Bedarf (lazy) geladen, damit der Mock-Modus ganz ohne
// installiertes @anthropic-ai/sdk läuft.
//
// Umsetzung nach aktueller Claude-API-Praxis (Stand: Modell claude-opus-4-8):
//   - adaptive Thinking
//   - strukturierte Ausgabe via output_config.format (JSON-Schema)  -> garantiert
//     ein Antwortobjekt im GM-Vertragsformat (siehe engine/schema.js)

import { buildSystemPrompt } from "./systemPrompt.js";
import { GM_JSON_SCHEMA } from "../engine/schema.js";

export class AnthropicProvider {
  constructor({ apiKey, model }) {
    this.apiKey = apiKey;
    this.model = model || "claude-opus-4-8";
    this.system = buildSystemPrompt();
    this._client = null;
  }

  async client() {
    if (this._client) return this._client;
    let Anthropic;
    try {
      ({ default: Anthropic } = await import("@anthropic-ai/sdk"));
    } catch {
      throw new Error(
        "@anthropic-ai/sdk ist nicht installiert. Führe `npm install` aus oder nutze AI_PROVIDER=mock.",
      );
    }
    this._client = new Anthropic({ apiKey: this.apiKey });
    return this._client;
  }

  async generateScene(context) {
    const client = await this.client();

    const userMessage = this.buildUserMessage(context);

    const response = await client.messages.create({
      model: this.model,
      max_tokens: 4000,
      thinking: { type: "adaptive" },
      output_config: {
        format: { type: "json_schema", schema: GM_JSON_SCHEMA },
      },
      system: this.system,
      messages: [{ role: "user", content: userMessage }],
    });

    // Bei output_config.format enthält der erste Text-Block gültiges JSON.
    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock) throw new Error("Claude-Antwort ohne Textblock.");
    return JSON.parse(textBlock.text);
  }

  buildUserMessage(context) {
    // Wir übergeben den Kontext als kompaktes JSON plus eine kurze Anweisung.
    // Der System-Prompt enthält die Regeln; hier nur der Ist-Zustand.
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
      "\n\nAntworte ausschließlich im vorgegebenen JSON-Format."
    );
  }
}
