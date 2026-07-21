// Orchestriert Spielzüge und die abgeleiteten Aktionen (Aktivität, Reise,
// Teufelsfrucht essen). Deterministische Regeln bleiben hier; die KI erzählt.
//
// Ablauf eines aktionsverbrauchenden Zugs:
//   0. Tagestakt prüfen (Echtzeit-Cooldown) -> ggf. Aktion verbrauchen.
//   1. Optional Skill-Check würfeln.
//   2. Kontext bauen (inkl. Kopfgeld/Heat/Teufelsfrucht/Reise).
//   3. Provider -> Szene; validieren; Zustand deterministisch anwenden.
//   4. Gedächtnis, Kopfgeld/Heat, Historie aktualisieren.

import { skillCheck } from "./dice.js";
import { applyXp, recomputeMaxHp } from "./character.js";
import { upsertNpc, setFlags, memorySummary } from "./memory.js";
import { characterDigest } from "./gameState.js";
import { validateGmResponse } from "./schema.js";
import { rumorsForDay } from "../content/lore.js";
import { LOCATIONS } from "../content/map.js";
import { listActivities } from "../content/activities.js";
import { clockView, canAct, advanceTime, mustRest, isLocked, startNewDay, setMorning, phaseFor } from "./clock.js";
import { applyBounty, applyHeat, decayHeat, bountyTier, heatLevel, marineTroubleChance } from "./bounty.js";
import { runActivity } from "./progression.js";
import { travelOptions, travelTo, currentTravelMode } from "./travel.js";
import { eatDevilFruit } from "./devilfruit.js";
import { panelFor, momentPanel } from "../ai/artProvider.js";
import { unlockedLore, nextLore } from "../content/loreArcs.js";
import { SKILLS } from "./character.js";
import { startCombat, combatTurn, combatView } from "./combat.js";
import { attemptJoinCanon, perspectiveCanon } from "./canon.js";
import { currentEdition, newsHeadlines } from "./news.js";
import { syncNewsDiscoveries, syncLocationDiscoveries, discoverCrew, crewRelation, metCrewIds, heardOfCrewIds } from "./knowledge.js";
import { CANON_CREWS } from "../content/canonCrews.js";
import { checkHakiUnlocks } from "./haki.js";
import { currentLocalSuspicion, resolveActionRisk } from "./eavesdropping.js";
import { advanceStoryDirector, ensureStoryDirector, storyDirectorView } from "./storyDirector.js";
import { applyActionReputation, applyCombatReputation, ensureFactions, factionValue, factionView } from "./factions.js";

const HISTORY_LIMIT = 8;

// --- öffentliche Züge -------------------------------------------------------

export async function startScene(game, provider) {
  syncDailyEffects(game);
  ensureStoryDirector(game);
  ensureFactions(game);
  const context = buildContext(game, { kind: "start", playerAction: "(Spielbeginn)", checkResult: null });
  const gm = validateGmResponse(await provider.generateScene(context));
  applyGmResponse(game, gm, null);
  return currentSceneView(game);
}

export async function playTurn(game, provider, { choiceId, freeText }) {
  requireAction(game);

  let playerAction = "";
  let checkResult = null;
  let actionSkill = null;
  const scene = game.scene;
  if (choiceId && scene) {
    const choice = scene.choices.find((c) => c.id === choiceId);
    if (!choice) throw new Error("Unbekannte Auswahlmöglichkeit.");
    playerAction = choice.text;
    actionSkill = choice.skillCheck?.skill || null;
    if (choice.skillCheck) checkResult = skillCheck(game.character, choice.skillCheck.skill, choice.skillCheck.dc, game.party);
  } else if (freeText && freeText.trim()) {
    playerAction = freeText.trim().slice(0, 500);
  } else {
    throw new Error("Weder Auswahl noch Freitext angegeben.");
  }

  advanceTime(game, 1); // ein Gespräch/eine kleine Handlung ~1 Stunde
  const actionRisk = resolveActionRisk(game, playerAction, actionSkill, checkResult);
  const storyEvent = advanceStoryDirector(game, playerAction);
  const factionChanges = applyActionReputation(game, { actionRisk, playerAction });
  const context = buildContext(game, { kind: "turn", playerAction, checkResult, actionRisk, storyEvent, factionChanges });
  const gm = validateGmResponse(await provider.generateScene(context));
  applyGmResponse(game, gm, { playerAction, checkResult });
  enforceEavesdroppingConsequence(game, actionRisk);
  return currentSceneView(game);
}

