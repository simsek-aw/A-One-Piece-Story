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
  combatTarget: null,
};
const SAVE_SLOTS_KEY = "aops-save-slots";

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
  const aHint = $("#appearanceHint");
  if (aHint) aHint.textContent = state.meta.imagesEnabled
    ? "✎ Bildgenerierung ist aktiv — dein Porträt wird beim Spielstart gezeichnet."
    : "ℹ️ Bildgenerierung ist derzeit aus; die Beschreibung wird gespeichert und der Spielleiter bezieht sie ein.";

  const params = new URLSearchParams(location.search);
  const existing = params.get("game");
  if (existing) {
    try {
      // Ein geteilter Link landet ebenfalls erst in der Charakterauswahl.
      // So kann man bewusst entscheiden, welches Abenteuer geöffnet wird.
      rememberCharacter(await api(`/api/games/${existing}`));
    } catch {
      /* ungültiger Link: Auswahl bleibt trotzdem verfügbar */
    }
  }
  buildCreation();
  renderSavedCharacters();
  $("#newCharacterBtn").onclick = () => $("#characterOverlay").classList.add("hidden");
  $("#backToCharacters").onclick = () => $("#characterOverlay").classList.remove("hidden");
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
        character: { name, archetype: state.sel.archetype, attributes: state.attrs, perk: state.sel.perk, appearance: $("#charAppearance")?.value.trim() || "" },
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
  rememberCharacter(view);
  $("#characterOverlay").classList.add("hidden");
  history.replaceState(null, "", `?game=${view.gameId}`);
  $("#screen-create").classList.add("hidden");
  $("#screen-game").classList.remove("hidden");
  storyBuffer = [];
  renderScene(view);
}

function readSaveSlots() {
  try {
    const slots = JSON.parse(localStorage.getItem(SAVE_SLOTS_KEY) || "[]");
    return Array.isArray(slots) ? slots : [];
  } catch {
    return [];
  }
}

function writeSaveSlots(slots) {
  try { localStorage.setItem(SAVE_SLOTS_KEY, JSON.stringify(slots.slice(0, 12))); } catch { /* Speicher ist optional */ }
}

function rememberCharacter(view) {
  const c = view.character;
  if (!view.gameId || !c?.name) return;
  const slot = { id: view.gameId, name: c.name, archetype: c.archetype, level: c.level, location: view.location, savedAt: Date.now() };
  const slots = readSaveSlots().filter((entry) => entry.id !== slot.id);
  slots.unshift(slot);
  writeSaveSlots(slots);
}

function renderSavedCharacters() {
  const list = $("#savedCharacterList");
  const empty = $("#noSavedCharacters");
  if (!list) return;
  const slots = readSaveSlots();
  list.innerHTML = "";
  if (empty) empty.classList.toggle("hidden", slots.length > 0);
  slots.forEach((slot) => {
    const row = el("div", "save-slot", `<div><strong>${escapeHtml(slot.name)}</strong><small>${escapeHtml(slot.archetype || "Abenteurer")} · Stufe ${slot.level || 1} · ${escapeHtml(slot.location || "unbekannter Ort")}</small></div>`);
    const actions = el("div", "save-slot-actions");
    const load = el("button", "primary", "Fortsetzen");
    load.onclick = async () => {
      try { enterGame(await api(`/api/games/${slot.id}`)); }
      catch (error) {
        // Nicht sofort aus der Auswahl entfernen: Ein temporärer Datenbank-
        // oder Deploy-Fehler darf keinen bekannten Charakter verschwinden lassen.
        $("#createError").textContent = "Dieser Spielstand ist auf dem Server derzeit nicht verfügbar. Prüfe Supabase-Konfiguration und Tabelle; alte Render-Spielstände vor Supabase können nach einem Neustart leider verloren sein.";
      }
    };
    const forget = el("button", "slot-forget", "Aus Liste entfernen");
    forget.onclick = () => { writeSaveSlots(readSaveSlots().filter((entry) => entry.id !== slot.id)); renderSavedCharacters(); };
    actions.append(load, forget);
    row.appendChild(actions);
    list.appendChild(row);
  });
}

