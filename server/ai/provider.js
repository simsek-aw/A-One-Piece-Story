// Provider-Fabrik. Wählt anhand der Konfiguration den KI-Provider.
// Beide Provider erfüllen dasselbe Interface:
//     generateScene(context) -> Promise<GmResponse-artiges Objekt>
// (Das Ergebnis wird anschließend von schema.js validiert.)

import { config } from "../config.js";
import { MockProvider } from "./mockProvider.js";
import { AnthropicProvider } from "./anthropicProvider.js";
import { OpenAIProvider } from "./openaiProvider.js";

export function createProvider() {
  if (config.aiProvider === "anthropic") {
    if (!config.anthropic.apiKey) {
      console.warn(
        "[ai] AI_PROVIDER=anthropic, aber ANTHROPIC_API_KEY fehlt. Fällt auf Mock zurück.",
      );
      return new MockProvider();
    }
    return new AnthropicProvider(config.anthropic);
  }
  if (config.aiProvider === "openai") {
    if (!config.openai.apiKey) {
      console.warn(
        "[ai] AI_PROVIDER=openai, aber OPENAI_API_KEY fehlt. Fällt auf Mock zurück.",
      );
      return new MockProvider();
    }
    return new OpenAIProvider(config.openai);
  }
  return new MockProvider();
}

export function activeProviderName() {
  if (config.aiProvider === "anthropic" && config.anthropic.apiKey) return "anthropic";
  if (config.aiProvider === "openai" && config.openai.apiKey) return "openai";
  return "mock";
}
