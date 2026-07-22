// Deterministische Platzhalter-Engine ("Spielleiter ohne KI").
//
// Sie ist bewusst NICHT klug — ihr Zweck ist, die komplette Spielschleife und
// den GM-Antwort-Vertrag lauffähig zu demonstrieren, damit der echte
// Claude-Provider später exakt dasselbe Format erfüllt. Sie reagiert grob auf
// Ort, Archetyp, Spieleraktion und Würfel-Ergebnisse, streut NPCs, Gerüchte,
// Rekrutierungs-Angebote und kleine Plot-Haken ein.

import { randomDevilFruit } from "../content/devilFruits.js";

// Mindestens 5 Varianten pro Ort: mit nur 2-3 Einträgen wiederholt sich die
// Zeilen bei mehreren Zügen am selben Ort fast garantiert wortgleich — genau
// das Muster, das sich wie Stillstand anfühlt (und der Kontinuitäts-Wächter
// inzwischen zu Recht als "kaum neue Substanz" abweist).
const LOCATION_FLAVOR = {
  loguetown: [
    "Der Wind trägt Salz und Asche über den Marktplatz von Loguetown. Auf dem Hinrichtungsgerüst, wo der Piratenkönig sein Ende fand, drängen sich Neugierige.",
    "In den Gassen Loguetowns feilschen Waffenschmiede, während Marine-Patrouillen misstrauisch die frischen Piratengesichter mustern.",
    "Am Hafen von Loguetown liegen Schiffe aller Art — von wackligen Kähnen bis zu stolzen Karavellen, jedes voller Hoffnung auf das One Piece.",
    "Kopfgeldjäger vergleichen an einer Tafel voller Steckbriefe ihre neuesten Ziele, während Kinder zwischen den Ständen Fangen spielen.",
    "Ein Ausrufer verliest vom Balkon des Gerichtsgebäudes die jüngsten Marine-Bekanntmachungen; seine Stimme geht im Stimmengewirr fast unter.",
    "Zwischen den Ständen riecht es nach gebratenem Fisch und heißem Pech; irgendwo streiten sich zwei Händler laut um den Preis für Schießpulver.",
  ],
  shells_town: [
    "Die weißen Mauern der Marine-Garnison von Shells Town glänzen — doch hinter ihnen riecht es nach fauligen Deals.",
    "Auf dem Hof der Garnison drillt ein Offizier eine Handvoll Rekruten, während die Stadt gedämpft ihren Geschäften nachgeht.",
    "Vor der Kaserne hängt frisch gestrichen ein Anschlag mit neuen Dienstvorschriften — niemand scheint ihn wirklich zu lesen.",
    "In einer Seitengasse tuscheln zwei Wachen über einen Vorgesetzten, der zu tief in dubiose Geschäfte verstrickt sein soll.",
    "Salzige Meeresluft treibt über den Exerzierplatz; Möwen kreisen abwartend über den Essensresten der Kantine.",
  ],
  hafendorf_sirup: [
    "Das Sirup-Hafendorf döst in der Nachmittagssonne. Die Kneipe am Kai ist der einzige Ort mit Leben — und sie steht zum Verkauf.",
    "Möwen kreischen über den Booten des verschlafenen Dorfes. Drinnen in der Kneipe klimpert jemand halbherzig auf einer Laute.",
    "Ein rostiger Wetterhahn auf dem Kneipendach dreht sich quietschend im Wind; sonst ist es im Dorf fast unheimlich still.",
    "Ein paar Fischer flicken am Kai ihre Netze und tauschen träge Neuigkeiten über vorbeiziehende Segel aus.",
    "Die Nachmittagssonne wirft lange Schatten über die schmale Dorfstraße; irgendwo bellt ein Hund nach einer Katze, die längst verschwunden ist.",
  ],
  klippen_vorposten: [
    "Der Wind heult um den Felsklippen-Außenposten. Die See darunter ist grau und unversöhnlich, und die Soldaten sprechen nur im Flüsterton über ihren Kommandanten.",
    "Möwen wagen sich kaum an die windgepeitschten Klippen. Der Marine-Vorposten wirkt eher wie ein Gefängnis für seine eigene Besatzung.",
    "Salzige Gischt schlägt gegen die Klippen; ein einsamer Wachposten starrt stur aufs graue Meer, als erwarte er etwas Bestimmtes.",
    "In den engen Fluren des Vorpostens riecht es nach nasser Wolle und altem Öl; Stimmen verstummen, sobald du näher kommst.",
    "Der Wind zerrt an einer losen Planke; irgendwo im Innern klirrt Metall, als würde jemand gerade Waffen inventarisieren.",
  ],
  orangen_hafen: [
    "Der Orangen-Hafen duftet nach Zitrusfrüchten und Teer. An den Kaimauern wird gefeilscht, geladen — und misstrauisch beobachtet.",
    "Kisten voller Orangen stapeln sich am Dock. Doch die Blicke der Händler sind wachsam: Piratenbanden kommen hier oft zu Besuch.",
    "Ein Händler ruft lautstark den Tagespreis für Zitrusfrüchte aus, während zwei Lademeister sich um die letzte freie Kiste streiten.",
    "Zwischen den Lagerhäusern hängen Netze zum Trocknen; ein Kind balanciert auf einem umgekippten Fass und wird prompt zurückgepfiffen.",
    "Am Kai wird gerade eine Ladung gelöscht; der süßlich-herbe Duft von Orangen mischt sich mit Teer und Meerwasser.",
  ],
  windmuehlendorf: [
    "Über dem Windmühlendorf drehen sich träge die alten Flügel. Abends erzählt man sich hier Geschichten — auch von einer 'Lücke' in der Geschichte der Welt.",
    "Ein ruhiges Dorf, in dem die Zeit langsamer läuft. Doch in den alten Logbüchern der Bibliothek schlummern Fragen, die niemand laut stellt.",
    "Ein alter Mann sitzt vor der Bibliothek und blättert stirnrunzelnd in einem zerfledderten Logbuch, das er niemandem zeigen will.",
    "Zwischen den Windmühlen spielen Kinder Verstecken; ihr Lachen hallt seltsam kontrastierend zu den gemurmelten Geschichten der Alten.",
    "Der Wind treibt raschelndes Laub über den Dorfplatz; irgendwo schlägt eine lose Fensterläde im Takt gegen die Mauer.",
  ],
};

