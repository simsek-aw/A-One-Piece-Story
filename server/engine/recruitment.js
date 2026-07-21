// Fünfstufige Rekrutierungsdialoge. Eine Person tritt nicht wegen eines
// einzigen Buttons bei: Persönlichkeit, Beziehung, Namenskenntnis und die
// gewählten Gesprächsstrategien wirken gemeinsam auf die Entscheidung.

import { skillCheck } from "./dice.js";
import { applyXp } from "./character.js";
import { upsertNpc } from "./memory.js";

const PERSONALITIES = {
  aggressiv: { label: "aggressiv", baseDc: 13, affinity: { ehrlich: 1, empathisch: -2, pragmatisch: 1, herausfordern: 2 } },
  schuechtern: { label: "schüchtern", baseDc: 10, affinity: { ehrlich: 1, empathisch: 2, pragmatisch: 0, herausfordern: -3 } },
  freundlich: { label: "freundlich", baseDc: 10, affinity: { ehrlich: 2, empathisch: 2, pragmatisch: 0, herausfordern: -2 } },
  zwielichtig: { label: "zwielichtig", baseDc: 12, affinity: { ehrlich: -1, empathisch: 0, pragmatisch: 2, herausfordern: 1 } },
  stolz: { label: "stolz", baseDc: 13, affinity: { ehrlich: 2, empathisch: 0, pragmatisch: 1, herausfordern: 1 } },
  vorsichtig: { label: "vorsichtig", baseDc: 12, affinity: { ehrlich: 1, empathisch: 2, pragmatisch: 1, herausfordern: -2 } },
};

const STAGES = [
  { title: "Annäherung", prompt: "Die Person mustert dich und wartet darauf, wie du das Gespräch eröffnest." },
  { title: "Name & Beweggrund", prompt: "Bevor von einer Crew die Rede ist, musst du verstehen, wer dir gegenübersteht und was diese Person antreibt." },
  { title: "Vertrauensprobe", prompt: "Deine Absichten werden geprüft. Leere Versprechen werden jetzt schnell entlarvt." },
  { title: "Bedingungen", prompt: "Es geht um Gefahr, Beute, Freiheit und darum, welchen Platz die Person an Bord hätte." },
  { title: "Entscheidung", prompt: "Der entscheidende Moment ist gekommen. Ein letzter Satz kann Vertrauen festigen oder alles zerstören." },
];

const APPROACHES = {
  ehrlich: { label: "Offen und ehrlich sprechen", skill: "ueberzeugen", description: "Erkläre deinen Traum und verschweige die Risiken nicht." },
  empathisch: { label: "Zuhören und Verständnis zeigen", skill: "wahrnehmung", description: "Finde heraus, was die Person wirklich braucht." },
  pragmatisch: { label: "Ein konkretes Angebot machen", skill: "ueberzeugen", description: "Sprich über Rolle, Schutz, Beute und Nutzen." },
  herausfordern: { label: "Stärke zeigen und herausfordern", skill: "einschuechtern", description: "Beweise Entschlossenheit – riskant bei sanften Gemütern." },
};

export function ensureNpcPersonality(game, npc) {
  const record = game.world.npcs?.[npc.id];
  if (!record) return null;
  if (!record.personality) record.personality = inferPersonality(npc.id, npc.role);
  if (record.nameKnown == null) record.nameKnown = false;
  return record;
}

export function startRecruitment(game, target) {
  const record = ensureNpcPersonality(game, target) || upsertNpc(game, target, game.world.day);
  if (!record.personality) record.personality = inferPersonality(target.id, target.role);
  const hostility = /räuber|bandit|plünderer/i.test(target.role || "") ? -3 : 0;
  game.recruitment = {
    status: "active",
    npcId: target.id,
    realName: target.name,
    role: target.role,
    reason: target.reason,
    personality: record.personality,
    nameKnown: !!record.nameKnown,
    step: 0,
    rapport: Math.round((record.disposition || 0) / 20) + hostility,
    successes: 0,
    history: [],
    message: openingFor(record.personality, target.role),
  };
  return game.recruitment;
}

