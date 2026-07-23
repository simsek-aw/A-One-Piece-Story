import test from "node:test";
import assert from "node:assert/strict";
import { createGame } from "../server/engine/gameState.js";
import { startCombat, combatTurn, combatOptions } from "../server/engine/combat.js";
import { companionMaxHp, ensurePartyStats } from "../server/engine/party.js";

function baseGame(overrides = {}) {
  return createGame({
    character: {
      name: "Rekku",
      archetype: "pirat",
      attributes: { staerke: 6, geschick: 5, zaehigkeit: 5, verstand: 5, willenskraft: 5, charisma: 5, glueck: 5 },
      ...overrides,
    },
    startLocationId: "loguetown",
  });
}

test("ensurePartyStats backfills hp/maxHp for companions from before this feature", () => {
  const game = baseGame();
  game.party = [{ id: "p1", name: "Kolo", role: "navigator", loyalty: 60 }];
  ensurePartyStats(game);
  const member = game.party[0];
  assert.equal(member.maxHp, companionMaxHp(game.character.level));
  assert.equal(member.hp, member.maxHp);
});

test("ensurePartyStats does not overwrite an already-wounded companion", () => {
  const game = baseGame();
  game.party = [{ id: "p1", name: "Kolo", role: "navigator", loyalty: 60, hp: 3, maxHp: 30 }];
  ensurePartyStats(game);
  assert.equal(game.party[0].hp, 3);
  assert.equal(game.party[0].maxHp, 30);
});

test("combatOptions exposes canHeal so the medizin skill has a use in combat", () => {
  const game = baseGame();
  startCombat(game, [{ kind: "bandit" }]);
  assert.equal(combatOptions(game).canHeal, true);
});

test("heal action targets a living party member by id, otherwise heals the player", () => {
  const game = baseGame();
  game.character.hp = 20;
  game.character.maxHp = 50;
  game.party = [{ id: "p1", name: "Kolo", role: "navigator", loyalty: 60, hp: 5, maxHp: 30 }];
  startCombat(game, [{ kind: "bandit" }]);

  const view = combatTurn(game, { action: "heal", targetId: "p1" });
  // Der Spieler heilt Kolo statt sich selbst -> die eigene HP kann durch den
  // Gegner-Angriff dieser Runde sinken, aber nie durch den Verarzten-Effekt
  // selbst steigen (der ging an Kolo).
  assert.ok(view.party[0].hp > 5, "ally hp should increase");
  assert.ok(view.player.hp <= 20, "player hp should not increase when healing an ally instead of self");
});

test("heal action heals the player when no matching living ally is given", () => {
  const game = baseGame();
  game.character.hp = 20;
  game.character.maxHp = 50;
  startCombat(game, [{ kind: "bandit" }]);

  const view = combatTurn(game, { action: "heal" });
  assert.ok(view.player.hp > 20, "player hp should increase");
});

test("a downed companion is excluded from further targeting and cannot act, but is not removed from the party", () => {
  const game = baseGame();
  game.party = [{ id: "p1", name: "Kolo", role: "navigator", loyalty: 60, hp: 1, maxHp: 30 }];
  startCombat(game, [{ kind: "marine_offizier" }]);

  // Genug Runden für den Gegner, um Kolo (1 HP) mit hoher Wahrscheinlichkeit
  // niederzustrecken; "verteidigen" verändert nichts an Kolos eigener Chance.
  let view;
  for (let i = 0; i < 20 && !game.combat.over; i++) {
    view = combatTurn(game, { action: "defend" });
  }
  assert.equal(game.party.length, 1, "companion stays in the roster even when downed");
  const kolo = view.party.find((p) => p.id === "p1");
  if (!kolo.alive) {
    assert.equal(kolo.hp, 0);
  }
});

test("over many simulated rounds, enemies do sometimes attack a party member instead of only the player", () => {
  let partyWasTargeted = false;
  for (let attempt = 0; attempt < 30 && !partyWasTargeted; attempt++) {
    const game = baseGame();
    game.character.hp = 500;
    game.character.maxHp = 500; // Spieler praktisch unsterblich, damit der Kampf lange genug läuft
    game.party = [{ id: "p1", name: "Kolo", role: "navigator", loyalty: 60, hp: 200, maxHp: 200 }];
    startCombat(game, [{ kind: "marine_offizier" }, { kind: "marine_offizier" }]);
    for (let round = 0; round < 15 && !game.combat.over; round++) {
      combatTurn(game, { action: "defend" });
    }
    if (game.party[0].hp < 200) partyWasTargeted = true;
  }
  assert.ok(partyWasTargeted, "enemies should target party members across enough simulated combat rounds");
});