const NPC_POOL = [
  { id: "npc_kaya_die_wirtin", name: "Kaya die Wirtin", role: "Kneipenwirtin", locations: ["hafenstadt", "dorf"] },
  { id: "npc_gunkan_der_soeldner", name: "Gunkan", role: "Söldner mit Narbe", locations: ["hafenstadt", "dorf", "marinestadt"] },
  { id: "npc_lina_navigatorin", name: "Lina", role: "junge Navigatorin", locations: ["hafenstadt", "dorf"] },
  { id: "npc_offizier_borrot", name: "Offizier Borrot", role: "Marine-Offizier", locations: ["marinevorposten", "marinestadt"] },
  { id: "npc_rekrut_nilo", name: "Rekrut Nilo", role: "nervöser Marine-Rekrut", locations: ["marinevorposten", "marinestadt"] },
  { id: "npc_alter_job", name: "Der alte Job", role: "Schiffszimmermann a.D.", locations: ["hafenstadt", "dorf"] },
  { id: "npc_maskierter_fremder", name: "Ein maskierter Fremder", role: "zwielichtiger Reisender", locations: ["hafenstadt", "dorf", "marinestadt"] },
];

const DISCOVERY_ACTION = /\b(such|untersuch|durchstöber|durchsuch|öffn|kiste|truhe|lager|höhle|wrack|beute|grab)\w*/i;
const SHIP_ACTION = /\b(schiff|boot|kahn|kai|dock)\w*.{0,40}\b(kauf|nehm|beanspruch|reparier|übernehm|stehl)\w*|\b(kauf|nehm|beanspruch|reparier|übernehm|stehl)\w*.{0,40}\b(schiff|boot|kahn)\w*/i;

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
function chance(p) {
  return Math.random() < p;
}

function npcForContext(context) {
  const type = context.world.locationType;
  const candidates = NPC_POOL.filter((npc) => npc.locations.includes(type));
  return pick(candidates.length ? candidates : NPC_POOL);
}

