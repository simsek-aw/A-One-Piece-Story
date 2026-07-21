// Deterministische Platzhalter-Engine ("Spielleiter ohne KI").
//
// Sie ist bewusst NICHT klug — ihr Zweck ist, die komplette Spielschleife und
// den GM-Antwort-Vertrag lauffähig zu demonstrieren, damit der echte
// Claude-Provider später exakt dasselbe Format erfüllt. Sie reagiert grob auf
// Ort, Archetyp, Spieleraktion und Würfel-Ergebnisse, streut NPCs, Gerüchte,
// Rekrutierungs-Angebote und kleine Plot-Haken ein.

import { randomDevilFruit } from "../content/devilFruits.js";

const LOCATION_FLAVOR = {
  loguetown: [
    "Der Wind trägt Salz und Asche über den Marktplatz von Loguetown. Auf dem Hinrichtungsgerüst, wo der Piratenkönig sein Ende fand, drängen sich Neugierige.",
    "In den Gassen Loguetowns feilschen Waffenschmiede, während Marine-Patrouillen misstrauisch die frischen Piratengesichter mustern.",
    "Am Hafen von Loguetown liegen Schiffe aller Art — von wackligen Kähnen bis zu stolzen Karavellen, jedes voller Hoffnung auf das One Piece.",
  ],
  shells_town: [
    "Die weißen Mauern der Marine-Garnison von Shells Town glänzen — doch hinter ihnen riecht es nach fauligen Deals.",
    "Auf dem Hof der Garnison drillt ein Offizier eine Handvoll Rekruten, während die Stadt gedämpft ihren Geschäften nachgeht.",
  ],
  hafendorf_sirup: [
    "Das Sirup-Hafendorf döst in der Nachmittagssonne. Die Kneipe am Kai ist der einzige Ort mit Leben — und sie steht zum Verkauf.",
    "Möwen kreischen über den Booten des verschlafenen Dorfes. Drinnen in der Kneipe klimpert jemand halbherzig auf einer Laute.",
  ],
  klippen_vorposten: [
    "Der Wind heult um den Felsklippen-Außenposten. Die See darunter ist grau und unversöhnlich, und die Soldaten sprechen nur im Flüsterton über ihren Kommandanten.",
    "Möwen wagen sich kaum an die windgepeitschten Klippen. Der Marine-Vorposten wirkt eher wie ein Gefängnis für seine eigene Besatzung.",
  ],
  orangen_hafen: [
    "Der Orangen-Hafen duftet nach Zitrusfrüchten und Teer. An den Kaimauern wird gefeilscht, geladen — und misstrauisch beobachtet.",
    "Kisten voller Orangen stapeln sich am Dock. Doch die Blicke der Händler sind wachsam: Piratenbanden kommen hier oft zu Besuch.",
  ],
  windmuehlendorf: [
    "Über dem Windmühlendorf drehen sich träge die alten Flügel. Abends erzählt man sich hier Geschichten — auch von einer 'Lücke' in der Geschichte der Welt.",
    "Ein ruhiges Dorf, in dem die Zeit langsamer läuft. Doch in den alten Logbüchern der Bibliothek schlummern Fragen, die niemand laut stellt.",
  ],
};

const NPC_POOL = [
  { id: "npc_kaya_die_wirtin", name: "Kaya die Wirtin", role: "Kneipenwirtin" },
  { id: "npc_gunkan_der_soeldner", name: "Gunkan", role: "Söldner mit Narbe" },
  { id: "npc_lina_navigatorin", name: "Lina", role: "junge Navigatorin" },
  { id: "npc_offizier_borrot", name: "Offizier Borrot", role: "Marine-Offizier" },
  { id: "npc_alter_job", name: "Der alte Job", role: "Schiffszimmermann a.D." },
  { id: "npc_maskierter_fremder", name: "Ein maskierter Fremder", role: "?" },
];

const OPENERS = [
  "Ein hagerer Mann mit stechendem Blick spricht dich an.",
  "Aus einer Seitengasse hörst du einen unterdrückten Hilferuf.",
  "Ein Kind zupft an deinem Ärmel und deutet aufgeregt zum Kai.",
  "Eine Gestalt am Tresen beobachtet dich schon eine ganze Weile.",
  "Ein Aushang flattert an der Wand: gesucht wird eine mutige Hand für einen Auftrag.",
];

