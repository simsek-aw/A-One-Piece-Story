// Tageszeit-System (immersiv statt "1 Aktion/Tag"). Ein In-Game-Tag läuft über
// eine Uhr (Stunden). Aktionen kosten Zeit; man kann viele kleine Dinge am Tag
// tun (Gespräche etc.), während größere Aktivitäten Stunden fressen. Wird es zu
// spät, muss man rasten (Schlafplatz suchen) — das startet den nächsten Tag.
//
// Zeitabhängigkeit: manche Aktivitäten gehen nur tagsüber (Dojo, Arbeit) oder
// nur nachts (Unterwelt) — siehe content/activities.js + engine/progression.js.
//
// Optionaler Echtzeit-Takt (Multiplayer-freundlich): DAY_COOLDOWN_SECONDS>0
// sperrt den nächsten Tag nach dem Rasten für eine echte Wartezeit. Default 0
// (kein Zwang), damit Solo-Spiel flüssig bleibt.

const DAY_START_HOUR = Number(process.env.DAY_START_HOUR || 7);
const REST_REQUIRED_HOUR = 25; // ab 01:00 nachts muss gerastet werden
const DAY_COOLDOWN_SECONDS = clampInt(Number(process.env.DAY_COOLDOWN_SECONDS || 0), 0, 86400);

const PHASES = [
  { id: "morgen", label: "Morgen", emoji: "🌅" },
  { id: "mittag", label: "Mittag", emoji: "☀️" },
  { id: "nachmittag", label: "Nachmittag", emoji: "🌇" },
  { id: "abend", label: "Abend", emoji: "🌆" },
  { id: "nacht", label: "Nacht", emoji: "🌙" },
];

export function clockConfig() {
  return { dayStartHour: DAY_START_HOUR, cooldownSeconds: DAY_COOLDOWN_SECONDS };
}

export function initClock() {
  return { hour: DAY_START_HOUR, lockedUntil: null };
}

export function phaseFor(hour) {
  const h = ((hour % 24) + 24) % 24;
  if (h >= 5 && h < 11) return PHASES[0];
  if (h >= 11 && h < 15) return PHASES[1];
  if (h >= 15 && h < 18) return PHASES[2];
  if (h >= 18 && h < 22) return PHASES[3];
  return PHASES[4]; // Nacht
}

export function phaseId(game) {
  return phaseFor(game.world.clock.hour).id;
}

export function isNight(game) {
  return phaseId(game) === "nacht";
}

// Zeit im Tag voranschreiten lassen.
export function advanceTime(game, hours) {
  game.world.clock.hour += Math.max(0, hours || 0);
}

// Zu spät, um noch aktiv zu sein? -> rasten nötig.
export function mustRest(game) {
  return game.world.clock.hour >= REST_REQUIRED_HOUR;
}

// Echtzeit-Sperre (falls DAY_COOLDOWN_SECONDS gesetzt) nach dem Rasten aktiv?
export function isLocked(game) {
  const c = game.world.clock;
  return c.lockedUntil != null && now() < c.lockedUntil;
}

export function secondsRemaining(game) {
  const c = game.world.clock;
  if (c.lockedUntil == null) return 0;
  return Math.max(0, Math.ceil((c.lockedUntil - now()) / 1000));
}

// Kann der Spieler jetzt eine zeitkostende Aktion ausführen?
export function canAct(game) {
  return !isLocked(game) && !mustRest(game);
}

// Neuen Tag starten (durch Rasten oder Reise). Setzt Uhr auf Morgen, ggf.
// Echtzeit-Sperre. Der Aufrufer kümmert sich um Heilung/Heat-Abklang.
export function startNewDay(game, { extraDays = 0 } = {}) {
  game.world.day += 1 + Math.max(0, extraDays);
  game.world.clock.hour = DAY_START_HOUR;
  game.world.clock.lockedUntil = DAY_COOLDOWN_SECONDS > 0 ? now() + DAY_COOLDOWN_SECONDS * 1000 : null;
}

// Uhr auf den Morgen setzen (z. B. Ankunft nach einer Reise am nächsten Tag).
export function setMorning(game) {
  game.world.clock.hour = DAY_START_HOUR;
  game.world.clock.lockedUntil = null;
}

export function hourLabel(hour) {
  const h = Math.floor(((hour % 24) + 24) % 24);
  const m = Math.round((hour - Math.floor(hour)) * 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function clockView(game) {
  const c = game.world.clock;
  const ph = phaseFor(c.hour);
  return {
    day: game.world.day,
    hour: c.hour,
    hourLabel: hourLabel(c.hour),
    phase: ph.id,
    phaseLabel: ph.label,
    phaseEmoji: ph.emoji,
    isNight: ph.id === "nacht",
    mustRest: mustRest(game),
    locked: isLocked(game),
    secondsRemaining: secondsRemaining(game),
    cooldownSeconds: DAY_COOLDOWN_SECONDS,
  };
}

function now() {
  return Date.now();
}
function clampInt(n, min, max) {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, Math.trunc(n)));
}
