// Wissen & Perspektive: Was WEISS der Charakter — und wer weiß von IHM?
//
// Kernidee (Spielersicht statt Admin-Allwissen):
//   - Im Spiel sieht man nicht die komplette Liste aller Crews. Man kennt nur,
//     was man selbst erlebt oder gehört hat. Das lebt in world.knownCrews.
//   - Beziehung ist gerichtet abgestuft:
//       "gehört"   = nur vom Hörensagen (Zeitung/Gerücht). Der Spieler weiß von
//                    ihnen — sie aber NICHT von ihm.
//       "begegnet" = in Person getroffen. Gegenseitiges Wissen.
//       "mitglied" = Teil der Crew.
//   - Daraus folgt die Gegenrichtung: Kaido/Big Mom & Co. erinnern sich nur an
//     den Spieler, wenn eine echte Begegnung ("begegnet"/"mitglied") vorliegt.
//
// So bekommt man Weltgrößen über die News mit, ohne dass sie einen kennen.

import { CANON_CREWS } from "../content/canonCrews.js";
import { worldEventsUpToDay } from "../content/worldEvents.js";

export const RELATIONS = ["gehört", "begegnet", "mitglied"];
const RANK = { "gehört": 1, "begegnet": 2, "mitglied": 3 };

export function ensureKnowledge(game) {
  const w = game.world;
  if (!w.knownCrews) {
    w.knownCrews = {};
    // Startwissen: Institutionen/Legenden, die jeder kennt. Die Marine ist
    // überall ansprechbar ("begegnet"), Rogers zerschlagene Bande nur Legende
    // ("gehört"). Gesteuert über crew.initialRelation im Content.
    for (const crew of Object.values(CANON_CREWS)) {
      if (crew.initialRelation && RANK[crew.initialRelation]) {
        w.knownCrews[crew.id] = { relation: crew.initialRelation, sinceDay: w.day || 1 };
      }
    }
  }
  return w.knownCrews;
}

// Beziehung zu einer Crew setzen — nur nach oben (nie herabstufen).
export function discoverCrew(game, crewId, relation, note) {
  if (!CANON_CREWS[crewId] || !RANK[relation]) return null;
  const known = ensureKnowledge(game);
  const existing = known[crewId];
  if (existing && RANK[existing.relation] >= RANK[relation]) {
    if (note) existing.note = note;
    return existing;
  }
  const rec = existing || { sinceDay: game.world.day || 1 };
  rec.relation = relation;
  if (note) rec.note = note;
  known[crewId] = rec;
  return rec;
}

// Eine Crew wieder auf "begegnet" zurückstufen (z. B. nach Austritt) — man kennt
// sie ja weiterhin, ist aber kein Mitglied mehr.
export function demoteCrew(game, crewId, relation = "begegnet") {
  const known = ensureKnowledge(game);
  if (known[crewId]) known[crewId].relation = relation;
}

export function crewRelation(game, crewId) {
  return ensureKnowledge(game)[crewId]?.relation || null;
}

// Kennt der Spieler die Crew überhaupt (in irgendeiner Form)?
export function knowsOfCrew(game, crewId) {
  return !!crewRelation(game, crewId);
}

// Kennt die Crew den Spieler? (nur bei echter Begegnung)
export function crewKnowsPlayer(game, crewId) {
  const r = crewRelation(game, crewId);
  return r === "begegnet" || r === "mitglied";
}

// Aus den bisher erschienenen Weltereignissen ableiten, von welchen Crews der
// Spieler durch die Zeitung "gehört" hat. Idempotent — bei jeder Szene aufrufbar.
export function syncNewsDiscoveries(game) {
  ensureKnowledge(game);
  for (const e of worldEventsUpToDay(game.world.day)) {
    for (const crewId of e.crews || []) discoverCrew(game, crewId, "gehört");
  }
}

// IDs, die der Spieler in Person getroffen hat (oder Mitglied ist).
export function metCrewIds(game) {
  const known = ensureKnowledge(game);
  return Object.keys(known).filter((id) => RANK[known[id].relation] >= 2);
}

// IDs, von denen der Spieler nur gehört hat.
export function heardOfCrewIds(game) {
  const known = ensureKnowledge(game);
  return Object.keys(known).filter((id) => known[id].relation === "gehört");
}
