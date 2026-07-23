import test from "node:test";
import assert from "node:assert/strict";
import { createGame } from "../server/engine/gameState.js";
import { advanceStoryDirector, ensureStoryDirector, isThreadInvestigation } from "../server/engine/storyDirector.js";

function outpostGame() {
  const game = createGame({
    character: {
      name: "Mira",
      archetype: "pirat",
      attributes: { staerke: 5, geschick: 5, zaehigkeit: 5, verstand: 5, willenskraft: 5, charisma: 8, glueck: 3 },
    },
    startLocationId: "klippen_vorposten",
  });
  ensureStoryDirector(game);
  return game;
}

test("generic observation does not advance an unrelated story thread", () => {
  const game = outpostGame();
  const thread = game.world.storyDirector.threads[0];

  assert.equal(isThreadInvestigation("Vorsichtig Abstand halten und beobachten.", thread), false);
  assert.equal(advanceStoryDirector(game, "Vorsichtig Abstand halten und beobachten."), null);
  assert.equal(thread.progress, 0);
  assert.equal(thread.neglect, 1);
});

test("an investigation tied to the active hook advances the thread", () => {
  const game = outpostGame();
  const thread = game.world.storyDirector.threads[0];

  // Der Ort hat mehrere mögliche Fäden (siehe storyDirector.js), darum hier
  // bewusst NICHT den Wortlaut einer bestimmten Variante hardcoden, sondern
  // "Hinweise" nutzen — trifft THREAD_FOCUS_PATTERN unabhängig davon, welche
  // Variante gerade gezogen wurde.
  const event = advanceStoryDirector(game, `Ich beobachte alles und suche nach Hinweisen zu: ${thread.hook}`);
  assert.equal(event.type, "fortschritt");
  assert.equal(thread.progress, 1);
  assert.equal(thread.neglect, 0);
});

test("an investigation cannot advance a thread from another island", () => {
  const game = outpostGame();
  const outpostThread = game.world.storyDirector.threads[0];
  game.world.location = "loguetown";
  game.world.locationName = "Loguetown";

  ensureStoryDirector(game);
  const localThread = game.world.storyDirector.threads.find((thread) => thread.location === "loguetown");
  advanceStoryDirector(game, `Ich suche vor Ort nach Hinweisen zu: ${localThread.hook}`);

  assert.equal(outpostThread.progress, 0);
  assert.equal(localThread.progress, 1);
});
