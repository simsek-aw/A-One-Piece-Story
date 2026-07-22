// Prüft KI-Szenen wie ein Continuity Editor vor der Veröffentlichung.
// Der LLM-Entwurf darf keine Figuren teleportieren, Gesprächspartner ohne
// Erklärung verschwinden lassen oder einen unmotivierten Kampf erfinden.

import { validateGmResponse } from "./schema.js";

const MOVEMENT = /\b(geh|lauf|renn|fahr|segel|reise|ankomm|rud|kletter|spring|betret|verlass|steig|bring|führ|folg|kehr|gelang|flieh|schleich|anleg|ableg|nehme mir .{0,20}zimmer|suche .{0,30}schlafplatz)/i;
const ARRIVAL = /\b(kommt? an bord|klettert|springt (?:an|auf)|legt an|rudert heran|tritt ein|öffnet .{0,24}tür|wird .{0,24}(?:gebracht|geführt)|folgt dir|war .{0,30}versteckt|aus der (?:kajüte|luke|zelle)|erscheint in der tür)/i;
const DEPARTURE = /\b(geht|verlässt|verschwindet|zieht sich zurück|steigt aus|springt von bord|wird abgeführt|läuft davon|verabschiedet sich)/i;
const VIOLENT_ACTION = /\b(angreif|schlag|trete|schieß|erstech|bedroh|provozier|ziehe .*waffe|kämpf)/i;
const COMBAT_CAUSE = /\b(greift? .{0,24}an|überfällt|zieht .{0,20}waffe|stürzt sich|feuert auf|schlägt nach|bedroht|stellt dich|versperrt .{0,20}weg|aus rache|wegen .{0,30}(?:beute|kopfgeld|befehl)|verteidig)/i;
const COMBAT_MOTIVE = /\b(weil|nachdem|aus rache|kopfgeld|beute|befehl|verhaft|ausraub|überfall|erkennt dich|verfolgt|beschützt|territorium|schmuggel|zeuge|streit)/i;
const DISCOVERY_ACTION = /\b(such|untersuch|durchstöber|durchsuch|öffn|kiste|truhe|lager|höhle|wrack|beute|grab)\w*/i;
const SHIP_ACTION = /\b(schiff|boot|kahn|kai|dock)\w*.{0,40}\b(kauf|nehm|beanspruch|reparier|übernehm|stehl)\w*|\b(kauf|nehm|beanspruch|reparier|übernehm|stehl)\w*.{0,40}\b(schiff|boot|kahn)\w*/i;
const EXPLICIT_REWARD = /\b(überreicht|übergibt|schenkt|belohnt|als belohnung|vermacht|gibt dir|bietet dir)/i;
const LEAVE_INTENT = /\b(weiterzieh|weitergeh|weggeh|fortgeh|verlass|aufbrech|ziehe weiter|gehe weiter|sache ruhen lassen)/i;

export function continuityContext(game) {
  const present = new Set(game.scene?.presentNpcIds || []);
  const npcs = [...present].map((id) => {
    const npc = game.world.npcs?.[id];
    return npc ? { id, name: npc.name, role: npc.role } : { id, name: id, role: "" };
  });
  return {
    sceneLocation: game.world.sceneLocation || game.world.locationName,
    mapLocation: game.world.locationName,
    presentNpcs: npcs,
    party: (game.party || []).map((member) => ({ id: member.id, name: member.name, role: member.role })),
    previousNarration: game.scene?.narration?.slice(-1200) || "",
    previousChoices: (game.scene?.choices || []).map((choice) => choice.text).filter(Boolean),
    rules: [
      "Bestehende Personen bleiben anwesend, bis ihr Weggang erzählt wird.",
      "Neue Personen brauchen an abgeschlossenen Orten einen plausiblen Zugang.",
      "Ein Kampf braucht einen sichtbaren Auslöser und ein nachvollziehbares Motiv.",
      "Ortswechsel müssen durch Spielerhandlung oder Erzählung überbrückt werden.",
      "Funde und neue Besitztümer brauchen eine passende Suche, Übergabe oder Belohnung.",
      "Jede Szene muss mindestens ein neues, konkretes Element bringen — keine bloße Bestätigung der Spielerwahl.",
      "Neue Auswahlmöglichkeiten dürfen die vorigen nicht nur umformulieren; sie müssen den Fortschritt der Szene widerspiegeln.",
    ],
  };
}

