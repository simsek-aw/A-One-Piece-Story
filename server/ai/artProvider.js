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