export async function attemptRecruit(game, provider, { npcId }) {
  requireAction(game);
  const target = (game.recruitable || []).find((r) => r.id === npcId);
  if (!target) throw new Error("Diese Person ist gerade nicht rekrutierbar.");

  const check = skillCheck(game.character, "ueberzeugen", 13, game.party);
  const playerAction =
    `Ich versuche, ${target.name} (${target.role}) für meine Sache zu gewinnen. ` +
    (check.success ? "Meine Worte treffen — die Person ist überzeugt." : "Meine Worte verfehlen ihre Wirkung.");

  advanceTime(game, 1);
  const context = buildContext(game, { kind: "recruit", playerAction, checkResult: check, recruitTarget: target });
  const gm = validateGmResponse(await provider.generateScene(context));

  if (check.success && !game.party.some((p) => p.id === target.id)) {
    game.party.push({ id: target.id, name: target.name, role: target.role, loyalty: 50, joinedDay: game.world.day });
  }
  applyGmResponse(game, gm, { playerAction, checkResult: check });
  return currentSceneView(game);
}

// Ausbildungs-/Fortschritts-Aktivität (Dojo, Marine-Drill, Bücherwurm, …).
export async function doActivity(game, provider, { activityId }) {
  requireAction(game);
  const result = runActivity(game, activityId); // wendet Belohnungen deterministisch an
  const rankTxt = result.rankUps.length
    ? " Dabei steige ich auf in: " + result.rankUps.map((r) => `${r.skill} (Rang ${r.rank})`).join(", ") + "."
    : "";
  const loreTxt = result.loreUnlocks?.length
    ? " Eine neue Erkenntnis über die Lücke in der Geschichte: " + result.loreUnlocks.map((l) => l.title).join(", ") + "."
    : "";
  const hakiTxt = result.hakiUnlocks?.length
    ? " Etwas in mir erwacht: " + result.hakiUnlocks.map((h) => h.name).join(", ") + "!"
    : "";
  const playerAction = `Ich verbringe den Tag mit: ${result.activity.name}.${rankTxt}${loreTxt}${hakiTxt}`;

  advanceTime(game, result.activity.hours || 3); // Aktivitäten kosten mehrere Stunden
  const context = buildContext(game, { kind: "activity", playerAction, checkResult: null, activity: result.activity, loreUnlocks: result.loreUnlocks, hakiUnlocks: result.hakiUnlocks });
  const gm = validateGmResponse(await provider.generateScene(context));
  applyGmResponse(game, gm, { playerAction, checkResult: null });
  game.lastLevelUps = [...(game.lastLevelUps || []), ...result.levelUps];
  game.lastLoreUnlocks = result.loreUnlocks || [];
  game.lastHakiUnlocks = result.hakiUnlocks || [];
  return currentSceneView(game);
}

