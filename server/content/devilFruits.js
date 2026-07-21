// Teufelsfrüchte. Kleiner Katalog. Wer eine isst, erhält einen Fähigkeits-Tag
// (den der Spielleiter erzählerisch nutzt und der Boni auf passende Checks geben
// kann) — und den klassischen Nachteil: kann nicht mehr schwimmen.
//
// Der Katalog ist bewusst mit erfundenen, lore-nahen Früchten gefüllt (keine
// wörtlichen Kanon-Früchte), damit die Welt frei erweiterbar bleibt.

export const DEVIL_FRUITS = {
  gomu_knet: {
    id: "gomu_knet",
    name: "Knet-Frucht",
    type: "Paramecia",
    abilityTag: "gummi_koerper",
    bonusSkills: ["nahkampf"],
    ability: "Dein Körper wird gummiartig — du dehnst dich, federst Schläge ab, schnellst zurück.",
    downside: "Wie alle Teufelsfrucht-Nutzer kannst du nicht mehr schwimmen; tiefes Wasser ist tödlich.",
  },
  moko_nebel: {
    id: "moko_nebel",
    name: "Nebel-Frucht",
    type: "Logia",
    abilityTag: "nebel_koerper",
    bonusSkills: ["heimlichkeit", "wahrnehmung"],
    ability: "Du wirst zu Nebel — schwer zu treffen, schwer zu fassen, ideal zum Verschwinden.",
    downside: "Kein Schwimmen mehr; außerdem zerstreut dich starker Wind kurzzeitig.",
  },
  ushi_bison: {
    id: "ushi_bison",
    name: "Bison-Frucht",
    type: "Zoan",
    abilityTag: "bison_gestalt",
    bonusSkills: ["nahkampf", "einschuechtern"],
    ability: "Du kannst dich in einen mächtigen Bison (und eine Mischform) verwandeln — rohe Kraft.",
    downside: "Kein Schwimmen mehr; der Tierinstinkt kann in Wut die Kontrolle übernehmen.",
  },
  kage_schatten: {
    id: "kage_schatten",
    name: "Schatten-Frucht",
    type: "Paramecia",
    abilityTag: "schatten_manipulation",
    bonusSkills: ["heimlichkeit", "einschuechtern"],
    ability: "Du greifst und formst Schatten — verlagerst sie, versteckst dich in ihnen.",
    downside: "Kein Schwimmen mehr; direktes, grelles Sonnenlicht schwächt dich.",
  },
};

export function listDevilFruits() {
  return Object.values(DEVIL_FRUITS);
}

export function randomDevilFruit() {
  const all = Object.values(DEVIL_FRUITS);
  return all[Math.floor(Math.random() * all.length)];
}
