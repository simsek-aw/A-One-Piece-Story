// Echtzeit-Tagestakt. Kernidee (Multiplayer-freundlich): Ein In-Game-Tag hat
// eine begrenzte Zahl "großer" Aktionen. Sind sie aufgebraucht, ist der Tag
// vorbei und der nächste Tag schaltet erst nach einem echten Cooldown frei.
// So bekommt jeder Spieler denselben ruhigen Rhythmus ("bisschen Echtzeit"),
// und ein späterer Multiplayer-Raum kann sich denselben Tages-Takt teilen.
//
// Konfiguration über Umgebungsvariablen:
//   ACTIONS_PER_DAY      (Default 1)   – so oft am Tag darf man handeln
//   DAY_COOLDOWN_SECONDS (Default 45)  – Echtzeit-Wartezeit bis zum nächsten Tag
// Für "richtig Echtzeit" den Cooldown z.B. auf 3600 (1h) oder 86400 (1 Tag) setzen.

const ACTIONS_PER_DAY = clampInt(Number(process.env.ACTIONS_PER_DAY || 1), 1, 24);
const DAY_COOLDOWN_SECONDS = clampInt(Number(process.env.DAY_COOLDOWN_SECONDS || 45), 0, 86400);

export function clockConfig() {
  return { actionsPerDay: ACTIONS_PER_DAY, cooldownSeconds: DAY_COOLDOWN_SECONDS };
}

export function initClock() {
  return {
    actionsPerDay: ACTIONS_PER_DAY,
    actionsRemaining: ACTIONS_PER_DAY,
    // Zeitstempel (ms), ab dem der nächste Tag freigeschaltet ist. null = jetzt.
    lockedUntil: null,
  };
}

function now() {
  return Date.now();
}

// Ist der Tag "aufgebraucht" und wir warten auf den Cooldown?
export function isLocked(game) {
  const c = game.world.clock;
  if (!c) return false;
  if (c.actionsRemaining > 0) return false;
  return c.lockedUntil != null && now() < c.lockedUntil;
}

// Kann der Spieler jetzt eine (aktionsverbrauchende) Handlung ausführen?
export function canAct(game) {
  ensureNewDayIfDue(game);
  return game.world.clock.actionsRemaining > 0;
}

// Falls der Cooldown abgelaufen ist, automatisch den nächsten Tag starten.
export function ensureNewDayIfDue(game) {
  const c = game.world.clock;
  if (c.actionsRemaining <= 0 && c.lockedUntil != null && now() >= c.lockedUntil) {
    game.world.day += 1;
    c.actionsRemaining = c.actionsPerDay;
    c.lockedUntil = null;
    return true;
  }
  return false;
}

// Verbraucht eine Aktion. Wirft, wenn keine mehr da ist (der Server prüft vorher).
export function consumeAction(game) {
  ensureNewDayIfDue(game);
  const c = game.world.clock;
  if (c.actionsRemaining <= 0) {
    const secs = secondsRemaining(game);
    throw new Error(
      `Für heute ist Schluss. Der nächste Tag beginnt in ${secs} Sekunden — ruh dich aus, Käpt'n.`,
    );
  }
  c.actionsRemaining -= 1;
  if (c.actionsRemaining <= 0) {
    c.lockedUntil = now() + DAY_COOLDOWN_SECONDS * 1000;
  }
}

export function secondsRemaining(game) {
  const c = game.world.clock;
  if (c.lockedUntil == null) return 0;
  return Math.max(0, Math.ceil((c.lockedUntil - now()) / 1000));
}

export function clockView(game) {
  ensureNewDayIfDue(game);
  const c = game.world.clock;
  return {
    day: game.world.day,
    actionsRemaining: c.actionsRemaining,
    actionsPerDay: c.actionsPerDay,
    locked: isLocked(game),
    secondsRemaining: secondsRemaining(game),
    cooldownSeconds: DAY_COOLDOWN_SECONDS,
  };
}

function clampInt(n, min, max) {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, Math.trunc(n)));
}
