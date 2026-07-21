// Kopfgeld & Marine-Aufmerksamkeit ("Heat"). Aktionen heben/senken beides;
// hohes Kopfgeld/Heat = mehr Ärger (häufigere & härtere Marine-Begegnungen).
//
// - bounty: Kopfgeld in Berry (0..oben offen). Steigt durch Auflehnen gegen die
//   Marine, Verbrechen, spektakuläre Taten; sinkt kaum von allein.
// - heat: akute Aufmerksamkeit der Marine (0..100). Steigt schnell, klingt aber
//   über die Tage wieder ab.

const HEAT_DECAY_PER_DAY = 3;

export function applyBounty(character, delta) {
  if (!delta) return;
  character.bounty = Math.max(0, (character.bounty || 0) + Math.trunc(delta));
  // Kopfgeld-Stufe spiegelt sich in der Stellung wider (falls Kopfgeld-Typ).
  if (character.standing?.typ === "kopfgeld") {
    character.standing.kopfgeld = character.bounty;
    character.standing.wert = bountyTier(character.bounty).label;
  }
}

export function applyHeat(character, delta) {
  if (!delta) return;
  character.heat = clamp(Math.round((character.heat || 0) + delta), 0, 100);
}

// Täglicher Abklang der Aufmerksamkeit (beim Tageswechsel aufrufen).
export function decayHeat(character) {
  character.heat = clamp((character.heat || 0) - HEAT_DECAY_PER_DAY, 0, 100);
}

export function bountyTier(bounty) {
  if (bounty <= 0) return { label: "Unbekannt", level: 0 };
  if (bounty < 5_000_000) return { label: "Kleinkriminell", level: 1 };
  if (bounty < 30_000_000) return { label: "Gesucht", level: 2 };
  if (bounty < 100_000_000) return { label: "Berüchtigt", level: 3 };
  return { label: "Legende des East Blue", level: 4 };
}

export function heatLevel(heat) {
  if (heat >= 75) return { label: "Fahndung läuft", level: 3 };
  if (heat >= 45) return { label: "erhöhte Wachsamkeit", level: 2 };
  if (heat >= 20) return { label: "man wird auf dich aufmerksam", level: 1 };
  return { label: "unauffällig", level: 0 };
}

// Wahrscheinlichkeit (0..1) einer Marine-Begegnung in einer Szene, abhängig von
// Heat und Kopfgeld. Nutzt der Mock; der echte Spielleiter bekommt die Werte im
// Kontext und entscheidet erzählerisch.
export function marineTroubleChance(character) {
  const h = heatLevel(character.heat || 0).level;
  const b = bountyTier(character.bounty || 0).level;
  return clamp(0.05 + h * 0.18 + b * 0.08, 0, 0.85);
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}