function introduceNpc(npc, context) {
  if (npc.id === "npc_kaya_die_wirtin") return `Vor der kleinen Hafenkneipe winkt dich ${npc.name}, die Wirtin, zu sich.`;
  if (npc.id === "npc_offizier_borrot") return `${npc.name} löst sich aus einer Marine-Patrouille und tritt mit prüfendem Blick auf dich zu.`;
  if (npc.id === "npc_rekrut_nilo") return `${npc.name} wartet, bis sein Vorgesetzter außer Hörweite ist, und spricht dich leise an.`;
  if (npc.id === "npc_lina_navigatorin") return `${npc.name}, eine junge Navigatorin mit Seekarten unter dem Arm, spricht dich nahe dem Kai an.`;
  if (npc.id === "npc_alter_job") return `${npc.name} legt sein Werkzeug beiseite und mustert dich vom Rand der Werft aus.`;
  if (npc.id === "npc_gunkan_der_soeldner") return `${npc.name}, ein narbengesichtiger Söldner, lehnt unweit von dir an einer Mauer und spricht dich an.`;
  return `${npc.name} hält sich am Rand von ${context.world.sceneLocation || context.world.locationName} auf und gibt dir ein knappes Zeichen.`;
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
      stateChanges: {
        ...this.emptyChanges(),
        sceneLocation: `${context.world.locationName} – ${/zimmer|gasthaus/i.test(context.playerAction || "") ? "Gasthaus" : "Notlager"}`,
      },
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

    const npc = npcForContext(context);
    const thread = context.story?.active?.[0];
    return {
      narration:
        `${flavor}\n\n${archLine}\n\n` +
        (rumor ? `Am Rande hörst du ein Gerücht: „${rumor}“\n\n` : "") +
        `${introduceNpc(npc, context)}` + (thread ? `\n\nEin Gedanke bleibt hängen: ${thread.hook}` : ""),
      choices: [
        { id: "a", text: thread ? `Den Hinweis zu „${thread.title}“ gezielt untersuchen.` : "Zuhören und herausfinden, was los ist.", skillCheck: { skill: "wahrnehmung", dc: 10 } },
        { id: "b", text: "Selbstbewusst das Gespräch übernehmen.", skillCheck: { skill: "ueberzeugen", dc: 12 } },
        { id: "c", text: "Vorsichtig Abstand halten und beobachten.", skillCheck: null },
      ],
      stateChanges: { ...this.emptyChanges(), sceneLocation: this.defaultSceneLocation(context) },
      npcs: [{ id: npc.id, name: npc.name, role: npc.role, disposition: 0, note: "Zum ersten Mal getroffen." }],
      recruitable: [],
      panels: [{ kind: "ankunft", caption: `${context.world.locationName} — ein neuer Anfang` }],
    };
  }

  turnScene(context) {
    const check = context.checkResult;
    const parts = [];
    const risk = context.actionRisk;
    const storyEvent = context.storyEvent;
    const factionChanges = context.factionChanges || [];

    factionChanges.forEach((change) => {
      const direction = change.delta > 0 ? "verbessert" : "verschlechtert";
      parts.push(`Dein Ruf bei „${change.label}“ ${direction} sich (${change.delta > 0 ? "+" : ""}${change.delta}) – ${change.reason}.`);
    });

    if (storyEvent?.type === "fortschritt") {
      parts.push(`Deine Nachforschungen bringen Bewegung in den Faden „${storyEvent.title}“. Ein neues Detail passt endlich zu den bisherigen Spuren.`);
    } else if (storyEvent?.type === "eskaliert") {
      parts.push(`Während du andere Dinge verfolgst, spitzt sich „${storyEvent.title}“ zu. Die Welt wartet nicht darauf, dass du bereit bist.`);
    } else if (storyEvent?.type === "geloest") {
      parts.push(`Die letzten Spuren fügen sich zusammen: „${storyEvent.title}“ ist fürs Erste aufgeklärt. Deine Entscheidung hat einen sichtbaren Unterschied gemacht.`);
    } else if (storyEvent?.type === "verpasst") {
      parts.push(`Für „${storyEvent.title}“ ist es zu spät. Die Gelegenheit ist vorbei und hinterlässt eine Veränderung, die du nicht einfach zurückdrehen kannst.`);
    }

    if (risk) {
      if (!risk.discovered) {
        parts.push(`Deine Handlung bleibt fürs Erste unbemerkt. Doch nach ${risk.attempts} Versuch(en) wirkt dein Verhalten auffällig — für ${risk.label} lag das Entdeckungsrisiko diesmal bei ${risk.chance} %. Ein weiterer Versuch wird deutlich gefährlicher.`);
      } else if (risk.outcome === "angesprochen") {
        parts.push(`Eine Stimme verstummt. Jemand dreht sich direkt zu dir um: „Hast du nichts Besseres zu tun?“ Deine Aktion (${risk.label}) wurde bemerkt; die Umgebung ist nun alarmiert.`);
      } else if (risk.outcome === "verfolgt") {
        parts.push(`Deine Aktion (${risk.label}) bleibt nicht unbemerkt. Als du dich entfernst, lösen sich zwei Gestalten aus der Menge und folgen dir mit Abstand. Deine Entscheidung hat Folgen.`);
      } else {
        parts.push(`Die Umgebung kippt. Ein Wachposten stellt dich: „So etwas dulden wir hier nicht.“ Deine Aktion (${risk.label}) endet in einer handfesten Konfrontation.`);
      }
    }

    if (check) {
      const dcTag = `(${check.skillName}: ${check.total} gegen DC ${check.dc})`;
      if (check.kritErfolg) {
        parts.push(pick([
          `Ein Meisterwurf! ${dcTag} — alles gelingt weit über Erwarten.`,
          `Das sitzt perfekt! ${dcTag} — besser hättest du es nicht planen können.`,
        ]));
      } else if (check.kritFehler) {
        parts.push(pick([
          `Ein katastrophaler Patzer! ${dcTag} — das geht gründlich schief.`,
          `Das läuft komplett aus dem Ruder! ${dcTag} — schlimmer hätte es kaum kommen können.`,
        ]));
      } else if (check.success) {
        parts.push(pick([
          `Es gelingt dir. ${dcTag}.`,
          `Dein Vorhaben glückt. ${dcTag}.`,
          `Du behältst die Oberhand. ${dcTag}.`,
        ]));
      } else {
        parts.push(pick([
          `Es misslingt. ${dcTag}.`,
          `Dein Vorhaben scheitert. ${dcTag}.`,
          `Diesmal läuft es nicht zu deinen Gunsten. ${dcTag}.`,
        ]));
      }
    }

    parts.push(pick(LOCATION_FLAVOR[context.world.location] || LOCATION_FLAVOR.loguetown));

    // Bekannten NPC gelegentlich zurückbringen (Gedächtnis demonstrieren).
    const knownNpcs = context.memory?.npcs || [];
    const presentNpcs = context.continuity?.presentNpcs || [];
    const npcs = presentNpcs.map((npc) => ({
      id: npc.id,
      name: npc.name,
      role: npc.role || "",
      disposition: knownNpcs.find((known) => known.id === npc.id)?.gesinnung || 0,
      note: "Bleibt am aktuellen Schauplatz anwesend.",
    }));
    let recruitable = [];

    if (presentNpcs.length) {
      const names = presentNpcs.map((npc) => npc.name).join(" und ");
      const plural = presentNpcs.length > 1;
      parts.push(pick([
        `${names} ${plural ? "bleiben" : "bleibt"} in deiner Nähe und ${plural ? "verfolgen" : "verfolgt"} deine Handlung.`,
        `${names} ${plural ? "beobachten" : "beobachtet"} aufmerksam, wie du weitermachst.`,
        plural
          ? `Aus dem Augenwinkel siehst du, dass ${names} noch da sind und genau hinsehen.`
          : `Aus dem Augenwinkel siehst du, dass ${names} noch da ist und genau hinsieht.`,
      ]));
    } else if (knownNpcs.length && chance(0.35)) {
      const known = pick(knownNpcs);
      const mood = known.gesinnung > 20 ? "freundlich" : known.gesinnung < -20 ? "feindselig" : "reserviert";
      parts.push(`${known.name} kommt von der Straße her auf dich zu und begegnet dir ${mood}.`);
      npcs.push({
        id: known.id,
        name: known.name,
        role: known.role || "",
        disposition: known.gesinnung + (check?.success ? 8 : -4),
        note: check?.success ? "Der Spieler hat sich bewährt." : "Der Spieler enttäuschte ein wenig.",
      });
    } else if (chance(0.5)) {
      const npc = npcForContext(context);
      parts.push(introduceNpc(npc, context));
      npcs.push({ id: npc.id, name: npc.name, role: npc.role, disposition: 0, note: "Neue Bekanntschaft." });
      if (chance(0.5)) {
        recruitable = [{ id: npc.id, name: npc.name, role: npc.role, reason: "sucht einen Grund mitzukommen" }];
      }
    }

    if (npcs.length && chance(0.18)) {
      const actor = npcs[0];
      parts.push(`An ${actor.name}s kurzer Reaktion merkst du, dass die Situation mehr verbirgt, als ${actor.name} offen zugibt.`);
    }

    const changes = this.emptyChanges();
    changes.sceneLocation = this.sceneLocationFor(context);
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
    if (!st.hasDevilFruit && DISCOVERY_ACTION.test(context.playerAction || "") && chance(0.06)) {
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
    if (!extra.combatStart && !context.canonAffiliation && !st.hasShip && SHIP_ACTION.test(context.playerAction || "") && chance(0.04)) {
      const shipName = pick(["Möwenschwinge", "Roter Anker", "Sturmkind", "Alte Dame"]);
      parts.push(`Deine Suche am Kai führt dich zu einem aufgegebenen kleinen Schiff. Du prüfst die Besitzmarken und nimmst die '${shipName}' rechtmäßig als herrenloses Wrack in Anspruch.`);
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

  // Formulierungs-Varianten statt fixer Texte: dieselben vier "Rollen"
  // (nachforschen/verhandeln/handeln/weiterziehen) klingen sonst über viele
  // Züge hinweg fast wortgleich — genau das Muster, das sich wie Stillstand
  // anfühlt und den Kontinuitäts-Wächter zu Recht auslöst.
  genericChoices(context) {
    const thread = context.story?.active?.[0];
    const investigate = thread
      ? [
          `Die Spur zu „${thread.title}“ gezielt untersuchen.`,
          `Näher an „${thread.title}“ herangehen und nachhaken.`,
          `Konkrete Hinweise zu „${thread.title}“ zusammentragen.`,
        ]
      : [
          "Nachforschen und mehr herausfinden.",
          "Dich aufmerksam umsehen und Details prüfen.",
          "Die Umgebung gezielt nach Hinweisen absuchen.",
        ];
    const negotiate = [
      "Mit Worten die Lage entschärfen.",
      "Ruhig auf die Situation einreden.",
      "Vermitteln und die Gemüter beruhigen.",
    ];
    const act = [
      "Zur Tat schreiten.",
      "Beherzt eingreifen.",
      "Die Initiative ergreifen, bevor sich die Lage ändert.",
    ];
    const leave = [
      "Weiterziehen und die Sache ruhen lassen.",
      "Den Ort vorerst hinter dir lassen.",
      "Dich zurückziehen und später wiederkommen.",
    ];
    const options = [
      { id: "a", text: pick(investigate), skillCheck: { skill: "wahrnehmung", dc: 11 } },
      { id: "b", text: pick(negotiate), skillCheck: { skill: "ueberzeugen", dc: 12 } },
      { id: "c", text: pick(act), skillCheck: { skill: pick(["nahkampf", "schwertkunst", "geschick"]) === "geschick" ? "heimlichkeit" : "nahkampf", dc: 13 } },
      { id: "d", text: pick(leave), skillCheck: null },
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
      sceneLocation: null,
      itemsAdded: [],
      itemsRemoved: [],
      flagsSet: {},
    };
  }

  defaultSceneLocation(context) {
    const byType = {
      hafenstadt: "Hafenviertel",
      marinestadt: "Platz vor der Marinebasis",
      marinevorposten: "Hof des Marinevorpostens",
      dorf: "Dorfplatz",
    };
    return `${context.world.locationName} – ${byType[context.world.locationType] || "Hauptstraße"}`;
  }

  sceneLocationFor(context) {
    const action = String(context.playerAction || "").toLowerCase();
    if (/gefängnis|zelle|kerker/.test(action)) return `${context.world.locationName} – Gefängnis`;
    if (/kneipe|taverne|bar|wirt/.test(action)) return `${context.world.locationName} – Hafenkneipe`;
    if (/hafen|kai|dock|schiff/.test(action)) return `${context.world.locationName} – Hafen`;
    if (/markt|händler|laden/.test(action)) return `${context.world.locationName} – Marktviertel`;
    if (/marine|garnison|kaserne/.test(action)) return `${context.world.locationName} – Marinebasis`;
    return context.world.sceneLocation || this.defaultSceneLocation(context);
  }
}
