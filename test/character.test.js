import test from "node:test";
import assert from "node:assert/strict";
import { createCharacter, creationRules, GENDERS } from "../server/engine/character.js";
import { createGame, characterDigest } from "../server/engine/gameState.js";
import { currentSceneView } from "../server/engine/turn.js";

function baseCharInput(overrides = {}) {
  return {
    name: "Rekku",
    archetype: "pirat",
    attributes: { staerke: 5, geschick: 5, zaehigkeit: 5, verstand: 5, willenskraft: 5, charisma: 6, glueck: 5 },
    ...overrides,
  };
}

test("creationRules exposes the gender options for the frontend wizard", () => {
  const rules = creationRules();
  const ids = rules.genders.map((g) => g.id);
  assert.deepEqual(ids, ["maennlich", "weiblich", "divers"]);
});

test("createCharacter stores a valid gender selection", () => {
  const c = createCharacter(baseCharInput({ gender: "weiblich" }));
  assert.equal(c.gender, "weiblich");
});

test("createCharacter falls back to divers for a missing or invalid gender instead of throwing", () => {
  const noGender = createCharacter(baseCharInput());
  assert.equal(noGender.gender, "divers");
  const bogusGender = createCharacter(baseCharInput({ gender: "unbekannt" }));
  assert.equal(bogusGender.gender, "divers");
});

test("characterDigest exposes the gender as a readable German label for the game master prompt", () => {
  const game = createGame({ character: baseCharInput({ gender: "maennlich" }), startLocationId: "loguetown" });
  assert.equal(characterDigest(game).geschlecht, GENDERS.maennlich.name);
});

test("currentSceneView exposes the raw gender id on the character object", () => {
  const game = createGame({ character: baseCharInput({ gender: "weiblich" }), startLocationId: "loguetown" });
  game.scene = { narration: "Test", choices: [] };
  assert.equal(currentSceneView(game).character.gender, "weiblich");
});