const TWISTS = [
  "Doch etwas an der Sache stimmt nicht — der Fremde trägt ein Marine-Abzeichen unter dem Mantel.",
  "Erst später wird dir klar: Der Name auf dem Papier gehört jemandem, den du bereits getroffen hast.",
  "Als du dich umdrehst, ist die Person spurlos verschwunden — und deine Börse fühlt sich leichter an.",
  "Ein Windstoß enthüllt für einen Moment eine Tätowierung, die verdächtig nach einem berüchtigten Jolly Roger aussieht.",
];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
function chance(p) {
  return Math.random() < p;
}

export class MockProvider {
  async generateScene(context) {
    if (context.kind === "start") return this.startScene(context);
    if (context.kind === "recruit") return this.recruitScene(context);
    if (context.kind === "activity") return this.activityScene(context);
    if (context.kind === "travel") return this.travelScene(context);
    if (context.kind === "eat_fruit") return this.eatFruitScene(context);
    if (context.kind === "combat_end") return this.combatEndScene(context);
    if (context.kind === "canon_join") return this.canonJoinScene(context);
    if (context.kind === "rest") return this.restScene(context);
    return this.turnScene(context);
  }

  restScene(context) {
    return {
      narration:
        `${context.playerAction}\n\n` +
        `Die Nacht senkt sich über ${context.world.locationName}. Für einen Moment ist die Welt still — ` +
        `dann bricht ein neuer ${context.world.tageszeit || "Morgen"} an.`,
      choices: this.genericChoices(context),
      stateChanges: this.emptyChanges(),
      npcs: [],
      recruitable: [],
      panels: [{ kind: "nacht", caption: `Nachtruhe in ${context.world.locationName}` }],
    };
  }

  canonJoinScene(context) {
    const r = context.canonResult || {};
    const txt = r.success
      ? `Man mustert dich prüfend — dann ein Nicken. Du gehörst nun zu ${r.crew}! ` +
        (r.faction === "marine"
          ? "Man drückt dir eine Uniform in die Hand; die Patrouillen werden dich fortan in Ruhe lassen."
          : "Die Crew nimmt dich auf; unter diesem Banner reist es sich sicherer — aber die Erwartungen sind hoch.")
      : `Man lässt dich abblitzen. „${r.crew} nimmt nicht jeden.“ Der Beitritt bleibt dir (vorerst) verwehrt.`;
    return {
      narration: txt + "\n\nWie geht es weiter?",
      choices: this.genericChoices(context),
      stateChanges: this.emptyChanges(),
      npcs: [],
      recruitable: [],
      panels: r.success ? [{ kind: "crew", caption: `Aufnahme bei ${r.crew}` }] : [],
    };
  }

  combatEndScene(context) {
    const r = context.combatResult?.result;
    const txt =
      r === "sieg"
        ? "Als der letzte Gegner zu Boden geht, kehrt Stille ein. Schwer atmend stehst du inmitten des Staubs — du hast gesiegt."
        : r === "flucht"
          ? "Mit pochendem Herzen brichst du durch und lässt die Angreifer hinter dir. Fürs Erste bist du entkommen."
          : "Ein letzter Treffer, dann wird alles schwarz. Später erwachst du geschwächt an einem stillen Ort — am Leben, aber gezeichnet.";
    const panels = r === "sieg" ? [{ kind: "sieg", caption: "Sieg!" }] : [];
    return {
      narration: txt + "\n\n" + context.combatResult?.summary + "\n\nWie geht es weiter?",
      choices: this.genericChoices(context),
      stateChanges: this.emptyChanges(),
      npcs: [],
      recruitable: [],
      panels,
    };
  }

  activityScene(context) {
    const a = context.activity;
    let lore = "";
    if (context.loreUnlocks?.length) {
      lore = "\n\n📜 In den Aufzeichnungen stößt du auf etwas Neues:\n" +
        context.loreUnlocks.map((l) => `„${l.title}“ — ${l.text}`).join("\n\n");
    }
    return {
      narration:
        `Du widmest den Tag der Aktivität: ${a.name}.\n\n` +
        `${a.desc}\n\nDie Mühe zahlt sich aus — du spürst, wie du ein Stück wächst.${lore}`,
      choices: this.genericChoices(context),
      stateChanges: this.emptyChanges(),
      npcs: [],
      recruitable: [],
    };
  }

