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
