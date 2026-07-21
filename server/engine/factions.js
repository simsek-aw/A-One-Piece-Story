// Ortsübergreifender Ruf bei Gruppen, getrennt von der kurzfristigen Heat.
// Heat sagt: „Wer sucht dich gerade?“ Ruf sagt: „Wie wird man dich behandeln?“

const FACTIONS = {
  marine: { label: "Marine" },
  bewohner: { label: "Bewohner" },
  haendler: { label: "Händler" },
  unterwelt: { label: "Unterwelt" },
};

const HELP_PATTERN = /\b(helf(?:e|en|t|st)?|rett(?:e|en|t|st)?|beschütz(?:e|en|t|st)?|verteidig(?:e|en|t|st)?)\b/i;
const TRADE_PATTERN = /\b(kauf(?:e|en|t|st)?|handel(?:e|n|t|st)?|bezahl(?:e|n|t|st)?|arbeit(?:e|en|t|st)?)\b/i;

export function ensureFactions(game) {
  return game.world.factions || (game.world.factions = Object.fromEntries(Object.keys(FACTIONS).map((id) => [id, 0])));
}

export function factionView(game) {
  const values = ensureFactions(game);
  return Object.entries(FACTIONS).map(([id, faction]) => ({ id, label: faction.label, value: values[id] || 0, level: reputationLevel(values[id] || 0) }));
}

export function factionValue(game, id) {
  return ensureFactions(game)[id] || 0;
}

export function applyActionReputation(game, { actionRisk, playerAction }) {
  const changes = [];
  if (actionRisk?.type === "diebstahl") {
    change(game, changes, "haendler", actionRisk.discovered ? -18 : -5, "Diebstahl");
    if (actionRisk.discovered) change(game, changes, "bewohner", -8, "öffentliche Entdeckung");
  } else if (actionRisk?.type === "drohung") {
    change(game, changes, "bewohner", actionRisk.discovered ? -12 : -5, "Drohung");
    if (actionRisk.discovered) change(game, changes, "marine", -6, "öffentliche Drohung");
    else change(game, changes, "unterwelt", 3, "rücksichtsloser Ruf");
  } else if (actionRisk?.discovered) {
    change(game, changes, "bewohner", -4, "auffälliges Verhalten");
  }

  if (!actionRisk && HELP_PATTERN.test(playerAction || "")) change(game, changes, "bewohner", 8, "Hilfe geleistet");
  if (!actionRisk && TRADE_PATTERN.test(playerAction || "")) change(game, changes, "haendler", 4, "fair gehandelt");
  return changes;
}

export function applyCombatReputation(game, enemies, result) {
  const changes = [];
  if (result !== "sieg") return changes;
  const foughtMarine = enemies.some((e) => e.kind === "marine_soldat" || e.kind === "marine_offizier");
  const foughtBandits = enemies.some((e) => e.kind === "bandit" || e.kind === "kopfgeldjaeger");
  if (foughtMarine) {
    change(game, changes, "marine", -20, "Marine besiegt");
    change(game, changes, "unterwelt", 5, "gegen die Marine durchgesetzt");
  }
  if (foughtBandits) change(game, changes, "bewohner", 8, "Bedrohung beseitigt");
  return changes;
}

function change(game, changes, id, delta, reason) {
  const values = ensureFactions(game);
  values[id] = clamp((values[id] || 0) + delta, -100, 100);
  changes.push({ id, label: FACTIONS[id].label, delta, value: values[id], reason });
}

function reputationLevel(value) {
  if (value >= 50) return "verbündet";
  if (value >= 20) return "willkommen";
  if (value <= -50) return "feindselig";
  if (value <= -20) return "misstrauisch";
  return "neutral";
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
