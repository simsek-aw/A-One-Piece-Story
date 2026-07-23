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
import { DeepSeekProvider } from "./deepseekProvider.js";

const LABELS = {
  mock: "Lokal",
  gemini: "Gemini",
  openrouter: "OpenRouter",
  deepseek: "DeepSeek",
  openai: "OpenAI",
  anthropic: "Claude",
};

const OPENROUTER_PREFIX = "openrouter:";
const GEMINI_PREFIX = "gemini:";

export function openRouterProviderId(model = config.openrouter.model) {
  return `${OPENROUTER_PREFIX}${String(model).trim().toLowerCase()}`;
}

function openRouterModelFromProvider(providerName) {
  return providerName.startsWith(OPENROUTER_PREFIX) ? providerName.slice(OPENROUTER_PREFIX.length) : null;
}

function openRouterLabel(model) {
  const slug = String(model).split("/").at(-1) || model;
  return `OpenRouter · ${slug.replace(/:free$/i, "")} ${/:free$/i.test(slug) ? "(free)" : ""}`.trim();
}

export function geminiProviderId(model = config.gemini.model) {
  return `${GEMINI_PREFIX}${String(model).trim().toLowerCase()}`;
}

function geminiModelFromProvider(providerName) {
  return providerName.startsWith(GEMINI_PREFIX) ? providerName.slice(GEMINI_PREFIX.length) : null;
}

function geminiLabel(model) {
  return `Gemini · ${String(model).replace(/^gemini-/, "")}`;
}

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
  if (providerName === "gemini" || providerName.startsWith(GEMINI_PREFIX)) {
    if (!config.gemini.apiKey) {
      console.warn(
        "[ai] AI_PROVIDER=gemini, aber GEMINI_API_KEY fehlt. Fällt auf Mock zurück.",
      );
      return new MockProvider();
    }
    const model = geminiModelFromProvider(providerName) || config.gemini.model;
    return new GeminiProvider({ ...config.gemini, model });
  }
  if (providerName === "openrouter" || providerName.startsWith(OPENROUTER_PREFIX)) {
    if (!config.openrouter.apiKey) {
      console.warn(
        "[ai] AI_PROVIDER=openrouter, aber OPENROUTER_API_KEY fehlt. Fällt auf Mock zurück.",
      );
      return new MockProvider();
    }
    const model = openRouterModelFromProvider(providerName) || config.openrouter.model;
    return new OpenRouterProvider({ ...config.openrouter, model });
  }
  if (providerName === "deepseek") {
    if (!config.deepseek.apiKey) {
      console.warn("[ai] AI_PROVIDER=deepseek, aber DEEPSEEK_API_KEY fehlt. Fällt auf Mock zurück.");
      return new MockProvider();
    }
    return new DeepSeekProvider(config.deepseek);
  }
  return new MockProvider();
}

export function activeProviderName() {
  if (config.aiProvider === "anthropic" && config.anthropic.apiKey) return "anthropic";
  if (config.aiProvider === "openai" && config.openai.apiKey) return "openai";
  if ((config.aiProvider === "gemini" || config.aiProvider.startsWith(GEMINI_PREFIX)) && config.gemini.apiKey) {
    const requestedModel = geminiModelFromProvider(config.aiProvider);
    const model = requestedModel && config.gemini.models.map((entry) => entry.toLowerCase()).includes(requestedModel)
      ? requestedModel
      : config.gemini.model;
    return geminiProviderId(model);
  }
  if ((config.aiProvider === "openrouter" || config.aiProvider.startsWith(OPENROUTER_PREFIX)) && config.openrouter.apiKey) {
    const requestedModel = openRouterModelFromProvider(config.aiProvider);
    const model = requestedModel && config.openrouter.models.map((entry) => entry.toLowerCase()).includes(requestedModel)
      ? requestedModel
      : config.openrouter.model;
    return openRouterProviderId(model);
  }
  if (config.aiProvider === "deepseek" && config.deepseek.apiKey) return "deepseek";
  return "mock";
}

export function availableProviders() {
  const providers = [{ id: "mock", label: LABELS.mock, model: "regelbasierter Ersatz-Erzähler" }];
  if (config.gemini.apiKey) {
    config.gemini.models.forEach((model) => providers.push({ id: geminiProviderId(model), label: geminiLabel(model), model }));
  }
  if (config.openrouter.apiKey) {
    config.openrouter.models.forEach((model) => providers.push({ id: openRouterProviderId(model), label: openRouterLabel(model), model }));
  }
  if (config.deepseek.apiKey) providers.push({ id: "deepseek", label: LABELS.deepseek, model: config.deepseek.model });
  if (config.openai.apiKey) providers.push({ id: "openai", label: LABELS.openai, model: config.openai.model });
  if (config.anthropic.apiKey) providers.push({ id: "anthropic", label: LABELS.anthropic, model: config.anthropic.model });
  return providers;
}