  travelScene(context) {
    const t = context.travelInfo;
    const parts = [
      `Die See rollt unter dir dahin. Nach ${t.days} Tag(en) taucht ${context.world.locationName} am Horizont auf.`,
    ];
    const changes = this.emptyChanges();
    // Auf hoher See kann es zu Zwischenfällen kommen.
    if (chance(0.35)) {
      parts.push("Unterwegs kreuzt ein fremdes Schiff euren Kurs — die Begegnung endet glimpflich, kostet aber Nerven.");
      changes.xpDelta = 15;
    }
    return {
      narration: parts.join("\n\n") + `\n\nDu betrittst ${context.world.locationName}. Was tust du?`,
      choices: this.genericChoices(context),
      stateChanges: changes,
      npcs: [],
      recruitable: [],
    };
  }

  eatFruitScene(context) {
    const f = context.fruit;
    return {
      narration:
        `Der Geschmack ist grauenhaft — wie fauliges Meer und bitterer Rauch. Doch dann: ${f.ability}\n\n` +
        `Du bist jetzt ein Teufelsfrucht-Nutzer (${f.type}). Der Preis dafür ist unumkehrbar: ${f.downside}`,
      choices: this.genericChoices(context),
      stateChanges: { ...this.emptyChanges(), xpDelta: 30 },
      npcs: [],
      recruitable: [],
    };
  }

  startScene(context) {
    const loc = context.world.location;
    const flavor = pick(LOCATION_FLAVOR[loc] || LOCATION_FLAVOR.loguetown);
    const archLine = {
      marine: "Als frisch vereidigter Marine spürst du das Gewicht deiner Uniform — und die Blicke, die zwischen Respekt und Argwohn schwanken.",
      pirat: "Dein Herz schlägt für die Freiheit der offenen See. Du hast noch keine Crew, kein Schiff — nur einen Traum, so groß wie der Ozean.",
      barkeeper: "Deine Hände kennen das Gewicht einer vollen Flasche und das Gewicht eines guten Geheimnisses. Hier fängt etwas Neues an.",
    }[context.character.archetyp] || "";

    const rumor = context.world.rumors[context.world.rumors.length - 1];

    const npc = pick(NPC_POOL);
    return {
      narration:
        `${flavor}\n\n${archLine}\n\n` +
        (rumor ? `Am Rande hörst du ein Gerücht: „${rumor}“\n\n` : "") +
        `${pick(OPENERS)}`,
      choices: [
        { id: "a", text: "Zuhören und herausfinden, was los ist.", skillCheck: { skill: "wahrnehmung", dc: 10 } },
        { id: "b", text: "Selbstbewusst das Gespräch übernehmen.", skillCheck: { skill: "ueberzeugen", dc: 12 } },
        { id: "c", text: "Vorsichtig Abstand halten und beobachten.", skillCheck: null },
      ],
      stateChanges: this.emptyChanges(),
      npcs: [{ id: npc.id, name: npc.name, role: npc.role, disposition: 0, note: "Zum ersten Mal getroffen." }],
      recruitable: [],
      panels: [{ kind: "ankunft", caption: `${context.world.locationName} — ein neuer Anfang` }],
    };
  }

