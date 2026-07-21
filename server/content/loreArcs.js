// Handlungsstrang "Die Lücke in der Geschichte" — der rote Faden für Bücherwürmer.
// Jede Bücherwurm-/Recherche-Einheit erhöht world.flags.lore_fortschritt um 1.
// Beim Überschreiten einer Schwelle wird ein Fragment enthüllt (Chronik-Eintrag).
//
// Bewusst ORIGINAL formuliert (kein wörtlicher Kanon): eine verlorene Epoche,
// verschwiegen von der Weltregierung, deren Spuren nur in Steininschriften und
// Randnotizen überleben. Frei erweiterbar — einfach weitere Fragmente anhängen.

export const LORE_ARCS = [
  {
    threshold: 1,
    id: "luecke_1",
    title: "Ein fehlendes Jahrhundert",
    text:
      "In jedem Geschichtsbuch klafft dieselbe Lücke: rund hundert Jahre, über die niemand schreibt. " +
      "Kein Krieg, keine Könige, keine Namen — als hätte jemand die Seiten herausgerissen.",
  },
  {
    threshold: 3,
    id: "luecke_2",
    title: "Die Stimmen im Stein",
    text:
      "Ein alter Archivar flüstert von Inschriften auf unzerstörbaren Steinen, verstreut über die Welt. " +
      "Wer sie zu lesen versucht, verschwindet — oder schweigt für immer.",
  },
  {
    threshold: 5,
    id: "luecke_3",
    title: "Das Verbot",
    text:
      "Die Weltregierung ahndet die Erforschung jener Epoche als Schwerverbrechen. Nicht die Tat wird bestraft, " +
      "sondern die Neugier selbst. Was auch immer damals geschah — jemand hat gute Gründe, es zu begraben.",
  },
  {
    threshold: 8,
    id: "luecke_4",
    title: "Der Buchstabe D.",
    text:
      "Immer wieder derselbe Initial: 'D.', eingeritzt neben Namen, die Geschichte machten — und Geschichte fürchteten. " +
      "Ein Erbe? Ein Fluch? Ein Versprechen? Die Spur führt quer durch die Blues.",
  },
  {
    threshold: 12,
    id: "luecke_5",
    title: "Eine Waffe, ein Name",
    text:
      "Zwischen den Zeilen taucht ein Wort auf, das man sofort wieder vergessen soll — der Name von etwas, " +
      "das die Welt einst erschütterte. Du hast begonnen, die Lücke zu lesen. Und die Lücke liest jetzt dich.",
  },
];

export function unlockedLore(progress) {
  return LORE_ARCS.filter((a) => (progress || 0) >= a.threshold);
}

export function nextLore(progress) {
  return LORE_ARCS.find((a) => (progress || 0) < a.threshold) || null;
}

// Fragmente, die beim Sprung von prev -> next neu freigeschaltet werden.
export function newlyUnlocked(prev, next) {
  return LORE_ARCS.filter((a) => prev < a.threshold && next >= a.threshold);
}
