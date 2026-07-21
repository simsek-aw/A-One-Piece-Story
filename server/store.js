// Persistenz: lokal als JSON (ohne Konfiguration) oder dauerhaft in Supabase.
// Die API bleibt für die Spielengine identisch; nur diese Datei kennt das
// Speichermedium. Der Supabase-Secret-Key verlässt den Server nie.

import fs from "node:fs/promises";
import path from "node:path";
import { DATA_DIR, config } from "./config.js";

const GAMES_DIR = path.join(DATA_DIR, "games");
let supabaseClientPromise = null;

function gameFile(id) {
  if (!/^[A-Za-z0-9_-]+$/.test(id)) throw new Error("Ungültige Spiel-ID");
  return path.join(GAMES_DIR, `${id}.json`);
}

async function supabase() {
  if (!config.supabase.url && !config.supabase.secretKey) return null;
  if (!config.supabase.url || !config.supabase.secretKey) {
    throw new Error("Supabase ist unvollständig konfiguriert: SUPABASE_URL und SUPABASE_SECRET_KEY werden benötigt.");
  }
  if (!supabaseClientPromise) {
    supabaseClientPromise = import("@supabase/supabase-js")
      .then(({ createClient }) => createClient(config.supabase.url, config.supabase.secretKey, {
        auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
      }));
  }
  return supabaseClientPromise;
}

export async function saveGame(game) {
  game.updatedAt = new Date().toISOString();
  const db = await supabase();
  if (db) {
    const { error } = await db.from("aops_games").upsert({
      id: game.id,
      character_name: game.character.name,
      character_archetype: game.character.archetype,
      updated_at: game.updatedAt,
      game,
    }, { onConflict: "id" });
    if (error) throw new Error(`Supabase-Spielstand konnte nicht gespeichert werden: ${error.message}`);
    return game;
  }
  await fs.mkdir(GAMES_DIR, { recursive: true });
  await fs.writeFile(gameFile(game.id), JSON.stringify(game, null, 2), "utf8");
  return game;
}

export async function loadGame(id) {
  if (!/^[A-Za-z0-9_-]+$/.test(id)) return null;
  const db = await supabase();
  if (db) {
    const { data, error } = await db.from("aops_games").select("game").eq("id", id).maybeSingle();
    if (error) throw new Error(`Supabase-Spielstand konnte nicht geladen werden: ${error.message}`);
    if (data?.game) return data.game;
    // Bestehende lokale Spielstände werden beim ersten Öffnen automatisch in
    // Supabase übernommen. So gehen Abenteuer beim Umstieg nicht verloren.
    const legacyGame = await readLocalGame(id);
    if (legacyGame) await saveGame(legacyGame);
    return legacyGame;
  }
  return readLocalGame(id);
}

async function readLocalGame(id) {
  try {
    return JSON.parse(await fs.readFile(gameFile(id), "utf8"));
  } catch {
    return null;
  }
}
