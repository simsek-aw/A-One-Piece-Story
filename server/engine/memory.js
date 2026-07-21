// NPC-Gedächtnis und Entscheidungs-Flags. Kern des Versprechens: "Charaktere
// merken sich Entscheidungen, falls man sie wiedersieht."
//
// Das Gedächtnis lebt im Spielzustand (world.npcs / world.flags) und wird bei
// jeder Szene wieder in den Prompt injiziert.

export function ensureMemory(game) {
  game.world.npcs = game.world.npcs || {};
  game.world.flags = game.world.flags || {};
  return game;
}

// Fügt einen neuen NPC hinzu oder aktualisiert einen bekannten. Neue Notizen
// werden angehängt (Historie), disposition (-100..100) wird überschrieben.
export function upsertNpc(game, npc, currentDay) {
  ensureMemory(game);
  const id = String(npc.id || "").trim();
  if (!id) return;

  const existing = game.world.npcs[id];
  const disposition = clamp(Number(npc.disposition ?? existing?.disposition ?? 0), -100, 100);

  const record = existing || {
    id,
    name: npc.name || id,
    role: npc.role || "",
    firstMetDay: currentDay,
    disposition: 0,
    personality: npc.personality || null,
    nameKnown: npc.nameKnown ?? false,
    notes: [],
  };

  record.name = npc.name || record.name;
  record.role = npc.role || record.role;
  record.disposition = disposition;
  if (npc.personality) record.personality = npc.personality;
  if (npc.nameKnown != null) record.nameKnown = !!npc.nameKnown;
  record.lastSeenDay = currentDay;
  if (npc.note && typeof npc.note === "string") {
    record.notes.push({ day: currentDay, text: npc.note });
    // Historie begrenzen, damit der Prompt nicht ausufert.
    if (record.notes.length > 8) record.notes = record.notes.slice(-8);
  }

  game.world.npcs[id] = record;
  return record;
}

export function setFlags(game, flags) {
  if (!flags || typeof flags !== "object") return;
  ensureMemory(game);
  for (const [key, value] of Object.entries(flags)) {
    game.world.flags[String(key)] = value;
  }
}

// Kompakte Gedächtnis-Zusammenfassung für den Spielleiter-Prompt.
export function memorySummary(game, limit = 12) {
  ensureMemory(game);
  const npcs = Object.values(game.world.npcs)
    .sort((a, b) => (b.lastSeenDay ?? 0) - (a.lastSeenDay ?? 0))
    .slice(0, limit)
    .map((n) => ({
      id: n.id,
      name: n.name,
      role: n.role,
      persoenlichkeit: n.personality || "unbekannt",
      nameBekannt: !!n.nameKnown,
      gesinnung: n.disposition,
      zuletztGesehenTag: n.lastSeenDay,
      letzteNotizen: n.notes.slice(-2).map((x) => x.text),
    }));
  return { npcs, flags: game.world.flags };
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}