export function advanceRecruitment(game, approachId) {
  const dialogue = game.recruitment;
  if (!dialogue || dialogue.status !== "active") throw new Error("Es läuft kein Rekrutierungsgespräch.");
  const approach = APPROACHES[approachId];
  if (!approach) throw new Error("Unbekannte Gesprächsstrategie.");
  const personality = PERSONALITIES[dialogue.personality] || PERSONALITIES.vorsichtig;
  const compatibility = personality.affinity[approachId] || 0;
  const dc = personality.baseDc + Math.max(0, dialogue.step - 2) - compatibility;
  const check = skillCheck(game.character, approach.skill, dc, game.party);
  let delta = (check.success ? 2 : -1) + compatibility;
  if (check.kritErfolg) delta += 2;
  if (check.kritFehler) delta -= 2;
  dialogue.rapport = clamp(dialogue.rapport + delta, -12, 20);
  if (check.success) dialogue.successes += 1;

  // Der Name ist ein verdienter sozialer Vorteil, kein kostenloses UI-Wissen.
  if (!dialogue.nameKnown && dialogue.step <= 1 && check.success && (approachId === "ehrlich" || approachId === "empathisch")) {
    dialogue.nameKnown = true;
    dialogue.rapport = clamp(dialogue.rapport + 1, -12, 20);
  }
  const reaction = reactionFor(dialogue.personality, approachId, check.success, dialogue.nameKnown ? dialogue.realName : null);
  dialogue.history.push({ step: dialogue.step, approachId, success: check.success, delta, check });
  dialogue.step += 1;
  dialogue.message = reaction;

  const record = game.world.npcs?.[dialogue.npcId];
  if (record) {
    record.personality = dialogue.personality;
    record.nameKnown = dialogue.nameKnown;
    record.disposition = clamp((record.disposition || 0) + delta * 4, -100, 100);
  }
  game.lastCheck = check;

  if (dialogue.step >= STAGES.length) finishRecruitment(game);
  return dialogue;
}

export function closeRecruitment(game) {
  game.recruitment = null;
}

export function recruitmentView(game) {
  const dialogue = game.recruitment;
  if (!dialogue) return null;
  const stage = STAGES[Math.min(dialogue.step, STAGES.length - 1)];
  return {
    status: dialogue.status,
    npcId: dialogue.npcId,
    displayName: dialogue.nameKnown ? dialogue.realName : "Unbekannte Person",
    role: dialogue.role,
    personality: PERSONALITIES[dialogue.personality]?.label || dialogue.personality,
    nameKnown: dialogue.nameKnown,
    step: dialogue.step,
    totalSteps: STAGES.length,
    stageTitle: dialogue.status === "active" ? stage.title : "Entscheidung",
    stagePrompt: dialogue.status === "active" ? stage.prompt : "",
    rapport: dialogue.rapport,
    message: dialogue.message,
    joined: dialogue.status === "joined",
    options: dialogue.status === "active"
      ? Object.entries(APPROACHES).map(([id, option]) => ({ id, label: option.label, description: option.description, skill: option.skill }))
      : [],
  };
}

function finishRecruitment(game) {
  const d = game.recruitment;
  const joined = d.rapport >= 6 && d.successes >= 3;
  d.status = joined ? "joined" : "rejected";
  const shownName = d.nameKnown ? d.realName : "Die Person";
  if (joined && !game.party.some((member) => member.id === d.npcId)) {
    game.party.push({
      id: d.npcId,
      name: d.realName,
      role: d.role,
      personality: d.personality,
      loyalty: clamp(45 + d.rapport * 2, 35, 75),
      joinedDay: game.world.day,
    });
    game.lastLevelUps = applyXp(game.character, 30);
    d.message = `${shownName} lässt den Blick lange auf dir ruhen – dann folgt ein entschiedenes Nicken. „Gut. Ich komme mit. Aber gib mir keinen Grund, diese Entscheidung zu bereuen.“`;
  } else {
    game.lastLevelUps = applyXp(game.character, 8);
    d.message = `${shownName} schüttelt langsam den Kopf. „Nein. Dafür vertraue ich dir noch nicht genug.“ Die Ablehnung ist das Ergebnis des gesamten Gesprächs, nicht eines einzigen Satzes.`;
  }
  const record = game.world.npcs?.[d.npcId];
  if (record) {
    record.notes.push({ day: game.world.day, text: joined ? "Trat nach einem ausführlichen Gespräch der Crew bei." : "Lehnte den Beitritt nach einem ausführlichen Gespräch ab." });
    if (record.notes.length > 8) record.notes = record.notes.slice(-8);
  }
  game.recruitable = (game.recruitable || []).filter((candidate) => candidate.id !== d.npcId);
}

