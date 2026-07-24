import test from "node:test";
import assert from "node:assert/strict";
import { config } from "../server/config.js";
import { ttsEnabled, trimForSpeech, pcmToWav, buildSpeechPrompt, synthesizeSpeech } from "../server/ai/ttsProvider.js";

test("ttsEnabled requires both the GEMINI_TTS flag and an API key", () => {
  const original = { tts: config.gemini.tts, apiKey: config.gemini.apiKey };
  try {
    config.gemini.tts = false;
    config.gemini.apiKey = "test-key";
    assert.equal(ttsEnabled(), false);

    config.gemini.tts = true;
    config.gemini.apiKey = "";
    assert.equal(ttsEnabled(), false);

    config.gemini.tts = true;
    config.gemini.apiKey = "test-key";
    assert.equal(ttsEnabled(), true);
  } finally {
    config.gemini.tts = original.tts;
    config.gemini.apiKey = original.apiKey;
  }
});

test("synthesizeSpeech returns no audio when TTS is disabled, without attempting a network call", async () => {
  const original = { tts: config.gemini.tts };
  try {
    config.gemini.tts = false;
    const result = await synthesizeSpeech("Ein Testsatz.");
    assert.deepEqual(result, { audio: null });
  } finally {
    config.gemini.tts = original.tts;
  }
});

test("trimForSpeech passes short text through unchanged", () => {
  const text = "Ein kurzer Satz für die Sprachausgabe.";
  assert.equal(trimForSpeech(text), text);
});

test("trimForSpeech cuts long text at the last sentence boundary instead of mid-word", () => {
  const sentence = "Der Hafen liegt ruhig im Morgenlicht und die Möwen kreisen träge über den Kais. ";
  const long = sentence.repeat(20); // deutlich über der 900-Zeichen-Grenze
  const trimmed = trimForSpeech(long);
  assert.ok(trimmed.length <= 900);
  assert.ok(/[.!?]$/.test(trimmed.trim()), `expected a sentence-ending trim, got: "${trimmed.slice(-40)}"`);
});

test("pcmToWav wraps raw PCM bytes in a valid 44-byte RIFF/WAVE header", () => {
  const pcmBytes = Buffer.from([1, 2, 3, 4, 5, 6, 7, 8]);
  const wavBase64 = pcmToWav(pcmBytes.toString("base64"), "audio/L16;codec=pcm;rate=24000");
  const wav = Buffer.from(wavBase64, "base64");

  assert.equal(wav.length, 44 + pcmBytes.length);
  assert.equal(wav.toString("ascii", 0, 4), "RIFF");
  assert.equal(wav.toString("ascii", 8, 12), "WAVE");
  assert.equal(wav.toString("ascii", 12, 16), "fmt ");
  assert.equal(wav.readUInt16LE(20), 1); // PCM format tag
  assert.equal(wav.readUInt16LE(22), 1); // mono
  assert.equal(wav.readUInt32LE(24), 24000); // sample rate parsed from mimeType
  assert.equal(wav.readUInt16LE(34), 16); // bit depth
  assert.equal(wav.toString("ascii", 36, 40), "data");
  assert.equal(wav.readUInt32LE(40), pcmBytes.length);
  assert.deepEqual(wav.subarray(44), pcmBytes);
});

test("pcmToWav falls back to 24000Hz when the mimeType has no rate", () => {
  const wavBase64 = pcmToWav(Buffer.from([9, 9]).toString("base64"), "audio/L16");
  const wav = Buffer.from(wavBase64, "base64");
  assert.equal(wav.readUInt32LE(24), 24000);
});

// Nutzerwunsch: die Sprachausgabe soll wie ein D&D-Spielleiter vorgetragen
// werden. Gemini-TTS liest eine vorangestellte Regieanweisung nicht wörtlich
// vor, sondern befolgt sie als Vortragsstil — die Anweisung muss also VOR
// dem eigentlichen Erzähltext stehen, nicht danach oder vermischt.
test("buildSpeechPrompt prepends the configured narration style before the text", () => {
  const original = config.gemini.ttsStyle;
  try {
    config.gemini.ttsStyle = "Sprich wie ein Dungeons-and-Dragons-Spielleiter.";
    const prompt = buildSpeechPrompt("Der Hafen liegt ruhig im Morgenlicht.");
    assert.ok(prompt.startsWith(config.gemini.ttsStyle));
    assert.ok(prompt.endsWith("Der Hafen liegt ruhig im Morgenlicht."));
    assert.ok(prompt.indexOf(config.gemini.ttsStyle) < prompt.indexOf("Der Hafen"));
  } finally {
    config.gemini.ttsStyle = original;
  }
});
