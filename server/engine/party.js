// Crew-/Party-Boni: "Je nachdem wer man ist, helfen sie einem bei Erkundung,
// Kampf oder anderen Dingen." Jeder Begleiter unterstützt anhand seiner Rolle
// bestimmte Fertigkeiten. Die Boni fließen deterministisch in Skill-Checks ein.

// Schlüsselwort in der Rolle -> Skills, die dieser Begleiter unterstützt.
const ROLE_HINTS = [
  { keys: ["navigator", "steuermann"], skills: ["navigation", "wahrnehmung"] },
  { keys: ["söldner", "soldner", "kämpfer", "kaempfer", "krieger", "schwertkämpfer"], skills: ["nahkampf", "schwertkunst"] },
  { keys: ["schütze", "schuetze", "scharfschütze"], skills: ["schiessen"] },
  { keys: ["wirt", "koch", "barkeeper"], skills: ["kochen", "ueberzeugen"] },
  { keys: ["offizier", "marine"], skills: ["schiessen", "einschuechtern"] },
  { keys: ["zimmermann", "werft", "schmied", "mechaniker"], skills: ["handwerk"] },
  { keys: ["arzt", "ärztin", "aerztin", "mediziner"], skills: ["medizin"] },
  { keys: ["dieb", "spion", "schatten", "unterwelt"], skills: ["heimlichkeit", "wahrnehmung"] },
  { keys: ["redner", "diplomat", "händler", "haendler"], skills: ["ueberzeugen"] },
];

// Skills, die ein einzelner Begleiter (anhand Rolle) unterstützt.
export function companionSkills(role) {
  const r = String(role || "").toLowerCase();
  const set = new Set();
  for (const hint of ROLE_HINTS) {
    if (hint.keys.some((k) => r.includes(k))) hint.skills.forEach((s) => set.add(s));
  }
  // Fallback: jeder Begleiter hilft zumindest ein wenig beim Erkunden.
  if (set.size === 0) set.add("wahrnehmung");
  return [...set];
}

// Gesamt-Bonus der Party auf einen bestimmten Skill (gedeckelt), skaliert leicht
// mit der Loyalität des Begleiters.
export function partyBonusForSkill(party, skillId) {
  if (!Array.isArray(party) || !party.length) return 0;
  let bonus = 0;
  for (const p of party) {
    if (companionSkills(p.role).includes(skillId)) {
      bonus += (p.loyalty ?? 50) >= 70 ? 2 : 1;
    }
  }
  return Math.min(bonus, 4); // Deckel, damit es nicht ausartet
}