export async function generateCoherentScene(game, provider, context) {
  const first = validateGmResponse(await provider.generateScene(context));
  const firstIssues = auditContinuity(game, context, first);
  if (!firstIssues.length) {
    game.lastContinuityReview = { corrected: false, issues: [] };
    return first;
  }

  console.warn(`[continuity] Szenenentwurf verworfen: ${firstIssues.join(" | ")}`);

  // Der Provider hat bereits auf den lokalen Erzähler zurückgeschaltet. Ein
  // zweiter externer Aufruf würde bei Quota/Timeout nur erneut scheitern.
  if (first.providerNotice?.type === "fallback") {
    game.lastContinuityReview = { corrected: true, fallback: true, issues: firstIssues };
    return { ...continuityFallback(game, context), providerNotice: first.providerNotice };
  }

  const retryContext = {
    ...context,
    continuityReview: {
      rejected: true,
      issues: firstIssues,
      instruction: "Verwirf den vorigen Entwurf vollständig. Schreibe dieselbe Spieleraktion als räumlich und kausal lückenlose Szene neu. Wiederhole keine Absätze oder Formulierungen der vorherigen Szene. Die Handlung muss sichtbar voranschreiten und 2–4 konkrete Folgeoptionen liefern.",
      rejectedDraft: {
        narration: first.narration,
        sceneLocation: first.stateChanges.sceneLocation,
        npcs: first.npcs.map((npc) => ({ id: npc.id, name: npc.name, role: npc.role })),
        combatStart: first.combatStart,
      },
    },
  };

  try {
    const second = validateGmResponse(await provider.generateScene(retryContext));
    const secondIssues = auditContinuity(game, context, second);
    if (!secondIssues.length) {
      game.lastContinuityReview = { corrected: true, issues: firstIssues };
      return second;
    }
    console.warn(`[continuity] Auch die Korrektur war unplausibel, sicherer Fallback: ${secondIssues.join(" | ")}`);
    game.lastContinuityReview = { corrected: true, fallback: true, issues: secondIssues };
  } catch (error) {
    game.lastContinuityReview = { corrected: true, fallback: true, issues: [...firstIssues, `Korrektur fehlgeschlagen: ${error.message}`] };
  }
  return { ...continuityFallback(game, context), providerNotice: first.providerNotice || null };
}

