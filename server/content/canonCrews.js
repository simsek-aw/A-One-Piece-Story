// Kanonische Crews/Fraktionen, denen man beitreten kann ("Teil des Canons werden").
//
// Kernidee des Spielers: Wie leicht man aufgenommen wird, hängt von der Crew ab.
//   - openness (0..100): Wie bereitwillig kleine Mitglieder/Lakaien aufgenommen
//     werden. Big Mom (riesige Crew) = sehr hoch. Strohhüte (nur "die Richtigen")
//     = extrem niedrig.
//   - Daraus wird ein Beitritts-DC berechnet: niedrige openness -> hoher DC.
//   - eraFromDay: Ab welchem In-Game-Tag die Crew überhaupt existiert/rekrutiert.
//     Das Spiel startet kurz nach Rogers Tod; manche Crews (z.B. die Strohhüte)
//     gibt es in dieser Ära schlicht noch nicht.
//   - requirements: minLevel, maxBounty (Marine nimmt keine Gesuchten) etc.
//   - effects: was der Beitritt bringt (Schutz vor Marine, Rang, "Familie" ...).
//
// Bewusst lore-nah, aber frei erweiterbar.

const YEAR = 365; // grobe Tage/Jahr für Ära-Gating

export const CANON_CREWS = {
  big_mom: {
    id: "big_mom",
    name: "Big-Mom-Piratenbande",
    recruiter: "Charlotte Linlin (Big Mom)",
    faction: "pirat",
    openness: 90,
    prestige: 95,
    eraFromDay: 1,
    requirements: {},
    effects: { protection: true, note: "Teil einer gewaltigen Familie — aber Big Mom erwartet absolute Loyalität und ihre Süßigkeiten-Launen sind gefürchtet." },
    blurb: "Eine riesige Piratenfamilie, die ständig wächst. Big Mom nimmt gern auch kleine Lakaien auf — solange sie nützlich und loyal sind.",
    joinable: true,
  },
  whitebeard: {
    id: "whitebeard",
    name: "Whitebeard-Piratenbande",
    recruiter: "Edward Newgate (Whitebeard)",
    faction: "pirat",
    openness: 65,
    prestige: 98,
    eraFromDay: 1,
    requirements: { minLevel: 3 },
    effects: { protection: true, note: "Whitebeard behandelt seine Mannschaft wie Söhne und Töchter — starker Rückhalt, aber man muss sich beweisen." },
    blurb: "Der stärkste Mann der Welt sammelt keine Lakaien, sondern Familie. Wer Mut und Herz zeigt, wird 'Sohn' oder 'Tochter'.",
    joinable: true,
  },
  marine: {
    id: "marine",
    name: "Die Marine",
    recruiter: "ein Rekrutierungsoffizier",
    faction: "marine",
    openness: 75,
    prestige: 60,
    eraFromDay: 1,
    requirements: { maxBounty: 0 },
    effects: { marineFriendly: true, rank: "Rekrut", note: "Als Marine wird man kaum von Patrouillen behelligt — solange die Weste sauber bleibt." },
    blurb: "Die Streitkräfte der Weltregierung nehmen gern Freiwillige mit sauberer Weste. Ein Kopfgeld schließt dich allerdings aus.",
    joinable: true,
  },
  roger: {
    id: "roger",
    name: "Roger-Piratenbande",
    recruiter: "—",
    faction: "pirat",
    openness: 0,
    prestige: 100,
    eraFromDay: 1,
    requirements: {},
    effects: {},
    blurb: "Die Crew des Piratenkönigs — soeben aufgelöst, ihr Kapitän hingerichtet. Ein Beitritt ist unmöglich; nur Legenden bleiben.",
    joinable: false,
  },
  straw_hats: {
    id: "straw_hats",
    name: "Strohhut-Piratenbande",
    recruiter: "ein Junge mit Strohhut",
    faction: "pirat",
    openness: 5,
    prestige: 100,
    eraFromDay: 22 * YEAR, // existiert in dieser Ära noch lange nicht
    requirements: {},
    effects: { protection: true, note: "Der Kapitän nimmt nur genau die Menschen auf, die er selbst auserwählt — Bitten helfen fast nie." },
    blurb: "Eine (noch ferne) Crew, deren Kapitän niemanden aus Berechnung aufnimmt, sondern nur 'die Richtigen'. Beitreten lässt sich kaum erzwingen.",
    joinable: true,
  },
};

export function listCanonCrews() {
  return Object.values(CANON_CREWS);
}
