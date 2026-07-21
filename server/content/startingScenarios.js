// Archetypen (Starts, KEINE feste Rolle) und Startorte.
//
// Jeder Archetyp gibt Attribut-Boni, Start-Skills, ein Start-Item und eine
// "Stellung" (Marine-Rang / Kopfgeld / Ruf). Niemand ist an seine Rolle
// gebunden — ein Marine kann desertieren, ein Barkeeper eine Crew gründen usw.

export const ARCHETYPES = {
  marine: {
    id: "marine",
    name: "Marine-Soldat",
    tagline: "Ordnung, Pflicht — und die Frage, was Gerechtigkeit wirklich heißt.",
    attributeBonus: { staerke: 1, zaehigkeit: 1, willenskraft: 1 },
    startSkills: { schwertkunst: 2, schiessen: 2, einschuechtern: 1 },
    startItem: { id: "marine_saebel", name: "Marine-Säbel", type: "waffe" },
    standing: { typ: "marine_rang", wert: "Rekrut", kopfgeld: 0 },
    startBeri: 30,
  },
  pirat: {
    id: "pirat",
    name: "Angehender Piratenkapitän",
    tagline: "Ein Traum, ein Schiff (irgendwann) und der Ozean, der ruft.",
    attributeBonus: { charisma: 1, willenskraft: 1, glueck: 1 },
    startSkills: { ueberzeugen: 2, nahkampf: 2, navigation: 1 },
    startItem: { id: "alte_seekarte", name: "Zerfledderte Seekarte", type: "werkzeug" },
    standing: { typ: "kopfgeld", wert: "Unbekannt", kopfgeld: 0 },
    startBeri: 20,
  },
  barkeeper: {
    id: "barkeeper",
    name: "Barkeeper",
    tagline: "Hinter dem Tresen hört man alles — und jeder braucht mal einen Drink.",
    attributeBonus: { verstand: 1, charisma: 1, geschick: 1 },
    startSkills: { ueberzeugen: 2, wahrnehmung: 2, kochen: 2, medizin: 1 },
    startItem: { id: "hausflasche", name: "Flasche 'Hauswein'", type: "verbrauch" },
    standing: { typ: "ruf", wert: "Ortsbekannt", kopfgeld: 0 },
    startBeri: 60,
  },
};

// Startorte im East Blue der frühen Piraten-Ära. Nicht hart an Archetypen
// gebunden — jeder kann überall starten, aber manche passen thematisch besser
// (Hinweis: recommendedFor ist nur eine Empfehlung fürs UI).
export const START_LOCATIONS = {
  loguetown: {
    id: "loguetown",
    name: "Loguetown",
    blurb:
      "Die 'Stadt des Anfangs und des Endes'. Hier starb der Piratenkönig — und hier " +
      "beginnen jetzt tausend Träume. Marine, Kopfgeldjäger und frische Piraten treffen aufeinander.",
    recommendedFor: ["pirat", "barkeeper"],
  },
  shells_town: {
    id: "shells_town",
    name: "Shells Town",
    blurb:
      "Eine Marine-Garnisonsstadt. Ordnung an der Oberfläche, Korruption in den Kellern. " +
      "Ein guter Ort, um Karriere zu machen — oder Fragen zu stellen, die man besser nicht stellt.",
    recommendedFor: ["marine"],
  },
  hafenkneipe_syrup: {
    id: "hafenkneipe_syrup",
    name: "Kleines Hafendorf",
    blurb:
      "Ein verschlafenes Küstendorf mit einer einzigen Kneipe, die zufällig zu verkaufen steht. " +
      "Wer hier ankommt, sucht entweder Ruhe — oder einen Neuanfang fernab der Marine.",
    recommendedFor: ["barkeeper", "pirat"],
  },
  gefaengnisinsel: {
    id: "gefaengnisinsel",
    name: "Felsklippen-Außenposten",
    blurb:
      "Ein karger Marine-Vorposten auf einer windgepeitschten Klippeninsel. Wenig Komfort, " +
      "viele Geheimnisse — und ein Vorgesetzter, dem man nicht trauen sollte.",
    recommendedFor: ["marine", "pirat"],
  },
};

export function listArchetypes() {
  return Object.values(ARCHETYPES).map((a) => ({
    id: a.id,
    name: a.name,
    tagline: a.tagline,
    attributeBonus: a.attributeBonus,
    startSkills: a.startSkills,
    startItem: a.startItem,
    standing: a.standing,
  }));
}

export function listStartLocations() {
  return Object.values(START_LOCATIONS);
}