// Reise zu einem verbundenen Ort (See-Route: Schiff oder Passage nötig).
export async function doTravel(game, provider, { destId }) {
  requireAction(game);
  const info = travelTo(game, destId); // ändert Ort, zieht Passage ab, Tage vergehen
  const modeTxt = info.mode === "eigenes_schiff" ? "mit meinem eigenen Schiff" : "als Passagier auf einem fremden Schiff";
  const playerAction = `Ich reise ${modeTxt} nach ${game.world.locationName} (${info.days} Tage auf See).`;

  setMorning(game); // Ankunft am nächsten Morgen
  syncDailyEffects(game); // Reisetage: Heat klingt ab
  const context = buildContext(game, { kind: "travel", playerAction, checkResult: null, travelInfo: info });
  const gm = validateGmResponse(await provider.generateScene(context));
  applyGmResponse(game, gm, { playerAction, checkResult: null });
  return currentSceneView(game);
}

// Eine Kampfrunde ausführen. Kostet KEINE Tagesaktion; Zwischenrunden erzeugen
// keine KI-Aufrufe. Endet der Kampf, spielt die KI den Ausgang aus.
export async function doCombatAction(game, provider, { action, targetId, skill }) {
  if (!game.combat || !game.combat.active || game.combat.over) {
    throw new Error("Es läuft gerade kein Kampf.");
  }
  combatTurn(game, { action, targetId, skill });
  if (game.combat.over) {
    return resolveCombatEnd(game, provider);
  }
  return currentSceneView(game);
}

// Wendet Kampf-Belohnungen/-Folgen deterministisch an und lässt die KI den
// Ausgang erzählen.
async function resolveCombatEnd(game, provider) {
  const cm = game.combat;
  const c = game.character;
  const result = cm.result;

  let summary = "";
  if (result === "sieg") {
    let xp = 0, beri = 0, bounty = 0, heat = 0;
    for (const e of cm.enemies) {
      xp += e.reward.xp;
      beri += e.reward.beri;
      bounty += e.reward.bountyOnDefeat;
      heat += e.reward.heatOnDefeat;
    }
    const levelUps = applyXp(c, xp);
    c.beri += beri;
    applyBounty(c, bounty);
    applyHeat(c, heat);
    game.lastLevelUps = levelUps;
    const names = cm.enemies.map((e) => e.name).join(", ");
    summary =
      `SIEG gegen: ${names}. Belohnung: ${xp} EP, ${beri} Beri` +
      (bounty ? `, Kopfgeld +${bounty} Ⓑ` : "") + (heat ? `, Marine-Aufmerksamkeit +${heat}` : "") + ".";
  } else if (result === "flucht") {
    applyXp(c, 5);
    applyHeat(c, 2);
    summary = "FLUCHT gelungen — du entkommst dem Kampf, das Herz rast.";
  } else {
    // Niederlage: kein permanenter Tod. Du erwachst geschwächt, etwas ärmer.
    const verlust = Math.min(c.beri, Math.round(c.beri * 0.3));
    c.beri -= verlust;
    c.hp = 1;
    applyHeat(c, -5);
    summary = `NIEDERLAGE — du wirst niedergestreckt und erwachst später mit letzter Kraft (Verlust: ${verlust} Beri).`;
  }

  cm.active = false;
  const factionChanges = applyCombatReputation(game, cm.enemies, result);
  advanceTime(game, 1); // ein Kampf kostet etwa eine Stunde
  const context = buildContext(game, { kind: "combat_end", playerAction: summary, checkResult: null, combatResult: { result, summary }, factionChanges });
  const gm = validateGmResponse(await provider.generateScene(context));
  gm.combatStart = null; // kein sofortiger Folgekampf aus dem Ausgang
  applyGmResponse(game, gm, { playerAction: summary, checkResult: null });
  game.combat = null; // Kampf abgeschlossen
  return currentSceneView(game);
}

