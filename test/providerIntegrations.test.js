import test from "node:test";
import assert from "node:assert/strict";
import { DeepSeekProvider } from "../server/ai/deepseekProvider.js";
import { generateKrea } from "../server/ai/imageProvider.js";
import { GeminiProvider } from "../server/ai/geminiProvider.js";
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
