// Einfache dateibasierte Persistenz für Spielstände (ein JSON pro Spiel).
// Bewusst ohne Datenbank/native Module gehalten, damit das Projekt überall
// mit reinem `npm install` läuft. Später leicht gegen SQLite/Postgres
// austauschbar, weil der Rest des Codes nur diese Funktionen nutzt.
import fs from "node:fs";
import path from "node:path";
import { DATA_DIR } from "./config.js";

const GAMES_DIR = path.join(DATA_DIR, "games");

function ensureDirs() {
  fs.mkdirSync(GAMES_DIR, { recursive: true });
}

function gameFile(id) {
  // Nur alphanumerische IDs zulassen (Schutz vor Pfad-Traversal).
  if (!/^[A-Za-z0-9_-]+$/.test(id)) throw new Error("Ungültige Spiel-ID");
  return path.join(GAMES_DIR, `${id}.json`);
}

export function saveGame(game) {
  ensureDirs();
  game.updatedAt = new Date().toISOString();
  fs.writeFileSync(gameFile(game.id), JSON.stringify(game, null, 2), "utf8");
  return game;
}

export function loadGame(id) {
  try {
    const raw = fs.readFileSync(gameFile(id), "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function gameExists(id) {
  try {
    return fs.existsSync(gameFile(id));
  } catch {
    return false;
  }
}
