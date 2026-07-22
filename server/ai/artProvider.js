// Szenen-Panel-Slot: "Retro-Modus" — der aktuelle Schauplatz wird als
// waschechtes 8-Bit-Panel gezeigt, wie ein altes monochromes Taschenspiel
// (Game-Boy-Auflösung 160×144, 4-Ton-Grün-Palette, blockige Pixel statt
// Kurven). Deterministisch, kein externer Bild-Request, kein API-Kontingent
// nötig — und bewusst NICHT durch echte KI-Bilder ersetzbar: das Retro-Panel
// IST der Stil, keine Übergangslösung. Für dramatische Schlüsselmomente
// (Duell, Explosion, …) bleibt momentPanel() im Tusche-Manga-Look, als
// bewusster Kontrast zum ruhigen 8-Bit-Erkunden.
//
// Signatur bleibt kompatibel: panelFor(game) -> { kind, src, caption, alt }

import { LOCATIONS } from "../content/map.js";
import { isNight } from "../engine/clock.js";

// Original-DMG-Game-Boy-Palette (dunkelstes zu hellstes Grün).
const GB = { darkest: "#0f380f", dark: "#306230", light: "#8bac0f", lightest: "#9bbc0f" };
const PX = 4; // Pixelraster-Einheit (px pro "8-Bit-Pixel")
const COLS = 40, ROWS = 36; // 40*4 x 36*4 = 160x144 (klassische GB-Auflösung)
const W = COLS * PX, H = ROWS * PX;

export function panelFor(game) {
  const loc = LOCATIONS[game.world.location];
  const type = loc?.type || "default";
  const night = isNight(game);
  const name = loc?.name || game.world.locationName;
  const svg = buildPixelScene({ type, night, day: game.world.day, name });
  const src = "data:image/svg+xml;utf8," + encodeURIComponent(svg);
  return {
    kind: "retro-8bit",
    src,
    alt: `8-Bit-Ansicht: ${name}`,
    caption: `${name} · Tag ${game.world.day} · 🎮 Retro-Modus`,
  };
}

// Zeichnet ein Rechteck im Pixelraster (Koordinaten in Raster-Einheiten, nicht px).
function px(gx, gy, gw, gh, color) {
  return `<rect x="${gx * PX}" y="${gy * PX}" width="${gw * PX}" height="${gh * PX}" fill="${color}"/>`;
}

// Blockiger kleiner Sprite (Spieler oder NPC), 2x3 Raster-Einheiten, ein
// durchgängiger Kontrastton (kein zweiter Kopf-Ton, der mit dem Boden verschmilzt).
function sprite(gx, gy, color) {
  return (
    px(gx, gy, 2, 1, color) + // Kopf
    px(gx, gy + 1, 2, 1, color) + // Rumpf
    px(gx, gy + 2, 1, 1, color) + // Bein links
    px(gx + 1, gy + 2, 1, 1, color) // Bein rechts
  );
}

