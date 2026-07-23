// Rundenbasiertes Kampfsystem. Deterministisch (die Engine würfelt); die KI
// rahmt nur Beginn und Ausgang. Ablauf pro Runde:
//   0. Initiative: wer ist schneller diese Runde (Spielerseite vs. Gegner)?
//      Gewinnt die Gegnerseite, greifen sie VOR der Spieleraktion an.
//   1. Spieler-Aktion (Angriff mit Skill / Verteidigen / Verarzten / Spezial /
//      Fliehen) — außer betäubt, dann verfällt die Aktion diese Runde.
//   2. Verbündete (Crew) greifen an (übersprungen: niedergeschlagen/betäubt).
//   3. Prüfen: alle Gegner besiegt -> Sieg.
//   4. Gegner greifen an (falls nicht schon in Schritt 0 dran) — Ziel ist
//      zufällig der Spieler ODER ein lebender Begleiter, nicht mehr fix nur
//      der Spieler. Kann Statuseffekte auslösen (vergiftet/betäubt).
//   5. Rundenende: Gift zehrt an allen Betroffenen (Spieler/Begleiter/Gegner).
// Zwischenrunden erzeugen KEINE KI-Aufrufe (nur ein Kampf-Log). Erst der
// Ausgang wird von der KI ausgespielt (siehe turn.js: resolveCombatEnd).

import { rollDie, attributeModifier } from "./dice.js";
import { enemyTemplate } from "../content/enemies.js";
import { companionSkills, ensurePartyStats } from "./party.js";

const COMBAT_SKILLS = {
  nahkampf: { name: "Nahkampf", attr: "staerke", dmg: 6 },
  schwertkunst: { name: "Schwertkunst", attr: "geschick", dmg: 7 },
  schiessen: { name: "Schießen", attr: "geschick", dmg: 6 },
};

const STATUS_LABEL = { vergiftet: "vergiftet", betaeubt: "betäubt" };

function scale(level) {
  return 1 + Math.max(0, level - 1) * 0.15;
}

// Startet einen Kampf. enemySpecs: [{ kind, name? }] (kind = Vorlage aus enemies.js)
export function startCombat(game, enemySpecs) {
  ensurePartyStats(game); // ältere Spielstände ohne Begleiter-HP nachrüsten
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
      status: [],
      inflicts: t.inflicts || null,
      reward: { xp: t.xp, beri: t.beri, bountyOnDefeat: t.bountyOnDefeat, heatOnDefeat: t.heatOnDefeat },
    };
  });
  if (!enemies.length) enemies.push(makeDefault(s));

  // Begleiter starten jeden Kampf ohne Resteffekte aus einem vorherigen Kampf
  // (HP selbst bleibt bestehen — nur echte Rast heilt Wunden vollständig).
  for (const member of game.party || []) member.status = [];

  game.combat = {
    active: true,
    round: 1,
    enemies,
    defending: false,
    overwhelmUsed: false, // Haoshoku: höchstens einmal pro Kampf
    playerStatus: [],
    log: ["Ein Kampf beginnt!"],
    over: false,
    result: null,
  };
  return game.combat;
}

