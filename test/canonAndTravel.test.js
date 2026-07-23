import test from "node:test";
import assert from "node:assert/strict";
import { createGame } from "../server/engine/gameState.js";
import { joinOpportunityNow, attemptJoinCanon } from "../server/engine/canon.js";
import { isImprisoned, doTravel } from "../server/engine/turn.js";
import { CANON_CREWS } from "../server/content/canonCrews.js";

function baseGame(startLocationId = "loguetown") {
  return createGame({
    character: {
      name: "Rekku",
      archetype: "pirat",
      attributes: { staerke: 5, geschick: 5, zaehigkeit: 5, verstand: 5, willenskraft: 5, charisma: 6, glueck: 5 },
    },
    startLocationId,
  });
}

// Kernpunkt: eine einmal (irgendwann) erreichte "begegnet"-Beziehung darf den
// Beitritt nicht für immer und von überall aus freischalten — siehe
// joinOpportunityNow in canon.js.
test("marine cannot be joined just from being met once, away from any marine location", () => {
  const game = baseGame("loguetown"); // hafenstadt, keine marinestadt/marinevorposten
  game.world.knownCrews = { marine: { relation: "begegnet", sinceDay: 1 } };
  assert.equal(joinOpportunityNow(game, CANON_CREWS.marine), false);
  assert.throws(() => attemptJoinCanon(game, "marine"), /niemand da/i);
});

test("marine can be joined while actually standing at a marine location", () => {
  const game = baseGame("shells_town"); // type: marinestadt
  game.world.knownCrews = { marine: { relation: "begegnet", sinceDay: 1 } };
  assert.equal(joinOpportunityNow(game, CANON_CREWS.marine), true);
});

test("a story-offered crew is only joinable while its offer is live", () => {
  const game = baseGame("loguetown");
  game.world.knownCrews = { freibeuter_rookies: { relation: "begegnet", sinceDay: 1 } };
  assert.equal(joinOpportunityNow(game, CANON_CREWS.freibeuter_rookies), false);
  game.world.canonOffer = { crewId: "freibeuter_rookies" };
  assert.equal(joinOpportunityNow(game, CANON_CREWS.freibeuter_rookies), true);
});

test("isImprisoned reads the current sub-scene, not the map location", () => {
  const game = baseGame();
  assert.equal(isImprisoned(game), false);
  game.world.sceneLocation = "Loguetown – Gefängniszelle";
  assert.equal(isImprisoned(game), true);
});

test("doTravel refuses to move an imprisoned character", async () => {
  const game = baseGame();
  game.world.sceneLocation = "Loguetown – Gefängniszelle";
  await assert.rejects(() => doTravel(game, null, { destId: "orangen_hafen" }), /sitzt gerade fest/i);
});
