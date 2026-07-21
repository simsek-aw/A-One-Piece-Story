import test from "node:test";
import assert from "node:assert/strict";
import { createGame } from "../server/engine/gameState.js";
import { auditContinuity, continuityContext, generateCoherentScene } from "../server/engine/continuityDirector.js";

const STATE_CHANGES = {
  timeAdvanceDays: 0, hpDelta: 0, beriDelta: 0, xpDelta: 0, bountyDelta: 0, heatDelta: 0,
  location: null, sceneLocation: null, itemsAdded: [], itemsRemoved: [], flagsSet: {},
};

function gameOnBoat() {
  const game = createGame({
    character: {
      name: "Mira", archetype: "pirat",
      attributes: { staerke: 5, geschick: 5, zaehigkeit: 5, verstand: 5, willenskraft: 5, charisma: 8, glueck: 3 },
    },
    startLocationId: "loguetown",
  });
  game.world.sceneLocation = "Loguetown – Händlerboot";
  game.world.npcs = {
    seller: { id: "seller", name: "Taro", role: "Verkäufer", disposition: 5, notes: [] },
    officer: { id: "officer", name: "Leutnant Bea", role: "Marine-Offizier", disposition: 0, notes: [] },
  };
  game.scene = {
    narration: "Du bist auf einem Händlerboot. Taro zeigt Ware, Leutnant Bea kontrolliert die Ladung.",
    choices: [], panels: [], presentNpcIds: ["seller", "officer"],
  };
  return game;
}

function scene(overrides = {}) {
  return {
    narration: "Du bleibst auf dem Händlerboot. Taro verhandelt, während Leutnant Bea die Ladung kontrolliert.",
    choices: [{ id: "a", text: "Weiterreden.", skillCheck: null }],
    stateChanges: { ...STATE_CHANGES },
    npcs: [
      { id: "seller", name: "Taro", role: "Verkäufer", disposition: 5, note: "Verhandelt weiter." },
      { id: "officer", name: "Leutnant Bea", role: "Marine-Offizier", disposition: 0, note: "Kontrolliert weiter." },
    ],
    recruitable: [], devilFruitFound: null, shipAcquired: null, combatStart: null, canonOffer: null, panels: [],
    ...overrides,
  };
}

test("rejects teleporting rescuer, vanished actors and ungrounded combat", () => {
  const game = gameOnBoat();
  const context = { kind: "turn", playerAction: "Ich frage Verkäufer Taro nach dem Preis.", continuity: continuityContext(game) };
  const bad = scene({
    narration: "Plötzlich rettet dich die Wirtin Mara. Ein Piratenbandit greift an.",
    npcs: [{ id: "mara", name: "Mara", role: "Wirtin", disposition: 20, note: "Rettete dich." }],
    combatStart: { enemies: [{ name: "Piratenbandit", kind: "bandit" }] },
  });
  const issues = auditContinuity(game, context, bad);
  assert.ok(issues.some((issue) => issue.includes("Mara") && issue.includes("Zugang")));
  assert.ok(issues.some((issue) => issue.includes("Taro") && issue.includes("verschwindet")));
  assert.ok(issues.some((issue) => issue.includes("Motiv")));
  assert.ok(issues.some((issue) => issue.includes("Angreifer") && issue.includes("Zugang")));
});

test("accepts an attacker whose arrival and motive are narrated", () => {
  const game = gameOnBoat();
  game.scene.presentNpcIds = [];
  const context = { kind: "turn", playerAction: "Ich prüfe die Ware.", continuity: continuityContext(game) };
  const plausible = scene({
    narration: "Ein Piratenbandit rudert heran und klettert an Bord, weil er die Ware rauben will. Er zieht sein Schwert und greift dich an.",
    npcs: [],
    combatStart: { enemies: [{ name: "Piratenbandit", kind: "bandit" }] },
  });
  assert.deepEqual(auditContinuity(game, context, plausible), []);
});

test("requests one corrected draft before applying a scene", async () => {
  const game = gameOnBoat();
  const context = { kind: "turn", playerAction: "Ich frage Verkäufer Taro nach dem Preis.", continuity: continuityContext(game) };
  const bad = scene({
    narration: "Plötzlich rettet dich die Wirtin Mara. Ein Piratenbandit greift an.",
    npcs: [{ id: "mara", name: "Mara", role: "Wirtin", disposition: 20, note: "Rettete dich." }],
    combatStart: { enemies: [{ name: "Piratenbandit", kind: "bandit" }] },
  });
  const corrected = scene();
  let calls = 0;
  const result = await generateCoherentScene(game, { generateScene: async () => (++calls === 1 ? bad : corrected) }, context);
  assert.equal(calls, 2);
  assert.equal(result.combatStart, null);
  assert.equal(game.lastContinuityReview.corrected, true);
});

test("uses a safe local continuation when both drafts are implausible", async () => {
  const game = gameOnBoat();
  const context = { kind: "turn", playerAction: "Ich frage Verkäufer Taro nach dem Preis.", continuity: continuityContext(game) };
  const bad = scene({
    narration: "Plötzlich rettet dich die Wirtin Mara. Ein Piratenbandit greift an.",
    npcs: [{ id: "mara", name: "Mara", role: "Wirtin", disposition: 20, note: "Rettete dich." }],
    combatStart: { enemies: [{ name: "Piratenbandit", kind: "bandit" }] },
  });
  let calls = 0;
  const result = await generateCoherentScene(game, { generateScene: async () => { calls += 1; return bad; } }, context);
  assert.equal(calls, 2);
  assert.equal(result.combatStart, null);
  assert.deepEqual(result.npcs.map((npc) => npc.id), ["seller", "officer"]);
  assert.equal(game.lastContinuityReview.fallback, true);
});

test("keeps an established NPC present even at an open location", () => {
  const game = gameOnBoat();
  game.world.sceneLocation = "Loguetown – Kai";
  game.scene.presentNpcIds = ["seller"];
  const context = { kind: "turn", playerAction: "Ich halte Abstand und beobachte.", continuity: continuityContext(game) };
  const bad = scene({
    narration: "Du beobachtest den Kai. Niemand reagiert auf dich.",
    npcs: [],
  });

  assert.ok(auditContinuity(game, context, bad).some((issue) => issue.includes("Taro") && issue.includes("verschwindet")));
});

test("rejects a random devil fruit during passive observation", () => {
  const game = gameOnBoat();
  game.scene.presentNpcIds = [];
  const context = { kind: "turn", playerAction: "Ich halte Abstand und beobachte.", continuity: continuityContext(game) };
  const bad = scene({
    narration: "In einer alten Truhe entdeckst du plötzlich eine Knet-Frucht.",
    npcs: [],
    devilFruitFound: { id: "knet_frucht", name: "Knet-Frucht", type: "Paramecia" },
  });

  assert.ok(auditContinuity(game, context, bad).some((issue) => issue.includes("Teufelsfrucht")));
});

test("accepts a devil fruit after a deliberate search", () => {
  const game = gameOnBoat();
  game.scene.presentNpcIds = [];
  const context = { kind: "turn", playerAction: "Ich durchsuche die alte Truhe und öffne den doppelten Boden.", continuity: continuityContext(game) };
  const plausible = scene({
    narration: "Im doppelten Boden der Truhe entdeckst du eine Knet-Frucht.",
    npcs: [],
    devilFruitFound: { id: "knet_frucht", name: "Knet-Frucht", type: "Paramecia" },
  });

  assert.deepEqual(auditContinuity(game, context, plausible), []);
});
