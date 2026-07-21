// Anime-Panel-Slot. Jedes "Kapitel"/jede Szene bekommt ein grobes Panel, damit
// man sieht, wo man ist. JETZT: eine deterministische Platzhalter-Grafik (inline
// SVG, kein externer Request, funktioniert offline). SPÄTER: echte KI-Bilder
// einsteckbar, indem man diese Funktion durch einen Aufruf an eine Bild-API
// ersetzt (z. B. mit Caching pro Ort/Szene). Signatur bleibt dann gleich:
//   panelFor(game) -> { kind, src, caption, alt }
//
// So bleibt der Rest des Spiels unverändert, wenn echte Panels dazukommen.

import { LOCATIONS } from "../content/map.js";

// Farbpaletten je Ortstyp (Himmel oben, Meer/Boden unten, Akzent).
const PALETTES = {
  hafenstadt: ["#2b4b7a", "#1c3358", "#f4b942"],
  marinestadt: ["#3a5a86", "#22406a", "#e8eef7"],
  marinevorposten: ["#4a5a6a", "#2b3947", "#c7d3e0"],
  dorf: ["#3f6a86", "#255066", "#f0c46a"],
  default: ["#2b4b7a", "#1c3358", "#f4b942"],
};

export function panelFor(game) {
  const loc = LOCATIONS[game.world.location];
  const type = loc?.type || "default";
  const [sky, sea, accent] = PALETTES[type] || PALETTES.default;
  const day = game.world.day;
  const night = day % 4 === 0; // gelegentlich Nachtszene
  const svg = buildSvg({ sky, sea, accent, night, type, name: loc?.name || game.world.locationName });
  const src = "data:image/svg+xml;utf8," + encodeURIComponent(svg);
  return {
    kind: "placeholder-svg",
    src,
    alt: `Panel: ${loc?.name || game.world.locationName}`,
    caption: `${loc?.name || game.world.locationName} · Tag ${day}`,
  };
}

function buildSvg({ sky, sea, accent, night, type, name }) {
  const W = 800, H = 300;
  const celest = night
    ? `<circle cx="650" cy="70" r="26" fill="#e8eef7" opacity="0.9"/><circle cx="662" cy="64" r="22" fill="${sky}"/>`
    : `<circle cx="650" cy="70" r="34" fill="${accent}" opacity="0.9"/>`;

  // grobe Silhouette je nach Ortstyp
  let silhouette = "";
  if (type === "hafenstadt" || type === "marinestadt") {
    silhouette = `
      <rect x="80" y="150" width="90" height="90" fill="#0d1a30"/>
      <rect x="200" y="120" width="70" height="120" fill="#0d1a30"/>
      <rect x="300" y="160" width="110" height="80" fill="#0d1a30"/>
      <polygon points="470,240 520,120 570,240" fill="#0d1a30"/>
      <rect x="600" y="170" width="80" height="70" fill="#0d1a30"/>`;
  } else if (type === "marinevorposten") {
    silhouette = `
      <polygon points="120,240 160,110 200,240" fill="#0d1a30"/>
      <rect x="300" y="150" width="120" height="90" fill="#0d1a30"/>
      <polygon points="500,240 560,90 620,240" fill="#0d1a30"/>`;
  } else {
    silhouette = `
      <polygon points="120,240 170,150 220,240" fill="#0d1a30"/>
      <rect x="280" y="180" width="80" height="60" fill="#0d1a30"/>
      <polygon points="430,240 480,160 530,240" fill="#0d1a30"/>
      <rect x="600" y="190" width="70" height="50" fill="#0d1a30"/>`;
  }

  // kleines Schiff auf dem Wasser
  const ship = `<g opacity="0.85"><polygon points="120,268 190,268 175,285 135,285" fill="#0d1a30"/><line x1="155" y1="240" x2="155" y2="268" stroke="#0d1a30" stroke-width="3"/><polygon points="155,244 185,262 155,262" fill="${accent}"/></g>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="skyG" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${sky}"/>
      <stop offset="100%" stop-color="${night ? "#0b1526" : sky}"/>
    </linearGradient>
    <linearGradient id="seaG" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${sea}"/>
      <stop offset="100%" stop-color="#0a1424"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#skyG)"/>
  ${celest}
  ${silhouette}
  <rect y="250" width="${W}" height="50" fill="url(#seaG)"/>
  ${ship}
  <rect x="0" y="0" width="${W}" height="${H}" fill="none" stroke="#0a1424" stroke-width="8"/>
  <text x="24" y="285" font-family="Georgia, serif" font-size="22" fill="#f4f1ea" opacity="0.92">${escapeXml(name)}</text>
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
    `<g transform="translate(${x},${140}) scale(${s})"><circle cx="0" cy="-46" r="16" fill="${fill}"/><rect x="-16" y="-30" width="32" height="60" rx="8" fill="${fill}"/></g>`;

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