export function auditContinuity(game, context, gm) {
  const issues = [];
  const continuity = context.continuity || continuityContext(game);
  const oldPlace = normalize(continuity.sceneLocation);
  const newPlace = normalize(gm.stateChanges.sceneLocation || continuity.sceneLocation);
  const combined = `${context.playerAction || ""}\n${gm.narration}`;
  const placeChanged = !!newPlace && newPlace !== oldPlace && !newPlace.includes(oldPlace) && !oldPlace.includes(newPlace);

  if (!gm.combatStart && gm.choices.length < 1) {
    issues.push("Die Szene bietet keine spielbare Folgeoption und kann den Spieler festsetzen.");
  }

  if (context.kind === "turn") {
    const repeatedShare = repeatedParagraphShare(continuity.previousNarration, gm.narration);
    if (repeatedShare >= 0.5) {
      issues.push("Der Entwurf wiederholt mindestens die Hälfte der vorherigen Szene, statt die Spieleraktion fortzuführen.");
    } else if (repeatedShare >= 0.3 && newParagraphLength(continuity.previousNarration, gm.narration) < 220) {
      issues.push("Der Entwurf hängt sich stark an die vorige Szene an und fügt kaum neue Substanz hinzu — nur eine knappe Bestätigung der Wahl.");
    }
  }

  if (context.kind === "turn" && choicesBarelyChanged(continuity.previousChoices, gm.choices)) {
    issues.push("Die neuen Auswahlmöglichkeiten unterscheiden sich kaum von der vorigen Szene — kein erkennbarer Fortschritt.");
  }

  if (context.kind === "turn" && LEAVE_INTENT.test(context.playerAction || "") && !placeChanged && !DEPARTURE.test(gm.narration)) {
    issues.push(`Der Spieler will den Schauplatz verlassen, bleibt im Entwurf aber ohne erzählten Aufbruch in „${continuity.sceneLocation}“.`);
  }

  if (placeChanged && !MOVEMENT.test(combined) && context.kind !== "travel") {
    issues.push(`Unbegründeter Ortswechsel von „${continuity.sceneLocation}“ zu „${gm.stateChanges.sceneLocation}“.`);
  }

  const oldIds = new Set((continuity.presentNpcs || []).map((npc) => npc.id));
  const partyIds = new Set((continuity.party || []).map((npc) => npc.id));
  const newIds = new Set(gm.npcs.map((npc) => npc.id));
  const confined = /(boot|schiff|kajüte|zelle|gefängnis|kerker|verhörraum)/i.test(continuity.sceneLocation || "");

  for (const npc of gm.npcs) {
    if (!npcMentioned(gm.narration, npc)) {
      issues.push(`NPC „${npc.name}“ steht in der Szene, wird im Erzähltext aber nicht eingeführt.`);
    }
    if (confined && !placeChanged && !oldIds.has(npc.id) && !partyIds.has(npc.id) && !actorTransitionExplained(gm.narration, npc, ARRIVAL)) {
      issues.push(`„${npc.name}“ taucht am abgeschlossenen Schauplatz „${continuity.sceneLocation}“ ohne erklärten Zugang auf.`);
    }
  }

  if (context.kind === "turn" && !placeChanged) {
    for (const npc of continuity.presentNpcs || []) {
      if (!newIds.has(npc.id) && !actorTransitionExplained(gm.narration, npc, DEPARTURE)) {
        issues.push(`„${npc.name}“ verschwindet aus der laufenden Szene ohne erzählten Weggang.`);
      }
    }
  }

  if (gm.devilFruitFound && !DISCOVERY_ACTION.test(context.playerAction || "") && !EXPLICIT_REWARD.test(gm.narration) && context.storyEvent?.type !== "geloest") {
    issues.push("Die Teufelsfrucht erscheint ohne passende Suche, Öffnung, Übergabe oder Belohnung.");
  }

  if (gm.shipAcquired && !SHIP_ACTION.test(context.playerAction || "") && !EXPLICIT_REWARD.test(gm.narration) && context.storyEvent?.type !== "geloest") {
    issues.push("Das Schiff geht ohne passende Handlung, Übergabe oder Belohnung in den Besitz des Spielers über.");
  }

  if (gm.combatStart) {
    const engineCause = context.actionRisk?.discovered || ["eskaliert", "verpasst"].includes(context.storyEvent?.type) || VIOLENT_ACTION.test(context.playerAction || "");
    if (!engineCause && !COMBAT_CAUSE.test(gm.narration)) {
      issues.push("Der Kampf beginnt ohne sichtbaren Auslöser oder nachvollziehbares Motiv.");
    }
    const enemiesGrounded = combatantsGrounded(gm.narration, gm.combatStart.enemies, continuity.presentNpcs || []);
    if (!engineCause && !enemiesGrounded && !COMBAT_MOTIVE.test(gm.narration)) {
      issues.push("Neue Gegner haben weder ein etabliertes Motiv noch eine Verbindung zur laufenden Szene.");
    }
    if (confined && !placeChanged && !enemiesGrounded) {
      issues.push(`Neue Angreifer erreichen „${continuity.sceneLocation}“ ohne erklärten Zugang.`);
    }
  }
  return [...new Set(issues)];
}

