// Anwendung von Ausbildungs-Aktivitäten: Skill-Fortschritt, Rang-Aufstieg,
// XP und Nebeneffekte (Beri/Heat/Lore).

import { ACTIVITIES, TRAIN_THRESHOLD } from "../content/activities.js";
import { SKILLS, applyXp } from "./character.js";
import { applyHeat } from "./bounty.js";
import { LOCATIONS } from "../content/map.js";
import { newlyUnlocked } from "../content/loreArcs.js";

// Führt eine Aktivität aus (deterministisch) und liefert eine Zusammenfassung,
// die der Spielleiter als Kontext ausspielt.
export function runActivity(game, activityId) {
  const act = ACTIVITIES[activityId];
  if (!act) throw new Error("Unbekannte Aktivität.");

  const c = game.character;
  const loc = LOCATIONS[game.world.location];
  if (act.requiresLocationType && !act.requiresLocationType.includes(loc?.type)) {
    throw new Error(`'${act.name}' ist hier nicht möglich (falscher Ort).`);
  }

  c.skillProgress = c.skillProgress || {};
  const rankUps = [];
  for (const skillId of act.trains) {
    if (!SKILLS[skillId]) continue;
    c.skillProgress[skillId] = (c.skillProgress[skillId] || 0) + 1;
    if (c.skillProgress[skillId] >= TRAIN_THRESHOLD) {
      c.skillProgress[skillId] = 0;
      c.skills[skillId] = (c.skills[skillId] || 0) + 1;
      rankUps.push({ skill: skillId, rank: c.skills[skillId] });
    }
  }

  const eff = act.effects || {};
  if (eff.beriDelta) c.beri = Math.max(0, c.beri + eff.beriDelta);
  if (eff.heatDelta) applyHeat(c, eff.heatDelta);

  let loreUnlocks = [];
  if (eff.loreProgress) {
    const prev = game.world.flags.lore_fortschritt || 0;
    const next = prev + eff.loreProgress;
    game.world.flags.lore_fortschritt = next;
    loreUnlocks = newlyUnlocked(prev, next);
  }

  const levelUps = applyXp(c, act.xp || 0);

  return { activity: act, rankUps, levelUps, effects: eff, loreUnlocks };
}
