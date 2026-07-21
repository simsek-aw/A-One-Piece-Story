// Skill-Check-System à la Fallout/Baldur's Gate: 1W20 + Attribut-Modifikator
// + Skill-Rang gegen einen Schwierigkeitsgrad (DC). Die KI entscheidet NICHT
// über Erfolg/Misserfolg — das macht deterministisch die Engine. Die KI
// erzählt danach nur das Ergebnis aus.

import { SKILLS } from "./character.js";

// Attribut-Modifikator: Wert 5 = 0, jeder Punkt darüber/darunter ±1 (grob D&D-artig).
export function attributeModifier(value) {
  return Math.floor((value - 5));
}

export function rollDie(sides = 20) {
  return 1 + Math.floor(Math.random() * sides);
}

// Führt einen Check aus. skillId muss in SKILLS existieren.
// Rückgabe enthält alle Einzelteile, damit das UI transparent würfeln kann.
export function skillCheck(character, skillId, dc) {
  const skill = SKILLS[skillId];
  const attrId = skill ? skill.attribut : "glueck";
  const attrValue = character.attributes[attrId] ?? 5;
  const rank = character.skills[skillId] ?? 0;

  const roll = rollDie(20);
  const attrMod = attributeModifier(attrValue);
  const total = roll + attrMod + rank;

  const kritErfolg = roll === 20;
  const kritFehler = roll === 1;
  const success = kritErfolg || (!kritFehler && total >= dc);

  return {
    skillId,
    skillName: skill ? skill.name : skillId,
    attribut: attrId,
    dc,
    roll,
    attrMod,
    rank,
    total,
    success,
    kritErfolg,
    kritFehler,
  };
}