function continuityFallback(game, context) {
  const continuity = context.continuity || continuityContext(game);
  const movingOn = LEAVE_INTENT.test(context.playerAction || "");
  if (movingOn) {
    const nextPlace = `${continuity.mapLocation} – Hauptstraße`;
    return {
      narration: `Du lässt ${continuity.sceneLocation} bewusst hinter dir. Der Lärm und die Stimmen werden leiser, während du die Hauptstraße von ${continuity.mapLocation} erreichst. Vor dir öffnen sich neue Wege; niemand hält dich am alten Schauplatz fest.`,
      choices: [
        { id: "move_a", text: "Die Umgebung und mögliche Abzweigungen prüfen.", skillCheck: { skill: "wahrnehmung", dc: 10 } },
        { id: "move_b", text: "Nach einem sicheren Ort für eine Pause suchen.", skillCheck: null },
        { id: "move_c", text: "Gezielt nach Gerüchten und Neuigkeiten fragen.", skillCheck: { skill: "ueberzeugen", dc: 11 } },
      ],
      stateChanges: {
        timeAdvanceDays: 0, hpDelta: 0, beriDelta: 0, xpDelta: 5, bountyDelta: 0, heatDelta: 0,
        location: null, sceneLocation: nextPlace, itemsAdded: [], itemsRemoved: [], flagsSet: {},
      },
      npcs: [], recruitable: [], devilFruitFound: null, shipAcquired: null, combatStart: null, canonOffer: null, panels: [],
    };
  }
  const actors = continuity.presentNpcs || [];
  const actorText = actors.length
    ? `${actors.map((npc) => npc.name).join(" und ")} ${actors.length === 1 ? "bleibt" : "bleiben"} in deiner unmittelbaren Nähe.`
    : "Niemand Neues tritt unvermittelt auf den Plan.";
  const checkText = context.checkResult
    ? context.checkResult.success ? " Dein Versuch gelingt und verändert die Stimmung spürbar." : " Dein Versuch scheitert, doch die Situation bleibt nachvollziehbar bestehen."
    : "";
  const action = context.playerAction && context.playerAction !== "(Spielbeginn)"
    ? `Du setzt deinen Entschluss um: ${context.playerAction}`
    : "Du nimmst deine Umgebung aufmerksam in Augenschein.";

  return {
    narration: `Du befindest dich weiterhin am Schauplatz ${continuity.sceneLocation}. ${action}.${checkText}\n\n${actorText} Die Lage entwickelt sich ohne unerklärten Ortswechsel oder plötzlichen Angriff weiter.`,
    choices: [
      { id: "cont_a", text: "Die unmittelbare Umgebung genauer untersuchen.", skillCheck: { skill: "wahrnehmung", dc: 10 } },
      ...(actors[0] ? [{ id: "cont_b", text: `Das Gespräch mit ${actors[0].name} fortsetzen.`, skillCheck: { skill: "ueberzeugen", dc: 11 } }] : []),
      { id: "cont_c", text: "Den Schauplatz bewusst verlassen und weiterziehen.", skillCheck: null },
    ],
    stateChanges: {
      timeAdvanceDays: 0, hpDelta: 0, beriDelta: 0, xpDelta: 5, bountyDelta: 0, heatDelta: 0,
      location: null, sceneLocation: continuity.sceneLocation, itemsAdded: [], itemsRemoved: [], flagsSet: {},
    },
    npcs: actors.map((npc) => {
      const memory = game.world.npcs?.[npc.id];
      return { id: npc.id, name: npc.name, role: npc.role || "", disposition: memory?.disposition || 0, note: "Blieb während der Szene anwesend." };
    }),
    recruitable: [], devilFruitFound: null, shipAcquired: null, combatStart: null, canonOffer: null, panels: [],
  };
}

