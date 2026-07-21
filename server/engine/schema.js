// Der GM-Antwort-Vertrag. Jeder KI-Provider (Mock oder Claude) MUSS ein Objekt
// in dieser Form liefern. `validateGmResponse` normalisiert/säubert die Eingabe
// und wirft bei grobem Unfug — so bleibt die Engine robust, egal wer erzählt.
//
// Zusätzlich wird dieses Schema als JSON-Schema an die Claude-API übergeben
// (output_config.format), damit der echte Spielleiter garantiert passendes
// JSON liefert. Siehe ai/anthropicProvider.js.

import { CANON_CREW_IDS } from "../content/canonCrews.js";
import { MOMENT_KIND_IDS } from "../ai/artProvider.js";

export const GM_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    narration: { type: "string" },
    choices: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          id: { type: "string" },
          text: { type: "string" },
          skillCheck: {
            anyOf: [
              { type: "null" },
              {
                type: "object",
                additionalProperties: false,
                properties: {
                  skill: { type: "string" },
                  dc: { type: "integer" },
                },
                required: ["skill", "dc"],
              },
            ],
          },
        },
        required: ["id", "text", "skillCheck"],
      },
    },
    stateChanges: {
      type: "object",
      additionalProperties: false,
      properties: {
        timeAdvanceDays: { type: "integer" },
        hpDelta: { type: "integer" },
        beriDelta: { type: "integer" },
        xpDelta: { type: "integer" },
        bountyDelta: { type: "integer" },
        heatDelta: { type: "integer" },
        location: { anyOf: [{ type: "null" }, { type: "string" }] },
        itemsAdded: { type: "array", items: { type: "string" } },
        itemsRemoved: { type: "array", items: { type: "string" } },
        flagsSet: { type: "object", additionalProperties: true },
      },
      required: [
        "timeAdvanceDays",
        "hpDelta",
        "beriDelta",
        "xpDelta",
        "bountyDelta",
        "heatDelta",
        "location",
        "itemsAdded",
        "itemsRemoved",
        "flagsSet",
      ],
    },
    npcs: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          role: { type: "string" },
          disposition: { type: "integer" },
          note: { type: "string" },
        },
        required: ["id", "name", "role", "disposition", "note"],
      },
    },
    recruitable: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          role: { type: "string" },
          reason: { type: "string" },
        },
        required: ["id", "name", "role", "reason"],
      },
    },
    // Optionale Ereignisse: eine gefundene Teufelsfrucht bzw. ein erlangtes Schiff.
    devilFruitFound: {
      anyOf: [
        { type: "null" },
        {
          type: "object",
          additionalProperties: false,
          properties: { id: { type: "string" }, name: { type: "string" }, type: { type: "string" } },
          required: ["id", "name", "type"],
        },
      ],
    },
    shipAcquired: {
      anyOf: [
        { type: "null" },
        {
          type: "object",
          additionalProperties: false,
          properties: { name: { type: "string" } },
          required: ["name"],
        },
      ],
    },
    // Optionaler Kampfbeginn: die KI kann eine Konfrontation auslösen.
    combatStart: {
      anyOf: [
        { type: "null" },
        {
          type: "object",
          additionalProperties: false,
          properties: {
            enemies: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                properties: {
                  name: { type: "string" },
                  kind: {
                    type: "string",
                    enum: ["bandit", "wildtier", "rivale", "kopfgeldjaeger", "marine_soldat", "marine_offizier"],
                  },
                },
                required: ["name", "kind"],
              },
            },
          },
          required: ["enemies"],
        },
      ],
    },
    // Key-Moment-Panels (0–2 gezeichnete Panels für Schlüsselmomente).
    panels: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          kind: { type: "string", enum: MOMENT_KIND_IDS },
          caption: { type: "string" },
        },
        required: ["kind", "caption"],
      },
    },
    // Optionales Angebot, einer kanonischen Crew beizutreten (crewId aus canonCrews).
    canonOffer: {
      anyOf: [
        { type: "null" },
        {
          type: "object",
          additionalProperties: false,
          properties: {
            crewId: { type: "string", enum: CANON_CREW_IDS },
          },
          required: ["crewId"],
        },
      ],
    },
  },
  required: ["narration", "choices", "stateChanges", "npcs", "recruitable", "devilFruitFound", "shipAcquired", "combatStart", "canonOffer", "panels"],
};

function toInt(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}
function toStr(v, fallback = "") {
  return typeof v === "string" ? v : fallback;
}
function toArr(v) {
  return Array.isArray(v) ? v : [];
}