// Versuch, einer kanonischen Crew/Fraktion beizutreten ("Teil des Canons werden").
// Kostet eine Tagesaktion. Erfolgschance hängt von der Offenheit der Crew ab.
export async function doJoinCanon(game, provider, { crewId }) {
  requireAction(game);
  syncLocationDiscoveries(game); // ggf. gerade erst am richtigen Ort angekommen
  // Server-seitige Immersions-Schranke: ein Beitrittsversuch setzt eine ECHTE
  // vorherige Begegnung voraus (Ort mit Präsenz oder ein canonOffer der KI) —
  // kein rückwirkendes "war schon immer da", nur weil die Anfrage kommt.
  const rel = crewRelation(game, crewId);
  if (rel !== "begegnet" && rel !== "mitglied") {
    throw new Error("Du bist dieser Crew noch nicht in Person begegnet — dafür musst du erst den richtigen Ort finden oder ihr über die Geschichte begegnen.");
  }
  const result = attemptJoinCanon(game, crewId); // deterministischer Check
  advanceTime(game, 2);
  const playerAction = result.success
    ? `Ich schließe mich an: ${result.crew.name}. (Überzeugen ${result.check.total} gegen DC ${result.dc} — aufgenommen!)`
    : `Ich bitte um Aufnahme bei ${result.crew.name} — werde aber abgewiesen. (Überzeugen ${result.check.total} gegen DC ${result.dc}.)`;
  const context = buildContext(game, { kind: "canon_join", playerAction, checkResult: result.check, canonResult: { crew: result.crew.name, faction: result.crew.faction, success: result.success } });
  const gm = validateGmResponse(await provider.generateScene(context));
  applyGmResponse(game, gm, { playerAction, checkResult: result.check });
  game.world.canonOffer = null; // Angebot verbraucht
  return currentSceneView(game);
}

// Rasten / Schlafplatz suchen -> beendet den Tag und startet den nächsten Morgen.
export async function doRest(game, provider) {
  requireNoCombat(game);
  if (isLocked(game)) throw new Error(`Der neue Tag beginnt in ${clockView(game).secondsRemaining}s.`);
  const c = game.character;
  const INN_COST = 15;
  let playerAction;
  if (c.beri >= INN_COST) {
    c.beri -= INN_COST;
    c.hp = c.maxHp;
    playerAction = `Ich nehme mir ein Zimmer in einem Gasthaus (−${INN_COST} Ⓑ) und schlafe bis zum Morgen — frisch erholt.`;
  } else {
    c.hp = Math.min(c.maxHp, c.hp + Math.round(c.maxHp * 0.4));
    applyHeat(c, 2);
    playerAction = "Ohne Geld für eine Bleibe suchst du dir einen notdürftigen Schlafplatz und döst unruhig bis zum Morgen.";
  }
  startNewDay(game);
  syncDailyEffects(game);
  const context = buildContext(game, { kind: "rest", playerAction, checkResult: null });
  const gm = validateGmResponse(await provider.generateScene(context));
  applyGmResponse(game, gm, { playerAction, checkResult: null });
  return currentSceneView(game);
}

// Teufelsfrucht essen (kostet keine Tagesaktion — ein dramatischer Moment).
export async function doEatFruit(game, provider, { fruitId }) {
  requireNoCombat(game);
  const fruit = eatDevilFruit(game, fruitId);
  const playerAction =
    `Ich beiße in die ${fruit.name}. Ein widerlicher Geschmack — dann durchströmt mich die Kraft der ${fruit.type}-Frucht. ` +
    `Von nun an werde ich niemals wieder schwimmen können.`;
  const context = buildContext(game, { kind: "eat_fruit", playerAction, checkResult: null, fruit });
  const gm = validateGmResponse(await provider.generateScene(context));
  applyGmResponse(game, gm, { playerAction, checkResult: null });
  return currentSceneView(game);
}

// --- interne Helfer ---------------------------------------------------------

function requireNoCombat(game) {
  if (game.combat && game.combat.active && !game.combat.over) {
    throw new Error("Du steckst mitten im Kampf! Erst kämpfen (oder fliehen).");
  }
}