async function post(path, body, actionLabel) {
  $("#turnError").textContent = "";
  closeDrawer(); // auf Mobil: Menü schließen, damit man die Szene sieht
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

  // Panel (SVG sofort; echtes KI-Bild wird bei Bedarf nachgeladen)
  if (view.panel?.src) {
    $("#panelImg").src = view.panel.src;
    $("#panelImg").alt = view.panel.alt || "";
    $("#panelCaption").textContent = view.panel.caption || "";
    upgradePanel($("#panelImg"), { scope: "scene" }, "s:" + view.locationId);
  }

  // Story-Log (nur bei neuer Erzählung anhängen; Rendering weiter unten)
  if (view.scene?.narration && storyBuffer[storyBuffer.length - 1]?.text !== view.scene.narration) {
    storyBuffer.push({ type: "narration", text: view.scene.narration });
  }

  // Check-Banner
  const cb = $("#checkBanner");
  if (view.lastCheck) {
    const k = view.lastCheck;
    cb.className = "check-banner " + (k.success ? "ok" : "bad");
    cb.textContent = k.teufelsfruchtSchwaeche
      ? `🌀 Teufelsfrucht-Schwäche: Du kannst nicht schwimmen — der Versuch scheitert katastrophal.`
      : `🎲 ${k.skillName}: ${k.roll} + Attr ${signed(k.attrMod)} + Rang ${k.rank}${k.dfBonus ? " + Frucht " + k.dfBonus : ""}${k.partyBonus ? " + Crew " + k.partyBonus : ""}${k.hakiBonus ? " + Haki " + k.hakiBonus : ""} = ${k.total} vs DC ${k.dc} → ` +
        (k.kritErfolg ? "KRITISCHER ERFOLG!" : k.kritFehler ? "KRITISCHER PATZER!" : k.success ? "Erfolg" : "Misserfolg");
    cb.classList.remove("hidden");
  } else cb.classList.add("hidden");

  renderConsequences(view);

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
  if (view.lastHakiUnlocks?.length) {
    view.lastHakiUnlocks.forEach((h) => {
      const note = `🌀 Dein Haki erwacht: ${h.name}!`;
      if (!storyBuffer.some((e) => e.text === note)) storyBuffer.push({ type: "action", text: note });
    });
  }

  if (view.news?.fresh) {
    const note = `🗞️ Die News-Möwe bringt die Tagesausgabe (Tag ${view.news.day}).`;
    if (!storyBuffer.some((e) => e.text === note)) storyBuffer.push({ type: "action", text: note });
  }

  // Story-Log rendern (nachdem alle Notizen dieses Zuges eingesammelt sind)
  const log = $("#storyLog");
  log.innerHTML = "";
  storyBuffer.slice(-12).forEach((e, i, arr) => {
    log.appendChild(el("div", `entry ${e.type}${i === arr.length - 1 ? " latest" : ""}`, escapeHtml(e.text)));
  });
  log.lastChild?.scrollIntoView({ behavior: "smooth", block: "end" });

  renderDayBar(view);
  renderNews(view);
  renderKeyPanels(view);
  renderCombat(view);
  renderChoices(view);
  renderRecruit(view);
  renderSidebar(view);
  renderMap(view);
  renderTravel(view);
  renderActivities(view);
  renderSkillAlloc(view);
  renderLore(view);
  renderStoryThreads(view);
  renderFactions(view);
  renderCanon(view);
  renderDenDen(view);

  $("#shareLink").value = `${location.origin}${location.pathname}?game=${view.gameId}`;
  $("#freeText").value = "";
}

function locked(view) {
  return !!view.clock?.locked;
}

