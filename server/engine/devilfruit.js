// Teufelsfrucht essen und ihre Wirkung/Nachteile verankern.

import { DEVIL_FRUITS } from "../content/devilFruits.js";

// Der Spieler isst eine Frucht, die als Inventar-Item (kind: "teufelsfrucht")
// vorliegt. Setzt die Fähigkeit, entfernt das Item, verankert den Nachteil.
export function eatDevilFruit(game, fruitId) {
  const c = game.character;
  if (c.devilFruit) {
    throw new Error("Du hast bereits eine Teufelsfrucht gegessen — eine zweite wäre dein sicherer Tod.");
  }
  const idx = c.inventory.findIndex((it) => it.kind === "teufelsfrucht" && it.fruitId === fruitId);
  if (idx === -1) throw new Error("Diese Teufelsfrucht hast du nicht.");
  const fruit = DEVIL_FRUITS[fruitId];
  if (!fruit) throw new Error("Unbekannte Teufelsfrucht.");

  c.inventory.splice(idx, 1);
  c.devilFruit = {
    id: fruit.id,
    name: fruit.name,
    type: fruit.type,
    abilityTag: fruit.abilityTag,
    bonusSkills: fruit.bonusSkills || [],
  };
  c.canSwim = false;
  game.world.flags.hat_teufelsfrucht = fruit.id;
  return fruit;
}

// Fügt dem Inventar eine (zufällige oder bestimmte) Teufelsfrucht als Item hinzu.
export function grantDevilFruitItem(game, fruit) {
  game.character.inventory.push({
    id: "teufelsfrucht_" + fruit.id,
    name: fruit.name + " (Teufelsfrucht)",
    kind: "teufelsfrucht",
    fruitId: fruit.id,
    anzahl: 1,
  });
}
