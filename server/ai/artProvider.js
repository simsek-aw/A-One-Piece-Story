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
  const building = (x, y, w, h) => `<g><rect x="${x + 5}" y="${y + 6}" width="${w}" height="${h}" fill="#07101f" opacity=".35"/><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="#0d1a30" stroke="${accent}" stroke-width="2"/><path d="M${x + 8} ${y + h / 2}H${x + w - 8}M${x + w / 2} ${y + 7}V${y + h - 7}" stroke="${accent}" opacity=".45"/></g>`;
  const person = (x, y, player = false) => `<g transform="translate(${x},${y})"><ellipse rx="${player ? 15 : 10}" ry="${player ? 11 : 8}" fill="#0d1a30"/><circle r="${player ? 7 : 5}" fill="${player ? accent : "#e8eef7"}" stroke="#0d1a30" stroke-width="2"/><path d="M0 -${player ? 17 : 12} 5 -${player ? 9 : 7}H-5Z" fill="${player ? accent : "#0d1a30"}"/></g>`;
  let terrain = "";
  if (type === "hafenstadt" || type === "marinestadt") {
    terrain = `<rect x="590" width="210" height="300" fill="url(#water)"/><path d="M584 0v300" stroke="#0d1a30" stroke-width="12"/>` +
      `<g fill="#8a765a" stroke="#0d1a30" stroke-width="3"><rect x="548" y="45" width="155" height="20"/><rect x="548" y="205" width="190" height="20"/></g>` +
      building(55, 34, 125, 66) + building(225, 28, 105, 78) + building(380, 45, 120, 58) + building(90, 180, 145, 70) + building(330, 178, 150, 66) +
      `<path d="M0 140H584M285 0V300" stroke="#d6c49b" stroke-width="30" opacity=".55"/>` + person(520, 145, true) + person(430, 132) + person(548, 175);
  } else if (type === "marinevorposten") {
    terrain = `<path d="M610 0Q570 75 625 135T590 300H800V0Z" fill="url(#water)"/><path d="M610 0Q570 75 625 135T590 300" fill="none" stroke="#0d1a30" stroke-width="14"/>` +
      building(230, 62, 210, 105) + building(80, 190, 120, 62) +
      `<rect x="285" y="168" width="100" height="72" fill="none" stroke="#0d1a30" stroke-width="6" stroke-dasharray="10 7"/><path d="M335 300V240" stroke="#d6c49b" stroke-width="34" opacity=".55"/>` +
      person(335, 210, true) + person(270, 195) + person(405, 195);
  } else {
    terrain = `<path d="M0 238Q170 215 330 245T800 220V300H0Z" fill="url(#water)"/><path d="M0 238Q170 215 330 245T800 220" fill="none" stroke="#0d1a30" stroke-width="10"/>` +
      building(90, 42, 110, 68) + building(300, 55, 130, 74) + building(555, 35, 105, 65) +
      `<path d="M0 155Q210 120 390 155T800 130" fill="none" stroke="#d6c49b" stroke-width="32" opacity=".6"/>` + person(390, 150, true) + person(300, 145) + person(495, 142);
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <pattern id="ground" width="18" height="18" patternUnits="userSpaceOnUse"><rect width="18" height="18" fill="${sky}"/><circle cx="3" cy="4" r="1" fill="${accent}" opacity=".2"/></pattern>
    <pattern id="water" width="26" height="14" patternUnits="userSpaceOnUse"><rect width="26" height="14" fill="${sea}"/><path d="M0 7Q6 2 13 7T26 7" fill="none" stroke="${accent}" opacity=".35" stroke-width="2"/></pattern>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#ground)"/>
  ${terrain}
  ${night ? `<rect width="${W}" height="${H}" fill="#07101f" opacity=".38"/>` : ""}
  <g transform="translate(750,45)" opacity=".8"><circle r="25" fill="none" stroke="#f4f1ea" stroke-width="2"/><path d="M0-20 6 0 0 20-6 0Z" fill="#f4f1ea"/><text x="0" y="-29" text-anchor="middle" font-size="11" fill="#f4f1ea">N</text></g>
  <rect x="0" y="0" width="${W}" height="${H}" fill="none" stroke="#0a1424" stroke-width="8"/>
  <rect x="14" y="252" width="330" height="34" fill="#0d1a30" opacity=".9"/><text x="28" y="276" font-family="Arial Black, sans-serif" font-size="18" fill="#f4f1ea">DRAUFSICHT · ${escapeXml(name)}</text>
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
