// Archetypen (Starts, KEINE feste Rolle) und Startorte.
//
// Jeder Archetyp gibt Attribut-Boni, Start-Skills, ein Start-Item und eine
// "Stellung" (Marine-Rang / Kopfgeld / Ruf). Niemand ist an seine Rolle
// gebunden — ein Marine kann desertieren, ein Barkeeper eine Crew gründen usw.
//
// Die Orte selbst leben in content/map.js (mit Koordinaten & Reisewegen);
// hier werden nur die startbaren Orte daraus abgeleitet.

import { LOCATIONS } from "./map.js";

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
  kopfgeldjaeger: {
    id: "kopfgeldjaeger",
    name: "Kopfgeldjäger",
    tagline: "Du jagst Gesuchte für Beri — mit drei Klingen und einem miserablen Orientierungssinn.",
    attributeBonus: { staerke: 1, geschick: 1, willenskraft: 1 },
    startSkills: { schwertkunst: 3, wahrnehmung: 1, einschuechtern: 1 },
    startItem: { id: "gejagt_katana", name: "Gut gepflegtes Katana", type: "waffe" },
    standing: { typ: "ruf", wert: "Gefürchtet", kopfgeld: 0 },
    startBeri: 40,
  },
  koch: {
    id: "koch",
    name: "Schiffskoch",
    tagline: "Ein voller Bauch entscheidet Schlachten. Deine Küche ist heilig — und deine Beine sind Waffen.",
    attributeBonus: { geschick: 1, zaehigkeit: 1, charisma: 1 },
    startSkills: { kochen: 3, nahkampf: 2 },
    startItem: { id: "kochmesser_set", name: "Set feiner Kochmesser", type: "werkzeug" },
    standing: { typ: "ruf", wert: "Ortsbekannt", kopfgeld: 0 },
    startBeri: 45,
  },
  arzt: {
    id: "arzt",
    name: "Schiffsarzt",
    tagline: "Wo andere zuschlagen, flickst du zusammen. Ohne Doktor kommt keine Crew weit.",
    attributeBonus: { verstand: 2, geschick: 1 },
    startSkills: { medizin: 3, wahrnehmung: 1, handwerk: 1 },
    startItem: { id: "arzttasche", name: "Abgegriffene Arzttasche", type: "werkzeug" },
    standing: { typ: "ruf", wert: "Ortsbekannt", kopfgeld: 0 },
    startBeri: 50,
  },
  dieb: {
    id: "dieb",
    name: "Diebin & Navigatorin",
    tagline: "Karten, Kassen und Kurse — nichts entgeht dir. Du nimmst nur von denen, die es verdient haben.",
    attributeBonus: { geschick: 1, verstand: 1, glueck: 1 },
    startSkills: { heimlichkeit: 2, navigation: 2, wahrnehmung: 1 },
    startItem: { id: "dietrich_set", name: "Dietrich-Set", type: "werkzeug" },
    standing: { typ: "ruf", wert: "Unbekannt", kopfgeld: 0 },
    startBeri: 25,
  },
  schiffszimmerer: {
    id: "schiffszimmerer",
    name: "Schiffszimmerer",
    tagline: "Holz und Nägel unter den Fingern, das Meer im Blut — ohne dich bleibt jedes Schiff am Kai.",
    attributeBonus: { staerke: 1, verstand: 1, zaehigkeit: 1 },
    startSkills: { handwerk: 3, nahkampf: 1 },
    startItem: { id: "werkzeuggurt", name: "Abgewetzter Werkzeuggürtel", type: "werkzeug" },
    standing: { typ: "ruf", wert: "Ortsbekannt", kopfgeld: 0 },
    startBeri: 35,
  },
  gelehrte: {
    id: "gelehrte",
    name: "Gelehrte",
    tagline: "Alte Schriften, vergessene Geschichte — die Wahrheit liegt selten dort, wo man sie erwartet.",
    attributeBonus: { verstand: 2, glueck: 1 },
    startSkills: { wahrnehmung: 2, ueberzeugen: 1, navigation: 1 },
    startItem: { id: "feldnotizbuch", name: "Vollgekritzeltes Feldnotizbuch", type: "werkzeug" },
    standing: { typ: "ruf", wert: "Unbekannt", kopfgeld: 0 },
    startBeri: 40,
  },
  musiker: {
    id: "musiker",
    name: "Musikant",
    tagline: "Ein Lied für jede Lage — manche heilen Wunden, manche öffnen Türen, manche wecken fast die Toten.",
    attributeBonus: { charisma: 2, geschick: 1 },
    startSkills: { ueberzeugen: 3, wahrnehmung: 1 },
    startItem: { id: "reiseinstrument", name: "Reise-Instrument in Lederhülle", type: "werkzeug" },
    standing: { typ: "ruf", wert: "Ortsbekannt", kopfgeld: 0 },
    startBeri: 30,
  },
  fischer: {
    id: "fischer",
    name: "Fischer",
    tagline: "Aufgewachsen zwischen Netzen und Gezeiten — das Meer ist dir vertrauter als das feste Land.",
    attributeBonus: { staerke: 1, zaehigkeit: 1, geschick: 1 },
    startSkills: { schwimmen: 3, navigation: 1, nahkampf: 1 },
    startItem: { id: "harpune", name: "Alte Harpune", type: "waffe" },
    standing: { typ: "ruf", wert: "Unbekannt", kopfgeld: 0 },
    startBeri: 20,
  },
};

// Startorte werden aus der Karte (content/map.js) abgeleitet: alle Orte mit
// startable=true. Jeder kann überall starten; recommendedFor ist nur eine
// UI-Empfehlung.
export const START_LOCATIONS = Object.fromEntries(
  Object.values(LOCATIONS)
    .filter((l) => l.startable)
    .map((l) => [l.id, l]),
);

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