function renderConsequences(view) {
  const box = $("#consequenceBanner");
  if (!box) return;
  const data = view.consequences;
  const lines = [];
  let dangerous = false;

  if (data?.actionRisk) {
    const risk = data.actionRisk;
    dangerous ||= risk.discovered;
    lines.push(
      `<b>🎲 ${escapeHtml(risk.label)}</b>: Risiko ${risk.chance}% · Wurf ${risk.roll} → ` +
      (risk.discovered ? `<strong>entdeckt (${escapeHtml(risk.outcome)})</strong>` : "unbemerkt"),
    );
  }
  if (data?.storyEvent) {
    const event = data.storyEvent;
    const labels = { fortschritt: "Spur gefunden", eskaliert: "Lage eskaliert", geloest: "Faden gelöst", verpasst: "Gelegenheit verpasst" };
    dangerous ||= event.type === "eskaliert" || event.type === "verpasst";
    lines.push(`<b>🧭 ${escapeHtml(labels[event.type] || event.type)}</b>${event.title ? `: ${escapeHtml(event.title)}` : ""}`);
  }
  (data?.factionChanges || []).forEach((change) => {
    dangerous ||= change.delta < 0;
    lines.push(`<b>⚖️ ${escapeHtml(change.label)}</b>: ${change.delta > 0 ? "+" : ""}${change.delta} · jetzt ${change.value}`);
  });

  if (!lines.length) {
    box.classList.add("hidden");
    return;
  }
  box.className = `consequence-banner ${dangerous ? "danger" : "safe"}`;
  box.innerHTML = `<div class="consequence-title">Folgen deiner Handlung</div>${lines.map((line) => `<div>${line}</div>`).join("")}`;
}
// Aktionen blockiert, wenn Echtzeit-Sperre ODER Erschöpfung (muss rasten) ODER Kampf.
function actionsBlocked(view) {
  return !!view.clock?.locked || !!view.clock?.mustRest || inCombat(view);
}

function renderDayBar(view) {
  const bar = $("#dayBar");
  const c = view.clock;
  clearInterval(state.clockTimer);

  if (c.locked) {
    // Optionaler Echtzeit-Takt zwischen Tagen (Multiplayer): Countdown.
    bar.className = "day-bar locked";
    let remaining = c.secondsRemaining;
    const paint = () => { bar.innerHTML = `🌙 <b>Neuer Tag in ${remaining}s</b> — ruh dich aus, Käpt'n.`; };
    paint();
    state.clockTimer = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) { clearInterval(state.clockTimer); refreshView(); }
      else paint();
    }, 1000);
    return;
  }

  bar.className = "day-bar" + (c.mustRest ? " locked" : "");
  const info = el("span", null,
    `${c.phaseEmoji} <b>Tag ${c.day}</b> · ${c.phaseLabel} <span class="uhr">${c.hourLabel}</span>` +
    (c.mustRest ? ` · <span class="warn">erschöpft — du musst rasten</span>` : c.isNight ? ` · <span class="hint">es ist Nacht</span>` : ""));
  bar.innerHTML = "";
  bar.appendChild(info);
  const rest = el("button", "rest-btn" + (c.mustRest || c.isNight ? " urgent" : ""), "🌙 Rasten / Schlafplatz");
  rest.disabled = inCombat(view);
  rest.onclick = () => post("/rest", {}, "Ich suche einen Schlafplatz und beende den Tag.");
  bar.appendChild(rest);
}

function renderKeyPanels(view) {
  const wrap = $("#keyPanels");
  wrap.innerHTML = "";
  const panels = view.scene?.panels || [];
  panels.forEach((p) => {
    const fig = el("figure", "key-panel");
    const img = el("img");
    img.src = p.src; img.alt = p.caption || "";
    fig.appendChild(img);
    if (p.caption) fig.appendChild(el("figcaption", null, escapeHtml(p.caption)));
    wrap.appendChild(fig);
    upgradePanel(img, { scope: "moment", kind: p.kind }, "m:" + p.kind);
  });
}

