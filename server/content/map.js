// Weltkarte des frühen East Blue. Orte als Knoten mit Koordinaten (0..100 Grid
// für die UI), Region und Verbindungen. Reisen zwischen Inseln laufen über See
// (braucht ein Schiff ODER bezahlte Passage). Bewegung INNERHALB eines Ortes ist
// keine "Reise" und kostet nichts.

export const LOCATIONS = {
  loguetown: {
    id: "loguetown",
    name: "Loguetown",
    region: "East Blue",
    type: "hafenstadt",
    x: 50,
    y: 78,
    blurb:
      "Die 'Stadt des Anfangs und des Endes'. Hier starb der Piratenkönig — und hier " +
      "beginnen jetzt tausend Träume. Marine, Kopfgeldjäger und frische Piraten treffen aufeinander.",
    startable: true,
    recommendedFor: ["pirat", "barkeeper"],
  },
  shells_town: {
    id: "shells_town",
    name: "Shells Town",
    region: "East Blue",
    type: "marinestadt",
    x: 30,
    y: 55,
    blurb:
      "Eine Marine-Garnisonsstadt. Ordnung an der Oberfläche, Korruption in den Kellern. " +
      "Ein guter Ort, um Karriere zu machen — oder Fragen zu stellen, die man besser nicht stellt.",
    startable: true,
    recommendedFor: ["marine"],
  },
  hafendorf_sirup: {
    id: "hafendorf_sirup",
    name: "Sirup-Hafendorf",
    region: "East Blue",
    type: "dorf",
    x: 68,
    y: 40,
    blurb:
      "Ein verschlafenes Küstendorf mit einer einzigen Kneipe, die zufällig zu verkaufen steht. " +
      "Wer hier ankommt, sucht entweder Ruhe — oder einen Neuanfang fernab der Marine.",
    startable: true,
    recommendedFor: ["barkeeper", "pirat"],
  },
  klippen_vorposten: {
    id: "klippen_vorposten",
    name: "Felsklippen-Außenposten",
    region: "East Blue",
    type: "marinevorposten",
    x: 18,
    y: 30,
    blurb:
      "Ein karger Marine-Vorposten auf einer windgepeitschten Klippeninsel. Wenig Komfort, " +
      "viele Geheimnisse — und ein Vorgesetzter, dem man nicht trauen sollte.",
    startable: true,
    recommendedFor: ["marine", "pirat"],
  },
  orangen_hafen: {
    id: "orangen_hafen",
    name: "Orangen-Hafen",
    region: "East Blue",
    type: "hafenstadt",
    x: 78,
    y: 62,
    blurb:
      "Eine geschäftige kleine Hafenstadt, berühmt für ihre Obstgärten — und berüchtigt für " +
      "die Piratenbanden, die sie regelmäßig heimsuchen.",
    startable: false,
  },
  windmuehlendorf: {
    id: "windmuehlendorf",
    name: "Windmühlendorf",
    region: "East Blue",
    type: "dorf",
    x: 45,
    y: 20,
    blurb:
      "Ein ruhiges Dorf am Rand des Meeres, überragt von alten Windmühlen. Hier erzählt man " +
      "sich abends Geschichten von Rogers Crew — und von einer 'Lücke' in der Geschichte.",
    startable: false,
  },
};

// Verbindungen (ungerichtet). mode: "see" (braucht Schiff/Passage), days: Reisedauer.
const EDGES = [
  ["loguetown", "shells_town", "see", 2],
  ["loguetown", "orangen_hafen", "see", 1],
  ["loguetown", "hafendorf_sirup", "see", 2],
  ["shells_town", "klippen_vorposten", "see", 1],
  ["shells_town", "windmuehlendorf", "see", 2],
  ["hafendorf_sirup", "orangen_hafen", "see", 1],
  ["hafendorf_sirup", "windmuehlendorf", "see", 2],
  ["orangen_hafen", "windmuehlendorf", "see", 3],
  ["klippen_vorposten", "windmuehlendorf", "see", 2],
];

// Nachbarn eines Ortes: [{ to, mode, days }]
export function connectionsFrom(locId) {
  const out = [];
  for (const [a, b, mode, days] of EDGES) {
    if (a === locId) out.push({ to: b, mode, days });
    else if (b === locId) out.push({ to: a, mode, days });
  }
  return out;
}

export function locationsForMap() {
  return Object.values(LOCATIONS).map((l) => ({
    id: l.id,
    name: l.name,
    region: l.region,
    type: l.type,
    x: l.x,
    y: l.y,
  }));
}

export function mapEdges() {
  return EDGES.map(([from, to, mode, days]) => ({ from, to, mode, days }));
}
