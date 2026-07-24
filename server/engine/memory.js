// NPC-Gedächtnis und Entscheidungs-Flags. Kern des Versprechens: "Charaktere
// merken sich Entscheidungen, falls man sie wiedersieht."
//
// Das Gedächtnis lebt im Spielzustand (world.npcs / world.flags) und wird bei
// jeder Szene wieder in den Prompt injiziert.

// Dieselbe Schwelle, die app.js fürs "Bekannte Gesichter"-Panel nutzt
// (disp > 20 ? "friend" : disp < -20 ? "foe" : "neutral") — eine Person gilt
// hier wie dort ab demselben Wert als Freund/Feind statt zwei verschiedene,
// unabhängig gepflegte Schwellen im Spiel zu haben.
const FRIEND_FOE_THRESHOLD = 20;

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
  const previousDisposition = existing?.disposition ?? 0;
  const disposition = clamp(Number(npc.disposition ?? previousDisposition), -100, 100);

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

  // Ein Crewmitglied hat in party.js eine EIGENE Loyalitäts-Zahl, die bislang
  // beim Beitritt einfror und nie wieder aktualisiert wurde. Verändert sich
  // die laufend erzählte Gesinnung merklich, zieht die Loyalität leicht mit —
  // sonst laufen "wie die Crew über dich denkt" (Gesinnung) und "wie treu sie
  // ist" (Loyalität) für dieselbe Person dauerhaft auseinander.
  const dispositionShift = disposition - previousDisposition;
  if (dispositionShift !== 0) {
    const member = (game.party || []).find((p) => p.id === id);
    if (member && member.loyalty != null) {
      member.loyalty = clamp(member.loyalty + Math.round(dispositionShift / 4), 20, 95);
    }
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
//
// Bisher rein nach Aktualität sortiert (zuletzt gesehen zuerst) — bei vielen
// Begegnungen fielen ältere NPCs dadurch schlicht aus dem "limit" heraus,
// selbst wenn sie eigentlich noch relevant sind (Crew, aktuell anwesend,
// eine gefestigte Freund-/Feindschaft). Jetzt garantieren diese drei Gruppen
// sich zuerst einen Platz; erst danach füllt Aktualität den Rest auf.
export function memorySummary(game, limit = 12) {
  ensureMemory(game);
  const partyIds = new Set((game.party || []).map((p) => p.id));
  const presentIds = new Set(game.scene?.presentNpcIds || []);

  const priority = (n) =>
    (presentIds.has(n.id) ? 4 : 0) +
    (partyIds.has(n.id) ? 2 : 0) +
    (Math.abs(n.disposition) >= FRIEND_FOE_THRESHOLD ? 1 : 0);

  const npcs = Object.values(game.world.npcs)
    .sort((a, b) => (priority(b) - priority(a)) || ((b.lastSeenDay ?? 0) - (a.lastSeenDay ?? 0)))
    .slice(0, limit)
    .map((n) => ({
      id: n.id,
      name: n.name,
      role: n.role,
      persoenlichkeit: n.personality || "unbekannt",
      nameBekannt: !!n.nameKnown,
      gesinnung: n.disposition,
      // Abgeleitetes Feld statt eigenem gespeichertem Zustand — kann dadurch
      // nie mit game.party/gesinnung auseinanderlaufen (siehe Nutzerfrage
      // nach einer konsistenten, immer aktuellen Zugehörigkeits-Angabe).
      zugehoerigkeit: affiliation(n, partyIds),
      zuletztGesehenTag: n.lastSeenDay,
      letzteNotizen: n.notes.slice(-2).map((x) => x.text),
    }));
  return { npcs, flags: game.world.flags };
}

function affiliation(npc, partyIds) {
  if (partyIds.has(npc.id)) return "crew";
  if (npc.disposition >= FRIEND_FOE_THRESHOLD) return "verbuendet";
  if (npc.disposition <= -FRIEND_FOE_THRESHOLD) return "feindlich";
  return "neutral";
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}