function requireAction(game) {
  requireNoCombat(game);
  syncDailyEffects(game);
  if (isLocked(game)) {
    throw new Error(`Der neue Tag beginnt in ${clockView(game).secondsRemaining}s — ruh dich noch aus.`);
  }
  if (mustRest(game)) {
    throw new Error("Es ist tief in der Nacht — du bist erschöpft. Suche einen Schlafplatz (Rasten), um den Tag zu beenden.");
  }
}

// Wendet tägliche Effekte an, wenn Tage vergangen sind (v.a. Heat-Abklang).
function syncDailyEffects(game) {
  const w = game.world;
  if (w._lastEffectDay == null) w._lastEffectDay = w.day;
  while (w._lastEffectDay < w.day) {
    decayHeat(game.character);
    w._lastEffectDay += 1;
  }
}

function buildContext(game, { kind, playerAction, checkResult, recruitTarget, activity, travelInfo, fruit, loreUnlocks, hakiUnlocks, combatResult, canonResult, actionRisk, storyEvent, factionChanges }) {
  const c = game.character;
  syncNewsDiscoveries(game); // aus der Zeitung "gehörte" Crews aktualisieren
  syncLocationDiscoveries(game); // vor Ort begegnete Fraktionen (z. B. Marine-Standort)
  const nameOf = (id) => CANON_CREWS[id]?.name || id;
  return {
    language: game.language,
    kind,
    canonResult: canonResult || null,
    canonAffiliation: c.canonAffiliation || null,
    canonOffer: game.world.canonOffer || null,
    world: {
      day: game.world.day,
      tageszeit: phaseFor(game.world.clock.hour).label,
      uhrzeit: clockView(game).hourLabel,
      istNacht: phaseFor(game.world.clock.hour).id === "nacht",
      location: game.world.location,
      locationName: game.world.locationName,
      locationType: LOCATIONS[game.world.location]?.type || "",
      locationBlurb: LOCATIONS[game.world.location]?.blurb || "",
      localSuspicion: currentLocalSuspicion(game), // ortsgebundene Aufmerksamkeit durch riskante Taten
      travelMode: currentTravelMode(game),
      rumors: rumorsForDay(game.world.day).map((r) => r.rumor),
      loreProgress: game.world.flags.lore_fortschritt || 0,
      loreUnlocked: unlockedLore(game.world.flags.lore_fortschritt || 0).map((l) => l.title),
      // Schlagzeilen aus der Welt (auch außerhalb der Spieler-Bubble)
      news: newsHeadlines(game),
      // Perspektive: Was der Charakter kennt (nur diese Crews darf er benennen).
      crewsMet: metCrewIds(game).map(nameOf), // in Person getroffen — kennen ihn auch
      crewsKnownOf: heardOfCrewIds(game).map(nameOf), // nur gehört — kennen ihn NICHT
    },
    character: characterDigest(game),
    // Rohwerte für Konsequenz-Logik (Mock nutzt sie, Claude sieht sie als Kontext).
    status: {
      bounty: c.bounty,
      bountyTier: bountyTier(c.bounty).label,
      heat: c.heat,
      heatLevel: heatLevel(c.heat).label,
      marineTroubleChance: Math.round(marineTroubleChance(c, factionValue(game, "marine")) * 100),
      hasDevilFruit: !!c.devilFruit,
      devilFruit: c.devilFruit,
      hasShip: !!c.ship,
    },
    memory: memorySummary(game),
    history: game.history.slice(-HISTORY_LIMIT),
    story: storyDirectorView(game),
    factions: factionView(game),
    playerAction,
    checkResult,
    actionRisk: actionRisk || null,
    storyEvent: storyEvent || null,
    factionChanges: factionChanges || [],
    recruitTarget: recruitTarget || null,
    activity: activity || null,
    travelInfo: travelInfo || null,
    fruit: fruit || null,
    loreUnlocks: loreUnlocks || null,
    hakiUnlocks: hakiUnlocks || null,
    combatResult: combatResult || null,
  };
}

