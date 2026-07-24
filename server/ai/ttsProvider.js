// Sprachausgabe für die Szenen-Erzählung — Gemini-native TTS (kostenloses
// Kontingent über Google AI Studio, separat von der Text-Kontingent-Kette
// der Story). Nicht-blockierend gedacht: das Frontend zeigt den Text sofort
// wie eh und je; die Stimme trifft ein paar hundert Millisekunden später ein
// und wird nur abgespielt, wenn der Spieler den Umschalter aktiviert hat.
//
// Gemini liefert rohe PCM-Samples (kein Container), Browser können aber nur
// Container-Formate wie WAV abspielen — darum wird hier serverseitig ein
// minimaler WAV-Header vorangestellt, bevor die Audiodaten ans Frontend gehen.

import { config } from "../config.js";

export function ttsEnabled() {
  return !!(config.gemini.tts && config.gemini.apiKey);
}

// Sehr lange Szenen würden Latenz/Kontingent unnötig strapazieren — an der
// letzten Satzgrenze vor der Grenze kappen, statt mitten im Wort abzuschneiden.
// Exportiert für Tests (reine Funktion, kein Netzwerk nötig).
const MAX_CHARS = 900;
export function trimForSpeech(text) {
  const clean = String(text || "").trim();
  if (clean.length <= MAX_CHARS) return clean;
  const cut = clean.slice(0, MAX_CHARS);
  const lastSentenceEnd = Math.max(cut.lastIndexOf("."), cut.lastIndexOf("!"), cut.lastIndexOf("?"));
  return lastSentenceEnd > 200 ? cut.slice(0, lastSentenceEnd + 1) : cut;
}

// Gemini-TTS liest eine vorangestellte Regieanweisung nicht wörtlich vor,
// sondern befolgt sie als Vortragsstil (dieselbe "Say cheerfully: ..."-
// Steuerung, mit der Gemini seine TTS-Modelle "steuerbar" macht). Ein
// Absatzumbruch trennt Anweisung und Erzähltext klar voneinander.
// Exportiert für Tests.
export function buildSpeechPrompt(text) {
  return `${config.gemini.ttsStyle}\n\n${text}`;
}

let _client = null;
async function client() {
  if (_client) return _client;
  const { GoogleGenAI } = await import("@google/genai");
  _client = new GoogleGenAI({ apiKey: config.gemini.apiKey });
  return _client;
}

// Baut aus rohen PCM-Samples (Gemini liefert standardmäßig 16-bit signed,
// mono, 24 kHz — die Rate wird trotzdem aus dem gemeldeten mimeType gelesen,
// falls Google sie einmal ändert) eine abspielbare WAV-Datei. Exportiert für
// Tests (reine Funktion, kein Netzwerk nötig).
export function pcmToWav(base64Pcm, mimeType) {
  const rateMatch = /rate=(\d+)/.exec(mimeType || "");
  const sampleRate = rateMatch ? Number(rateMatch[1]) : 24000;
  const channels = 1;
  const bitDepth = 16;
  const pcm = Buffer.from(base64Pcm, "base64");
  const byteRate = sampleRate * channels * (bitDepth / 8);
  const blockAlign = channels * (bitDepth / 8);
  const header = Buffer.alloc(44);
  header.write("RIFF", 0, "ascii");
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8, "ascii");
  header.write("fmt ", 12, "ascii");
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitDepth, 34);
  header.write("data", 36, "ascii");
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]).toString("base64");
}

// Liefert { audio: "<base64 WAV>" } oder { audio: null } bei Aus/Fehler —
// nie eine Exception, damit ein TTS-Ausfall niemals den Spielfluss stört.
export async function synthesizeSpeech(text) {
  if (!ttsEnabled()) {
    console.warn("[tts] Deaktiviert: GEMINI_TTS und/oder GEMINI_API_KEY sind serverseitig nicht gesetzt.");
    return { audio: null };
  }
  const spoken = trimForSpeech(text);
  if (!spoken) return { audio: null };
  try {
    const c = await client();
    const response = await c.models.generateContent({
      model: config.gemini.ttsModel,
      contents: [{ parts: [{ text: buildSpeechPrompt(spoken) }] }],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          languageCode: "de-DE",
          voiceConfig: { prebuiltVoiceConfig: { voiceName: config.gemini.ttsVoice } },
        },
      },
    });
    const part = response?.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data);
    if (!part?.inlineData?.data) {
      const candidate = response?.candidates?.[0];
      console.warn(
        "[tts] Gemini lieferte keine Audiodaten zurück.",
        `finishReason=${candidate?.finishReason || "?"}`,
        `blockReason=${response?.promptFeedback?.blockReason || "-"}`,
        `parts=${JSON.stringify(candidate?.content?.parts || [])}`,
      );
      return { audio: null };
    }
    return { audio: pcmToWav(part.inlineData.data, part.inlineData.mimeType) };
  } catch (err) {
    console.warn("[tts] Sprachausgabe fehlgeschlagen:", err.message);
    return { audio: null };
  }
}
