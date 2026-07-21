// Reisen zwischen Orten. Seewege brauchen ein eigenes Schiff ODER bezahlte
// Passage. Eine Reise kostet eine Tagesaktion und lässt Tage vergehen
// (fast-forward über die Uhr).

import { LOCATIONS, connectionsFrom } from "../content/map.js";

const PASSAGE_COST_PER_DAY = 25; // Berry pro Reisetag, wenn kein eigenes Schiff.

export function travelOptions(game) {
  const here = game.world.location;
  return connectionsFrom(here).map((edge) => {
    const dest = LOCATIONS[edge.to];
    const hasShip = !!game.character.ship;
    const passageCost = hasShip ? 0 : edge.days * PASSAGE_COST_PER_DAY;
    return {
      to: edge.to,
      name: dest?.name || edge.to,
      mode: edge.mode,
      days: edge.days,
      hasShip,
      passageCost,
      affordable: hasShip || game.character.beri >= passageCost,
    };
  });
}

// Führt eine Reise aus (deterministisch). Aktualisiert Ort, zieht ggf. Passage
// ab und schiebt die Uhr um die Reisetage vor. Liefert Info für die Erzählung.
export function travelTo(game, destId) {
  const opt = travelOptions(game).find((o) => o.to === destId);
  if (!opt) throw new Error("Dorthin gibt es von hier keine Verbindung.");
  if (!opt.hasShip && game.character.beri < opt.passageCost) {
    throw new Error(`Die Passage kostet ${opt.passageCost} Ⓑ — so viel hast du nicht.`);
  }

  const mode = opt.hasShip ? "eigenes_schiff" : "passage";
  if (mode === "passage") game.character.beri -= opt.passageCost;

  const from = game.world.location;
  game.world.location = destId;
  game.world.locationName = LOCATIONS[destId]?.name || destId;

  // Reisetage vergehen; die Uhr springt vor (unabhängig vom Cooldown-Modell).
  game.world.day += opt.days;
  game.world.travelMode = mode;

  return { from, to: destId, days: opt.days, mode, passageCost: opt.hasShip ? 0 : opt.passageCost };
}

// Fortbewegungsart zur Anzeige (an Land zu Fuß, auf See per Schiff/Passage).
export function currentTravelMode(game) {
  return game.world.travelMode || "zu_fuss";
}
