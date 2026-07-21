// Kleiner, deterministischer Story Director. Er hält einen lokalen Hauptfaden
// am Leben, damit Szenen nicht nur aus voneinander losgelösten Zufallsereignissen
// bestehen. Die KI erzählt die Folgen; Fortschritt und Eskalation gehören der
// Engine und sind daher bei allen Providern gleich.

const THREADS_BY_LOCATION = {
  loguetown: { title: "Der verschwundene Kurier", hook: "Ein Kurier mit einer versiegelten Nachricht ist am Hafen verschwunden." },
  shells_town: { title: "Die gefälschten Drillpläne", hook: "Jemand verkauft Pläne der Garnison an die falschen Leute." },
  hafendorf_sirup: { title: "Das stille Schiff", hook: "Ein herrenloses Schiff liegt seit Tagen vor der Küste – doch nachts brennt Licht an Bord." },
  klippen_vorposten: { title: "Befehle aus der Tiefe", hook: "Der Kommandant erhält geheime Befehle, die selbst seine Soldaten fürchten." },
  orangen_hafen: { title: "Die fehlende Ladung", hook: "Eine Kiste mit wertvoller Ware verschwand zwischen Kai und Lagerhaus." },
  windmuehlendorf: { title: "Das zerrissene Logbuch", hook: "In der Bibliothek fehlt genau die Seite, die von einem fremden Schiff erzählt." },
};

const INVESTIGATE_PATTERN = /\b(nachforsch(?:e|en|t|st)?|herausfind(?:e|en|t|st)?|frag(?:e|en|t|st)?|such(?:e|en|t|st)?|spür(?:e|en|t|st)?|verfolg(?:e|en|t|st)?|lausch(?:e|en|t|st)?|zuhoer(?:e|en|t|st)?|zuhör(?:e|en|t|st)?|beobacht(?:e|en|t|st)?)\b/i;

export function ensureStoryDirector(game) {
  const director = game.world.storyDirector || (game.world.storyDirector = { threads: [], lastEvent: null });
  if (!director.threads.some((t) => t.status === "aktiv")) {
    const source = THREADS_BY_LOCATION[game.world.location] || THREADS_BY_LOCATION.loguetown;
    director.threads.push({
      id: `faden_${game.world.location}_${game.world.day}`,
      location: game.world.location,
      title: source.title,
      hook: source.hook,
      progress: 0,
      stage: 0,
      neglect: 0,
      status: "aktiv",
      createdDay: game.world.day,
    });
    director.lastEvent = { type: "begonnen", threadId: director.threads.at(-1).id };
  }
  return director;
}

export function advanceStoryDirector(game, playerAction) {
  const director = ensureStoryDirector(game);
  const thread = director.threads.find((t) => t.status === "aktiv");
  if (!thread) return null;

  let event = null;
  if (INVESTIGATE_PATTERN.test(playerAction || "")) {
    thread.progress = Math.min(3, thread.progress + 1);
    thread.neglect = 0;
    event = { type: thread.progress === 3 ? "geloest" : "fortschritt", threadId: thread.id, title: thread.title, progress: thread.progress };
    if (thread.progress === 3) {
      thread.status = "geloest";
      game.world.flags[`story_${thread.id}_geloest`] = true;
    }
  } else {
    thread.neglect += 1;
    // Nach drei ignorierten Zügen verändert sich die Lage. Nach der dritten
    // Eskalation ist die Gelegenheit vorbei – eine echte verpasste Chance.
    if (thread.neglect >= 3) {
      thread.neglect = 0;
      thread.stage += 1;
      event = { type: thread.stage >= 3 ? "verpasst" : "eskaliert", threadId: thread.id, title: thread.title, stage: thread.stage };
      if (thread.stage >= 3) {
        thread.status = "verpasst";
        game.world.flags[`story_${thread.id}_verpasst`] = true;
      }
    }
  }
  director.lastEvent = event;
  return event;
}

export function storyDirectorView(game) {
  const director = ensureStoryDirector(game);
  return {
    active: director.threads
      .filter((t) => t.status === "aktiv")
      .map((t) => ({ title: t.title, hook: t.hook, progress: t.progress, stage: t.stage, location: t.location })),
    lastEvent: director.lastEvent,
  };
}
