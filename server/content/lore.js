// Welt- und Timeline-Wissen. Dient zwei Zwecken:
//  1. Als Kontext-Baustein für den Spielleiter-Prompt (siehe ai/systemPrompt.js).
//  2. Damit die deterministische Engine Kanon-Ereignisse als Gerüchte einstreuen
//     kann ("Koexistenz" mit dem Manga-Zeitstrang).
//
// Bewusst grob & lore-nah gehalten, keine wörtlichen Manga-Inhalte. Der Start
// liegt kurz nach Gol D. Rogers Hinrichtung in Loguetown — dem Beginn des
// großen Piratenzeitalters (ca. 22 Jahre vor Ruffys Aufbruch).

export const ERA = {
  label: "Beginn des großen Piratenzeitalters",
  // In-Game-Kalender: wir zählen Tage ab Rogers Hinrichtung.
  startDayLabel: "Tag 1 nach Rogers Hinrichtung",
};

// Kanon-nahe Hintergrund-Ereignisse, verankert an Tages-Offsets ab Start.
// Die Engine kann sie als Nachrichten/Gerüchte am Rand einstreuen. Der Spieler
// beeinflusst sie NICHT direkt — er koexistiert mit ihnen.
export const CANON_TIMELINE = [
  {
    day: 1,
    scope: "weltweit",
    rumor:
      "Die Marine hat den Piratenkönig Gol D. Roger in Loguetown hingerichtet. " +
      "Seine letzten Worte haben ein Feuer entfacht: Unzählige träumen jetzt vom One Piece.",
  },
  {
    day: 20,
    scope: "weltweit",
    rumor:
      "Überall stechen neue Crews in See. Die Marine verstärkt ihre Patrouillen in allen vier Blues.",
  },
  {
    day: 90,
    scope: "Grand Line",
    rumor:
      "Gerüchte über einen jungen Kapitän mit einem Strohhut, der einst zu Rogers Crew gehörte, machen die Runde.",
  },
  {
    day: 180,
    scope: "weltweit",
    rumor:
      "Die Weltregierung diskutiert, das Wort 'D.' und alles um Rogers Erbe strenger zu überwachen.",
  },
];

// Kern-Fakten für den Spielleiter-Prompt (kompakt, promptfreundlich).
export const WORLD_FACTS = [
  "Setting: die Welt von One Piece, kurz nach Rogers Hinrichtung.",
  "Es gibt Teufelsfrüchte (deren Nutzer nicht schwimmen können), Haki (anfangs unbekannt/latent), Marine, Piraten, Kopfgelder in Berry.",
  "Die vier Meere heißen East Blue, West Blue, North Blue, South Blue; dazwischen die Grand Line, geteilt durch die Red Line.",
  "Ton: abenteuerlich, mit Herz, Humor und gelegentlicher Dramatik — wie One Piece selbst.",
  "Wichtige benannte Kanon-Figuren treten höchstens am Rand als Gerücht/Kurzbegegnung auf und werden nie 'zerstört' oder aus dem Kanon gerissen.",
];

export function rumorsForDay(day) {
  return CANON_TIMELINE.filter((e) => e.day <= day).slice(-3);
}