// Profilbild anzeigen; falls noch keins da ist (und Bilder aktiv sind + eine
// Beschreibung existiert), im Hintergrund generieren und einblenden.
let _avatarRequested = false;
function renderAvatar(c) {
  const img = $("#charAvatar");
  if (!img) return;
  if (c.avatar) {
    img.src = c.avatar;
    img.classList.remove("hidden");
    return;
  }
  img.classList.add("hidden");
  if (!_avatarRequested && state.meta?.imagesEnabled && (c.appearance || "").trim()) {
    _avatarRequested = true;
    const head = img.closest(".char-head");
    head?.classList.add("drawing-avatar");
    fetch(`/api/games/${state.gameId}/panel`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ scope: "avatar" }),
    })
      .then((r) => r.json())
      .then((d) => { if (d && d.src) { img.src = d.src; img.classList.remove("hidden"); } })
      .catch(() => {})
      .finally(() => head?.classList.remove("drawing-avatar"));
  }
}

// Echtes KI-Panel im Hintergrund holen und das SVG austauschen, sobald fertig.
// Fällt es aus (aus/kein Guthaben/Fehler), bleibt einfach das SVG stehen.
const panelImgCache = new Map();
async function upgradePanel(imgEl, body, key) {
  if (!state.meta?.imagesEnabled || !state.gameId || !imgEl) return;
  imgEl.dataset.pkey = key;
  const cached = panelImgCache.get(key);
  if (cached) { imgEl.src = cached; return; }
  const fig = imgEl.closest("figure");
  fig?.classList.add("drawing");
  try {
    const res = await fetch(`/api/games/${state.gameId}/panel`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    const data = await res.json();
    if (data && data.src) {
      panelImgCache.set(key, data.src);
      if (imgEl.dataset.pkey === key) imgEl.src = data.src; // nur wenn noch aktuell
    }
  } catch (e) { /* SVG bleibt */ }
  finally { fig?.classList.remove("drawing"); }
}

function inCombat(view) {
  return !!(view.combat && view.combat.active && !view.combat.over);
}

function renderChoices(view) {
  const choices = $("#choices");
  choices.innerHTML = "";
  // Während eines Kampfes übernimmt die Kampf-UI; normale Auswahl ausgeblendet.
  if (inCombat(view)) {
    $("#freeText").disabled = true;
    $("#freeForm").querySelector("button").disabled = true;
    return;
  }
  const isLocked = actionsBlocked(view);
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
  if (view.recruitable?.length && !actionsBlocked(view)) {
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

async function combatAction(payload) {
  $("#turnError").textContent = "";
  try {
    const view = await api(`/api/games/${state.gameId}/combat-action`, { method: "POST", body: JSON.stringify(payload) });
    renderScene(view);
  } catch (e) {
    $("#turnError").textContent = e.message;
  }
}

function renderCombat(view) {
  const box = $("#combatBox");
  if (!inCombat(view)) {
    box.classList.add("hidden");
    return;
  }
  box.classList.remove("hidden");
  const cm = view.combat;
  $("#combatRound").textContent = cm.round;

  const alive = cm.enemies.filter((e) => e.alive);
  if (!state.combatTarget || !alive.some((e) => e.id === state.combatTarget)) {
    state.combatTarget = alive[0]?.id || null;
  }

  const enemyWrap = $("#combatEnemies");
  enemyWrap.innerHTML = "";
  cm.enemies.forEach((e) => {
    const w = pct(e.hp, e.maxHp);
    const node = el("div", "combat-enemy" + (e.alive ? "" : " dead") + (e.id === state.combatTarget ? " sel" : ""),
      `<div class="ce-top"><span>${escapeHtml(e.name)}</span><span>${e.hp}/${e.maxHp}</span></div><div class="bar"><div class="bar-fill foe" style="width:${w}%"></div></div>`);
    if (e.alive) node.onclick = () => { state.combatTarget = e.id; renderCombat(view); };
    enemyWrap.appendChild(node);
  });

  const p = cm.player;
  $("#combatPlayer").innerHTML =
    `<div class="ce-top"><span>${escapeHtml(p.name)}${cm.party.length ? " + " + cm.party.length + " Crew" : ""}</span><span>❤️ ${p.hp}/${p.maxHp}</span></div>` +
    `<div class="bar"><div class="bar-fill hp" style="width:${pct(p.hp, p.maxHp)}%"></div></div>`;

  const logBox = $("#combatLog");
  logBox.innerHTML = "";
  cm.log.forEach((l) => logBox.appendChild(el("div", "cl-line", escapeHtml(l))));
  logBox.scrollTop = logBox.scrollHeight;

  // Zielauswahl (nur wenn mehr als ein Gegner lebt)
  const tgt = $("#combatTargets");
  tgt.innerHTML = alive.length > 1 ? "Ziel: " : "";
  if (alive.length > 1) {
    alive.forEach((e) => {
      const b = el("button", "chip" + (e.id === state.combatTarget ? " sel" : ""), escapeHtml(e.name));
      b.onclick = () => { state.combatTarget = e.id; renderCombat(view); };
      tgt.appendChild(b);
    });
  }

  const btns = $("#combatButtons");
  btns.innerHTML = "";
  cm.options.attackSkills.forEach((sk) => {
    const b = el("button", "combat-btn", `⚔️ ${sk}`);
    b.onclick = () => combatAction({ action: "attack", skill: sk, targetId: state.combatTarget });
    btns.appendChild(b);
  });
  if (cm.options.special) {
    const b = el("button", "combat-btn special", "💥 Spezial");
    b.onclick = () => combatAction({ action: "special", targetId: state.combatTarget });
    btns.appendChild(b);
  }
  if (cm.options.overwhelm) {
    const b = el("button", "combat-btn special haoshoku", "👑 Überwältigen");
    b.title = "Haoshoku — nur einmal pro Kampf";
    b.onclick = () => combatAction({ action: "overwhelm" });
    btns.appendChild(b);
  }
  const def = el("button", "combat-btn", "🛡️ Verteidigen");
  def.onclick = () => combatAction({ action: "defend" });
  btns.appendChild(def);
  const flee = el("button", "combat-btn", "🏃 Fliehen");
  flee.onclick = () => combatAction({ action: "flee" });
  btns.appendChild(flee);
}

function renderSidebar(view) {
  const c = view.character;
  $("#charTitle").textContent = `${c.name} · Lvl ${c.level}`;
  $("#charDay").textContent = `Tag ${view.day} · ${view.location}`;
  renderAvatar(c);

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
  const hakiOn = ["beobachtung", "ruestung", "haoshoku"].filter((k) => c.haki?.[k]);
  const HAKI_LABEL = { beobachtung: "Beobachtungshaki", ruestung: "Rüstungshaki", haoshoku: "Haoshoku" };
  $("#hakiLine").innerHTML = hakiOn.length
    ? `🌀 Haki: <b>${hakiOn.map((k) => escapeHtml(HAKI_LABEL[k])).join(", ")}</b>`
    : "";

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
      if (it.kind === "teufelsfrucht" && !c.devilFruit && !inCombat(view)) {
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
  const isLocked = actionsBlocked(view);
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
  const isLocked = actionsBlocked(view);
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
  if (points > 0 && !actionsBlocked(view)) {
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

function renderStoryThreads(view) {
  const list = $("#storyThreads");
  if (!list) return;
  const threads = view.story?.active || [];
  list.innerHTML = "";
  if (!threads.length) {
    list.innerHTML = `<div class="hint">Im Moment keine offenen Fäden.</div>`;
    return;
  }
  threads.forEach((thread) => {
    const urgency = ["erste Spuren", "angespannt", "dringend"][Math.min(thread.stage || 0, 2)];
    list.appendChild(el("div", "li story-thread", `<b>${escapeHtml(thread.title)}</b><small>${escapeHtml(thread.hook)}<br>Spuren: ${thread.progress}/3 · Lage: ${urgency}</small>`));
  });
}

function renderFactions(view) {
  const list = $("#factionList");
  if (!list) return;
  const factions = view.factions || [];
  list.innerHTML = "";
  if (!factions.length) { list.innerHTML = `<div class="hint">Noch keine Gerüchte über deinen Ruf.</div>`; return; }
  factions.forEach((faction) => {
    const sign = faction.value > 0 ? "+" : "";
    list.appendChild(el("div", "li faction-row", `${escapeHtml(faction.label)} <span class="disp ${faction.value >= 20 ? "friend" : faction.value <= -20 ? "foe" : "neutral"}">${sign}${faction.value}</span><small>${escapeHtml(faction.level)}</small>`));
  });
}

function renderCanon(view) {
  const affEl = $("#canonAffil");
  const offerEl = $("#canonOffer");
  const listEl = $("#canonList");
  const heardWrap = $("#canonHeardWrap");
  const heardEl = $("#canonHeard");
  const emptyEl = $("#canonEmpty");
  const aff = view.character.canonAffiliation;
  const disabled = actionsBlocked(view);
  // Spielersicht: canon = { met: [...], heardOf: [...] }
  const met = (view.canon && view.canon.met) || [];
  const heardOf = (view.canon && view.canon.heardOf) || [];

  affEl.innerHTML = aff
    ? `✅ Mitglied: <b>${escapeHtml(aff.name)}</b> (${escapeHtml(aff.rank)})${aff.marineFriendly ? " · Marine-Schutz" : aff.protection ? " · Schutz der Crew" : ""}`
    : `<span class="hint">Noch ungebunden. Wem du begegnest, den kannst du um Aufnahme bitten.</span>`;

  // Aktives Angebot hervorheben
  if (view.canonOffer && !aff) {
    const crew = met.find((c) => c.id === view.canonOffer.crewId);
    if (crew) {
      offerEl.classList.remove("hidden");
      offerEl.innerHTML = `<b>Angebot:</b> ${escapeHtml(crew.name)} `;
      const btn = el("button", "chip sel", crew.available ? `Beitreten (Ziel-DC ${crew.effectiveDc})` : "nicht möglich");
      btn.disabled = disabled || !crew.available;
      if (!crew.available) btn.title = crew.reason;
      btn.onclick = () => post("/join-canon", { crewId: crew.id }, `Ich bitte ${crew.name} um Aufnahme.`);
      offerEl.appendChild(btn);
    } else offerEl.classList.add("hidden");
  } else offerEl.classList.add("hidden");

  // Begegnete Crews: mit Status + Beitritts-Option
  listEl.innerHTML = "";
  met.forEach((crew) => {
    const openTxt = crew.openness >= 80 ? "sehr offen" : crew.openness >= 55 ? "offen" : crew.openness >= 25 ? "wählerisch" : "extrem wählerisch";
    const canonTag = crew.canonical ? `<span class="tier t3">Canon</span>` : `<span class="tier t0">kleine Crew</span>`;
    const row = el("div", "li");
    let status;
    if (crew.affiliated) status = `<span class="disp friend">Mitglied</span>`;
    else if (crew.available) status = `<span class="hint">Ziel-DC ${crew.effectiveDc}</span>`;
    else status = `<span class="hint">${escapeHtml(crew.reason)}</span>`;
    row.innerHTML = `<b>${escapeHtml(crew.name)}</b> ${canonTag} <span class="tier t1">${openTxt}</span><small>${escapeHtml(crew.blurb)}</small><div class="canon-row-status">${status}</div>`;
    if (!aff && crew.available && !crew.affiliated) {
      const btn = el("button", "chip", "Beitreten versuchen");
      btn.disabled = disabled;
      btn.onclick = () => post("/join-canon", { crewId: crew.id }, `Ich suche ${crew.name} auf und bitte um Aufnahme.`);
      row.appendChild(btn);
    }
    listEl.appendChild(row);
  });
  listEl.classList.toggle("hidden", met.length === 0);

  // Nur gehört: Name + Blurb, KEIN Beitritt (du müsstest sie erst finden)
  heardEl.innerHTML = "";
  heardOf.forEach((crew) => {
    const canonTag = crew.canonical ? `<span class="tier t3">Canon</span>` : `<span class="tier t0">Gruppe</span>`;
    const row = el("div", "li muted");
    row.innerHTML = `<b>${escapeHtml(crew.name)}</b> ${canonTag}<small>${escapeHtml(crew.blurb)}</small><div class="canon-row-status"><span class="hint">nur vom Hörensagen — du müsstest sie erst aufspüren</span></div>`;
    heardEl.appendChild(row);
  });
  heardWrap.classList.toggle("hidden", heardOf.length === 0);

  emptyEl.classList.toggle("hidden", met.length > 0 || heardOf.length > 0);
}

function renderNews(view) {
  const list = $("#newsList");
  const fresh = $("#newsFresh");
  list.innerHTML = "";
  const news = view.news;
  if (!news) { list.textContent = "—"; fresh.classList.add("hidden"); return; }
  fresh.classList.toggle("hidden", !news.fresh);
  const scopeLabel = { weltweit: "WELT", grand_line: "GRAND LINE", east_blue: "EAST BLUE", fahndung: "FAHNDUNG", "gerücht": "GERÜCHT", regional: "REGION" };
  news.items.forEach((it) => {
    list.appendChild(el("div", "news-item",
      `<div class="news-scope">${escapeHtml(scopeLabel[it.scope] || it.scope.toUpperCase())}</div>` +
      `<div class="news-head">${escapeHtml(it.headline)}</div>` +
      `<div class="news-body">${escapeHtml(it.body)}</div>`));
  });
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
  if (!text || actionsBlocked(state.view)) return;
  post("/turn", { freeText: text }, text);
});

// ---------- Mobile Drawer / PWA ----------
function openDrawer() { document.body.classList.add("drawer-open"); }
function closeDrawer() { document.body.classList.remove("drawer-open"); }

$("#menuToggle").addEventListener("click", () => document.body.classList.toggle("drawer-open"));
$("#drawerOverlay").addEventListener("click", closeDrawer);

// Schwarz-Weiß invertieren (paper <-> ink), Wahl merken.
$("#themeToggle").addEventListener("click", () => {
  const cur = document.documentElement.getAttribute("data-theme") === "ink" ? "ink" : "paper";
  const next = cur === "ink" ? "paper" : "ink";
  document.documentElement.setAttribute("data-theme", next);
  try { localStorage.setItem("ops-theme", next); } catch (e) {}
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", next === "ink" ? "#0f0f0f" : "#e7e4dc");
});

// Touch-Gesten: nach links wischen öffnet das Menü (von rechts), nach rechts schließt.
let _tsx = 0, _tsy = 0;
window.addEventListener("touchstart", (e) => { const t = e.touches[0]; _tsx = t.clientX; _tsy = t.clientY; }, { passive: true });
window.addEventListener("touchend", (e) => {
  const t = e.changedTouches[0];
  const dx = t.clientX - _tsx, dy = t.clientY - _tsy;
  if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
    if (dx < 0) openDrawer(); else closeDrawer();
  }
}, { passive: true });

// Service-Worker (installierbare Web-App / Offline-Shell)
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(() => {}));
}

// ---------- Helfer ----------
function pct(a, b) { return Math.max(0, Math.min(100, Math.round((a / (b || 1)) * 100))); }
function signed(n) { return n >= 0 ? "+" + n : "" + n; }
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
}
