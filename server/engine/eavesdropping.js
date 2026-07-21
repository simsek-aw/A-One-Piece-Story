// Riskante Handlungen sind kein kostenloser Informations- oder Fortschritts-
// Button. Der Verdacht gehört zum ORT und bleibt deshalb nach Szenenwechseln
// spürbar. Die Engine würfelt Folgen, nicht der Erzähler.

const ACTION_TYPES = {
  lauschen: { label: "Lauschen", baseChance: 0.06, repeatChance: 0.12, pattern: /\b(lausch(?:e|en|t|st)?|zuhoer(?:e|en|t|st)?|zuhör(?:e|en|t|st)?|horch(?:e|en|t|st)?|belausch(?:e|en|t|st)?)\b/i },
  heimlichkeit: { label: "Heimlichkeit", baseChance: 0.08, repeatChance: 0.08, pattern: /\b(schleich(?:e|en|t|st)?|versteck(?:e|en|t|st)?|heimlich|unbemerkt|spionier(?:e|en|t|st)?)\b/i },
  diebstahl: { label: "Diebstahl", baseChance: 0.15, repeatChance: 0.1, pattern: /\b(stehl(?:e|en|t|st)?|klau(?:e|en|t|st)?|bestiehl(?:e|en|t|st)?|taschendieb|einbrech(?:e|en|t|st)?)\b/i },
  drohung: { label: "Drohung", baseChance: 0.1, repeatChance: 0.09, pattern: /\b(droh(?:e|en|t|st)?|einschüchter(?:e|en|t|st)?|erpresse|bedroh(?:e|en|t|st)?)\b/i },
};

export function isEavesdropping(action) {
  return ACTION_TYPES.lauschen.pattern.test(action || "");
}

export function currentLocalSuspicion(game) {
  return game.world.localSuspicion?.[game.world.location]?.suspicion || 0;
}

// actionSkill erkennt auch Auswahlmöglichkeiten mit einem expliziten
// Heimlichkeits-/Einschüchterungs-Check als riskant.
export function resolveActionRisk(game, action, actionSkill, checkResult) {
  const type = actionType(action, actionSkill);
  const place = placeState(game);
  // Eine unauffällige andere Handlung unterbricht die Wiederholungsserie,
  // ohne den bereits entstandenen Ortsverdacht einfach verschwinden zu lassen.
  if (!type) {
    place.lastActionType = null;
    place.attempts = {};
    return null;
  }
  if (place.lastDay !== game.world.day) {
    const elapsed = game.world.day - place.lastDay;
    place.suspicion = Math.max(0, place.suspicion - elapsed * 8);
    place.attempts = {};
    place.lastDay = game.world.day;
  }
  if (place.lastActionType && place.lastActionType !== type) place.attempts[type] = 0;
  place.lastActionType = type;
  const attempts = (place.attempts[type] || 0) + 1;
  place.attempts[type] = attempts;
  const config = ACTION_TYPES[type];

  // Misslungene Proben und ein bereits aufmerksamer Ort sind gefährlicher.
  const checkModifier = checkResult ? (checkResult.success ? -0.05 : 0.08) : 0;
  const chance = clamp(
    config.baseChance + (attempts - 1) * config.repeatChance + place.suspicion / 200 + (game.character.heat || 0) / 1000 + checkModifier,
    0.02,
    0.9,
  );
  const roll = Math.random();
  const discovered = roll < chance;
  const outcome = !discovered ? "unbemerkt" : outcomeFor(type, roll, chance);
  const result = { type, label: config.label, attempts, chance: Math.round(chance * 100), roll: Math.floor(roll * 100) + 1, discovered, outcome };

  if (discovered) {
    const heat = outcome === "kampf" ? 14 : outcome === "verfolgt" ? 9 : 5;
    game.character.heat = Math.min(100, (game.character.heat || 0) + heat);
    place.suspicion = Math.min(100, place.suspicion + (outcome === "kampf" ? 30 : outcome === "verfolgt" ? 20 : 12));
    game.world.flags[`bei_${type}_entdeckt`] = true;
    place.attempts[type] = 0;
  } else {
    // Auch ein geglückter, wiederholter Trick hinterlässt ein ungutes Gefühl.
    place.suspicion = Math.min(100, place.suspicion + 3);
  }
  return result;
}

// Rückwärtskompatibler Name für bestehende Importe/Tests.
export function resolveEavesdroppingRisk(game, action) {
  return resolveActionRisk(game, action, null, null);
}

function actionType(action, actionSkill) {
  if (actionSkill === "heimlichkeit") return "heimlichkeit";
  if (actionSkill === "einschüchtern") return "drohung";
  return Object.entries(ACTION_TYPES).find(([, config]) => config.pattern.test(action || ""))?.[0] || null;
}

function placeState(game) {
  const all = game.world.localSuspicion || (game.world.localSuspicion = {});
  const id = game.world.location || "unbekannt";
  return all[id] || (all[id] = { suspicion: 0, attempts: {}, lastActionType: null, lastDay: game.world.day });
}

function outcomeFor(type, roll, chance) {
  // Bei Diebstahl und Drohung eskaliert eine Entdeckung schneller in Gewalt.
  const confrontation = type === "diebstahl" || type === "drohung" ? 0.45 : 0.55;
  const pursuit = type === "diebstahl" ? 0.75 : 0.86;
  if (roll < chance * confrontation) return "angesprochen";
  if (roll < chance * pursuit) return "verfolgt";
  return "kampf";
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}