function makeDefault(s) {
  const t = enemyTemplate("bandit");
  return { id: "e1", kind: t.id, name: t.name, hp: Math.round(t.hp * s), maxHp: Math.round(t.hp * s), atk: t.atk, def: t.def, dmg: Math.round(t.dmg * s), alive: true, status: [], inflicts: t.inflicts || null, reward: { xp: t.xp, beri: t.beri, bountyOnDefeat: 0, heatOnDefeat: 0 } };
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
  return { attackSkills: skills, special, overwhelm, canFlee: true, canHeal: true };
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
// Begleiter haben keine eigenen Attribute — Loyalität steht grob für
// Kampferfahrung/Vorsicht und gibt einen kleinen Verteidigungsbonus.
function companionDefense(member) {
  return 10 + ((member.loyalty ?? 50) >= 70 ? 2 : 0);
}
function aliveEnemies(game) {
  return game.combat.enemies.filter((e) => e.alive);
}
function alivePartyMembers(game) {
  return (game.party || []).filter((p) => (p.hp ?? 1) > 0);
}

// Entfernt (und meldet) einen "betäubt"-Status, falls vorhanden — wird beim
// eigenen Aktionsversuch geprüft: einmal getroffen, einmal ausgesetzt.
function consumeStun(statusArr) {
  const idx = (statusArr || []).findIndex((s) => s.type === "betaeubt");
  if (idx === -1) return false;
  statusArr.splice(idx, 1);
  return true;
}

// Rollt gegen die Trefferchance eines Statuseffekts und trägt ihn bei Erfolg
// ein (erneuert die Dauer statt zu stapeln, falls schon vorhanden).
function maybeInflict(statusArr, inflicts) {
  if (!inflicts) return null;
  if (Math.random() >= inflicts.chance) return null;
  const rounds = inflicts.type === "vergiftet" ? 2 : 1;
  const existing = statusArr.find((s) => s.type === inflicts.type);
  if (existing) existing.rounds = rounds;
  else statusArr.push({ type: inflicts.type, rounds });
  return inflicts.type;
}

// Gift zehrt am Ende jeder Runde an allen Betroffenen — unabhängig davon, ob
// Spieler, Begleiter oder Gegner.
function tickPoison(game, holder, label, statusArr) {
  const poison = (statusArr || []).find((s) => s.type === "vergiftet");
  if (!poison) return;
  const dmg = 3;
  holder.hp = Math.max(0, holder.hp - dmg);
  log(game, `☠️ Gift zehrt an ${label} (-${dmg} HP).`);
  poison.rounds -= 1;
  if (poison.rounds <= 0) {
    statusArr.splice(statusArr.indexOf(poison), 1);
    log(game, `Die Vergiftung bei ${label} klingt ab.`);
  }
}

// Initiative: eine Seite ist diese Runde schneller. Bei Gleichstand/Vorteil
// bleibt die Spielerseite zuerst dran (bisheriges Verhalten unverändert).
function enemiesActFirst(game) {
  const foes = aliveEnemies(game);
  if (!foes.length) return false;
  const c = game.character;
  const playerRoll = rollDie(20) + attributeModifier(c.attributes.geschick ?? 5);
  const avgAtk = Math.round(foes.reduce((sum, e) => sum + e.atk, 0) / foes.length);
  const enemyRoll = rollDie(20) + avgAtk;
  return enemyRoll > playerRoll;
}

// Ein zufälliges Ziel für einen gegnerischen Angriff: der Spieler oder ein
// lebender Begleiter (Begleiter sind jetzt echte Ziele, kein Freifahrtschein
// mehr nur für den Spieler).
function pickDefender(game) {
  const targets = [{ kind: "player", ref: game.character, label: game.character.name }];
  for (const member of alivePartyMembers(game)) targets.push({ kind: "party", ref: member, label: member.name });
  return targets[rollDie(targets.length) - 1];
}

// Führt die komplette Angriffsphase der Gegner aus. Gibt true zurück, wenn
// der Spieler dabei besiegt wurde (Aufrufer muss dann sofort abbrechen).
// stunnedEnemyIds: bereits VOR dieser Runde ermittelt (siehe combatTurn) —
// eine Betäubung, die HEUTE erst zugefügt wird, greift erst nächste Runde.
function runEnemyPhase(game, stunnedEnemyIds) {
  const cm = game.combat;
  const c = game.character;
  for (const e of aliveEnemies(game)) {
    if (stunnedEnemyIds.has(e.id)) {
      log(game, `${e.name} ist betäubt und kann nicht angreifen.`);
      continue;
    }
    const defender = pickDefender(game);
    const roll = rollDie(20);
    const defenseValue = defender.kind === "player" ? playerDefense(c, cm.defending) : companionDefense(defender.ref);
    if (roll === 20 || (roll !== 1 && roll + e.atk >= defenseValue)) {
      let dmg = e.dmg + (roll === 20 ? Math.round(e.dmg * 0.5) : 0);
      if (defender.kind === "player" && cm.defending) dmg = Math.round(dmg / 2);
      defender.ref.hp = Math.max(0, defender.ref.hp - dmg);
      const who = defender.kind === "player" ? "dich" : defender.label;
      log(game, `⚔️ ${e.name} trifft ${who} für ${dmg}.`);
      const statusArr = defender.kind === "player" ? (cm.playerStatus ||= []) : (defender.ref.status ||= []);
      const inflicted = maybeInflict(statusArr, e.inflicts);
      if (inflicted) log(game, `${defender.kind === "player" ? "Du bist" : defender.label + " ist"} jetzt ${STATUS_LABEL[inflicted]}!`);
      if (defender.ref.hp <= 0) {
        if (defender.kind === "player") return true;
        log(game, `${defender.label} geht zu Boden und kann nicht mehr kämpfen!`);
      }
    } else {
      const who = defender.kind === "player" ? "dich" : defender.label;
      log(game, `${e.name} greift ${who} an — ${defender.kind === "player" ? "du weichst aus" : "daneben"}.`);
    }
  }
  return false;
}

// Führt eine Kampfrunde aus. action: 'attack'|'special'|'overwhelm'|'defend'|'heal'|'flee'
export function combatTurn(game, { action, targetId, skill }) {
  const cm = game.combat;
  if (!cm || !cm.active || cm.over) throw new Error("Es läuft gerade kein Kampf.");
  const c = game.character;
  cm.defending = false;

  // Betäubung wird HIER, am Rundenanfang, konsumiert — sie stammt aus der
  // Infliktion der VORHERIGEN Runde. So ist der Status-Badge im UI eine
  // volle Runde lang sichtbar, bevor er tatsächlich eine Aktion aussetzt,
  // statt im selben Funktionsaufruf zugefügt und sofort wieder verbraucht
  // zu werden (das wäre für den Spieler nie sichtbar gewesen).
  const playerStunned = consumeStun((cm.playerStatus ||= []));
  const stunnedAllyIds = new Set((game.party || []).filter((p) => consumeStun((p.status ||= []))).map((p) => p.id));
  const stunnedEnemyIds = new Set(cm.enemies.filter((e) => consumeStun((e.status ||= []))).map((e) => e.id));

  // Initiative: gewinnt die Gegnerseite, greifen sie an, BEVOR die
  // Spieleraktion überhaupt ausgewertet wird — genau das macht "schneller
  // sein" spürbar.
  const enemiesFirst = enemiesActFirst(game);
  if (enemiesFirst) {
    log(game, "⚡ Die Gegner sind schneller diese Runde!");
    if (runEnemyPhase(game, stunnedEnemyIds)) {
      cm.over = true; cm.result = "niederlage";
      return combatView(game);
    }
  }

  if (playerStunned) {
    log(game, "😵 Du bist betäubt und kannst diese Runde nicht handeln!");
  } else {
    const enemiesAlive = aliveEnemies(game);
    const target = enemiesAlive.find((e) => e.id === targetId) || enemiesAlive[0];

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
    } else if (action === "heal") {
      // Verarzten: nutzt den Medizin-Skill, kostet die Runde wie ein Angriff.
      // Ohne targetId (oder ohne passenden lebenden Begleiter) heilt man sich
      // selbst — jede*r kann grundlegende Erste Hilfe versuchen, Medizin-Rang
      // macht es nur wirksamer (wie bei den Angriffs-Skills).
      const medRank = c.skills.medizin || 0;
      const healAmount = 6 + medRank * 2 + Math.max(0, attributeModifier(c.attributes.verstand ?? 5));
      const ally = (game.party || []).find((p) => p.id === targetId && (p.hp ?? 1) > 0);
      if (ally) {
        ally.hp = Math.min(ally.maxHp, ally.hp + healAmount);
        log(game, `✚ Du verarztest ${ally.name} (+${healAmount} HP).`);
      } else {
        c.hp = Math.min(c.maxHp, c.hp + healAmount);
        log(game, `✚ Du verarztest dich selbst (+${healAmount} HP).`);
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
  }

  // Verbündete (Crew) greifen an — niedergeschlagene oder betäubte Begleiter
  // setzen aus.
  for (const ally of alivePartyMembers(game)) {
    if (stunnedAllyIds.has(ally.id)) {
      log(game, `${ally.name} ist betäubt und kann nicht angreifen.`);
      continue;
    }
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

  // Gegner greifen an (falls nicht schon vor der Spieleraktion geschehen)
  if (!enemiesFirst) {
    if (runEnemyPhase(game, stunnedEnemyIds)) {
      cm.over = true;
      cm.result = "niederlage";
      return combatView(game);
    }
  }

  // Rundenende: Gift zehrt an allen Betroffenen.
  tickPoison(game, c, "dir", (cm.playerStatus ||= []));
  for (const member of alivePartyMembers(game)) {
    tickPoison(game, member, member.name, (member.status ||= []));
    if (member.hp <= 0) log(game, `${member.name} geht zu Boden und kann nicht mehr kämpfen!`);
  }
  for (const e of aliveEnemies(game)) {
    tickPoison(game, e, e.name, (e.status ||= []));
    if (e.hp <= 0) { e.alive = false; log(game, `${e.name} erliegt dem Gift!`); }
  }

  if (c.hp <= 0) {
    cm.over = true;
    cm.result = "niederlage";
    return combatView(game);
  }
  if (!aliveEnemies(game).length) {
    cm.over = true;
    cm.result = "sieg";
    return combatView(game);
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
    enemies: cm.enemies.map((e) => ({
      id: e.id, name: e.name, hp: e.hp, maxHp: e.maxHp, alive: e.alive,
      status: (e.status || []).map((s) => s.type),
    })),
    player: {
      name: game.character.name, hp: game.character.hp, maxHp: game.character.maxHp,
      status: (cm.playerStatus || []).map((s) => s.type),
    },
    party: (game.party || []).map((p) => ({
      id: p.id, name: p.name, role: p.role, hp: p.hp ?? p.maxHp ?? 0, maxHp: p.maxHp ?? 0,
      alive: (p.hp ?? 1) > 0, status: (p.status || []).map((s) => s.type),
    })),
    options: opt,
  };
}
