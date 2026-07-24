import test from "node:test";
import assert from "node:assert/strict";
import { createGame } from "../server/engine/gameState.js";
import { upsertNpc, memorySummary } from "../server/engine/memory.js";

function baseGame() {
  return createGame({
    character: {
      name: "Rekku", archetype: "pirat",
      attributes: { staerke: 5, geschick: 5, zaehigkeit: 5, verstand: 5, willenskraft: 5, charisma: 6, glueck: 5 },
    },
    startLocationId: "loguetown",
  });
}

function npc(id, overrides = {}) {
  return { id, name: id, role: "", disposition: 0, lastSeenDay: 1, notes: [], ...overrides };
}

// Vorher rein nach Aktualität sortiert -> ein alter, aber wichtiger Kontakt
// (hier: sehr gefestigte Freundschaft) fiel aus dem Prompt-Ausschnitt heraus,
// sobald genug neuere Begegnungen dazwischen lagen.
test("memorySummary keeps a long-unseen ally with extreme disposition over more recent neutral contacts", () => {
  const game = baseGame();
  game.scene = { presentNpcIds: [] };
  game.world.npcs = {
    recent1: npc("recent1", { lastSeenDay: 10 }),
    recent2: npc("recent2", { lastSeenDay: 9 }),
    recent3: npc("recent3", { lastSeenDay: 8 }),
    forgottenAlly: npc("forgottenAlly", { disposition: 80, lastSeenDay: 1 }),
  };
  const ids = memorySummary(game, 3).npcs.map((n) => n.id);
  assert.ok(ids.includes("forgottenAlly"), `expected forgottenAlly in ${ids}`);
  assert.equal(ids.length, 3);
});

test("memorySummary keeps a currently present NPC over more recent absent ones", () => {
  const game = baseGame();
  game.scene = { presentNpcIds: ["forgottenButHere"] };
  game.world.npcs = {
    recentA: npc("recentA", { lastSeenDay: 10 }),
    recentB: npc("recentB", { lastSeenDay: 9 }),
    recentC: npc("recentC", { lastSeenDay: 8 }),
    forgottenButHere: npc("forgottenButHere", { lastSeenDay: 1 }),
  };
  const ids = memorySummary(game, 3).npcs.map((n) => n.id);
  assert.ok(ids.includes("forgottenButHere"), `expected forgottenButHere in ${ids}`);
  assert.ok(!ids.includes("recentC"), "least-recent non-priority entry should be displaced");
});

test("memorySummary keeps a party member over more recent non-party contacts", () => {
  const game = baseGame();
  game.scene = { presentNpcIds: [] };
  game.party = [{ id: "crewOld", name: "Kolo", role: "Navigator", loyalty: 60 }];
  game.world.npcs = {
    recentX: npc("recentX", { lastSeenDay: 10 }),
    recentY: npc("recentY", { lastSeenDay: 9 }),
    recentZ: npc("recentZ", { lastSeenDay: 8 }),
    crewOld: npc("crewOld", { lastSeenDay: 1 }),
  };
  const ids = memorySummary(game, 3).npcs.map((n) => n.id);
  assert.ok(ids.includes("crewOld"), `expected crewOld in ${ids}`);
});

test("memorySummary derives zugehoerigkeit from party membership and disposition, never stored redundantly", () => {
  const game = baseGame();
  game.scene = { presentNpcIds: [] };
  game.party = [{ id: "member", name: "Kolo", role: "Navigator", loyalty: 60 }];
  game.world.npcs = {
    member: npc("member", { disposition: -90 }), // trotz negativer Gesinnung: Crew geht vor
    ally: npc("ally", { disposition: 25 }),
    foe: npc("foe", { disposition: -25 }),
    stranger: npc("stranger", { disposition: 0 }),
  };
  const byId = Object.fromEntries(memorySummary(game, 10).npcs.map((n) => [n.id, n.zugehoerigkeit]));
  assert.equal(byId.member, "crew");
  assert.equal(byId.ally, "verbuendet");
  assert.equal(byId.foe, "feindlich");
  assert.equal(byId.stranger, "neutral");
});

// Vorher: game.party[].loyalty wurde beim Beitritt einmalig gesetzt und nie
// wieder aktualisiert, während game.world.npcs[].disposition (Gesinnung)
// weiter live über upsertNpc einlief -> zwei auseinanderlaufende Zahlen für
// dieselbe Beziehung.
test("upsertNpc nudges a party member's loyalty toward a rising disposition", () => {
  const game = baseGame();
  game.party = [{ id: "m1", name: "Kolo", role: "Navigator", loyalty: 50 }];
  game.world.npcs.m1 = npc("m1", { disposition: 0 });

  upsertNpc(game, { id: "m1", name: "Kolo", role: "Navigator", disposition: 40 }, 3);

  assert.equal(game.world.npcs.m1.disposition, 40);
  assert.equal(game.party[0].loyalty, 60); // 50 + round(40/4)
});

test("upsertNpc nudges a party member's loyalty down when disposition worsens, clamped at the floor", () => {
  const game = baseGame();
  game.party = [{ id: "m1", name: "Kolo", role: "Navigator", loyalty: 25 }];
  game.world.npcs.m1 = npc("m1", { disposition: 40 });

  upsertNpc(game, { id: "m1", name: "Kolo", role: "Navigator", disposition: -60 }, 3);

  // shift = -100 -> round(-100/4) = -25 -> 25 - 25 = 0, geklemmt auf den Boden 20
  assert.equal(game.party[0].loyalty, 20);
});

test("upsertNpc leaves loyalty untouched for an NPC who never joined the crew", () => {
  const game = baseGame();
  game.party = [];
  game.world.npcs.stranger = npc("stranger", { disposition: 0 });

  upsertNpc(game, { id: "stranger", name: "Stranger", role: "", disposition: 90 }, 3);

  assert.equal(game.party.length, 0);
  assert.equal(game.world.npcs.stranger.disposition, 90);
});
