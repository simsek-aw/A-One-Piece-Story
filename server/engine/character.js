// Attribute, Skills, Perks und Charaktererstellung.

import { ARCHETYPES } from "../content/startingScenarios.js";

// 7 Attribute (S.P.E.C.I.A.L.-inspiriert, One-Piece-gefärbt).
export const ATTRIBUTES = {
  staerke: { id: "staerke", name: "Stärke", desc: "Rohe Kraft, Nahkampfwucht." },
  geschick: { id: "geschick", name: "Geschick", desc: "Beweglichkeit, Präzision, Reflexe." },
  zaehigkeit: { id: "zaehigkeit", name: "Zähigkeit", desc: "Konstitution, Ausdauer, Trefferpunkte." },
  verstand: { id: "verstand", name: "Verstand", desc: "Wissen, Navigation, Medizin, Taktik." },
  willenskraft: { id: "willenskraft", name: "Willenskraft", desc: "Entschlossenheit, latentes Haki-Potenzial." },
  charisma: { id: "charisma", name: "Charisma", desc: "Überzeugung, Führung, Rekrutierung." },
  glueck: { id: "glueck", name: "Glück", desc: "Zufall, kritische Treffer, das gewisse Etwas." },
};

// Skills, jeweils an ein Leitattribut gekoppelt.
export const SKILLS = {
  nahkampf: { id: "nahkampf", name: "Nahkampf", attribut: "staerke" },
  schwertkunst: { id: "schwertkunst", name: "Schwertkunst", attribut: "geschick" },
  schiessen: { id: "schiessen", name: "Schießen", attribut: "geschick" },
  navigation: { id: "navigation", name: "Navigation", attribut: "verstand" },
  medizin: { id: "medizin", name: "Medizin", attribut: "verstand" },
  handwerk: { id: "handwerk", name: "Handwerk", attribut: "verstand" },
  ueberzeugen: { id: "ueberzeugen", name: "Überzeugen", attribut: "charisma" },
  einschuechtern: { id: "einschuechtern", name: "Einschüchtern", attribut: "willenskraft" },
  heimlichkeit: { id: "heimlichkeit", name: "Heimlichkeit", attribut: "geschick" },
  wahrnehmung: { id: "wahrnehmung", name: "Wahrnehmung", attribut: "verstand" },
  kochen: { id: "kochen", name: "Kochen & Barkeeping", attribut: "geschick" },
  schwimmen: { id: "schwimmen", name: "Schwimmen", attribut: "zaehigkeit" },
  haki: { id: "haki", name: "Haki (latent)", attribut: "willenskraft" },
};

// Perks (Fallout-Stil), wählbar bei Erstellung und Levelaufstieg.
export const PERKS = {
  seebein: { id: "seebein", name: "Seebein", desc: "Seekrankheit? Kennst du nicht. Bonus bei Navigation & auf See." },
  eisenkinn: { id: "eisenkinn", name: "Eisenkinn", desc: "+ Trefferpunkte, steckst mehr ein." },
  charmeur: { id: "charmeur", name: "Charmeur", desc: "Rekrutierung & Überzeugen leichter." },
  strassenkind: { id: "strassenkind", name: "Straßenkind", desc: "Heimlichkeit & Feilschen, kennt die Unterwelt." },
  unbeugsam: { id: "unbeugsam", name: "Unbeugsam", desc: "Widerstand gegen Einschüchterung, Keim von Haki." },
};

const BASE_ATTRIBUTE = 4;
const POINTS_TO_DISTRIBUTE = 8;
const MIN_ATTR = 1;
const MAX_ATTR = 10;

export function defaultAttributeSpread() {
  const attrs = {};
  for (const id of Object.keys(ATTRIBUTES)) attrs[id] = BASE_ATTRIBUTE;
  return attrs;
}

export function creationRules() {
  return {
    baseAttribute: BASE_ATTRIBUTE,
    pointsToDistribute: POINTS_TO_DISTRIBUTE,
    minAttribute: MIN_ATTR,
    maxAttribute: MAX_ATTR,
    attributes: Object.values(ATTRIBUTES),
    skills: Object.values(SKILLS),
    perks: Object.values(PERKS),
  };
}

function maxHp(character) {
  return 20 + character.attributes.zaehigkeit * 5 + (character.perks.includes("eisenkinn") ? 15 : 0);
}