// Normalisiert eine (potenziell unvollständige) Provider-Antwort in eine
// garantiert vollständige, sichere Struktur.
export function validateGmResponse(raw) {
  if (!raw || typeof raw !== "object") {
    throw new Error("Spielleiter-Antwort ist kein Objekt.");
  }
  const narration = toStr(raw.narration).trim();
  if (!narration) throw new Error("Spielleiter-Antwort ohne Erzähltext.");

  const choices = toArr(raw.choices)
    .map((c, i) => {
      const sc = c?.skillCheck;
      let skillCheck = null;
      if (sc && typeof sc === "object" && sc.skill) {
        skillCheck = { skill: toStr(sc.skill), dc: toInt(sc.dc, 12) };
      }
      return {
        id: toStr(c?.id) || `c${i + 1}`,
        text: toStr(c?.text).trim(),
        skillCheck,
      };
    })
    .filter((c) => c.text.length > 0)
    .slice(0, 6);

  const s = raw.stateChanges || {};
  const stateChanges = {
    timeAdvanceDays: clampInt(toInt(s.timeAdvanceDays, 0), 0, 30),
    hpDelta: clampInt(toInt(s.hpDelta, 0), -500, 500),
    beriDelta: clampInt(toInt(s.beriDelta, 0), -100000, 100000),
    xpDelta: clampInt(toInt(s.xpDelta, 0), 0, 1000),
    bountyDelta: clampInt(toInt(s.bountyDelta, 0), -50_000_000, 50_000_000),
    heatDelta: clampInt(toInt(s.heatDelta, 0), -100, 100),
    location: s.location == null ? null : toStr(s.location),
    itemsAdded: toArr(s.itemsAdded).map((x) => toStr(x)).filter(Boolean).slice(0, 10),
    itemsRemoved: toArr(s.itemsRemoved).map((x) => toStr(x)).filter(Boolean).slice(0, 10),
    flagsSet: s.flagsSet && typeof s.flagsSet === "object" ? s.flagsSet : {},
  };

  const npcs = toArr(raw.npcs)
    .map((n) => ({
      id: toStr(n?.id).trim(),
      name: toStr(n?.name).trim(),
      role: toStr(n?.role).trim(),
      disposition: clampInt(toInt(n?.disposition, 0), -100, 100),
      note: toStr(n?.note).trim(),
    }))
    .filter((n) => n.id)
    .slice(0, 10);

  const recruitable = toArr(raw.recruitable)
    .map((r) => ({
      id: toStr(r?.id).trim(),
      name: toStr(r?.name).trim(),
      role: toStr(r?.role).trim(),
      reason: toStr(r?.reason).trim(),
    }))
    .filter((r) => r.id && r.name)
    .slice(0, 5);

  let devilFruitFound = null;
  const df = raw.devilFruitFound;
  if (df && typeof df === "object" && df.id) {
    devilFruitFound = { id: toStr(df.id), name: toStr(df.name), type: toStr(df.type) };
  }

  let shipAcquired = null;
  const sh = raw.shipAcquired;
  if (sh && typeof sh === "object" && sh.name) {
    shipAcquired = { name: toStr(sh.name) };
  }

  let combatStart = null;
  const cs = raw.combatStart;
  const KINDS = ["bandit", "wildtier", "rivale", "kopfgeldjaeger", "marine_soldat", "marine_offizier"];
  if (cs && typeof cs === "object" && Array.isArray(cs.enemies)) {
    const enemies = cs.enemies
      .map((e) => ({ name: toStr(e?.name).trim(), kind: KINDS.includes(e?.kind) ? e.kind : "bandit" }))
      .filter((e) => e.name)
      .slice(0, 5);
    if (enemies.length) combatStart = { enemies };
  }

  let canonOffer = null;
  const co = raw.canonOffer;
  if (co && typeof co === "object" && CANON_CREW_IDS.includes(co.crewId)) {
    canonOffer = { crewId: co.crewId };
  }

  const panels = toArr(raw.panels)
    .map((p) => ({ kind: MOMENT_KIND_IDS.includes(p?.kind) ? p.kind : "spannung", caption: toStr(p?.caption).trim() }))
    .filter((p) => p.caption)
    .slice(0, 2);

  return { narration, choices, stateChanges, npcs, recruitable, devilFruitFound, shipAcquired, combatStart, canonOffer, panels };
}

function clampInt(n, min, max) {
  return Math.max(min, Math.min(max, n));
}
