// Zeitungssystem ("News-Möwe"). Baut deterministisch eine aktuelle Ausgabe aus
// dem Weltgeschehen + spielerbezogenen Schlagzeilen (Kopfgeld, Crew) + einer
// regionalen Meldung. So erfährt der Spieler auch, was AUSSERHALB seiner Bubble
// im Kanon passiert — und der Spielleiter bekommt die Schlagzeilen als Kontext.

import { worldEventsUpToDay, REGIONAL_FLAVOR } from "../content/worldEvents.js";
import { bountyTier } from "./bounty.js";

export function currentEdition(game) {
  const day = game.world.day;
  const c = game.character;
  const items = [];

  // Jüngste Welt-Ereignisse (max 2).
  const world = worldEventsUpToDay(day).slice(-2).reverse();
  for (const e of world) items.push({ scope: e.scope, headline: e.headline, body: e.body });

  // Spielerbezogene Schlagzeile: Kopfgeld wird gemeldet.
  if ((c.bounty || 0) > 0) {
    items.push({
      scope: "fahndung",
      headline: `Kopfgeld ausgesetzt: ${c.name}`,
      body: `Die Marine meldet ein Kopfgeld von ${(c.bounty).toLocaleString("de-DE")} Ⓑ auf ${c.name} (${bountyTier(c.bounty).label}).`,
    });
  }

  // Crew-Zugehörigkeit wird zur Nachricht.
  if (c.canonAffiliation) {
    items.push({
      scope: "gerücht",
      headline: `Neuzugang bei ${c.canonAffiliation.name}`,
      body: `Beobachter berichten, dass ${c.name} nun unter dem Banner von ${c.canonAffiliation.name} segelt.`,
    });
  }

  // Regionale Meldung zum aktuellen Ort.
  const regional = REGIONAL_FLAVOR[game.world.location];
  if (regional) items.push({ scope: "regional", headline: "Aus der Region", body: regional });

  return {
    day,
    title: "Die Windrose — Tagesausgabe",
    items: items.slice(0, 5),
  };
}

// Kompakte Schlagzeilen-Liste für den Spielleiter-Prompt.
export function newsHeadlines(game) {
  return currentEdition(game).items.map((i) => `[${i.scope}] ${i.headline}`);
}
