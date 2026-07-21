// Provider-Fabrik. AI_PROVIDER bestimmt nur den Standard; alle Anbieter mit
// konfiguriertem Key können parallel erstellt und pro Spielstand gewählt werden.
// Alle Provider erfüllen dasselbe Interface:
//     generateScene(context) -> Promise<GmResponse-artiges Objekt>
// (Das Ergebnis wird anschließend von schema.js validiert.)

import { config } from "../config.js";
import { MockProvider } from "./mockProvider.js";
import { AnthropicProvider } from "./anthropicProvider.js";
import { OpenAIProvider } from "./openaiProvider.js";
import { GeminiProvider } from "./geminiProvider.js";
import { OpenRouterProvider } from "./openrouterProvider.js";

const LABELS = {
  mock: "Lokal",
  gemini: "Gemini",
  openrouter: "OpenRouter",
  openai: "OpenAI",
  anthropic: "Claude",
};

export function createProvider(requestedProvider = config.aiProvider) {
  const providerName = String(requestedProvider || "mock").toLowerCase();
  if (providerName === "anthropic") {
    if (!config.anthropic.apiKey) {
      console.warn(
        "[ai] AI_PROVIDER=anthropic, aber ANTHROPIC_API_KEY fehlt. Fällt auf Mock zurück.",
      );
      return new MockProvider();
    }
    return new AnthropicProvider(config.anthropic);
  }
  if (providerName === "openai") {
    if (!config.openai.apiKey) {
      console.warn(
        "[ai] AI_PROVIDER=openai, aber OPENAI_API_KEY fehlt. Fällt auf Mock zurück.",
      );
      return new MockProvider();
    }
    return new OpenAIProvider(config.openai);
  }
  if (providerName === "gemini") {
    if (!config.gemini.apiKey) {
      console.warn(
        "[ai] AI_PROVIDER=gemini, aber GEMINI_API_KEY fehlt. Fällt auf Mock zurück.",
      );
      return new MockProvider();
    }
    return new GeminiProvider(config.gemini);
  }
  if (providerName === "openrouter") {
    if (!config.openrouter.apiKey) {
      console.warn(
        "[ai] AI_PROVIDER=openrouter, aber OPENROUTER_API_KEY fehlt. Fällt auf Mock zurück.",
      );
      return new MockProvider();
    }
    return new OpenRouterProvider(config.openrouter);
  }
  return new MockProvider();
}

export function activeProviderName() {
  if (config.aiProvider === "anthropic" && config.anthropic.apiKey) return "anthropic";
  if (config.aiProvider === "openai" && config.openai.apiKey) return "openai";
  if (config.aiProvider === "gemini" && config.gemini.apiKey) return "gemini";
  if (config.aiProvider === "openrouter" && config.openrouter.apiKey) return "openrouter";
  return "mock";
}

export function availableProviders() {
  const providers = [{ id: "mock", label: LABELS.mock, model: "regelbasierter Ersatz-Erzähler" }];
  if (config.gemini.apiKey) providers.push({ id: "gemini", label: LABELS.gemini, model: config.gemini.model });
  if (config.openrouter.apiKey) providers.push({ id: "openrouter", label: LABELS.openrouter, model: config.openrouter.model });
  if (config.openai.apiKey) providers.push({ id: "openai", label: LABELS.openai, model: config.openai.model });
  if (config.anthropic.apiKey) providers.push({ id: "anthropic", label: LABELS.anthropic, model: config.anthropic.model });
  return providers;
}