// Ein gewürfelter Kampf darf nicht von einer beliebigen GM-Antwort "weg erzählt"
// werden. Der Erzähler bekommt das Ergebnis im Kontext, die Engine setzt es um.
function enforceEavesdroppingConsequence(game, actionRisk) {
  if (!actionRisk?.discovered || actionRisk.outcome !== "kampf") return;
  if (game.combat?.active && !game.combat.over) return;
  const enemy = actionRisk.type === "diebstahl" || actionRisk.type === "drohung"
    ? { name: "Wachmann", kind: "marine_soldat" }
    : { name: "Erzürnter Wachposten", kind: "bandit" };
  startCombat(game, [enemy]);
}

function applyGmResponse(game, gm, turnInfo) {
  const s = gm.stateChanges;
  const c = game.character;

  // Ort (die KI darf den Ort nur zu einem bekannten Karten-Ort ändern).
  if (s.location && s.location !== game.world.location && LOCATIONS[s.location]) {
    game.world.location = s.location;
    game.world.locationName = LOCATIONS[s.location].name;
  }

  // Werte (Tag wird NICHT hier verändert — die Uhr besitzt den Kalender).
  recomputeMaxHp(c);
  c.hp = Math.max(0, Math.min(c.maxHp, c.hp + s.hpDelta));
  c.beri = Math.max(0, c.beri + s.beriDelta);
  applyBounty(c, s.bountyDelta);
  applyHeat(c, s.heatDelta);
  const levelUps = applyXp(c, s.xpDelta);

  // Inventar
  for (const name of s.itemsAdded) c.inventory.push({ id: slug(name), name, anzahl: 1 });
  for (const name of s.itemsRemoved) {
    const idx = c.inventory.findIndex((it) => it.name === name || it.id === slug(name));
    if (idx >= 0) c.inventory.splice(idx, 1);
  }

  // Teufelsfrucht-Fund / Schiff (von der KI angeboten)
  if (gm.devilFruitFound && !c.devilFruit) {
    c.inventory.push({
      id: "teufelsfrucht_" + slug(gm.devilFruitFound.id),
      name: gm.devilFruitFound.name + " (Teufelsfrucht)",
      kind: "teufelsfrucht",
      fruitId: gm.devilFruitFound.id,
      anzahl: 1,
    });
  }
  if (gm.shipAcquired && !c.ship) {
    c.ship = { name: gm.shipAcquired.name };
  }

  // Flags & NPC-Gedächtnis
  setFlags(game, s.flagsSet);
  for (const npc of gm.npcs) upsertNpc(game, npc, game.world.day);

  // Kampf auslösen (falls die KI einen Kampf beginnt und keiner läuft)
  if (gm.combatStart && !(game.combat && game.combat.active && !game.combat.over)) {
    startCombat(game, gm.combatStart.enemies);
  }

  // Angebot, einer kanonischen Crew beizutreten (von der KI eingestreut).
  // Ein Abgesandter steht vor dir -> ihr seid euch in Person begegnet.
  if (gm.canonOffer) {
    game.world.canonOffer = gm.canonOffer;
    discoverCrew(game, gm.canonOffer.crewId, "begegnet");
  }

  // Szene (inkl. Key-Moment-Panels)
  const keyPanels = (gm.panels || []).map((p) => momentPanel(p.kind, p.caption));
  game.scene = { narration: gm.narration, choices: gm.choices, panels: keyPanels };
  game.recruitable = gm.recruitable;
  game.lastCheck = turnInfo?.checkResult || null;

  // Historie
  if (turnInfo?.playerAction) {
    game.history.push({
      day: game.world.day,
      action: turnInfo.playerAction,
      check: turnInfo.checkResult
        ? { skill: turnInfo.checkResult.skillId, success: turnInfo.checkResult.success }
        : null,
    });
  }
  game.history.push({ day: game.world.day, narration: gm.narration });
  if (game.history.length > HISTORY_LIMIT * 3) game.history = game.history.slice(-HISTORY_LIMIT * 3);

  game.lastLevelUps = levelUps;
  game.lastLoreUnlocks = []; // wird von doActivity danach ggf. gefüllt
  game.lastHakiUnlocks = []; // wird von doActivity danach ggf. gefüllt
}

