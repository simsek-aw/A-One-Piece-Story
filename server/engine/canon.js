// "Teil des Canons werden": Beitritt zu kanonischen Crews/Fraktionen.
// Die Beitritts-Schwierigkeit (DC) leitet sich aus der Offenheit der Crew ab:
// Big Mom (openness hoch) -> leicht; Strohhüte (openness sehr niedrig) -> extrem
// schwer und in dieser Ära ohnehin noch nicht verfügbar.

import { skillCheck } from "./dice.js";
import { bountyTier } from "./bounty.js";
import { CANON_CREWS } from "../content/canonCrews.js";
import { discoverCrew, demoteCrew, crewRelation, metCrewIds, heardOfCrewIds } from "./knowledge.js";

// DC aus Offenheit: openness 90 -> 7 (leicht), 65 -> 12, 5 -> 24 (fast unmöglich).
export function joinDC(openness) {
  return Math.max(5, Math.min(26, 25 - Math.round((openness || 0) / 5)));
}

// Ist der Beitritt gerade möglich? (Ära, Voraussetzungen, bestehende Zugehörigkeit)
export function joinAvailability(game, crew) {
  const c = game.character;
  if (!crew) return { available: false, reason: "Unbekannte Crew." };
  if (!crew.joinable) return { available: false, reason: `${crew.name}: kein Beitritt möglich.` };
  if (c.canonAffiliation && c.canonAffiliation.crewId === crew.id)
    return { available: false, reason: `Du bist bereits Mitglied: ${crew.name}.` };
  if (c.canonAffiliation)
    return { available: false, reason: `Du gehörst bereits ${c.canonAffiliation.name} an — verlasse diese Crew zuerst.` };
  if ((game.world.day || 1) < crew.eraFromDay)
    return { available: false, reason: `${crew.name} existiert in dieser Ära noch nicht.` };
  const req = crew.requirements || {};
  if (req.minLevel && c.level < req.minLevel)
    return { available: false, reason: `${crew.name} erwartet mindestens Stufe ${req.minLevel}.` };
  if (req.maxBounty != null && (c.bounty || 0) > req.maxBounty)
    return { available: false, reason: `Mit einem Kopfgeld nimmt dich ${crew.name} nicht auf.` };
  return { available: true, reason: "" };
}

// Ruf-Bonus: Bei Piratencrews hilft ein Name (Kopfgeld-Stufe). Marine nicht.
function fameBonus(crew, character) {
  return crew.faction === "pirat" ? bountyTier(character.bounty || 0).level : 0;
}

// Berühmte Kanon-Crews sind GENERELL schwerer beizutreten als kleine Gruppen.
const CANON_PENALTY = 3;

// Effektiver Beitritts-DC: Offenheit -> Basis, + Kanon-Aufschlag, - Ruf.
export function effectiveJoinDC(crew, character) {
  const base = joinDC(crew.openness) + (crew.canonical ? CANON_PENALTY : 0);
  return Math.max(3, base - fameBonus(crew, character));
}

// Vollständige Crew-Liste (ADMIN-/Designsicht — sieht alles).
export function listCanonStatus(game) {
  return Object.values(CANON_CREWS)
    .map((crew) => crewStatus(game, crew))
    .sort((a, b) => (b.canonical - a.canonical) || (b.prestige - a.prestige));
}

function crewStatus(game, crew) {
  const av = joinAvailability(game, crew);
  return {
    id: crew.id,
    name: crew.name,
    recruiter: crew.recruiter,
    faction: crew.faction,
    canonical: !!crew.canonical,
    openness: crew.openness,
    prestige: crew.prestige,
    blurb: crew.blurb,
    joinable: crew.joinable,
    available: av.available,
    reason: av.reason,
    effectiveDc: effectiveJoinDC(crew, game.character),
    affiliated: game.character.canonAffiliation?.crewId === crew.id,
    relation: crewRelation(game, crew.id),
  };
}

// SPIELERSICHT: nur Crews, die der Charakter kennt. "met" = in Person getroffen
// (beitretbar), "heardOf" = nur aus Nachrichten/Gerüchten gehört (erst finden).
export function perspectiveCanon(game) {
  const met = metCrewIds(game)
    .map((id) => crewStatus(game, CANON_CREWS[id]))
    .filter(Boolean)
    .sort((a, b) => (b.affiliated - a.affiliated) || (b.prestige - a.prestige));
  const heardOf = heardOfCrewIds(game)
    .map((id) => CANON_CREWS[id])
    .filter(Boolean)
    .map((crew) => ({
      id: crew.id, name: crew.name, faction: crew.faction,
      canonical: !!crew.canonical, blurb: crew.blurb, prestige: crew.prestige,
    }))
    .sort((a, b) => b.prestige - a.prestige);
  return { met, heardOf };
}

// Beitrittsversuch (deterministischer Überzeugen-Check gegen den crew-abhängigen DC).
export function attemptJoinCanon(game, crewId) {
  const crew = CANON_CREWS[crewId];
  if (!crew) throw new Error("Unbekannte Crew.");
  const av = joinAvailability(game, crew);
  if (!av.available) throw new Error(av.reason);

  const c = game.character;
  const dc = effectiveJoinDC(crew, c);
  const check = skillCheck(c, "ueberzeugen", dc, game.party);

  if (check.success) {
    c.canonAffiliation = {
      crewId: crew.id,
      name: crew.name,
      faction: crew.faction,
      rank: crew.effects?.rank || "Mitglied",
      protection: !!crew.effects?.protection,
      marineFriendly: !!crew.effects?.marineFriendly,
      joinedDay: game.world.day,
    };
    if (crew.faction === "marine") {
      c.standing = { typ: "marine_rang", wert: crew.effects?.rank || "Rekrut", kopfgeld: 0 };
    }
    game.world.flags[`canon_${crew.id}`] = true;
    discoverCrew(game, crew.id, "mitglied");
  }
  return { crew, check, success: check.success, dc };
}

export function leaveCanon(game) {
  const aff = game.character.canonAffiliation;
  if (aff) demoteCrew(game, aff.crewId, "begegnet"); // man kennt sie weiterhin
  game.character.canonAffiliation = null;
  return aff;
}
