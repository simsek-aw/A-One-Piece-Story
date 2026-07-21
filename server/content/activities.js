// Ausbildungs- & Fortschritts-Aktivitäten ("grenzenlos im Lore"). Jede kostet
// eine Tagesaktion und liefert deterministische Belohnungen; die eigentliche
// Szene erzählt danach der Spielleiter aus.
//
// Skill-Fortschritt: Jede Trainingseinheit erhöht den "Fortschritt" eines Skills.
// Ab TRAIN_THRESHOLD Einheiten steigt der Rang um 1 (siehe engine/progression.js).

export const TRAIN_THRESHOLD = 3;

// Tagsüber = Morgen/Mittag/Nachmittag. Abend & Nacht separat.
const TAGSUEBER = ["morgen", "mittag", "nachmittag"];
const ALL = ["morgen", "mittag", "nachmittag", "abend", "nacht"];

// hours: grobe Dauer in Stunden (bestimmt, wie stark die Tageszeit vorrückt).
export const ACTIVITIES = {
  dojo: {
    id: "dojo",
    name: "Im Dojo trainieren",
    desc: "Härte deinen Körper und deine Klinge. Trainiert Nahkampf & Schwertkunst.",
    trains: ["schwertkunst", "nahkampf"],
    xp: 15, hours: 4, phases: TAGSUEBER,
    effects: {},
  },
  marine_drill: {
    id: "marine_drill",
    name: "Marine-Drill",
    desc: "Exerzieren, Schießstand, Befehlston. Trainiert Schießen & Einschüchtern; senkt die Aufmerksamkeit der Marine.",
    trains: ["schiessen", "einschuechtern"],
    xp: 15, hours: 4, phases: TAGSUEBER,
    effects: { heatDelta: -8 },
    requiresLocationType: ["marinestadt", "marinevorposten"],
  },
  buecherwurm: {
    id: "buecherwurm",
    name: "Bücherwurm / Recherche",
    desc: "Wälze Archive und alte Logbücher. Trainiert Wahrnehmung & Medizin — und bringt dich der 'Lücke in der Geschichte' näher.",
    trains: ["wahrnehmung", "medizin"],
    xp: 12, hours: 4, phases: TAGSUEBER,
    effects: { loreProgress: 1 },
  },
  unterwelt: {
    id: "unterwelt",
    name: "Unter die Leute (Unterwelt)",
    desc: "Kneipen, Docks, zwielichtige Kontakte — vor allem nachts. Trainiert Heimlichkeit & Überzeugen, bringt Beri, aber auch Aufmerksamkeit.",
    trains: ["heimlichkeit", "ueberzeugen"],
    xp: 12, hours: 3, phases: ["abend", "nacht"],
    effects: { beriDelta: 30, heatDelta: 4 },
  },
  arbeiten: {
    id: "arbeiten",
    name: "Arbeiten / Jobben",
    desc: "Ehrliche Arbeit an Tresen, Dock oder Werft. Trainiert Kochen & Handwerk und füllt die Kasse.",
    trains: ["kochen", "handwerk"],
    xp: 8, hours: 5, phases: ["mittag", "nachmittag", "abend"],
    effects: { beriDelta: 45 },
  },
  meditation: {
    id: "meditation",
    name: "Meditation (Wille)",
    desc: "Sammle dich und schärfe deinen Willen. Trainiert Willenskraft-nahe Fertigkeiten — der Keim von Haki.",
    trains: ["haki", "einschuechtern"],
    xp: 12, hours: 2, phases: ALL,
    effects: {},
  },
};

export function listActivities() {
  return Object.values(ACTIVITIES).map((a) => ({
    id: a.id,
    name: a.name,
    desc: a.desc,
    trains: a.trains,
    hours: a.hours,
    phases: a.phases,
    requiresLocationType: a.requiresLocationType || null,
  }));
}