function repeatedParagraphShare(previous, current) {
  const oldParagraphs = paragraphs(previous);
  const newParagraphs = paragraphs(current);
  if (!oldParagraphs.length || !newParagraphs.length) return 0;
  const repeatedLength = newParagraphs
    .filter((paragraph) => oldParagraphs.some((old) => wordSimilarity(old, paragraph) >= 0.82))
    .reduce((sum, paragraph) => sum + paragraph.length, 0);
  const totalLength = newParagraphs.reduce((sum, paragraph) => sum + paragraph.length, 0);
  return totalLength ? repeatedLength / totalLength : 0;
}

// Wie viele Zeichen der neuen Antwort sind wirklich NEU (kein Wiederaufguss
// eines Absatzes aus der vorigen Szene)? Ergänzt repeatedParagraphShare für
// den Fall, dass der Entwurf zwar formal "neu" ist, aber kaum Substanz bringt.
function newParagraphLength(previous, current) {
  const oldParagraphs = paragraphs(previous);
  const newParagraphs = paragraphs(current);
  if (!newParagraphs.length) return 0;
  return newParagraphs
    .filter((paragraph) => !oldParagraphs.some((old) => wordSimilarity(old, paragraph) >= 0.82))
    .reduce((sum, paragraph) => sum + paragraph.length, 0);
}

// Erkennt das "steckengeblieben"-Muster: derselbe Optionensatz kommt fast
// unverändert zurück, obwohl der Spieler gerade gehandelt hat.
function choicesBarelyChanged(previousTexts, newChoices) {
  const oldList = (previousTexts || []).map(normalize).filter(Boolean);
  const newList = (newChoices || []).map((choice) => normalize(choice.text)).filter(Boolean);
  if (oldList.length < 2 || newList.length < 2) return false;
  const matches = newList.filter((text) => oldList.some((old) => wordSimilarity(old, text) >= 0.6)).length;
  return matches / newList.length >= 0.75;
}

function paragraphs(text) {
  return String(text || "").split(/\n\s*\n/).map(normalize).filter((part) => part.length >= 35 && !/^wie gehst du vor/.test(part));
}

function wordSimilarity(a, b) {
  const left = new Set(a.split(/\s+/).filter((word) => word.length > 2));
  const right = new Set(b.split(/\s+/).filter((word) => word.length > 2));
  if (!left.size || !right.size) return 0;
  const shared = [...left].filter((word) => right.has(word)).length;
  return shared / Math.max(left.size, right.size);
}

function npcMentioned(narration, npc) {
  const text = normalize(narration);
  const name = normalize(npc.name);
  if (name.length >= 3 && text.includes(name)) return true;
  return String(npc.role || "").split(/[^\p{L}\p{N}]+/u).map(normalize).some((word) => word.length >= 5 && text.includes(word));
}

function combatantsGrounded(narration, enemies, presentNpcs) {
  const sentences = String(narration || "").split(/(?<=[.!?])\s+/);
  return (enemies || []).every((enemy) => {
    const labels = `${enemy.name || ""} ${enemy.kind || ""}`.split(/[^\p{L}\p{N}]+/u).map(normalize).filter((word) => word.length >= 5);
    const alreadyPresent = (presentNpcs || []).some((npc) => {
      const actor = normalize(`${npc.name} ${npc.role}`);
      return labels.some((label) => actor.includes(label) || label.includes(actor));
    });
    if (alreadyPresent) return true;
    return sentences.some((sentence) => {
      const normalizedSentence = normalize(sentence);
      return labels.some((label) => normalizedSentence.includes(label)) && ARRIVAL.test(sentence);
    });
  });
}

function actorTransitionExplained(narration, npc, transitionPattern) {
  const sentences = String(narration || "").split(/(?<=[.!?])\s+/);
  const labels = `${npc.name || ""} ${npc.role || ""}`.split(/[^\p{L}\p{N}]+/u).map(normalize).filter((word) => word.length >= 5);
  return sentences.some((sentence) => {
    const normalizedSentence = normalize(sentence);
    return labels.some((label) => normalizedSentence.includes(label)) && transitionPattern.test(sentence);
  });
}

function normalize(value) {
  return String(value || "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}