  turnScene(context) {
    const check = context.checkResult;
    const parts = [];

    if (check) {
      if (check.kritErfolg) {
        parts.push(`Ein Meisterwurf! (${check.skillName}: ${check.total} gegen DC ${check.dc}) — alles gelingt weit über Erwarten.`);
      } else if (check.kritFehler) {
        parts.push(`Ein katastrophaler Patzer! (${check.skillName}: ${check.total} gegen DC ${check.dc}) — das geht gründlich schief.`);
      } else if (check.success) {
        parts.push(`Es gelingt dir. (${check.skillName}: ${check.total} gegen DC ${check.dc}).`);
      } else {
        parts.push(`Es misslingt. (${check.skillName}: ${check.total} gegen DC ${check.dc}).`);
      }
    }

    parts.push(pick(LOCATION_FLAVOR[context.world.location] || LOCATION_FLAVOR.loguetown));

    // Bekannten NPC gelegentlich zurückbringen (Gedächtnis demonstrieren).
    const knownNpcs = context.memory?.npcs || [];
    const npcs = [];
    let recruitable = [];

    if (knownNpcs.length && chance(0.5)) {
      const known = pick(knownNpcs);
      const mood = known.gesinnung > 20 ? "freundlich" : known.gesinnung < -20 ? "feindselig" : "reserviert";
      parts.push(`${known.name} taucht wieder auf und begegnet dir ${mood}.`);
      npcs.push({
        id: known.id,
        name: known.name,
        role: known.role || "",
        disposition: known.gesinnung + (check?.success ? 8 : -4),
        note: check?.success ? "Der Spieler hat sich bewährt." : "Der Spieler enttäuschte ein wenig.",
      });
    } else if (chance(0.5)) {
      const npc = pick(NPC_POOL);
      parts.push(`${pick(OPENERS)} Es ist ${npc.name} (${npc.role}).`);
      npcs.push({ id: npc.id, name: npc.name, role: npc.role, disposition: 0, note: "Neue Bekanntschaft." });
      if (chance(0.5)) {
        recruitable = [{ id: npc.id, name: npc.name, role: npc.role, reason: "sucht einen Grund mitzukommen" }];
      }
    }

    if (chance(0.22)) parts.push(pick(TWISTS));

    const changes = this.emptyChanges();
    changes.xpDelta = check?.success ? 20 : 10;
    if (check?.kritErfolg) changes.xpDelta = 35;
    if (check?.kritFehler) changes.hpDelta = -6;
    if (chance(0.15)) changes.beriDelta = pick([-15, 10, 25, 40]);
    if (check?.success && chance(0.15)) changes.itemsAdded = [pick(["Notration", "Rostiges Messer", "Verband", "Fass Rum"])];

    // --- Kopfgeld/Heat-Konsequenzen: Marine-Begegnungen (ggf. Kampf) ---
    const st = context.status || {};
    const troubleP = (st.marineTroubleChance || 5) / 100;
    let extra = {};
    if (chance(troubleP)) {
      const officer = { id: "npc_offizier_borrot", name: "Offizier Borrot", role: "Marine-Offizier" };
      if (st.bounty > 0 || st.heat >= 45) {
        parts.push(`Eine Marine-Patrouille wird auf dich aufmerksam! „Das Gesicht kenne ich von einem Steckbrief …“ Sie ziehen die Waffen.`);
        npcs.push({ id: officer.id, name: officer.name, role: officer.role, disposition: -30, note: "Hat dich als Gesuchten gestellt." });
        // Bei ernster Lage: Kampf!
        const enemies = [{ name: "Marine-Soldat", kind: "marine_soldat" }];
        if (st.heat >= 60) enemies.push({ name: "Marine-Soldat", kind: "marine_soldat" });
        extra.combatStart = { enemies };
      } else {
        parts.push(`Eine Marine-Patrouille mustert dich kurz, findet aber nichts Verdächtiges und zieht weiter.`);
        npcs.push({ id: officer.id, name: officer.name, role: officer.role, disposition: 0, note: "Routine-Kontrolle." });
      }
    }

    // Gelegentlicher Zwischenfall: Banditen/Wildtier greifen an.
    if (!extra.combatStart && chance(0.12)) {
      const roll = pick([
        [{ name: "Straßenbandit", kind: "bandit" }],
        [{ name: "Straßenbandit", kind: "bandit" }, { name: "Straßenbandit", kind: "bandit" }],
        [{ name: "wildes Tier", kind: "wildtier" }],
        [{ name: "Kopfgeldjäger", kind: "kopfgeldjaeger" }],
      ]);
      parts.push(`Plötzlich versperren dir Angreifer den Weg — es kommt zum Kampf!`);
      extra.combatStart = { enemies: roll };
    }

    // Kritischer Erfolg gegen Widerstand kann Ruhm (und Kopfgeld) bringen.
    if (check?.kritErfolg && chance(0.4)) {
      changes.bountyDelta = pick([500000, 1000000, 3000000]);
      parts.push(`Deine Tat spricht sich herum — dein Ruf (und dein Kopfgeld) wächst.`);
    }

    // Seltener Teufelsfrucht-Fund (nur wenn man noch keine hat).
    if (!st.hasDevilFruit && chance(0.06)) {
      const fruit = randomDevilFruit();
      parts.push(`In einer alten Truhe entdeckst du eine seltsame, spiralig gemusterte Frucht: eine ${fruit.name}!`);
      extra.devilFruitFound = { id: fruit.id, name: fruit.name, type: fruit.type };
    }
    // Gelegentliches Angebot, Teil einer Crew zu werden (kleine Crews häufiger).
    if (!extra.combatStart && !context.canonAffiliation && !context.canonOffer && chance(0.1)) {
      const crewId = pick([
        "freibeuter_rookies", "freibeuter_rookies", "schmuggler", "wirte_gilde", "kopfgeldjaeger_gilde",
        "big_mom", "kaido", "whitebeard", "marine", "giants",
      ]);
      const who = {
        big_mom: "ein Abgesandter der Big-Mom-Piraten",
        kaido: "ein finsterer Handlanger Kaidos",
        whitebeard: "ein Kommandant der Whitebeard-Piraten",
        marine: "ein Marine-Rekrutierungsoffizier",
        giants: "ein hünenhafter Krieger aus Elbaf",
        freibeuter_rookies: "ein aufgeregter Rookie-Kapitän",
        schmuggler: "ein zwielichtiger Bootsmann",
        wirte_gilde: "eine resolute Hafenwirtin",
        kopfgeldjaeger_gilde: "ein narbengesichtiger Kopfgeldjäger",
      }[crewId];
      parts.push(`${who} spricht dich an — man könnte sich einer größeren Sache anschließen.`);
      extra.canonOffer = { crewId };
    }

    // Sehr seltenes Schiff (nur wenn man keins hat).
    if (!extra.combatStart && !context.canonAffiliation && chance(0.04)) {
      const shipName = pick(["Möwenschwinge", "Roter Anker", "Sturmkind", "Alte Dame"]);
      parts.push(`Am Kai liegt ein herrenloses kleines Schiff — mit etwas Mühe könnte es deins werden: die '${shipName}'.`);
      extra.shipAcquired = { name: shipName };
    }

    // Key-Moment-Panel für Schlüsselmomente
    let panels = [];
    if (extra.combatStart) panels = [{ kind: "duell", caption: "Es kommt zum Kampf!" }];
    else if (extra.devilFruitFound) panels = [{ kind: "enthuellung", caption: "Eine geheimnisvolle Frucht" }];
    else if (chance(0.12)) panels = [{ kind: "spannung", caption: "Alle Blicke richten sich auf dich." }];

    return {
      narration: parts.join("\n\n") + "\n\nWie gehst du vor?",
      choices: this.genericChoices(context),
      stateChanges: changes,
      npcs,
      recruitable,
      panels,
      ...extra,
    };
  }

