// Orchestriert einen Spielzug:
//   1. Optional: Skill-Check für die gewählte Option deterministisch würfeln.
//   2. Kontext für den Spielleiter bauen (Charakter, Welt, Gedächtnis, Historie).
//   3. Provider (Mock/Claude) um die nächste Szene bitten.
//   4. Antwort validieren und Zustandsänderungen deterministisch anwenden.
//   5. Gedächtnis & Historie aktualisieren.

import { skillCheck } from "./dice.js";
import { applyXp, recomputeMaxHp } from "./character.js";
import { upsertNpc, setFlags, memorySummary } from "./memory.js";
import { characterDigest } from "./gameState.js";
import { validateGmResponse } from "./schema.js";
import { rumorsForDay } from "../content/lore.js";
import { START_LOCATIONS } from "../content/startingScenarios.js";

const HISTORY_LIMIT = 8;

// Baut die erste Szene beim Spielstart (kein Spieler-Input, kein Check).
export async function startScene(game, provider) {
  const context = buildContext(game, {
    kind: "start",
    playerAction: "(Spielbeginn)",
    checkResult: null,
  });
  const gm = validateGmResponse(await provider.generateScene(context));
  applyGmResponse(game, gm, null);
  return currentSceneView(game);
}

// Verarbeitet eine Spieleraktion (Auswahl per choiceId ODER Freitext).
export async function playTurn(game, provider, { choiceId, freeText }) {
  let playerAction = "";
  let checkResult = null;

  const scene = game.scene;
  if (choiceId && scene) {
    const choice = scene.choices.find((c) => c.id === choiceId);
    if (!choice) throw new Error("Unbekannte Auswahlmöglichkeit.");
    playerAction = choice.text;
    if (choice.skillCheck) {
      checkResult = skillCheck(game.character, choice.skillCheck.skill, choice.skillCheck.dc);
    }
  } else if (freeText && freeText.trim()) {
    playerAction = freeText.trim().slice(0, 500);
  } else {
    throw new Error("Weder Auswahl noch Freitext angegeben.");
  }

  const context = buildContext(game, {
    kind: "turn",
    playerAction,
    checkResult,
  });
  const gm = validateGmResponse(await provider.generateScene(context));
  applyGmResponse(game, gm, { playerAction, checkResult });
  return currentSceneView(game);
}

// Rekrutierungsversuch: der Spieler versucht, einen angebotenen NPC zu gewinnen.
// Deterministischer Überzeugen-Check; das Ergebnis wird der KI als nächste
// Aktion übergeben, damit sie es ausspielt.
export async function attemptRecruit(game, provider, { npcId }) {
  const target = (game.recruitable || []).find((r) => r.id === npcId);
  if (!target) throw new Error("Diese Person ist gerade nicht rekrutierbar.");

  const check = skillCheck(game.character, "ueberzeugen", 13);
  const playerAction =
    `Ich versuche, ${target.name} (${target.role}) für meine Sache zu gewinnen. ` +
    (check.success
      ? "Meine Worte treffen — die Person ist überzeugt."
      : "Meine Worte verfehlen ihre Wirkung — die Person zögert oder lehnt ab.");

  const context = buildContext(game, {
    kind: "recruit",
    playerAction,
    checkResult: check,
    recruitTarget: target,
  });
  const gm = validateGmResponse(await provider.generateScene(context));

  // Bei Erfolg tritt der NPC der Party bei (deterministisch, nicht der KI überlassen).
  if (check.success && !game.party.some((p) => p.id === target.id)) {
    game.party.push({
      id: target.id,
      name: target.name,
      role: target.role,
      loyalty: 50,
      joinedDay: game.world.day,
    });
  }
  applyGmResponse(game, gm, { playerAction, checkResult: check });
  return currentSceneView(game);
}

// ---- interne Helfer ----

function buildContext(game, { kind, playerAction, checkResult, recruitTarget }) {
  return {
    language: game.language,
    kind,
    world: {
      day: game.world.day,
      location: game.world.location,
      locationName: game.world.locationName,
      locationBlurb: START_LOCATIONS[game.world.location]?.blurb || "",
      rumors: rumorsForDay(game.world.day).map((r) => r.rumor),
    },
    character: characterDigest(game),
    memory: memorySummary(game),
    history: game.history.slice(-HISTORY_LIMIT),
    playerAction,
    checkResult,
    recruitTarget: recruitTarget || null,
  };
}

function applyGmResponse(game, gm, turnInfo) {
  const s = gm.stateChanges;

  // Zeit
  game.world.day += s.timeAdvanceDays;

  // Ort
  if (s.location && s.location !== game.world.location) {
    game.world.location = s.location;
    game.world.locationName = START_LOCATIONS[s.location]?.name || s.location;
  }

  // HP (mit maxHp geklammert)
  const c = game.character;
  recomputeMaxHp(c);
  c.hp = Math.max(0, Math.min(c.maxHp, c.hp + s.hpDelta));

  // Beri
  c.beri = Math.max(0, c.beri + s.beriDelta);

  // XP / Level
  const levelUps = applyXp(c, s.xpDelta);

  // Inventar
  for (const name of s.itemsAdded) {
    c.inventory.push({ id: slug(name), name, anzahl: 1 });
  }
  for (const name of s.itemsRemoved) {
    const idx = c.inventory.findIndex((it) => it.name === name || it.id === slug(name));
    if (idx >= 0) c.inventory.splice(idx, 1);
  }

  // Flags & NPC-Gedächtnis
  setFlags(game, s.flagsSet);
  for (const npc of gm.npcs) upsertNpc(game, npc, game.world.day);

  // Szene setzen
  game.scene = { narration: gm.narration, choices: gm.choices };
  game.recruitable = gm.recruitable;
  game.lastCheck = turnInfo?.checkResult || null;

  // Historie
  if (turnInfo?.playerAction) {
    game.history.push({
      day: game.world.day,
      action: turnInfo.playerAction,
      check: turnInfo.checkResult
        ? { skill: turnInfo.checkResult.skillId, success: turnInfo.checkResult.success, total: turnInfo.checkResult.total, dc: turnInfo.checkResult.dc }
        : null,
    });
  }
  game.history.push({ day: game.world.day, narration: gm.narration });
  if (game.history.length > HISTORY_LIMIT * 3) {
    game.history = game.history.slice(-HISTORY_LIMIT * 3);
  }

  game.lastLevelUps = levelUps;
}

function slug(name) {
  return String(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40) || "item";
}

// Sichtbare Szene fürs Frontend (nur, was der Client braucht).
export function currentSceneView(game) {
  const c = game.character;
  return {
    gameId: game.id,
    day: game.world.day,
    location: game.world.locationName,
    scene: game.scene,
    recruitable: game.recruitable,
    lastCheck: game.lastCheck,
    lastLevelUps: game.lastLevelUps || [],
    character: {
      name: c.name,
      archetype: c.archetype,
      level: c.level,
      xp: c.xp,
      hp: c.hp,
      maxHp: c.maxHp,
      beri: c.beri,
      standing: c.standing,
      attributes: c.attributes,
      skills: c.skills,
      perks: c.perks,
      inventory: c.inventory,
    },
    party: game.party,
    memory: memorySummary(game, 20),
  };
}
