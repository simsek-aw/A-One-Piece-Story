// Haki-Ausbau: der Willenskraft-Pfad wird zu echten Fähigkeiten.
//
// Drei Stufen (generische Haki-Begriffe, wie im Skill "haki (latent)" bereits
// angelegt):
//   - Beobachtungshaki: schaltet frei ab Rang 1. Passive Vorahnung/Wahrnehmung.
//   - Rüstungshaki: schaltet frei ab Rang 3. Ein echter Kampf-Spezialangriff
//     (kein bloßer Fruchteffekt mehr, siehe combat.js).
//   - Haoshoku (Überwältigungswille): extrem selten. Braucht Rang 6 UND hohe
//     Willenskraft — und selbst dann nur eine kleine Chance pro Trainings-
//     Ereignis. Einmal erwacht, bleibt es für immer.
//
// checkHakiUnlocks() wird nach jeder Änderung am haki-Skillrang aufgerufen
// (Aktivität, Skillpunkt-Verteilung) und liefert die NEU erwachten Stufen
// zurück, damit der Spielleiter sie als Schlüsselmoment erzählen kann.

const RANK_BEOBACHTUNG = 1;
const RANK_RUESTUNG = 3;
const RANK_HAOSHOKU = 6;
const WILLENSKRAFT_HAOSHOKU = 8;
const HAOSHOKU_CHANCE = 0.08; // pro Trainingsereignis, solange noch nicht erwacht

export const HAKI_TIERS = {
  beobachtung: {
    id: "beobachtung",
    name: "Beobachtungshaki",
    desc: "Ein Gespür für Gefahr, Absicht und den nächsten Schlag, bevor er fällt.",
  },
  ruestung: {
    id: "ruestung",
    name: "Rüstungshaki",
    desc: "Unsichtbare Rüstung um Fäuste und Haut — schlägt durch, wo bloße Kraft versagt.",
  },
  haoshoku: {
    id: "haoshoku",
    name: "Haoshoku (Überwältigungswille)",
    desc: "Ein Wille, der Schwächere allein durch seine Gegenwart in die Knie zwingt. Unter Millionen einer.",
  },
};

export function ensureHaki(character) {
  if (!character.haki) character.haki = { beobachtung: false, ruestung: false, haoshoku: false };
  return character.haki;
}

// Prüft nach einer Änderung des haki-Skillrangs auf neue Erwachungen.
// Gibt ein Array frisch erwachter HAKI_TIERS-Einträge zurück (leer, wenn nichts Neues).
export function checkHakiUnlocks(character) {
  const h = ensureHaki(character);
  const rank = character.skills?.haki || 0;
  const unlocked = [];

  if (!h.beobachtung && rank >= RANK_BEOBACHTUNG) {
    h.beobachtung = true;
    unlocked.push(HAKI_TIERS.beobachtung);
  }
  if (!h.ruestung && rank >= RANK_RUESTUNG) {
    h.ruestung = true;
    unlocked.push(HAKI_TIERS.ruestung);
  }
  if (!h.haoshoku && rank >= RANK_HAOSHOKU && (character.attributes?.willenskraft || 0) >= WILLENSKRAFT_HAOSHOKU) {
    if (Math.random() < HAOSHOKU_CHANCE) {
      h.haoshoku = true;
      unlocked.push(HAKI_TIERS.haoshoku);
    }
  }
  return unlocked;
}

// Kleine, generische Bonuswerte für Skill-Checks außerhalb des Kampfes.
export function hakiSkillBonus(character, skillId) {
  const h = character.haki;
  if (!h) return 0;
  if (h.beobachtung && (skillId === "wahrnehmung" || skillId === "heimlichkeit")) return 2;
  if (h.haoshoku && skillId === "einschuechtern") return 4;
  return 0;
}