  recruitScene(context) {
    const t = context.recruitTarget;
    const ok = context.checkResult?.success;
    return {
      narration: ok
        ? `${t.name} mustert dich lange — dann bricht ein Grinsen durch. „Also gut. Wohin die Reise auch geht: Ich bin dabei.“ ${t.name} schließt sich dir an.`
        : `${t.name} schüttelt den Kopf. „Schöne Worte. Aber die reichen mir nicht. Vielleicht ein andermal.“`,
      choices: this.genericChoices(context),
      stateChanges: { ...this.emptyChanges(), xpDelta: ok ? 25 : 5 },
      panels: [],
      npcs: [
        {
          id: t.id,
          name: t.name,
          role: t.role,
          disposition: ok ? 40 : -10,
          note: ok ? "Ist der Crew/Sache beigetreten." : "Hat eine Rekrutierung abgelehnt.",
        },
      ],
      recruitable: [],
    };
  }

  genericChoices(context) {
    const options = [
      { id: "a", text: "Nachforschen und mehr herausfinden.", skillCheck: { skill: "wahrnehmung", dc: 11 } },
      { id: "b", text: "Mit Worten die Lage entschärfen.", skillCheck: { skill: "ueberzeugen", dc: 12 } },
      { id: "c", text: "Zur Tat schreiten.", skillCheck: { skill: pick(["nahkampf", "schwertkunst", "geschick"]) === "geschick" ? "heimlichkeit" : "nahkampf", dc: 13 } },
      { id: "d", text: "Weiterziehen und die Sache ruhen lassen.", skillCheck: null },
    ];
    // 3 zufällige, aber stabile IDs a–d
    return options.slice(0, 3 + (chance(0.4) ? 1 : 0));
  }

  emptyChanges() {
    return {
      timeAdvanceDays: 0,
      hpDelta: 0,
      beriDelta: 0,
      xpDelta: 0,
      bountyDelta: 0,
      heatDelta: 0,
      location: null,
      itemsAdded: [],
      itemsRemoved: [],
      flagsSet: {},
    };
  }
}