function buildPixelScene({ type, night, day, name }) {
  const sky = night ? GB.darkest : GB.lightest;
  const mid = night ? GB.dark : GB.light;
  const ink = night ? GB.light : GB.darkest;
  const groundY = 24;
  let scene = "";

  // Himmelsdetails: Sonne/Mond + ein paar "Wolken"/Sterne aus Blöcken.
  scene += night
    ? px(33, 3, 2, 2, mid) + [6, 12, 20, 27].map((x, i) => px(x, 2 + (i % 2), 1, 1, mid)).join("")
    : px(33, 3, 3, 3, mid) + px(4, 5, 4, 1, mid) + px(18, 3, 5, 1, mid);

  // Bodentextur: ein Rasterpunkt-Muster für etwas "Retro-Grain". "ink"
  // kontrastiert gegen den "mid"-Boden in Tag- UND Nachtpalette gleichermaßen.
  // Zuerst gezeichnet, damit Gebäude/Figur später sauber darüber liegen.
  let groundTexture = "";
  for (let x = 1; x < COLS; x += 3) groundTexture += px(x, groundY + 1, 1, 1, ink);

  if (type === "hafenstadt" || type === "marinestadt" || type === "marinevorposten") {
    // Wasser rechts, Kai/Stege, ein Schiffsmast, Häuserblöcke links.
    scene += px(0, groundY, COLS, ROWS - groundY, mid) + groundTexture; // Boden
    scene += px(26, groundY, COLS - 26, ROWS - groundY, ink); // Wasser
    scene += px(24, groundY, 2, ROWS - groundY, mid); // Kai-Kante
    scene += px(29, groundY - 6, 1, 6, ink) + px(28, groundY - 7, 3, 1, ink); // Mast + Flagge
    scene += type === "marinevorposten"
      ? px(3, groundY - 9, 7, 9, ink) + px(5, groundY - 12, 3, 3, ink) // Wachturm
      : px(3, groundY - 7, 6, 7, ink) + px(11, groundY - 9, 6, 9, ink) + px(19, groundY - 6, 5, 6, ink); // Häuserzeile
    scene += px(6, groundY - 8, 2, 1, sky) + px(14, groundY - 10, 2, 1, sky); // Fenster
    // Auf offenem Boden stehen (nicht vor einer Hauswand), sonst verschmilzt
    // die Figur farblich mit der Silhouette dahinter.
    scene += sprite(1, groundY, ink);
  } else {
    // Dorf: Wiese, ein paar Hütten, Windmühle-Silhouette (One-Piece-Dörfer-Vibe).
    scene += px(0, groundY, COLS, ROWS - groundY, mid) + groundTexture; // Wiese
    scene += px(3, groundY - 6, 6, 6, ink) + px(12, groundY - 8, 5, 8, ink); // Hütten
    scene += px(24, groundY - 13, 1, 13, ink) + px(21, groundY - 16, 7, 4, ink); // Windmühlen-Flügel
    scene += px(6, groundY - 7, 2, 1, sky); // Fenster
    scene += sprite(18, groundY, ink); // Lücke zwischen Hütte und Windmühle
  }

  const label = String(name).toUpperCase();
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" shape-rendering="crispEdges">
  <rect width="${W}" height="${H}" fill="${sky}"/>
  ${scene}
  <rect x="0" y="0" width="${W}" height="9" fill="${GB.darkest}"/>
  <text x="4" y="7" font-family="monospace" font-size="6" letter-spacing="1" fill="${GB.lightest}">${escapeXml(label.slice(0, 24))} · TAG ${day}</text>
  <rect x="0" y="0" width="${W}" height="${H}" fill="none" stroke="${GB.darkest}" stroke-width="${PX}"/>
</svg>`;
}

function escapeXml(s) {
  return String(s).replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[c]));
}

// --- Key-Moment-Panels ("Manga-Panel" für Schlüsselmomente) ---
// JETZT: stilisierte, moment-typische Platzhalter-SVGs. SPÄTER: echte KI-Bilder
// einsteckbar (gleiche Signatur: momentPanel(kind, caption) -> { kind, src, caption }).

const MOMENT_KINDS = {
  ankunft: { bg: "#243b5e", fg: "#f4b942", label: "Ankunft" },
  spannung: { bg: "#3a2b4a", fg: "#f4b942", label: "Spannung" },
  explosion: { bg: "#5a2410", fg: "#ffb347", label: "Explosion" },
  duell: { bg: "#2b1f2b", fg: "#e2603f", label: "Duell" },
  crew: { bg: "#1e3a4a", fg: "#4fd18b", label: "Crew" },
  enthuellung: { bg: "#1b2c4d", fg: "#8fd0ff", label: "Enthüllung" },
  nacht: { bg: "#0d1526", fg: "#c7d3e0", label: "Nacht" },
  see: { bg: "#123", fg: "#4a8bd6", label: "See" },
  sieg: { bg: "#243b2e", fg: "#f4b942", label: "Sieg" },
};

export const MOMENT_KIND_IDS = Object.keys(MOMENT_KINDS);

export function momentPanel(kind, caption) {
  const k = MOMENT_KINDS[kind] || MOMENT_KINDS.spannung;
  const svg = buildMomentSvg(kind, k, caption);
  return { kind, src: "data:image/svg+xml;utf8," + encodeURIComponent(svg), caption: caption || k.label };
}

function buildMomentSvg(kind, k, caption) {
  const W = 800, H = 280;
  let art = "";
  const fig = (x, s = 1, fill = "#0d1a30") =>
    `<g transform="translate(${x},${140}) scale(${s})"><ellipse rx="24" ry="17" fill="${fill}"/><circle r="12" fill="${k.fg}" stroke="${fill}" stroke-width="5"/><path d="M0-34 10-17H-10Z" fill="${fill}"/></g>`;

  if (kind === "explosion") {
    art = `<g transform="translate(560,120)">` +
      Array.from({ length: 16 }).map((_, i) => { const a = (i / 16) * Math.PI * 2; const r1 = 30, r2 = 95 + (i % 3) * 18; return `<line x1="${Math.cos(a) * r1}" y1="${Math.sin(a) * r1}" x2="${Math.cos(a) * r2}" y2="${Math.sin(a) * r2}" stroke="${k.fg}" stroke-width="6"/>`; }).join("") +
      `<circle r="34" fill="#fff2c0"/><circle r="20" fill="#fff"/></g>` + fig(180, 1.1);
  } else if (kind === "duell") {
    art = fig(240, 1.2) + fig(560, 1.2) +
      `<line x1="300" y1="120" x2="500" y2="150" stroke="${k.fg}" stroke-width="5"/>` +
      `<line x1="300" y1="150" x2="500" y2="120" stroke="${k.fg}" stroke-width="5"/>`;
  } else if (kind === "crew") {
    art = [180, 300, 420, 540, 640].map((x, i) => fig(x, 0.9 + (i % 2) * 0.2)).join("") +
      `<line x1="640" y1="94" x2="640" y2="40" stroke="#0d1a30" stroke-width="4"/><polygon points="640,44 700,58 640,72" fill="${k.fg}"/>`;
  } else if (kind === "spannung") {
    // "Alle schauen in deine Richtung": konvergierende Blicklinien auf eine Figur.
    art = fig(400, 1.3, "#0d1a30") +
      Array.from({ length: 10 }).map((_, i) => { const x = 40 + i * 78; if (Math.abs(x - 400) < 60) return ""; return `<line x1="${x}" y1="60" x2="400" y2="120" stroke="${k.fg}" stroke-width="1.5" opacity="0.5"/>` + fig(x, 0.5, "#22314d"); }).join("");
  } else if (kind === "enthuellung") {
    art = `<g transform="translate(400,140)"><rect x="-70" y="-70" width="140" height="140" rx="8" fill="#0d1a30" stroke="${k.fg}" stroke-width="3"/>` +
      Array.from({ length: 6 }).map((_, i) => `<line x1="-50" y1="${-40 + i * 18}" x2="50" y2="${-40 + i * 18}" stroke="${k.fg}" stroke-width="2" opacity="0.7"/>`).join("") +
      `<circle r="120" fill="none" stroke="${k.fg}" stroke-width="1" opacity="0.3"/></g>`;
  } else if (kind === "nacht") {
    art = `<circle cx="640" cy="80" r="30" fill="${k.fg}" opacity="0.9"/><circle cx="652" cy="72" r="26" fill="${k.bg}"/>` +
      Array.from({ length: 20 }).map((_, i) => `<circle cx="${(i * 137) % W}" cy="${(i * 53) % 160 + 20}" r="1.6" fill="#fff" opacity="0.7"/>`).join("") + fig(360, 1);
  } else if (kind === "see") {
    art = `<path d="M0,190 Q200,160 400,190 T800,190 V280 H0 Z" fill="${k.fg}" opacity="0.5"/>` +
      `<g transform="translate(400,150)"><polygon points="-40,40 40,40 30,60 -30,60" fill="#0d1a30"/><line x1="0" y1="-20" x2="0" y2="40" stroke="#0d1a30" stroke-width="4"/><polygon points="0,-16 45,30 0,30" fill="${k.fg}"/></g>`;
  } else if (kind === "sieg") {
    art = `<g transform="translate(400,150)"><circle cx="0" cy="-56" r="18" fill="#0d1a30"/><rect x="-18" y="-38" width="36" height="66" rx="9" fill="#0d1a30"/><line x1="14" y1="-30" x2="46" y2="-70" stroke="#0d1a30" stroke-width="8"/></g>` +
      Array.from({ length: 12 }).map((_, i) => { const a = (i / 12) * Math.PI * 2; return `<line x1="400" y1="90" x2="${400 + Math.cos(a) * 120}" y2="${90 + Math.sin(a) * 120}" stroke="${k.fg}" stroke-width="2" opacity="0.4"/>`; }).join("");
  } else { // ankunft / default
    art = `<rect x="330" y="70" width="140" height="150" rx="6" fill="#0d1a30"/><rect x="360" y="110" width="80" height="110" fill="${k.bg}" stroke="${k.fg}" stroke-width="2"/>` + fig(400, 1.05);
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="${k.bg}"/>
  ${art}
  <rect x="0" y="0" width="${W}" height="${H}" fill="none" stroke="#0a1424" stroke-width="10"/>
  <rect x="14" y="14" width="${W - 28}" height="${H - 28}" fill="none" stroke="${k.fg}" stroke-width="2" opacity="0.5"/>
  <text x="28" y="${H - 24}" font-family="Georgia, serif" font-style="italic" font-size="20" fill="#f4f1ea">${escapeXml(caption || k.label)}</text>
</svg>`;
}
