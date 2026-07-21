// Rundenbasiertes Kampfsystem. Deterministisch (die Engine würfelt); die KI
// rahmt nur Beginn und Ausgang. Ablauf pro Runde:
//   1. Spieler-Aktion (Angriff mit Skill / Verteidigen / Spezial / Fliehen)
//   2. Verbündete (Crew) greifen an
//   3. Prüfen: alle Gegner besiegt -> Sieg
//   4. Gegner greifen an -> ggf. Niederlage
// Zwischenrunden erzeugen KEINE KI-Aufrufe (nur ein Kampf-Log). Erst der
// Ausgang wird von der KI ausgespielt (siehe turn.js: resolveCombatEnd).

import { rollDie, attributeModifier } from "./dice.js";
import { enemyTemplate } from "../content/enemies.js";
import { companionSkills } from "./party.js";

const COMBAT_SKILLS = {
  nahkampf: { name: "Nahkampf", attr: "staerke", dmg: 6 },
  schwertkunst: { name: "Schwertkunst", attr: "geschick", dmg: 7 },
  schiessen: { name: "Schießen", attr: "geschick", dmg: 6 },
};

function scale(level) {
  return 1 + Math.max(0, level - 1) * 0.15;
}

// Startet einen Kampf. enemySpecs: [{ kind, name? }] (kind = Vorlage aus enemies.js)
export function startCombat(game, enemySpecs) {
  const level = game.character.level || 1;
  const s = scale(level);
  const enemies = (enemySpecs || []).slice(0, 5).map((spec, i) => {
    const t = enemyTemplate(spec.kind);
    return {
      id: `e${i + 1}`,
      kind: t.id,
      name: spec.name || t.name,
      hp: Math.round(t.hp * s),
      maxHp: Math.round(t.hp * s),
      atk: t.atk,
      def: t.def,
      dmg: Math.round(t.dmg * s),
      alive: true,
      reward: { xp: t.xp, beri: t.beri, bountyOnDefeat: t.bountyOnDefeat, heatOnDefeat: t.heatOnDefeat },
    };
  });
  if (!enemies.length) enemies.push(makeDefault(s));

  game.combat = {
    active: true,
    round: 1,
    enemies,
    defending: false,
    overwhelmUsed: false, // Haoshoku: höchstens einmal pro Kampf
    log: ["Ein Kampf beginnt!"],
    over: false,
    result: null,
  };
  return game.combat;
}

function makeDefault(s) {
  const t = enemyTemplate("bandit");
  return { id: "e1", kind: t.id, name: t.name, hp: Math.round(t.hp * s), maxHp: Math.round(t.hp * s), atk: t.atk, def: t.def, dmg: Math.round(t.dmg * s), alive: true, reward: { xp: t.xp, beri: t.beri, bountyOnDefeat: 0, heatOnDefeat: 0 } };
}

// Welche Aktionen/Skills stehen dem Spieler offen?
export function combatOptions(game) {
  const c = game.character;
  const skills = Object.keys(COMBAT_SKILLS).filter((id) => (c.skills[id] || 0) > 0);
  if (!skills.length) skills.push("nahkampf"); // unbewaffnet immer möglich
  // Ein echter Spezialangriff braucht entweder eine Teufelsfrucht oder
  // tatsächlich ERWACHTES Rüstungshaki (nicht schon bloß den ersten Rang).
  const special = !!c.devilFruit || !!c.haki?.ruestung;
  // Haoshoku: extrem selten, darum höchstens einmal pro Kampf einsetzbar.
  const overwhelm = !!c.haki?.haoshoku && !game.combat?.overwhelmUsed;
  return { attackSkills: skills, special, overwhelm, canFlee: true };
}

function log(game, line) {
  game.combat.log.push(line);
  if (game.combat.log.length > 14) game.combat.log = game.combat.log.slice(-14);
}

