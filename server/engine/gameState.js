// Aufbau eines neuen Spielzustands. Der Spielstand ist EIN JSON-Objekt, das
// alles Deterministische enthält: Charakter, Party, Weltzeit, Gedächtnis,
// Historie. Die KI bekommt daraus jeweils nur eine kompakte Zusammenfassung.

import { nanoid } from "nanoid";
import { createCharacter } from "./character.js";
import { START_LOCATIONS } from "../content/startingScenarios.js";
import { ensureMemory } from "./memory.js";

export function createGame({ character, startLocationId, language = "de" }) {
  const location = START_LOCATIONS[startLocationId];
  if (!location) throw new Error("Unbekannter Startort.");

  const char = createCharacter(character);

  const game = {
    id: nanoid(10),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    language,
    character: char,
    party: [], // rekrutierte Begleiter
    world: {
      day: 1, // Tage seit Rogers Hinrichtung
      location: location.id,
      locationName: location.name,
      npcs: {},
      flags: {},
    },
    // Szenen-Historie: die letzten Erzähltexte + Spieleraktionen (für Kontext).
    history: [],
    // Aktuell offene Szene (Erzähltext + Auswahlmöglichkeiten).
    scene: null,
    // Aktuell rekrutierbare NPCs (aus der letzten Szene).
    recruitable: [],
    // Log letzter Würfe (fürs UI-Feedback).
    lastCheck: null,
    // Multiplayer-Vorbereitung: Spielstände können später an einen "room"
    // gebunden werden. Vorerst Single-Player.
    roomCode: null,
  };
  ensureMemory(game);
  return game;
}

// Kompakter Charakter-Steckbrief für den Prompt (nur das Nötige).
export function characterDigest(game) {
  const c = game.character;
  return {
    name: c.name,
    archetyp: c.archetype,
    level: c.level,
    hp: `${c.hp}/${c.maxHp}`,
    beri: c.beri,
    stellung: c.standing,
    topSkills: Object.entries(c.skills)
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([id, v]) => `${id} ${v}`),
    perks: c.perks,
    party: game.party.map((p) => ({ name: p.name, rolle: p.role })),
  };
}
