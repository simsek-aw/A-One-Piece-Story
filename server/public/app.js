// Frontend-Logik (Vanilla JS, ES-Module). Redet nur über /api mit dem Server;
// jegliche Spiellogik liegt serverseitig.

const $ = (sel) => document.querySelector(sel);
const el = (tag, cls, html) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html != null) n.innerHTML = html;
  return n;
};

const state = {
  meta: null,
  sel: { archetype: null, perk: null, location: null },
  attrs: {},
  gameId: null,
};

async function api(path, opts = {}) {
  showLoading(true);
  try {
    const res = await fetch(path, {
      headers: { "Content-Type": "application/json" },
      ...opts,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Serverfehler");
    return data;
  } finally {
    showLoading(false);
  }
}

function showLoading(on) {
  $("#loading").classList.toggle("hidden", !on);
}

// ---------- Boot ----------
init().catch((e) => console.error(e));

async function init() {
  state.meta = await api("/api/meta");
  $("#eraLabel").textContent = state.meta.era.label;
  $("#providerBadge").textContent = "Spielleiter: " + state.meta.provider;

  // Fortsetzen, falls ?game=... in der URL steht.
  const params = new URLSearchParams(location.search);
  const existing = params.get("game");
  if (existing) {
    try {
      const view = await api(`/api/games/${existing}`);
      enterGame(view);
      return;
    } catch {
      /* fällt in die Erstellung zurück */
    }
  }
  buildCreation();
}

// ---------- Charaktererstellung ----------
function buildCreation() {
  // Archetypen
  const aList = $("#archetypeList");
  aList.innerHTML = "";
  state.meta.archetypes.forEach((a) => {
    const bonus = Object.entries(a.attributeBonus).map(([k, v]) => `+${v} ${k}`).join(", ");
    const node = el(
      "button",
      "option",
      `<div class="o-title">${a.name}</div><div class="o-sub">${a.tagline}<br><em>${bonus}</em></div>`,
    );
    node.onclick = () => select("archetype", a.id, aList, node);
    aList.appendChild(node);
  });

  // Attribute (Point-Buy)
  const c = state.meta.creation;
  state.attrs = {};
  c.attributes.forEach((attr) => (state.attrs[attr.id] = c.baseAttribute));
  const attrList = $("#attributeList");
  attrList.innerHTML = "";
  c.attributes.forEach((attr) => {
    const row = el("div", "attr-row");
    row.appendChild(el("div", "a-name", `${attr.name}<small>${attr.desc}</small>`));
    const step = el("div", "stepper");
    const minus = el("button", null, "−");
    const val = el("span", "a-val", state.attrs[attr.id]);
    const plus = el("button", null, "+");
    minus.onclick = () => changeAttr(attr.id, -1);
    plus.onclick = () => changeAttr(attr.id, +1);
    step.append(minus, val, plus);
    row.appendChild(step);
    row.dataset.attr = attr.id;
    attrList.appendChild(row);
  });
  updateAttrUI();

  // Perks
  const pList = $("#perkList");
  pList.innerHTML = "";
  const none = el("button", "option", `<div class="o-title">Keiner</div><div class="o-sub">Ohne Talent starten.</div>`);
  none.onclick = () => select("perk", null, pList, none);
  pList.appendChild(none);
  c.perks.forEach((p) => {
    const node = el("button", "option", `<div class="o-title">${p.name}</div><div class="o-sub">${p.desc}</div>`);
    node.onclick = () => select("perk", p.id, pList, node);
    pList.appendChild(node);
  });

  // Startorte
  const lList = $("#locationList");
  lList.innerHTML = "";
  state.meta.startLocations.forEach((loc) => {
    const node = el("button", "option", `<div class="o-title">${loc.name}</div><div class="o-sub">${loc.blurb}</div>`);
    node.onclick = () => select("location", loc.id, lList, node);
    lList.appendChild(node);
  });

  $("#startBtn").onclick = startGame;
}

function select(key, value, container, node) {
  state.sel[key] = value;
  [...container.children].forEach((c) => c.classList.remove("selected"));
  node.classList.add("selected");
}

function spentPoints() {
  const c = state.meta.creation;
  return Object.values(state.attrs).reduce((s, v) => s + (v - c.baseAttribute), 0);
}

function changeAttr(id, delta) {
  const c = state.meta.creation;
  const next = state.attrs[id] + delta;
  if (next < c.minAttribute || next > c.maxAttribute) return;
  if (delta > 0 && spentPoints() >= c.pointsToDistribute) return;
  state.attrs[id] = next;
  updateAttrUI();
}

function updateAttrUI() {
  const c = state.meta.creation;
  const remaining = c.pointsToDistribute - spentPoints();
  $("#pointsHint").textContent = `Verteile genau ${c.pointsToDistribute} Punkte · verbleibend: ${remaining}`;
  document.querySelectorAll(".attr-row").forEach((row) => {
    const id = row.dataset.attr;
    row.querySelector(".a-val").textContent = state.attrs[id];
    const [minus, , plus] = row.querySelectorAll("button, .a-val");
    minus.disabled = state.attrs[id] <= c.minAttribute;
    plus.disabled = state.attrs[id] >= c.maxAttribute || remaining <= 0;
  });
}

async function startGame() {
  const name = $("#charName").value.trim();
  const err = $("#createError");
  err.textContent = "";
  if (!name) return (err.textContent = "Bitte einen Namen eingeben.");
  if (!state.sel.archetype) return (err.textContent = "Bitte eine Herkunft wählen.");
  if (!state.sel.location) return (err.textContent = "Bitte einen Startort wählen.");
  if (spentPoints() !== state.meta.creation.pointsToDistribute)
    return (err.textContent = "Bitte alle Attributpunkte verteilen.");

  try {
    const view = await api("/api/games", {
      method: "POST",
      body: JSON.stringify({
        character: {
          name,
          archetype: state.sel.archetype,
          attributes: state.attrs,
          perk: state.sel.perk,
        },
        startLocationId: state.sel.location,
      }),
    });
    enterGame(view);
  } catch (e) {
    err.textContent = e.message;
  }
}

// ---------- Spiel ----------
let storyBuffer = [];

function enterGame(view) {
  state.gameId = view.gameId;
  history.replaceState(null, "", `?game=${view.gameId}`);
  $("#screen-create").classList.add("hidden");
  $("#screen-game").classList.remove("hidden");
  storyBuffer = [];
  renderScene(view, { fresh: true });
}

async function sendTurn(payload) {
  $("#turnError").textContent = "";
  try {
    const view = await api(`/api/games/${state.gameId}/turn`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    renderScene(view);
  } catch (e) {
    $("#turnError").textContent = e.message;
  }
}

async function doRecruit(npcId) {
  $("#turnError").textContent = "";
  try {
    const view = await api(`/api/games/${state.gameId}/recruit`, {
      method: "POST",
      body: JSON.stringify({ npcId }),
    });
    renderScene(view);
  } catch (e) {
    $("#turnError").textContent = e.message;
  }
}

function renderScene(view, { fresh } = {}) {
  // Story-Log: aktuelle Erzählung anhängen.
  if (view.scene?.narration) {
    storyBuffer.push({ type: "narration", text: view.scene.narration });
  }
  const log = $("#storyLog");
  log.innerHTML = "";
  storyBuffer.slice(-12).forEach((e, i, arr) => {
    const node = el("div", `entry ${e.type}${i === arr.length - 1 ? " latest" : ""}`, escapeHtml(e.text));
    log.appendChild(node);
  });
  log.lastChild?.scrollIntoView({ behavior: "smooth", block: "end" });

  // Check-Banner
  const cb = $("#checkBanner");
  if (view.lastCheck) {
    const k = view.lastCheck;
    cb.className = "check-banner " + (k.success ? "ok" : "bad");
    cb.textContent =
      `🎲 ${k.skillName}: Wurf ${k.roll} + Attribut ${signed(k.attrMod)} + Rang ${k.rank} = ${k.total} gegen DC ${k.dc} → ` +
      (k.kritErfolg ? "KRITISCHER ERFOLG!" : k.kritFehler ? "KRITISCHER PATZER!" : k.success ? "Erfolg" : "Misserfolg");
    cb.classList.remove("hidden");
  } else {
    cb.classList.add("hidden");
  }

  // Level-Ups
  if (view.lastLevelUps?.length) {
    storyBuffer.push({ type: "action", text: `★ Levelaufstieg! Du bist jetzt Stufe ${view.lastLevelUps.at(-1).level}.` });
  }

  // Auswahlmöglichkeiten
  const choices = $("#choices");
  choices.innerHTML = "";
  (view.scene?.choices || []).forEach((c) => {
    const badge = c.skillCheck ? `<span class="c-check">${c.skillCheck.skill} · DC ${c.skillCheck.dc}</span>` : "";
    const node = el("button", "choice", escapeHtml(c.text) + badge);
    node.onclick = () => {
      storyBuffer.push({ type: "action", text: "› " + c.text });
      sendTurn({ choiceId: c.id });
    };
    choices.appendChild(node);
  });

  // Rekrutierung
  const rb = $("#recruitBox");
  const rl = $("#recruitList");
  rl.innerHTML = "";
  if (view.recruitable?.length) {
    view.recruitable.forEach((r) => {
      const row = el("div", "recruit-item", `<div class="r-info">${escapeHtml(r.name)} <small>${escapeHtml(r.role)} — ${escapeHtml(r.reason)}</small></div>`);
      const btn = el("button", null, "Überzeugen");
      btn.onclick = () => {
        storyBuffer.push({ type: "action", text: `› Ich versuche, ${r.name} zu rekrutieren.` });
        doRecruit(r.id);
      };
      row.appendChild(btn);
      rl.appendChild(row);
    });
    rb.classList.remove("hidden");
  } else {
    rb.classList.add("hidden");
  }

  renderSidebar(view);

  $("#shareLink").value = `${location.origin}${location.pathname}?game=${view.gameId}`;
  $("#freeText").value = "";
}

function renderSidebar(view) {
  const c = view.character;
  $("#charTitle").textContent = `${c.name} · Lvl ${c.level}`;
  $("#charDay").textContent = `Tag ${view.day} · ${view.location}`;

  $("#hpBar").style.width = pct(c.hp, c.maxHp) + "%";
  $("#hpText").textContent = `${c.hp}/${c.maxHp}`;
  const xpNext = 100 * c.level;
  $("#xpBar").style.width = pct(c.xp, xpNext) + "%";
  $("#xpText").textContent = `${c.xp}/${xpNext}`;

  const st = c.standing;
  $("#standing").textContent =
    st.typ === "marine_rang" ? `Marine-Rang: ${st.wert}` :
    st.typ === "kopfgeld" ? `Kopfgeld: ${st.kopfgeld} Ⓑ (${st.wert})` :
    `Ruf: ${st.wert}`;

  const attrs = $("#attrs");
  attrs.innerHTML = "";
  Object.entries(c.attributes).forEach(([k, v]) => {
    attrs.appendChild(el("div", "s-row", `<span>${k}</span><b>${v}</b>`));
  });

  const skills = $("#skills");
  skills.innerHTML = "";
  Object.entries(c.skills).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => {
    skills.appendChild(el("div", "s-row", `<span>${k}</span><b>${v}</b>`));
  });
  if (!skills.children.length) skills.textContent = "—";

  const party = $("#party");
  party.innerHTML = "";
  if (view.party?.length) {
    view.party.forEach((p) => party.appendChild(el("div", "li", `${escapeHtml(p.name)}<small>${escapeHtml(p.role)} · Loyalität ${p.loyalty ?? "?"}</small>`)));
  } else party.textContent = "Noch niemand.";

  const mem = $("#memory");
  mem.innerHTML = "";
  const npcs = view.memory?.npcs || [];
  if (npcs.length) {
    npcs.slice(0, 12).forEach((n) => {
      const disp = n.gesinnung > 20 ? "friend" : n.gesinnung < -20 ? "foe" : "neutral";
      const note = n.letzteNotizen?.length ? n.letzteNotizen.at(-1) : "";
      mem.appendChild(el("div", "li", `${escapeHtml(n.name)} <span class="disp ${disp}">${n.gesinnung}</span><small>${escapeHtml(n.role || "")}${note ? " — " + escapeHtml(note) : ""}</small>`));
    });
  } else mem.textContent = "Noch keine Bekanntschaften.";

  $("#beri").textContent = c.beri;
  const inv = $("#inventory");
  inv.innerHTML = "";
  if (c.inventory?.length) {
    c.inventory.forEach((it) => inv.appendChild(el("div", "li", `${escapeHtml(it.name)}${it.anzahl > 1 ? " ×" + it.anzahl : ""}`)));
  } else inv.textContent = "Leer.";
}

$("#freeForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const text = $("#freeText").value.trim();
  if (!text) return;
  storyBuffer.push({ type: "action", text: "› " + text });
  sendTurn({ freeText: text });
});

// ---------- Helfer ----------
function pct(a, b) { return Math.max(0, Math.min(100, Math.round((a / (b || 1)) * 100))); }
function signed(n) { return n >= 0 ? "+" + n : "" + n; }
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
}
