// Kanonische Crews/Fraktionen UND kleinere Gruppen, denen man beitreten kann.
//
// Kernidee:
//   - openness (0..100): Wie bereitwillig kleine Mitglieder aufgenommen werden.
//     Big Mom & Kaido horten Untergebene -> sehr hoch. Riesen/Strohhüte -> niedrig.
//   - canonical: true = berühmte Kanon-Crew. In Teil des Canons zu kommen ist
//     GENERELL schwerer als bei den kleinen Gruppen drumherum (kleiner DC-Aufschlag),
//     abgesehen von den "Sammlern" Big Mom/Kaido.
//   - eraFromDay: Ab wann die Crew existiert/rekrutiert (Spielstart = kurz nach
//     Rogers Tod). Manche entstehen erst später, die Strohhüte erst in ~22 Jahren.
//   - requirements: minLevel, maxBounty (Marine nimmt keine Gesuchten) usw.
//   - effects: was der Beitritt bringt (Schutz, Rang, "Familie" ...).
//
// Bewusst lore-nah, aber mit eigenen Namen dort, wo es passt — frei erweiterbar.

const YEAR = 365;

export const CANON_CREWS = {
  // ---- Große Kanon-Crews (canonical) ----
  big_mom: {
    id: "big_mom", name: "Big-Mom-Piratenbande", recruiter: "Charlotte Linlin (Big Mom)",
    faction: "pirat", canonical: true, openness: 90, prestige: 95, eraFromDay: 1, requirements: {},
    effects: { protection: true, note: "Teil einer gewaltigen Familie — aber Big Mom erwartet absolute Loyalität." },
    blurb: "Eine riesige Piratenfamilie, die ständig wächst. Big Mom nimmt gern auch kleine Lakaien auf — solange sie nützlich und loyal sind.",
    joinable: true,
  },
  kaido: {
    id: "kaido", name: "Beasts-Piratenbande", recruiter: "Kaido",
    faction: "pirat", canonical: true, openness: 85, prestige: 96, eraFromDay: 1, requirements: {},
    effects: { protection: true, note: "Reine Stärke zählt. Wer kämpfen kann, wird zur 'Zahl' oder zum Gifter — Schwäche wird verachtet." },
    blurb: "Kaido sammelt Kämpfer und künstliche Bestien in Massen. Aufnahme ist leicht — überleben ist es nicht.",
    joinable: true,
  },
  whitebeard: {
    id: "whitebeard", name: "Whitebeard-Piratenbande", recruiter: "Edward Newgate (Whitebeard)",
    faction: "pirat", canonical: true, openness: 60, prestige: 98, eraFromDay: 1, requirements: { minLevel: 3 },
    effects: { protection: true, note: "Whitebeard behandelt seine Mannschaft wie Söhne und Töchter — starker Rückhalt, aber man muss sich beweisen." },
    blurb: "Der stärkste Mann der Welt sammelt keine Lakaien, sondern Familie. Wer Mut und Herz zeigt, wird 'Sohn' oder 'Tochter'.",
    joinable: true,
  },
  buggy: {
    id: "buggy", name: "Buggy-Piratenbande", recruiter: "Buggy der Clown",
    faction: "pirat", canonical: true, openness: 78, prestige: 45, eraFromDay: 3 * YEAR, requirements: {},
    effects: { note: "Ein bunter Haufen. Buggy prahlt gern und nimmt fast jeden, der ihn bewundert (oder fürchtet)." },
    blurb: "Eine kleinere, chaotische Crew um einen ehemaligen Schiffsjungen des Piratenkönigs. Formiert sich erst einige Jahre nach Rogers Tod.",
    joinable: true,
  },
  giants: {
    id: "giants", name: "Riesenkrieger-Piraten (Elbaf)", recruiter: "ein Hüne aus Elbaf",
    faction: "pirat", canonical: true, openness: 20, prestige: 90, eraFromDay: 1, requirements: { minLevel: 5 },
    effects: { protection: true, note: "Die Riesen achten nur, wer sich in Ehre und Stärke beweist — für einen winzigen Menschen sehr schwer." },
    blurb: "Die stolzen Krieger von Elbaf nehmen kaum Außenseiter auf. Nur wer außergewöhnlichen Mut beweist, wird geduldet.",
    joinable: true,
  },
  marine: {
    id: "marine", name: "Die Marine", recruiter: "ein Rekrutierungsoffizier",
    faction: "marine", canonical: true, openness: 75, prestige: 60, eraFromDay: 1, requirements: { maxBounty: 0 },
    initialRelation: "begegnet", // Die Marine hat überall Rekrutierungsbüros — jederzeit ansprechbar.
    effects: { marineFriendly: true, rank: "Rekrut", note: "Als Marine wird man kaum von Patrouillen behelligt — solange die Weste sauber bleibt." },
    blurb: "Die Streitkräfte der Weltregierung nehmen gern Freiwillige mit sauberer Weste. Ein Kopfgeld schließt dich aus.",
    joinable: true,
  },
  roger: {
    id: "roger", name: "Roger-Piratenbande", recruiter: "—",
    faction: "pirat", canonical: true, openness: 0, prestige: 100, eraFromDay: 1, requirements: {},
    initialRelation: "gehört", // Rogers Hinrichtung kennt gerade die ganze Welt (aber unbeitretbare Legende).
    effects: {},
    blurb: "Die Crew des Piratenkönigs — soeben aufgelöst, ihr Kapitän hingerichtet. Ein Beitritt ist unmöglich; nur Legenden bleiben.",
    joinable: false,
  },
  straw_hats: {
    id: "straw_hats", name: "Strohhut-Piratenbande", recruiter: "ein Junge mit Strohhut",
    faction: "pirat", canonical: true, openness: 5, prestige: 100, eraFromDay: 22 * YEAR, requirements: {},
    effects: { protection: true, note: "Der Kapitän nimmt nur genau die Menschen auf, die er selbst auserwählt — Bitten helfen fast nie." },
    blurb: "Eine (noch ferne) Crew, deren Kapitän niemanden aus Berechnung aufnimmt, sondern nur 'die Richtigen'. Beitreten lässt sich kaum erzwingen.",
    joinable: true,
  },

  // ---- Kleinere / no-name Gruppen (nicht canonical) — leichter beizutreten ----
  freibeuter_rookies: {
    id: "freibeuter_rookies", name: "Freibeuter-Rookies", recruiter: "ein aufstrebender Rookie-Kapitän",
    faction: "pirat", canonical: false, openness: 92, prestige: 10, eraFromDay: 1, requirements: {},
    effects: { note: "Eine frische no-name-Crew, die jede Hand gebrauchen kann." },
    blurb: "Eine der unzähligen kleinen Crews, die nach Rogers Tod in See stechen. Nimmt praktisch jeden auf.",
    joinable: true,
  },
  schmuggler: {
    id: "schmuggler", name: "Küsten-Schmuggler", recruiter: "ein zwielichtiger Bootsmann",
    faction: "neutral", canonical: false, openness: 84, prestige: 12, eraFromDay: 1, requirements: {},
    effects: { note: "Diskrete Geschäfte, schnelle Beri — aber die Marine sieht es nicht gern." },
    blurb: "Eine lose Bande, die Waren an den Patrouillen vorbeischafft. Wer Diskretion mitbringt, ist willkommen.",
    joinable: true,
  },
  kopfgeldjaeger_gilde: {
    id: "kopfgeldjaeger_gilde", name: "Kopfgeldjäger-Kompanie", recruiter: "ein narbengesichtiger Jäger",
    faction: "neutral", canonical: false, openness: 80, prestige: 25, eraFromDay: 1, requirements: {},
    effects: { note: "Man jagt Gesuchte gegen Kopfgeld — halb im Dienst des Gesetzes, halb für sich selbst." },
    blurb: "Eine Kompanie von Kopfgeldjägern. Nimmt fähige Kämpfer, egal woher sie kommen.",
    joinable: true,
  },
  wirte_gilde: {
    id: "wirte_gilde", name: "Gilde der Hafenwirte", recruiter: "eine resolute Wirtin",
    faction: "neutral", canonical: false, openness: 88, prestige: 15, eraFromDay: 1, requirements: {},
    effects: { note: "Ein Netzwerk aus Kneipen und Herbergen — die besten Ohren im ganzen Blue." },
    blurb: "Ein Zusammenschluss von Wirten und Barkeepern. Wer Menschen (und Gerüchte) lesen kann, gehört bald dazu.",
    joinable: true,
  },
};

export function listCanonCrews() {
  return Object.values(CANON_CREWS);
}

export const CANON_CREW_IDS = Object.keys(CANON_CREWS);