// Validiert Spieler-Input aus der Charaktererstellung und baut die Figur.
// Wirft bei ungültigen Eingaben (der Server fängt das ab).
export function createCharacter({ name, archetype, attributes, perk }) {
  if (!name || typeof name !== "string" || name.trim().length < 2) {
    throw new Error("Bitte einen Namen (mind. 2 Zeichen) angeben.");
  }
  const arch = ARCHETYPES[archetype];
  if (!arch) throw new Error("Unbekannter Archetyp.");

  // Attribute prüfen: Punktevergabe muss aufgehen und Grenzen einhalten.
  const attrs = defaultAttributeSpread();
  let spent = 0;
  for (const id of Object.keys(ATTRIBUTES)) {
    const val = Number(attributes?.[id] ?? BASE_ATTRIBUTE);
    if (!Number.isInteger(val) || val < MIN_ATTR || val > MAX_ATTR) {
      throw new Error(`Attribut ${ATTRIBUTES[id].name} muss zwischen ${MIN_ATTR} und ${MAX_ATTR} liegen.`);
    }
    attrs[id] = val;
    spent += val - BASE_ATTRIBUTE;
  }
  if (spent !== POINTS_TO_DISTRIBUTE) {
    throw new Error(
      `Es müssen genau ${POINTS_TO_DISTRIBUTE} Attributpunkte verteilt werden (aktuell ${spent}).`,
    );
  }

  // Archetyp-Boni oben drauf.
  for (const [id, bonus] of Object.entries(arch.attributeBonus)) {
    attrs[id] = Math.min(MAX_ATTR, attrs[id] + bonus);
  }

  const perks = [];
  if (perk) {
    if (!PERKS[perk]) throw new Error("Unbekannter Perk.");
    perks.push(perk);
  }

  const skills = {};
  for (const id of Object.keys(SKILLS)) skills[id] = 0;
  for (const [id, rank] of Object.entries(arch.startSkills)) skills[id] = rank;

  const character = {
    name: name.trim(),
    archetype: arch.id,
    attributes: attrs,
    skills,
    perks,
    level: 1,
    xp: 0,
    hp: 0,
    maxHp: 0,
    beri: arch.startBeri,
    standing: { ...arch.standing },
    inventory: [{ ...arch.startItem, anzahl: 1 }],
    // Kopfgeld / Marine-Aufmerksamkeit
    bounty: arch.standing.kopfgeld || 0,
    heat: 0,
    // Teufelsfrucht & Schwimmen
    devilFruit: null,
    canSwim: true,
    // Eigenes Schiff (null = keins)
    ship: null,
    // Zugehörigkeit zu einer kanonischen Crew/Fraktion (null = keine)
    canonAffiliation: null,
    // Trainingsfortschritt pro Skill (für Rang-Aufstiege via Aktivitäten)
    skillProgress: {},
    // Freie Skillpunkte aus Levelaufstiegen (verteilbar)
    unspentSkillPoints: 0,
  };
  character.maxHp = maxHp(character);
  character.hp = character.maxHp;
  return character;
}

// XP-Schwelle für das nächste Level (einfach & wachsend).
export function xpForNextLevel(level) {
  return 100 * level;
}

// Wendet XP an und stuft ggf. auf. Gibt Liste der Level-Ups zurück (fürs UI).
export function applyXp(character, xpDelta) {
  const events = [];
  character.xp += Math.max(0, xpDelta | 0);
  while (character.xp >= xpForNextLevel(character.level)) {
    character.xp -= xpForNextLevel(character.level);
    character.level += 1;
    const oldMax = character.maxHp;
    character.maxHp = maxHp(character) + (character.level - 1) * 5;
    character.hp += character.maxHp - oldMax; // Level-Up heilt die Differenz.
    character.unspentSkillPoints = (character.unspentSkillPoints || 0) + 1; // 1 Skillpunkt je Level
    events.push({ level: character.level, maxHp: character.maxHp });
  }
  return events;
}

export function recomputeMaxHp(character) {
  const base = maxHp(character) + (character.level - 1) * 5;
  character.maxHp = base;
  if (character.hp > character.maxHp) character.hp = character.maxHp;
  return character.maxHp;
}