function inferPersonality(id, role = "") {
  const text = `${id} ${role}`.toLowerCase();
  if (/räuber|bandit|söldner|kämpfer|wache/.test(text)) return "aggressiv";
  if (/mask|schmuggl|dieb|spion|\?/.test(text)) return "zwielichtig";
  if (/offizier|adlig|kapitän/.test(text)) return "stolz";
  if (/kind|jung|lehrling/.test(text)) return "schuechtern";
  if (/wirt|arzt|koch|navigator|zimmermann/.test(text)) return "freundlich";
  const ids = Object.keys(PERSONALITIES);
  const hash = [...String(id)].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return ids[hash % ids.length];
}

function openingFor(personality, role) {
  const lines = {
    aggressiv: `Die Person verschränkt die Arme. „Nur weil du eine Crew suchst, heißt das nicht, dass ich Befehle von dir annehme.“`,
    schuechtern: `Die Person weicht deinem Blick aus und antwortet zunächst nur mit einem vorsichtigen Nicken.`,
    freundlich: `Die Person hört dir offen zu, wirkt aber nicht bereit, das eigene Leben für ein hübsches Versprechen aufzugeben.`,
    zwielichtig: `Ein schwer lesbares Lächeln huscht über das Gesicht. „Eine Crew also? Dann sag mir zuerst, was für mich dabei herausspringt.“`,
    stolz: `Die Person richtet sich auf. „Du willst jemanden wie mich anwerben? Dann überzeug mich, dass dein Ziel groß genug ist.“`,
    vorsichtig: `Die Person hält Abstand und prüft Fluchtwege, Hände und Tonfall. Vertrauen wird hier Arbeit kosten.`,
  };
  return `${lines[personality] || lines.vorsichtig} (${role || "unbekannte Rolle"})`;
}

function reactionFor(personality, approachId, success, name) {
  const subject = name || "Die Person";
  if (success) {
    const positive = {
      ehrlich: `${subject} erkennt, dass du nichts beschönigst. Die Schultern entspannen sich ein wenig.`,
      empathisch: `${subject} antwortet erst zögernd, dann ehrlicher. Du hast etwas Wichtiges verstanden.`,
      pragmatisch: `${subject} wägt dein Angebot sichtbar ab. Zum ersten Mal klingt die Crew wie eine echte Möglichkeit.`,
      herausfordern: `${subject} hält deinem Blick stand – und grinst schließlich. Deine Entschlossenheit ist angekommen.`,
    };
    return positive[approachId];
  }
  const negative = {
    ehrlich: `${subject} hört die Worte, findet darin aber noch keinen Grund, dir das eigene Leben anzuvertrauen.`,
    empathisch: `${subject} durchschaut deinen Versuch, Nähe herzustellen, und zieht sich innerlich zurück.`,
    pragmatisch: `${subject} nennt dein Angebot dünn und beginnt bereits, nach einem Ausgang aus dem Gespräch zu suchen.`,
    herausfordern: `${subject} reagiert gereizt. Für einen Moment liegt Gewalt in der Luft.`,
  };
  return negative[approachId] || "Die gewählte Strategie verfehlt ihre Wirkung. Das Gegenüber zieht sich merklich zurück.";
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
