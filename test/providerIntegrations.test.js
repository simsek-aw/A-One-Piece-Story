import test from "node:test";
import assert from "node:assert/strict";
import { DeepSeekProvider } from "../server/ai/deepseekProvider.js";
import { generateKrea } from "../server/ai/imageProvider.js";
import { GeminiProvider } from "../server/ai/geminiProvider.js";
import { activeProviderName, availableProviders, createProvider } from "../server/ai/provider.js";
import { config } from "../server/config.js";

test("DeepSeek requests JSON output and repairs a nearly valid response", async () => {
  const provider = new DeepSeekProvider({ apiKey: "test", model: "deepseek-v4-flash" });
  let request;
  provider._client = {
    chat: { completions: { create: async (payload) => {
      request = payload;
      return { choices: [{ message: { content: '{"narration":"Test" "choices":[]}' } }] };
    } } },
  };

  const result = await provider.generateScene({ kind: "turn", playerAction: "Ich beobachte." });
  assert.equal(result.narration, "Test");
  assert.equal(request.model, "deepseek-v4-flash");
  assert.deepEqual(request.response_format, { type: "json_object" });
  assert.deepEqual(request.thinking, { type: "disabled" });
});

test("Krea submits, polls and downloads a generated image", async () => {
  const originalFetch = globalThis.fetch;
  const originalKey = config.krea.apiKey;
  const originalModel = config.krea.imageModel;
  const calls = [];
  try {
    config.krea.apiKey = "test-token";
    config.krea.imageModel = "image/krea/krea-2/medium";
    globalThis.fetch = async (url, options = {}) => {
      calls.push({ url: String(url), options });
      if (String(url).includes("/generate/")) return new Response(JSON.stringify({ job_id: "job-1" }), { status: 200 });
      if (String(url).includes("/jobs/")) return new Response(JSON.stringify({ status: "completed", result: { urls: ["https://gen.krea.ai/test.png"] } }), { status: 200 });
      return new Response(new Uint8Array([1, 2, 3]), { status: 200, headers: { "Content-Type": "image/png" } });
    };

    const image = await generateKrea("manga harbor", "1024x1024");
    assert.equal(image, "AQID");
    assert.equal(calls.length, 3);
    assert.equal(JSON.parse(calls[0].options.body).aspect_ratio, "1:1");
    assert.equal(calls[0].options.headers.Authorization, "Bearer test-token");
  } finally {
    globalThis.fetch = originalFetch;
    config.krea.apiKey = originalKey;
    config.krea.imageModel = originalModel;
  }
});

test("Gemini exposes its local fallback instead of failing silently", async () => {
  const provider = new GeminiProvider({ apiKey: "test", model: "test" });
  provider._client = { models: { generateContent: async () => { throw new Error("429 RESOURCE_EXHAUSTED"); } } };
  const result = await provider.generateScene({
    kind: "turn",
    playerAction: "Ich gehe weiter.",
    world: { location: "loguetown", locationName: "Loguetown", locationType: "hafenstadt" },
    continuity: { presentNpcs: [] },
    story: { active: [] },
    status: {},
    memory: { npcs: [] },
  });

  assert.equal(result.providerNotice.type, "fallback");
  assert.match(result.providerNotice.message, /Kontingent|Anfragelimit/);
  assert.ok(result.choices.length > 0);
});

const SCENE_CONTEXT = {
  kind: "turn",
  playerAction: "Ich gehe weiter.",
  world: { location: "loguetown", locationName: "Loguetown", locationType: "hafenstadt" },
  continuity: { presentNpcs: [] },
  story: { active: [] },
  status: {},
  memory: { npcs: [] },
};

// Ein einmaliger Aussetzer (Timeout, Netzwerkhänger, kaputtes JSON) soll nicht
// sofort die Immersion zerstören ("Szene wurde mit dem lokalen Ersatz-Erzähler
// gesichert") — ein zweiter Versuch auf demselben Modell löst das oft schon.
test("Gemini retries once on a transient error before falling back", async () => {
  const provider = new GeminiProvider({ apiKey: "test", model: "test" });
  let calls = 0;
  provider._client = {
    models: {
      generateContent: async () => {
        calls += 1;
        if (calls === 1) throw new Error("timeout while waiting for response");
        return { text: JSON.stringify({ narration: "Zweiter Versuch klappt.", choices: [] }) };
      },
    },
  };

  const result = await provider.generateScene(SCENE_CONTEXT);
  assert.equal(calls, 2);
  assert.equal(result.narration, "Zweiter Versuch klappt.");
  assert.equal(result.providerNotice, undefined);
});

// Ein Auth-/Konfigurationsfehler wiederholt sich garantiert identisch — ein
// Retry würde nur Zeit verschwenden und sollte übersprungen werden.
test("Gemini skips the retry for a permanent auth/config error", async () => {
  const provider = new GeminiProvider({ apiKey: "test", model: "test" });
  let calls = 0;
  provider._client = {
    models: { generateContent: async () => { calls += 1; throw new Error("403 PERMISSION_DENIED: API key not valid"); } },
  };

  const result = await provider.generateScene(SCENE_CONTEXT);
  assert.equal(calls, 1);
  assert.equal(result.providerNotice.type, "fallback");
});

// Bleibt ein transienter Fehler auch nach dem Retry bestehen, soll die
// bestehende Modell-Kaskade weiterhin greifen, statt sofort aufzugeben.
test("Gemini falls through to the next model after exhausting retries on a transient error", async () => {
  const provider = new GeminiProvider({ apiKey: "test", models: ["model-a", "model-b"] });
  const callsPerModel = { "model-a": 0, "model-b": 0 };
  provider._client = {
    models: {
      generateContent: async ({ model }) => {
        callsPerModel[model] += 1;
        if (model === "model-a") throw new Error("timeout while waiting for response");
        return { text: JSON.stringify({ narration: "Modell b rettet die Szene.", choices: [] }) };
      },
    },
  };

  const result = await provider.generateScene(SCENE_CONTEXT);
  assert.equal(callsPerModel["model-a"], 2); // 1 Versuch + 1 Retry
  assert.equal(callsPerModel["model-b"], 1);
  assert.equal(result.narration, "Modell b rettet die Szene.");
});

test("multiple OpenRouter models become separate selectable providers", () => {
  const original = {
    apiKey: config.openrouter.apiKey,
    model: config.openrouter.model,
    models: config.openrouter.models,
    aiProvider: config.aiProvider,
  };
  try {
    config.openrouter.apiKey = "test";
    config.openrouter.model = "google/gemma-4-26b-a4b-it:free";
    config.openrouter.models = ["google/gemma-4-26b-a4b-it:free", "poolside/laguna-s-2.1:free"];
    config.aiProvider = "openrouter";

    const entries = availableProviders().filter((entry) => entry.id.startsWith("openrouter:"));
    assert.deepEqual(entries.map((entry) => entry.id), [
      "openrouter:google/gemma-4-26b-a4b-it:free",
      "openrouter:poolside/laguna-s-2.1:free",
    ]);
    assert.equal(activeProviderName(), entries[0].id);
    assert.equal(createProvider(entries[1].id).model, "poolside/laguna-s-2.1:free");
  } finally {
    config.openrouter.apiKey = original.apiKey;
    config.openrouter.model = original.model;
    config.openrouter.models = original.models;
    config.aiProvider = original.aiProvider;
  }
});