function playerAttackBonus(c, skillId) {
  const sk = COMBAT_SKILLS[skillId] || COMBAT_SKILLS.nahkampf;
  const df = c.devilFruit?.bonusSkills?.includes(skillId) ? 2 : 0;
  return attributeModifier(c.attributes[sk.attr] ?? 5) + (c.skills[skillId] || 0) + df;
}
function playerDamage(c, skillId) {
  const sk = COMBAT_SKILLS[skillId] || COMBAT_SKILLS.nahkampf;
  return sk.dmg + Math.max(0, attributeModifier(c.attributes[sk.attr] ?? 5)) + Math.floor((c.skills[skillId] || 0) / 2);
}
function playerDefense(c, defending) {
  return 10 + attributeModifier(c.attributes.geschick ?? 5) + (defending ? 4 : 0);
}
function aliveEnemies(game) {
  return game.combat.enemies.filter((e) => e.alive);
}

// Führt eine Kampfrunde aus. action: 'attack'|'special'|'defend'|'flee'
export function combatTurn(game, { action, targetId, skill }) {
  const cm = game.combat;
  if (!cm || !cm.active || cm.over) throw new Error("Es läuft gerade kein Kampf.");
  const c = game.character;
  cm.defending = false;

  const enemiesAlive = aliveEnemies(game);
  const target =
    enemiesAlive.find((e) => e.id === targetId) || enemiesAlive[0];

  if (action === "attack" || action === "special") {
    if (!target) throw new Error("Kein Ziel vorhanden.");
    const isSpecial = action === "special";
    if (isSpecial && !combatOptions(game).special) throw new Error("Du hast keine Spezialfähigkeit (Teufelsfrucht/Haki).");

    const skillId = isSpecial ? "nahkampf" : (COMBAT_SKILLS[skill] ? skill : combatOptions(game).attackSkills[0]);
    const roll = rollDie(20);
    const bonus = isSpecial ? (attributeModifier(c.attributes.willenskraft ?? 5) + (c.skills.haki || 0) + 3) : playerAttackBonus(c, skillId);
    const total = roll + bonus;
    const targetNo = 10 + target.def;
    const krit = roll === 20;
    const hit = krit || (roll !== 1 && total >= targetNo);

    if (isSpecial) {
      // Spezial: trifft alle Gegner (Flächenschaden), aber schwächer pro Ziel.
      const label = c.devilFruit ? c.devilFruit.name : "Rüstungshaki";
      if (hit) {
        const base = 8 + Math.max(0, attributeModifier(c.attributes.willenskraft ?? 5));
        enemiesAlive.forEach((e) => {
          const dmg = krit ? base : Math.round(base * 0.7);
          e.hp -= dmg;
          if (e.hp <= 0) { e.hp = 0; e.alive = false; }
        });
        log(game, `💥 Du entfesselst ${label}! Alle Gegner werden getroffen (${krit ? "kritisch!" : "Flächenschaden"}).`);
      } else {
        log(game, `Dein Spezialangriff (${label}) verfehlt sein Ziel.`);
      }
    } else {
      const skName = COMBAT_SKILLS[skillId].name;
      if (hit) {
        let dmg = playerDamage(c, skillId);
        if (krit) dmg *= 2;
        target.hp -= dmg;
        log(game, `🗡️ ${skName}: Du triffst ${target.name} für ${dmg} Schaden${krit ? " (KRITISCH!)" : ""}. (${roll}+${bonus} vs ${targetNo})`);
        if (target.hp <= 0) { target.hp = 0; target.alive = false; log(game, `${target.name} geht zu Boden!`); }
      } else {
        log(game, `${skName}: Dein Angriff auf ${target.name} geht daneben. (${roll}+${bonus} vs ${targetNo})`);
      }
    }
  } else if (action === "overwhelm") {
    // Haoshoku: ein einziger, erschöpfender Ausbruch von Überwältigungswillen
    // pro Kampf. Schwächere Gegner brechen sofort zusammen, der Rest wird hart
    // getroffen und eingeschüchtert.
    if (!combatOptions(game).overwhelm) throw new Error("Kein Überwältigungswille verfügbar (schon verbraucht oder nicht erwacht).");
    cm.overwhelmUsed = true;
    const bonus = attributeModifier(c.attributes.willenskraft ?? 5) + (c.skills.einschuechtern || 0) + 6;
    log(game, "👑 Dein Wille bricht wie eine Woge über das Schlachtfeld — Überwältigungswille!");
    for (const foe of aliveEnemies(game)) {
      const roll = rollDie(20);
      const targetNo = 10 + Math.round(foe.def * 1.5);
      if (roll === 20 || (roll !== 1 && roll + bonus >= targetNo)) {
        foe.hp = 0; foe.alive = false;
        log(game, `${foe.name} bricht ohne einen Schlag in die Knie!`);
      } else {
        const dmg = 10 + Math.max(0, attributeModifier(c.attributes.willenskraft ?? 5));
        foe.hp -= dmg;
        if (foe.hp <= 0) { foe.hp = 0; foe.alive = false; log(game, `${foe.name} geht überwältigt zu Boden!`); }
        else log(game, `${foe.name} taumelt eingeschüchtert zurück (${dmg} Schaden).`);
      }
    }
  } else if (action === "defend") {
    cm.defending = true;
    log(game, "🛡️ Du gehst in Verteidigung — eingehender Schaden wird diese Runde reduziert.");
  } else if (action === "flee") {
    const roll = rollDie(20);
    const bonus = attributeModifier(c.attributes.geschick ?? 5) + (c.skills.heimlichkeit || 0);
    const dc = 10 + aliveEnemies(game).length * 2;
    if (roll === 20 || (roll !== 1 && roll + bonus >= dc)) {
      log(game, "🏃 Du entkommst dem Kampf!");
      cm.over = true;
      cm.result = "flucht";
      return combatView(game);
    }
    log(game, `Flucht misslungen (${roll + bonus} vs ${dc}) — die Gegner setzen nach.`);
  } else {
    throw new Error("Unbekannte Kampfaktion.");
  }

  // Verbündete (Crew) greifen an
  for (const ally of game.party || []) {
    const foes = aliveEnemies(game);
    if (!foes.length) break;
    const foe = foes[rollDie(foes.length) - 1];
    const combatAlly = companionSkills(ally.role).some((s) => ["nahkampf", "schwertkunst", "schiessen"].includes(s));
    const roll = rollDie(20);
    const bonus = combatAlly ? 5 : 3;
    if (roll === 20 || (roll !== 1 && roll + bonus >= 10 + foe.def)) {
      const dmg = (combatAlly ? 6 : 4) + (roll === 20 ? 4 : 0);
      foe.hp -= dmg;
      log(game, `🤝 ${ally.name} trifft ${foe.name} für ${dmg}.`);
      if (foe.hp <= 0) { foe.hp = 0; foe.alive = false; log(game, `${foe.name} wird von ${ally.name} niedergestreckt!`); }
    }
  }

  // Sieg?
  if (!aliveEnemies(game).length) {
    cm.over = true;
    cm.result = "sieg";
    return combatView(game);
  }

  // Gegner greifen an (Ziel: der Spieler)
  for (const e of aliveEnemies(game)) {
    const roll = rollDie(20);
    const def = playerDefense(c, cm.defending);
    if (roll === 20 || (roll !== 1 && roll + e.atk >= def)) {
      let dmg = e.dmg + (roll === 20 ? Math.round(e.dmg * 0.5) : 0);
      if (cm.defending) dmg = Math.round(dmg / 2);
      c.hp = Math.max(0, c.hp - dmg);
      log(game, `⚔️ ${e.name} trifft dich für ${dmg}.`);
      if (c.hp <= 0) {
        cm.over = true;
        cm.result = "niederlage";
        return combatView(game);
      }
    } else {
      log(game, `${e.name} greift an — du weichst aus.`);
    }
  }

  cm.round += 1;
  return combatView(game);
}

// Sichtbarer Kampfzustand fürs Frontend.
export function combatView(game) {
  const cm = game.combat;
  if (!cm) return null;
  const opt = combatOptions(game);
  return {
    active: cm.active,
    round: cm.round,
    over: cm.over,
    result: cm.result,
    log: cm.log.slice(-12),
    enemies: cm.enemies.map((e) => ({ id: e.id, name: e.name, hp: e.hp, maxHp: e.maxHp, alive: e.alive })),
    player: { name: game.character.name, hp: game.character.hp, maxHp: game.character.maxHp },
    party: (game.party || []).map((p) => ({ name: p.name, role: p.role })),
    options: opt,
  };
}
