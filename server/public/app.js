// Frontend-Logik (Vanilla JS, ES-Module). Redet nur über /api mit dem Server.

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
  view: null,
  clockTimer: null,
};

async function api(path, opts = {}) {
  showLoading(true);
  try {
    const res = await fetch(path, { headers: { "Content-Type": "application/json" }, ...opts });
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
  const aList = $("#archetypeList");
  aList.innerHTML = "";
  state.meta.archetypes.forEach((a) => {
    const bonus = Object.entries(a.attributeBonus).map(([k, v]) => `+${v} ${k}`).join(", ");
    const node = el("button", "option", `<div class="o-title">${a.name}</div><div class="o-sub">${a.tagline}<br><em>${bonus}</em></div>`);
    node.onclick = () => select("archetype", a.id, aList, node);
    aList.appendChild(node);
  });

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
  if (spentPoints() !== state.meta.creation.pointsToDistribute) return (err.textContent = "Bitte alle Attributpunkte verteilen.");
  try {
    const view = await api("/api/games", {
      method: "POST",
      body: JSON.stringify({
        character: { name, archetype: state.sel.archetype, attributes: state.attrs, perk: state.sel.perk },
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
  renderScene(view);
}

async function post(path, body, actionLabel) {
  $("#turnError").textContent = "";
  if (actionLabel) storyBuffer.push({ type: "action", text: "› " + actionLabel });
  try {
    const view = await api(`/api/games/${state.gameId}${path}`, { method: "POST", body: JSON.stringify(body) });
    renderScene(view);
  } catch (e) {
    $("#turnError").textContent = e.message;
    // Aktion nicht ausgeführt -> Zeile wieder entfernen
    if (actionLabel) storyBuffer.pop();
    renderScene(state.view); // nur neu zeichnen
  }
}

async function refreshView() {
  try {
    const view = await api(`/api/games/${state.gameId}`);
    renderScene(view);
  } catch {}
}

function renderScene(view) {
  if (!view) return;
  state.view = view;

  // Panel
  if (view.panel?.src) {
    $("#panelImg").src = view.panel.src;
    $("#panelImg").alt = view.panel.alt || "";
    $("#panelCaption").textContent = view.panel.caption || "";
  }

  // Story-Log (nur bei neuer Erzählung anhängen)
  if (view.scene?.narration && storyBuffer[storyBuffer.length - 1]?.text !== view.scene.narration) {
    storyBuffer.push({ type: "narration", text: view.scene.narration });
  }
  const log = $("#storyLog");
  log.innerHTML = "";
  storyBuffer.slice(-12).forEach((e, i, arr) => {
    log.appendChild(el("div", `entry ${e.type}${i === arr.length - 1 ? " latest" : ""}`, escapeHtml(e.text)));
  });
  log.lastChild?.scrollIntoView({ behavior: "smooth", block: "end" });

  // Check-Banner
  const cb = $("#checkBanner");
  if (view.lastCheck) {
    const k = view.lastCheck;
    cb.className = "check-banner " + (k.success ? "ok" : "bad");
    cb.textContent = k.teufelsfruchtSchwaeche
      ? `🌀 Teufelsfrucht-Schwäche: Du kannst nicht schwimmen — der Versuch scheitert katastrophal.`
      : `🎲 ${k.skillName}: ${k.roll} + Attr ${signed(k.attrMod)} + Rang ${k.rank}${k.dfBonus ? " + Frucht " + k.dfBonus : ""}${k.partyBonus ? " + Crew " + k.partyBonus : ""} = ${k.total} vs DC ${k.dc} → ` +
        (k.kritErfolg ? "KRITISCHER ERFOLG!" : k.kritFehler ? "KRITISCHER PATZER!" : k.success ? "Erfolg" : "Misserfolg");
    cb.classList.remove("hidden");
  } else cb.classList.add("hidden");

  if (view.lastLevelUps?.length) {
    const lvl = view.lastLevelUps.at(-1).level;
    if (storyBuffer.at(-1)?.text !== `★ Levelaufstieg! Stufe ${lvl}.`)
      storyBuffer.push({ type: "action", text: `★ Levelaufstieg! Stufe ${lvl}. Du hast einen Skillpunkt zu verteilen.` });
  }
  if (view.lastLoreUnlocks?.length) {
    view.lastLoreUnlocks.forEach((l) => {
      const note = `📜 Neue Erkenntnis: „${l.title}“`;
      if (!storyBuffer.some((e) => e.text === note)) storyBuffer.push({ type: "action", text: note });
    });
  }

  renderDayBar(view);
  renderChoices(view);
  renderRecruit(view);
  renderSidebar(view);
  renderMap(view);
  renderTravel(view);
  renderActivities(view);
  renderSkillAlloc(view);
  renderLore(view);
  renderDenDen(view);

  $("#shareLink").value = `${location.origin}${location.pathname}?game=${view.gameId}`;
  $("#freeText").value = "";
}

function locked(view) {
  return !!view.clock?.locked;
}

function renderDayBar(view) {
  const bar = $("#dayBar");
  const c = view.clock;
  clearInterval(state.clockTimer);
  if (c.locked) {
    bar.className = "day-bar locked";
    let remaining = c.secondsRemaining;
    const paint = () => {
      bar.innerHTML = `🌙 <b>Tag ${c.day} vorbei.</b> Ruh dich aus, Käpt'n — der neue Tag beginnt in <b>${remaining}s</b>.`;
    };
    paint();
    state.clockTimer = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        clearInterval(state.clockTimer);
        refreshView(); // Server startet beim Laden den neuen Tag
      } else paint();
    }, 1000);
  } else {
    bar.className = "day-bar";
    bar.innerHTML = `☀️ <b>Tag ${c.day}</b> · Aktionen heute: <b>${c.actionsRemaining}/${c.actionsPerDay}</b>`;
  }
}

function renderChoices(view) {
  const choices = $("#choices");
  choices.innerHTML = "";
  const isLocked = locked(view);
  (view.scene?.choices || []).forEach((c) => {
    const badge = c.skillCheck ? `<span class="c-check">${c.skillCheck.skill} · DC ${c.skillCheck.dc}</span>` : "";
    const node = el("button", "choice", escapeHtml(c.text) + badge);
    node.disabled = isLocked;
    node.onclick = () => post("/turn", { choiceId: c.id }, c.text);
    choices.appendChild(node);
  });
  $("#freeText").disabled = isLocked;
  $("#freeForm").querySelector("button").disabled = isLocked;
}

function renderRecruit(view) {
  const rb = $("#recruitBox");
  const rl = $("#recruitList");
  rl.innerHTML = "";
  if (view.recruitable?.length && !locked(view)) {
    view.recruitable.forEach((r) => {
      const row = el("div", "recruit-item", `<div class="r-info">${escapeHtml(r.name)} <small>${escapeHtml(r.role)} — ${escapeHtml(r.reason)}</small></div>`);
      const btn = el("button", null, "Überzeugen");
      btn.onclick = () => post("/recruit", { npcId: r.id }, `Ich versuche, ${r.name} zu rekrutieren.`);
      row.appendChild(btn);
      rl.appendChild(row);
    });
    rb.classList.remove("hidden");
  } else rb.classList.add("hidden");
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
  $("#heatBar").style.width = pct(c.heat, 100) + "%";
  $("#heatText").textContent = `${c.heat}`;

  const st = c.standing;
  $("#standing").textContent =
    st.typ === "marine_rang" ? `Marine-Rang: ${st.wert}` :
    st.typ === "ruf" ? `Ruf: ${st.wert}` : `Status: ${c.bountyTier.label}`;
  $("#bounty").innerHTML = `💰 Kopfgeld: <b>${c.bounty.toLocaleString("de-DE")} Ⓑ</b> <span class="tier t${c.bountyTier.level}">${c.bountyTier.label}</span> · Marine: ${c.heatLevel.label}`;

  $("#devilfruit").innerHTML = c.devilFruit
    ? `🍇 Teufelsfrucht: <b>${escapeHtml(c.devilFruit.name)}</b> (${c.devilFruit.type}) — <span class="warn">kann nicht schwimmen</span>`
    : "";
  $("#shipLine").innerHTML = c.ship ? `⛵ Schiff: <b>${escapeHtml(c.ship.name)}</b>` : "";

  const attrs = $("#attrs");
  attrs.innerHTML = "";
  Object.entries(c.attributes).forEach(([k, v]) => attrs.appendChild(el("div", "s-row", `<span>${k}</span><b>${v}</b>`)));

  const skills = $("#skills");
  skills.innerHTML = "";
  Object.entries(c.skills).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => {
    const prog = c.skillProgress?.[k] ? ` <small>(+${c.skillProgress[k]}/3)</small>` : "";
    skills.appendChild(el("div", "s-row", `<span>${k}</span><b>${v}${prog}</b>`));
  });
  if (!skills.children.length) skills.textContent = "—";

  const party = $("#party");
  party.innerHTML = "";
  if (view.party?.length) view.party.forEach((p) => party.appendChild(el("div", "li", `${escapeHtml(p.name)}<small>${escapeHtml(p.role)} · Loyalität ${p.loyalty ?? "?"}</small>`)));
  else party.textContent = "Noch niemand.";

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

  $("#beri").textContent = c.beri.toLocaleString("de-DE");
  const inv = $("#inventory");
  inv.innerHTML = "";
  if (c.inventory?.length) {
    c.inventory.forEach((it) => {
      const row = el("div", "li", `${escapeHtml(it.name)}${it.anzahl > 1 ? " ×" + it.anzahl : ""}`);
      if (it.kind === "teufelsfrucht" && !c.devilFruit && !locked(view)) {
        const eat = el("button", "mini", "Essen");
        eat.title = "Achtung: unumkehrbar, du kannst danach nicht mehr schwimmen!";
        eat.onclick = () => post("/eat-fruit", { fruitId: it.fruitId }, `Ich esse die ${it.name}.`);
        row.appendChild(eat);
      }
      inv.appendChild(row);
    });
  } else inv.textContent = "Leer.";
}

function renderMap(view) {
  const map = state.meta.map;
  const cur = view.locationId;
  const wrap = $("#mapWrap");
  const modeIcon = { zu_fuss: "🚶 zu Fuß", passage: "🛳️ Passagier", eigenes_schiff: "⛵ eigenes Schiff" }[view.travelMode] || view.travelMode;
  $("#travelModeLabel").textContent = modeIcon;

  const W = 260, H = 200;
  const px = (x) => (x / 100) * (W - 30) + 15;
  const py = (y) => (y / 100) * (H - 30) + 15;
  let svg = `<svg viewBox="0 0 ${W} ${H}" class="map-svg">`;
  map.edges.forEach((e) => {
    const a = map.locations.find((l) => l.id === e.from);
    const b = map.locations.find((l) => l.id === e.to);
    if (!a || !b) return;
    svg += `<line x1="${px(a.x)}" y1="${py(a.y)}" x2="${px(b.x)}" y2="${py(b.y)}" class="map-edge" />`;
  });
  map.locations.forEach((l) => {
    const isCur = l.id === cur;
    svg += `<circle cx="${px(l.x)}" cy="${py(l.y)}" r="${isCur ? 7 : 4}" class="map-node ${isCur ? "cur" : ""}" />`;
    svg += `<text x="${px(l.x)}" y="${py(l.y) - 9}" class="map-label ${isCur ? "cur" : ""}">${escapeHtml(l.name)}</text>`;
  });
  svg += `</svg>`;
  wrap.innerHTML = svg;
}

function renderTravel(view) {
  const list = $("#travelList");
  list.innerHTML = "";
  const isLocked = locked(view);
  (view.travelOptions || []).forEach((o) => {
    const cost = o.hasShip ? "eigenes Schiff" : `${o.passageCost} Ⓑ`;
    const btn = el("button", "chip", `${escapeHtml(o.name)} · ${o.days}T · ${cost}`);
    btn.disabled = isLocked || !o.affordable;
    if (!o.affordable) btn.title = "Passage zu teuer";
    btn.onclick = () => post("/travel", { destId: o.to }, `Ich reise nach ${o.name}.`);
    list.appendChild(btn);
  });
  if (!list.children.length) list.textContent = "Keine Verbindungen.";
}

function renderActivities(view) {
  const list = $("#activityList");
  list.innerHTML = "";
  const isLocked = locked(view);
  state.meta.activities.forEach((a) => {
    const btn = el("button", "chip", escapeHtml(a.name));
    btn.title = a.desc + (a.requiresLocationType ? ` (nur an: ${a.requiresLocationType.join("/")})` : "");
    btn.disabled = isLocked;
    btn.onclick = () => post("/activity", { activityId: a.id }, a.name);
    list.appendChild(btn);
  });
}

function renderSkillAlloc(view) {
  const hint = $("#skillPointsHint");
  const alloc = $("#skillAlloc");
  const points = view.character.unspentSkillPoints || 0;
  alloc.innerHTML = "";
  if (points > 0 && !locked(view)) {
    hint.textContent = `★ ${points} freie(r) Skillpunkt(e) — wähle eine Fertigkeit:`;
    hint.classList.remove("hidden");
    state.meta.creation.skills.forEach((s) => {
      const cur = view.character.skills[s.id] || 0;
      const btn = el("button", "chip", `${s.name} ${cur} →`);
      btn.onclick = () => post("/spend-skill", { skillId: s.id }, `Ich verbessere ${s.name}.`);
      alloc.appendChild(btn);
    });
    alloc.classList.remove("hidden");
  } else {
    hint.classList.add("hidden");
    alloc.classList.add("hidden");
  }
}

function renderLore(view) {
  const bar = $("#loreBar");
  const list = $("#loreList");
  const lore = view.lore || { progress: 0, unlocked: [], next: null };
  bar.textContent = lore.next
    ? `Fortschritt: ${lore.progress} · nächste Erkenntnis bei ${lore.next.threshold} (recherchiere als Bücherwurm)`
    : `Fortschritt: ${lore.progress} · alle bekannten Fragmente entschlüsselt`;
  list.innerHTML = "";
  if (lore.unlocked?.length) {
    lore.unlocked.forEach((l) => list.appendChild(el("div", "li", `<b>${escapeHtml(l.title)}</b><small>${escapeHtml(l.text)}</small>`)));
  } else {
    list.innerHTML = `<div class="hint">Noch nichts entschlüsselt. Werde zum Bücherwurm, um die Lücke zu erforschen.</div>`;
  }
}

function renderDenDen(view) {
  const dd = $("#denden");
  dd.innerHTML = "";
  const calls = view.denDen?.calls || [];
  if (calls.length) calls.slice(-6).forEach((c) => dd.appendChild(el("div", "li", `${escapeHtml(c.from)}: ${escapeHtml(c.text)}`)));
  else dd.innerHTML = `<div class="hint">Noch still. (Multiplayer-Kanal ist vorbereitet — hier erscheinen später Anrufe anderer Spieler.)</div>`;
}

$("#freeForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const text = $("#freeText").value.trim();
  if (!text || locked(state.view)) return;
  post("/turn", { freeText: text }, text);
});

// ---------- Helfer ----------
function pct(a, b) { return Math.max(0, Math.min(100, Math.round((a / (b || 1)) * 100))); }
function signed(n) { return n >= 0 ? "+" + n : "" + n; }
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
}