// Levelaufstieg: freien Skillpunkt in einen Skill investieren (keine Tagesaktion).
export function spendSkillPoint(game, { skillId }) {
  requireNoCombat(game);
  const c = game.character;
  if ((c.unspentSkillPoints || 0) <= 0) throw new Error("Keine freien Skillpunkte.");
  if (!SKILLS[skillId]) throw new Error("Unbekannte Fertigkeit.");
  c.skills[skillId] = (c.skills[skillId] || 0) + 1;
  c.unspentSkillPoints -= 1;
  if (skillId === "haki") game.lastHakiUnlocks = [...(game.lastHakiUnlocks || []), ...checkHakiUnlocks(c)];
  return currentSceneView(game);
}

function slug(name) {
  return (
    String(name).toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 40) || "item"
  );
}

// Sichtbare Szene fürs Frontend.
export function currentSceneView(game) {
  syncDailyEffects(game);
  syncNewsDiscoveries(game); // frisch gehörte Crews vor dem Rendern übernehmen
  syncLocationDiscoveries(game);
  const c = game.character;
  return {
    gameId: game.id,
    clock: clockView(game),
    day: game.world.day,
    location: game.world.locationName,
    locationId: game.world.location,
    travelMode: currentTravelMode(game),
    scene: game.scene,
    combat: game.combat ? combatView(game) : null,
    panel: panelFor(game), // Anime-Panel-Slot (Platzhalter-Grafik)
    recruitable: game.recruitable,
    lastCheck: game.lastCheck,
    lastLevelUps: game.lastLevelUps || [],
    lastLoreUnlocks: game.lastLoreUnlocks || [],
    lastHakiUnlocks: game.lastHakiUnlocks || [],
    lore: {
      progress: game.world.flags.lore_fortschritt || 0,
      unlocked: unlockedLore(game.world.flags.lore_fortschritt || 0),
      next: nextLore(game.world.flags.lore_fortschritt || 0),
    },
    character: {
      name: c.name,
      archetype: c.archetype,
      appearance: c.appearance || "",
      avatar: c.avatar || null,
      level: c.level,
      xp: c.xp,
      hp: c.hp,
      maxHp: c.maxHp,
      beri: c.beri,
      bounty: c.bounty,
      bountyTier: bountyTier(c.bounty),
      heat: c.heat,
      heatLevel: heatLevel(c.heat),
      standing: c.standing,
      attributes: c.attributes,
      skills: c.skills,
      skillProgress: c.skillProgress || {},
      unspentSkillPoints: c.unspentSkillPoints || 0,
      perks: c.perks,
      inventory: c.inventory,
      devilFruit: c.devilFruit,
      canSwim: c.canSwim,
      ship: c.ship,
      haki: c.haki || { beobachtung: false, ruestung: false, haoshoku: false },
      canonAffiliation: c.canonAffiliation,
    },
    party: game.party,
    memory: memorySummary(game, 20),
    travelOptions: travelOptions(game),
    activities: listActivities(),
    canon: perspectiveCanon(game), // nur was der Charakter kennt (Spielersicht)
    canonOffer: game.world.canonOffer || null,
    news: newsEdition(game),
    denDen: game.denDen,
    factions: factionView(game),
  };
}

// Aktuelle Zeitungsausgabe + Kennzeichnung, ob sie frisch ist (neuer Tag).
function newsEdition(game) {
  const edition = currentEdition(game);
  const fresh = (game.world._lastNewsDay || 0) !== game.world.day;
  game.world._lastNewsDay = game.world.day;
  return { ...edition, fresh };
}
