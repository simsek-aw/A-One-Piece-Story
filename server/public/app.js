// Frontend-Logik (Vanilla JS, ES-Module). Redet nur über /api mit dem Server.

const $ = (sel) => document.querySelector(sel);
const el = (tag, cls, html) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html != null) n.innerHTML = html;
  return n;
};

// Haptik-Feedback für Mobilgeräte, die die Vibration-API unterstützen (z. B.
// Desktop/iOS Safari haben navigator.vibrate schlicht nicht -> No-Op).
function vibrate(pattern) {
  try { navigator.vibrate?.(pattern); } catch { /* optional */ }
}

// Deterministisches Mini-Portrait (Chibi-Kopf) für NPCs: dieselbe Person
// bekommt über Name+Rolle immer dasselbe Gesicht, ganz ohne Server-Anfrage
// oder KI-Bild. Nutzt currentColor -> passt sich automatisch dem Papier/
// Tinte-Theme an, genau wie der Rest des UI.
function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}
function npcFaceSvg(seed, disposition = 0) {
  const h = hashStr(String(seed));
  const hair = [
    "", // kahl
    `<path d="M6 12 Q16 2 26 12 L26 15 Q16 8 6 15 Z" fill="currentColor"/>`, // kurz
    `<path d="M5 13 L9 4 L13 12 L16 3 L19 12 L23 4 L27 13 Q16 6 5 13 Z" fill="currentColor"/>`, // zerzaust
    `<path d="M6 13 Q10 3 22 6 Q27 8 26 14 Q18 6 6 13 Z" fill="currentColor"/>`, // seitlich
  ][h % 4];
  const eyeShift = ((h >> 3) % 3) - 1;
  const mouth = disposition > 20
    ? `<path d="M11 21 Q16 25 21 21" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round"/>`
    : disposition < -20
      ? `<path d="M11 22 Q16 19 21 22" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round"/>`
      : `<line x1="12" y1="21" x2="20" y2="21" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>`;
  return `<svg viewBox="0 0 32 32" width="28" height="28" aria-hidden="true">` +
    `<circle cx="16" cy="17" r="11" fill="none" stroke="currentColor" stroke-width="1.8"/>` +
    hair +
    `<circle cx="${12 + eyeShift}" cy="16" r="1.6" fill="currentColor"/><circle cx="${20 + eyeShift}" cy="16" r="1.6" fill="currentColor"/>` +
    mouth +
    `</svg>`;
}
function npcFaceEl(seed, disposition) {
  return el("span", "npc-face", npcFaceSvg(seed, disposition));
}

const state = {
  meta: null,
  sel: { archetype: null, perk: null, location: null },
  attrs: {},
  gameId: null,
  view: null,
  clockTimer: null,
  combatTarget: null,
  lastFxNarration: null,
  fxTimer: null,
  wizardStep: 1,
  // Höchster je in diesem Durchlauf erreichter Schritt — unabhängig davon,
  // wohin man gerade zurückgesprungen ist. So bleibt z. B. die Übersicht
  // (Schritt 7) anklickbar, auch wenn man kurz zu Schritt 2 zurückspringt,
  // um die Herkunft zu ändern, statt sich erneut durchklicken zu müssen.
  wizardMaxStep: 1,
};
const WIZARD_STEPS = 7;
const WIZARD_LABELS = ["", "Name", "Herkunft", "Attribute", "Talent", "Startort", "Aussehen", "Übersicht"];

// Nutzt den freien Platz in der Kopfleiste: Ära-Tagline vor dem ersten Zug,
// danach Name/Level/Tag — aktualisiert sich bei jeder neuen Szene, damit es
// nie veraltet wirkt (anders als ein starrer Deko-Text).
function renderTopbarContext() {
  const box = $("#topbarContext");
  if (!box) return;
  if (state.gameId && state.view?.character) {
    const c = state.view.character;
    box.textContent = `${c.name} · Lvl ${c.level} · Tag ${state.view.day}`;
  } else {
    box.textContent = state.meta?.era?.label || "";
  }
}
// Charakter-Attribute/-Skills sind objektweise nach interner ID (z. B.
// "glueck", "ueberzeugen") indiziert, ohne Umlaute. Fürs UI immer über die
// Metadaten auf den echten Anzeigenamen ("Glück", "Überzeugen") auflösen,
// statt die rohe ID direkt anzuzeigen.
function attrLabel(id) {
  return state.meta.creation.attributes.find((a) => a.id === id)?.name || id;
}
function skillLabel(id) {
  return state.meta.creation.skills.find((s) => s.id === id)?.name || id;
}

const SAVE_SLOTS_KEY = "aops-save-slots";
const PROVIDER_KEY = "aops-provider";
// Eigenständig erfundene Namen im Klang der One-Piece-Welt (kurz, einprägsam,
// oft ungewöhnliche Vor-/Rufnamen) — bewusst KEINE echten Canon-Namen
// (Ruffy, Zoro, Nami, Sanji, ...), analog zur Perk-Namensregel in character.js.
const RANDOM_NAMES = ["Kaito", "Riko", "Sango", "Toran", "Miri", "Enzo", "Kael", "Vasha", "Reika", "Jiro", "Amara", "Renzo", "Suri", "Baku", "Nera", "Yuna", "Kohana", "Rook", "Tobo", "Dez"];
const RANDOM_APPEARANCES = {
  hair: ["kurzes zerzaustes schwarzes Haar", "lange kupferrote Zöpfe", "silberner Undercut", "wilde dunkelblaue Locken", "rasierter Kopf mit auffälliger Tätowierung", "strohblondes Haar unter einem Kopftuch"],
  feature: ["eine feine Narbe über der Augenbraue", "unzählige Sommersprossen", "ein breites herausforderndes Grinsen", "ein ruhiger durchdringender Blick", "eine goldene Zahnlücke", "runde getönte Brillengläser"],
  clothing: ["langer verwitterter Kapitänsmantel", "ärmellose Weste und breiter Gürtel", "praktische Reisekleidung mit vielen Taschen", "helle Marinejacke ohne Abzeichen", "auffälliger gemusterter Kimono", "schwere Stiefel und ein weiter Schal"],
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
  renderTopbarContext();
  buildProviderPicker();
  const aHint = $("#appearanceHint");
  if (aHint) aHint.textContent = state.meta.imagesEnabled
    ? `✎ Bildgenerierung über ${state.meta.imageProvider || "KI"} ist aktiv — dein Porträt wird beim Spielstart gezeichnet.`
    : "ℹ️ Bildgenerierung ist derzeit aus; die Beschreibung wird gespeichert und der Spielleiter bezieht sie ein.";
  if (state.meta.ttsEnabled) {
    $("#ttsToggle").classList.remove("hidden");
    updateTtsToggleLabel();
  }

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
  $("#menuCharacterPicker").onclick = beginNewCharacter;
  $("#menuNewCharacter").onclick = beginNewCharacter;
  $("#menuRefreshGame").onclick = async () => {
    closeDrawer();
    await refreshView();
  };
}

function buildProviderPicker() {
  const select = $("#providerSelect");
  const available = state.meta.providers || [{ id: state.meta.provider, label: state.meta.provider }];
  select.innerHTML = "";
  available.forEach((provider) => {
    const option = document.createElement("option");
    option.value = provider.id;
    option.textContent = provider.label;
    option.title = provider.model || "";
    select.appendChild(option);
  });
  let preferred = state.meta.provider;
  try { preferred = localStorage.getItem(PROVIDER_KEY) || preferred; } catch { /* optional */ }
  select.value = available.some((provider) => provider.id === preferred) ? preferred : state.meta.provider;
  select.disabled = available.length < 2;
  select.onchange = changeProvider;
}

async function changeProvider() {
  const select = $("#providerSelect");
  const previous = state.view?.aiProvider || state.meta.provider;
  try {
    if (state.gameId) {
      const view = await api(`/api/games/${state.gameId}/provider`, {
        method: "POST",
        body: JSON.stringify({ aiProvider: select.value }),
      });
      renderScene(view);
    }
    try { localStorage.setItem(PROVIDER_KEY, select.value); } catch { /* optional */ }
  } catch (error) {
    select.value = previous;
    const target = state.gameId ? $("#turnError") : $("#createError");
    if (target) target.textContent = error.message;
  }
}

// ---------- Charaktererstellung ----------
function buildCreation() {
  state.wizardMaxStep = 1; // frischer Durchlauf -> nur Schritt 1 anklickbar, bis man weiterkommt
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
  const none = el("button", "option selected", `<div class="o-title">Keiner</div><div class="o-sub">Ohne Talent starten.</div>`);
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
  $("#randomizeCharacterBtn").onclick = randomizeCharacter;
  $("#wizardNext").onclick = wizardGoNext;
  $("#wizardBack").onclick = wizardGoBack;
  document.querySelectorAll(".randomize-step").forEach((btn) => {
    btn.onclick = () => STEP_RANDOMIZERS[btn.dataset.randomize]?.();
  });

  goToWizardStep(1);
}

// ---------- Schritt-für-Schritt-Assistent ----------
// Statt einer langen scrollenden Seite: ein Schritt pro Bildschirm, mit
// Fortschrittsanzeige, Zurück/Weiter-Navigation und einer klaren Validierung
// pro Schritt (z. B. "erst Herkunft wählen, dann weiter").
function renderWizardProgress() {
  const list = $("#wizardProgress");
  list.innerHTML = "";
  for (let step = 1; step <= WIZARD_STEPS; step += 1) {
    // Jeder Schritt bis zum je erreichten Höchststand (wizardMaxStep, NICHT
    // nur der aktuell angezeigte) bleibt anklickbar — sonst würde ein
    // Rücksprung von der Übersicht zum Anpassen eines Feldes bedeuten, sich
    // danach wieder durch alle Schritte klicken zu müssen.
    const reachable = step <= state.wizardMaxStep;
    const cls = [
      step === state.wizardStep ? "current" : reachable ? "done" : "",
      reachable ? "clickable" : "",
    ].filter(Boolean).join(" ");
    const item = el("li", cls, `<span class="dot">${step}</span><span class="wp-label">${WIZARD_LABELS[step]}</span>`);
    if (reachable) {
      item.setAttribute("role", "button");
      item.setAttribute("tabindex", "0");
      item.onclick = () => goToWizardStep(step);
      item.onkeydown = (ev) => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); goToWizardStep(step); } };
    }
    list.appendChild(item);
  }
}

function goToWizardStep(step) {
  state.wizardStep = Math.max(1, Math.min(WIZARD_STEPS, step));
  state.wizardMaxStep = Math.max(state.wizardMaxStep, state.wizardStep);
  document.querySelectorAll(".wizard-step").forEach((section) => {
    section.hidden = Number(section.dataset.step) !== state.wizardStep;
  });
  $("#wizardBack").classList.toggle("hidden", state.wizardStep === 1);
  $("#wizardNext").classList.toggle("hidden", state.wizardStep === WIZARD_STEPS);
  $("#startBtn").classList.toggle("hidden", state.wizardStep !== WIZARD_STEPS);
  $("#createError").textContent = "";
  if (state.wizardStep === WIZARD_STEPS) renderSummary();
  renderWizardProgress();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// Letzter Schritt: Übersicht aller Angaben, jede Zeile klickbar zum Zurück-
// springen zum passenden Schritt — spart ein "war das wirklich alles?"-Gefühl
// direkt vor dem Start.
function renderSummary() {
  const box = $("#summaryList");
  if (!box) return;
  box.innerHTML = "";
  const archetype = state.meta.archetypes.find((a) => a.id === state.sel.archetype);
  const perk = state.meta.creation.perks.find((p) => p.id === state.sel.perk);
  const location = state.meta.startLocations.find((l) => l.id === state.sel.location);
  const attrText = state.meta.creation.attributes.map((attr) => `${attr.name} ${state.attrs[attr.id]}`).join(" · ");

  const rows = [
    { step: 1, label: "Name", value: $("#charName").value.trim() || "—" },
    { step: 2, label: "Herkunft", value: archetype?.name || "—" },
    { step: 3, label: "Attribute", value: attrText || "—" },
    { step: 4, label: "Talent", value: perk?.name || "Keiner" },
    { step: 5, label: "Startort", value: location?.name || "—" },
    { step: 6, label: "Aussehen", value: $("#charAppearance").value.trim() || "— (optional)" },
  ];
  rows.forEach((row) => {
    const node = el("button", "summary-row", `<div class="sr-label">${escapeHtml(row.label)}</div><div class="sr-value">${escapeHtml(row.value)}</div><div class="sr-edit">Bearbeiten →</div>`);
    node.type = "button";
    node.onclick = () => goToWizardStep(row.step);
    box.appendChild(node);
  });
}

// Prüft, ob der AKTUELLE Schritt abgeschlossen ist. Gibt bei Bedarf eine
// Fehlermeldung zurück (null = alles gut, weiter geht's).
function wizardValidationError() {
  const c = state.meta.creation;
  switch (state.wizardStep) {
    case 1:
      return $("#charName").value.trim().length >= 2 ? null : "Bitte einen Namen (mind. 2 Zeichen) eingeben.";
    case 2:
      return state.sel.archetype ? null : "Bitte eine Herkunft wählen.";
    case 3:
      return spentPoints() === c.pointsToDistribute ? null : "Bitte alle Attributpunkte verteilen.";
    case 5:
      return state.sel.location ? null : "Bitte einen Startort wählen.";
    default:
      return null; // Talent (4) ist optional ("Keiner" ist gültig), Aussehen (6) auch
  }
}

function wizardGoNext() {
  const error = wizardValidationError();
  if (error) { $("#createError").textContent = error; return; }
  goToWizardStep(state.wizardStep + 1);
}

function wizardGoBack() {
  goToWizardStep(state.wizardStep - 1);
}

// Pro-Schritt-Zufallsknöpfe: würfeln NUR das Feld dieses Schritts, statt wie
// "Schnellstart" den ganzen Charakter neu aufzusetzen.
const STEP_RANDOMIZERS = {
  attributes: randomizeAttributesOnly,
  perk: randomizePerkOnly,
  location: randomizeLocationOnly,
};

function randomizeAttributesOnly() {
  const creation = state.meta.creation;
  const archetype = state.meta.archetypes.find((a) => a.id === state.sel.archetype);
  state.attrs = Object.fromEntries(creation.attributes.map((attr) => [attr.id, creation.baseAttribute]));
  for (let point = 0; point < creation.pointsToDistribute; point += 1) {
    const eligible = creation.attributes.filter((attr) => state.attrs[attr.id] < creation.maxAttribute);
    const weighted = eligible.flatMap((attr) => Array(archetype?.attributeBonus?.[attr.id] ? 3 : 1).fill(attr.id));
    state.attrs[pickRandom(weighted)] += 1;
  }
  updateAttrUI();
}

function randomizePerkOnly() {
  const perkIndex = randomIndex(state.meta.creation.perks.length);
  $("#perkList").children[perkIndex + 1].click(); // +1: „Keiner" steht an Position 0
}

function randomizeLocationOnly() {
  const locationIndex = randomIndex(state.meta.startLocations.length);
  $("#locationList").children[locationIndex].click();
}

function randomizeArchetypeOnly() {
  const archetypeIndex = randomIndex(state.meta.archetypes.length);
  $("#archetypeList").children[archetypeIndex].click();
}

// "Schnellstart": würfelt den kompletten Charakter (Name, Herkunft, Attribute,
// Talent, Startort, Aussehen) und springt direkt zum letzten Schritt, damit
// man das Ergebnis noch anpassen/ansehen kann, bevor man startet.
function randomizeCharacter() {
  randomizeArchetypeOnly();
  randomizeAttributesOnly();
  randomizePerkOnly();
  randomizeLocationOnly();

  $("#charName").value = pickRandom(RANDOM_NAMES);
  $("#charAppearance").value = [
    pickRandom(RANDOM_APPEARANCES.hair),
    pickRandom(RANDOM_APPEARANCES.feature),
    pickRandom(RANDOM_APPEARANCES.clothing),
  ].join(", ");
  goToWizardStep(WIZARD_STEPS); // löscht createError -> Hinweis erst danach setzen
  $("#createError").textContent = "🎲 Charakter ausgewürfelt – du kannst alles noch ändern.";
}

function randomIndex(length) {
  return Math.floor(Math.random() * length);
}

function pickRandom(values) {
  return values[randomIndex(values.length)];
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
        aiProvider: $("#providerSelect").value,
      }),
    });
    enterGame(view);
  } catch (e) {
    err.textContent = e.message;
  }
}

// ---------- Spiel ----------
let storyBuffer = [];
let lastChapterDay = null; // welcher Tag zuletzt eine Kapitel-Überschrift bekam

function enterGame(view) {
  state.gameId = view.gameId;
  state.lastFxNarration = null;
  rememberCharacter(view);
  history.replaceState(null, "", `?game=${view.gameId}`);
  $("#screen-create").classList.add("hidden");
  $("#screen-game").classList.remove("hidden");
  $("#openLogbook").classList.remove("hidden");
  $("#profileBtn").classList.remove("hidden");
  $("#skillReadyBtn").classList.remove("hidden");
  activateLogPanel("panelCharacter");
  storyBuffer = [];
  lastChapterDay = null;
  renderScene(view);
  showRecapBanner(view.recap);
}

// "Bisher geschah..."-Rückblick: der Story-Log lebt nur im Browser
// (storyBuffer) und ist nach einem Reload/Fortsetzen weg. Der Server liefert
// deterministisch (keine KI) einen kompakten Rückblick mit — hier nur beim
// (Wieder-)Einstieg gezeigt, nicht bei jedem Zug.
function showRecapBanner(recap) {
  const banner = $("#recapBanner");
  if (!recap || !recap.bullets?.length) { banner.classList.add("hidden"); return; }
  $("#recapTitle").textContent = `📜 Bisher geschah... (Tag ${recap.day} · ${recap.location})`;
  const list = $("#recapList");
  list.innerHTML = "";
  recap.bullets.forEach((b) => list.appendChild(el("li", "", escapeHtml(b))));
  banner.classList.remove("hidden");
}

function hideRecapBanner() {
  $("#recapBanner").classList.add("hidden");
}

// Ehemals ein eigenes Popup ("Wer sticht heute in See?"); jetzt lebt die
// Charakterauswahl direkt in Schritt 1 des Assistenten (unter dem Namen),
// darum führen "Neuer Charakter" und "Zur Charakterauswahl" beide hierher.
function beginNewCharacter() {
  if (state.view) rememberCharacter(state.view);
  stopSpeech();
  state.gameId = null;
  state.view = null;
  state.lastFxNarration = null;
  state.sel = { archetype: null, perk: null, location: null };
  buildCreation();
  renderSavedCharacters();
  $("#charName").value = "";
  $("#charAppearance").value = "";
  $("#createError").textContent = "";
  $("#screen-game").classList.add("hidden");
  $("#openLogbook").classList.add("hidden");
  $("#profileBtn").classList.add("hidden");
  $("#skillReadyBtn").classList.add("hidden");
  $("#profilePopover").classList.add("hidden");
  $("#screen-create").classList.remove("hidden");
  history.replaceState(null, "", location.pathname);
  renderTopbarContext();
  closeDrawer();
  window.scrollTo({ top: 0, behavior: "smooth" });
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
    // slot.archetype ist die interne ID (z. B. "kopfgeldjaeger") — hier auf
    // den echten Anzeigenamen ("Kopfgeldjäger") auflösen, sonst zeigt die
    // Karte einen rohen, umlautlosen Bezeichner statt echten Text.
    const archetypeName = state.meta.archetypes.find((a) => a.id === slot.archetype)?.name || "Abenteurer";
    const row = el("div", "save-slot", `<div><strong>${escapeHtml(slot.name)}</strong><small>${escapeHtml(archetypeName)} · Stufe ${slot.level || 1} · ${escapeHtml(slot.location || "unbekannter Ort")}</small></div>`);
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
  hideRecapBanner(); // Rückblick war nur für den Einstieg gedacht, nicht während des Spiels
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
  const previousView = state.view;
  const wasInCombat = inCombat(previousView);
  const isInCombat = inCombat(view);
  const isNewNarration = !!view.scene?.narration && view.scene.narration !== state.lastFxNarration;
  state.view = view;
  renderTopbarContext();
  if (view.aiProvider && $("#providerSelect").querySelector(`option[value="${CSS.escape(view.aiProvider)}"]`)) {
    $("#providerSelect").value = view.aiProvider;
    try { localStorage.setItem(PROVIDER_KEY, view.aiProvider); } catch { /* optional */ }
  }

  // Szenen-Panel: bewusst dauerhaft 8-Bit-Retro (kein KI-Bild-Upgrade mehr —
  // das Pixel-Panel IST der Stil, keine Übergangslösung).
  if (view.panel?.src) {
    $("#panelImg").src = view.panel.src;
    $("#panelImg").alt = view.panel.alt || "";
    $("#panelCaption").textContent = view.panel.caption || "";
  }

  // Kapitel-Überschrift: rein deterministisch aus Tag/Ort/aktivem Erzähl-
  // faden abgeleitet (kein KI-Text nötig), macht aus der reinen Zug-Liste
  // ein Logbuch mit Struktur. Ein neuer Tag beginnt ein neues Kapitel;
  // beim (Wieder-)Einstieg bekommt der aktuelle Tag immer eine Überschrift.
  if (view.day !== lastChapterDay) {
    lastChapterDay = view.day;
    const hook = view.story?.active?.find((t) => t.location === view.locationId);
    storyBuffer.push({
      type: "chapter",
      text: `Kapitel ${view.day} · ${view.location}`,
      subtitle: hook ? hook.hook : null,
    });
  }

  // Ortswechsel deterministisch sichtbar machen — unabhängig davon, wie klar
  // (oder unklar) die KI-Erzählung ihn beschrieben hat. Beantwortet "bin ich
  // von A nach B gegangen?" immer eindeutig, bevor die Szene selbst kommt.
  if (view.locationChange) {
    const lc = view.locationChange;
    const note = `🧭 Weitergezogen: ${lc.from} → ${lc.to}`;
    if (!storyBuffer.some((entry) => entry.text === note)) storyBuffer.push({ type: "waypoint", text: note });
  }

  // Story-Log (nur bei neuer Erzählung anhängen; Rendering weiter unten)
  if (isNewNarration) {
    storyBuffer.push({ type: "narration", text: view.scene.narration });
  }

  if (view.providerNotice?.type === "fallback") {
    const note = `⚠ ${view.providerNotice.provider}: ${view.providerNotice.message}. Die Szene wurde mit dem lokalen Ersatz-Erzähler gesichert.`;
    if (!storyBuffer.some((entry) => entry.text === note)) storyBuffer.push({ type: "event", text: note });
  }

  // Transparenz, wenn der Kontinuitäts-Wächter zweimal in Folge einen Entwurf
  // verworfen und auf die neutrale Übergangs-Szene zurückgefallen ist — genau
  // der Moment, der sich sonst wie ein unerklärter "Stillstand" anfühlt.
  if (view.continuityNotice?.fallback) {
    const reason = view.continuityNotice.issues?.[0] || "Kontinuitätsproblem";
    const note = `🩹 Die Szene blieb inhaltlich hängen (${reason}). Eine neutrale Übergangs-Szene wurde eingesetzt, damit nichts Unerklärtes passiert — versuch es mit einer klaren, konkreten Handlung.`;
    if (!storyBuffer.some((entry) => entry.text === note)) storyBuffer.push({ type: "event", text: note });
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
    if (!storyBuffer.some((entry) => entry.text.startsWith(`★ Levelaufstieg! Stufe ${lvl}.`)))
      storyBuffer.push({ type: "event", text: `★ Levelaufstieg! Stufe ${lvl}. Du hast einen Skillpunkt zu verteilen.` });
  }
  if (view.lastLoreUnlocks?.length) {
    view.lastLoreUnlocks.forEach((l) => {
      const note = `📜 Neue Erkenntnis: „${l.title}“`;
      if (!storyBuffer.some((e) => e.text === note)) storyBuffer.push({ type: "event", text: note });
    });
  }
  if (view.lastHakiUnlocks?.length) {
    view.lastHakiUnlocks.forEach((h) => {
      const note = `🌀 Dein Haki erwacht: ${h.name}!`;
      if (!storyBuffer.some((e) => e.text === note)) storyBuffer.push({ type: "event", text: note });
    });
  }

  if (view.news?.fresh) {
    const note = `🗞️ Die News-Möwe bringt die Tagesausgabe (Tag ${view.news.day}).`;
    if (!storyBuffer.some((e) => e.text === note)) storyBuffer.push({ type: "event", text: note });
  }

  // Story-Log rendern (nachdem alle Notizen dieses Zuges eingesammelt sind)
  const log = $("#storyLog");
  log.innerHTML = "";
  const visibleEntries = storyBuffer.slice(-12);
  const latestNarrationIndex = visibleEntries.findLastIndex((entry) => entry.type === "narration");
  visibleEntries.forEach((e, i) => {
    if (e.type === "chapter") {
      const div = el("div", "entry chapter");
      div.innerHTML = `<div class="chapter-title">${escapeHtml(e.text)}</div>`
        + (e.subtitle ? `<div class="chapter-subtitle">${escapeHtml(e.subtitle)}</div>` : "");
      log.appendChild(div);
      return;
    }
    log.appendChild(el("div", `entry ${e.type}${i === latestNarrationIndex ? " latest" : ""}`, escapeHtml(e.text)));
  });
  // Im Kampf darf das allgemeine Story-Log nicht den sichtbaren Ausschnitt
  // von den Kampfaktionen wegziehen. Beim Kampfbeginn führen wir stattdessen
  // nach dem Rendern einmal gezielt zur Kampfbox.
  renderDayBar(view);
  renderSceneContext(view);
  renderNews(view);
  renderKeyPanels(view);
  renderCombat(view);
  renderChoices(view);
  renderRecruit(view);
  renderSidebar(view);
  renderProfilePopover(view);
  renderSkillReadyIndicator(view);
  renderMap(view);
  renderTravel(view);
  renderActivities(view);
  renderSkillAlloc(view);
  renderLore(view);
  renderStoryThreads(view);
  renderFactions(view);
  renderCanon(view);
  renderDenDen(view);

  if (isInCombat && !wasInCombat) {
    requestAnimationFrame(() => {
      $("#combatBox").scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }

  // Neue Spielleitertexte beginnen wie eine neue Manga-Seite oben im
  // sichtbaren Lesebereich. Sticky Kopf- und Ortsleisten werden eingerechnet.
  if (isNewNarration && !isInCombat) {
    requestAnimationFrame(() => scrollLatestNarrationToTop(log.querySelector(".entry.narration.latest")));
  }

  $("#shareLink").value = `${location.origin}${location.pathname}?game=${view.gameId}`;
  $("#freeText").value = "";

  if (isNewNarration) {
    state.lastFxNarration = view.scene.narration;
    playSceneMangaFx(view, previousView);
    speak(view.scene.narration);
  }
}

function scrollLatestNarrationToTop(entry) {
  if (!entry) return;
  const topbarHeight = $(".topbar")?.offsetHeight || 0;
  const hudHeight = $("#sceneHud")?.offsetHeight || 0;
  const top = window.scrollY + entry.getBoundingClientRect().top - topbarHeight - hudHeight - 12;
  window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
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
  return !!view.clock?.locked || !!view.clock?.mustRest || inCombat(view) || view.recruitment?.status === "active";
}

function renderDayBar(view) {
  const bar = $("#dayBar");
  const place = $("#sceneLocation");
  const c = view.clock;
  clearInterval(state.clockTimer);
  place.innerHTML = `<span>📍 Aktueller Schauplatz</span><b>${escapeHtml(view.sceneLocation || view.location)}</b><small>${escapeHtml(view.location)}</small>`;

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
  const rest = el("button", "rest-btn" + (c.mustRest || c.isNight ? " urgent" : ""), "🌙 Rasten");
  rest.title = "Schlafplatz suchen und den Tag beenden";
  rest.disabled = inCombat(view);
  rest.onclick = () => post("/rest", {}, "Ich suche einen Schlafplatz und beende den Tag.");
  bar.appendChild(rest);
}

function renderSceneContext(view) {
  const box = $("#sceneContext");
  const npcs = view.presentNpcs || [];
  const localThread = (view.story?.active || []).find((thread) => thread.location === view.locationId);
  const people = npcs.length
    ? npcs.map((npc) => `<span class="scene-chip" title="${escapeHtml(npc.role || "Anwesend")}">${escapeHtml(npc.displayName)}${npc.role ? `<small>${escapeHtml(npc.role)}</small>` : ""}</span>`).join("")
    : `<span class="scene-empty">Niemand Handlungsrelevantes in unmittelbarer Nähe</span>`;
  // Deterministische Orts-Spur: zeigt immer eindeutig den zurückgelegten Weg,
  // egal wie klar (oder unklar) die Erzählung selbst den Wechsel beschreibt.
  const trail = view.locationTrail || [];
  const trailRow = trail.length
    ? `<div class="scene-context-row"><b>🧭 Weg</b><div class="scene-trail">${trail
        .map((t, i) => `<span class="trail-stop${i === trail.length - 1 ? " trail-current" : ""}">${escapeHtml(t.to)}</span>`)
        .join('<span class="trail-arrow">→</span>')}</div></div>`
    : "";
  box.innerHTML =
    trailRow +
    `<div class="scene-context-row"><b>◉ Vor Ort</b><div class="scene-chips">${people}</div></div>` +
    `<div class="scene-context-row"><b>⌁ Lokale Spur</b><div>${localThread ? `<strong>${escapeHtml(localThread.title)}</strong><small>${escapeHtml(localThread.hook)}</small>` : `<span class="scene-empty">Keine aktive Spur an diesem Ort</span>`}</div></div>`;
}

function playSceneMangaFx(view, previousView) {
  const panelKind = view.scene?.panels?.at(-1)?.kind;
  const risk = view.consequences?.actionRisk;
  const storyEvent = view.consequences?.storyEvent;
  const placeChanged = previousView && previousView.sceneLocation !== view.sceneLocation;
  let effect = null;
  if (inCombat(view) || panelKind === "duell" || panelKind === "explosion") effect = ["impact", "DON!!"];
  else if (view.lastCheck?.kritErfolg || panelKind === "sieg") effect = ["impact", "KRAK!"];
  else if (view.lastCheck?.kritFehler || risk?.discovered) effect = ["danger", "GASP!"];
  else if (panelKind === "enthuellung" || storyEvent?.type === "geloest") effect = ["reveal", "ENTHÜLLT!"];
  else if (storyEvent?.type === "fortschritt") effect = ["reveal", "SPUR!"];
  else if (placeChanged || panelKind === "ankunft") effect = ["speed", "NEUER ORT"];
  if (!effect) return;

  const [kind, word] = effect;
  // Haptik auf Mobilgeräten für die wirklich kritischen/gefährlichen Momente
  // (Kampf/Duell/Explosion, kritischer Erfolg/Sieg, kritischer Patzer/
  // entdecktes Risiko) — dieselbe Einstufung wie für den Manga-FX-Overlay,
  // damit keine zweite Erkennungslogik gepflegt werden muss. Enthüllung/
  // Ortswechsel sind erzählerisch, nicht körperlich spürbar -> keine Vibration.
  if (kind === "impact") vibrate([35, 60, 35]);
  else if (kind === "danger") vibrate(180);

  const overlay = $("#mangaFx");
  clearTimeout(state.fxTimer);
  overlay.className = `manga-fx fx-${kind}`;
  $("#mangaFxWord").textContent = word;
  // Erneutes Setzen in einem neuen Frame startet die CSS-Animation zuverlässig.
  requestAnimationFrame(() => overlay.classList.add("active"));
  state.fxTimer = setTimeout(() => overlay.classList.remove("active"), 1050);
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
  return !!(view?.combat?.active && !view.combat.over);
}

function renderChoices(view) {
  const choices = $("#choices");
  choices.innerHTML = "";
  const lock = actionLock(view);
  if (lock) {
    const notice = el("div", "action-lock", `<strong>${escapeHtml(lock.title)}</strong><span>${escapeHtml(lock.text)}</span>`);
    if (lock.action) {
      const button = el("button", "primary", lock.button);
      button.type = "button";
      button.onclick = lock.action;
      notice.appendChild(button);
    }
    choices.appendChild(notice);
    $("#freeText").disabled = true;
    $("#freeForm").querySelector("button").disabled = true;
    return;
  }
  const isLocked = actionsBlocked(view);
  (view.scene?.choices || []).forEach((c, index) => {
    const badge = c.skillCheck ? `<span class="c-check">${c.skillCheck.skill} · DC ${c.skillCheck.dc}</span>` : "";
    const node = el("button", "choice", `<kbd>${index + 1}</kbd><span class="choice-text">${escapeHtml(c.text)}${badge}</span>`);
    node.type = "button";
    node.setAttribute("aria-keyshortcuts", String(index + 1));
    node.title = `Taste ${index + 1}`;
    node.disabled = isLocked;
    node.onclick = () => post("/turn", { choiceId: c.id }, c.text);
    choices.appendChild(node);
  });
  $("#freeText").disabled = isLocked;
  $("#freeForm").querySelector("button").disabled = isLocked;
}

function actionLock(view) {
  if (inCombat(view)) return {
    title: "Der Kampf läuft",
    text: "Triff deine nächste Entscheidung in der Kampfbox.",
    button: "Zur Kampfbox",
    action: () => $("#combatBox").scrollIntoView({ behavior: "smooth", block: "center" }),
  };
  if (view.recruitment?.status === "active") return {
    title: "Das Gespräch läuft",
    text: "Beende die aktuelle Gesprächsphase, bevor du etwas anderes tust.",
    button: "Zum Gespräch",
    action: () => $("#recruitDialogue").scrollIntoView({ behavior: "smooth", block: "center" }),
  };
  if (view.clock?.locked) return {
    title: "Der neue Tag beginnt gleich",
    text: `Noch ${view.clock.secondsRemaining || 0} Sekunden bis zum Morgen.`,
  };
  if (view.clock?.mustRest) return {
    title: "Du bist erschöpft",
    text: "Raste jetzt, damit das Abenteuer am nächsten Morgen weitergeht.",
    button: "🌙 Jetzt rasten",
    action: () => post("/rest", {}, "Ich suche einen Schlafplatz und beende den Tag."),
  };
  return null;
}

function renderRecruit(view) {
  const rb = $("#recruitBox");
  const rl = $("#recruitList");
  const dialogueBox = $("#recruitDialogue");
  rl.innerHTML = "";
  dialogueBox.innerHTML = "";

  const dialogue = view.recruitment;
  if (dialogue) {
    rb.classList.add("hidden");
    dialogueBox.classList.remove("hidden");
    const finished = dialogue.status !== "active";
    const relation = dialogue.rapport >= 10 ? "starkes Vertrauen"
      : dialogue.rapport >= 6 ? "gewonnen"
        : dialogue.rapport >= 2 ? "interessiert"
          : dialogue.rapport >= -2 ? "unentschlossen"
            : "abweisend";
    const progress = Array.from({ length: dialogue.totalSteps }, (_, i) =>
      `<span class="recruit-step ${i < dialogue.step ? "done" : i === dialogue.step && !finished ? "current" : ""}">${i + 1}</span>`,
    ).join("");
    dialogueBox.innerHTML =
      `<div class="recruit-heading"><div><small>Fünfstufiges Crewgespräch</small><h3>${escapeHtml(dialogue.displayName)}</h3></div>` +
      `<span class="personality">${escapeHtml(dialogue.personality)}</span></div>` +
      `<div class="recruit-progress">${progress}</div>` +
      `<div class="recruit-stage"><b>${escapeHtml(dialogue.stageTitle)}</b>${dialogue.stagePrompt ? `<small>${escapeHtml(dialogue.stagePrompt)}</small>` : ""}</div>` +
      `<p class="recruit-reaction">${escapeHtml(dialogue.message)}</p>` +
      `<div class="rapport"><span>Beziehung: <b>${relation}</b></span><span>${dialogue.rapport > 0 ? "+" : ""}${dialogue.rapport}</span></div>` +
      `<div class="rapport-track"><span style="width:${Math.max(0, Math.min(100, ((dialogue.rapport + 12) / 32) * 100))}%"></span></div>`;

    if (!finished) {
      const options = el("div", "recruit-options");
      dialogue.options.forEach((option) => {
        const btn = el("button", "recruit-option",
          `<b>${escapeHtml(option.label)}</b><small>${escapeHtml(option.description)} · ${escapeHtml(option.skill)}</small>`);
        btn.onclick = () => post("/recruit", { npcId: dialogue.npcId, approachId: option.id }, option.label);
        options.appendChild(btn);
      });
      dialogueBox.appendChild(options);
    } else {
      const result = el("div", `recruit-result ${dialogue.joined ? "joined" : "rejected"}`,
        dialogue.joined ? "✓ Neues Crewmitglied" : "✕ Beitritt abgelehnt");
      const close = el("button", "primary", "Gespräch beenden");
      close.onclick = () => post("/recruit", { npcId: dialogue.npcId, approachId: "close" }, null);
      dialogueBox.append(result, close);
    }
    return;
  }

  dialogueBox.classList.add("hidden");
  if (view.recruitable?.length && !actionsBlocked(view)) {
    view.recruitable.forEach((r) => {
      const name = r.displayName || "Unbekannte Person";
      const row = el("div", "recruit-item", `<div class="r-info">${escapeHtml(name)} <small>${escapeHtml(r.role)} — ${escapeHtml(r.reason)}</small></div>`);
      const btn = el("button", null, "Gespräch beginnen");
      btn.onclick = () => post("/recruit", { npcId: r.id }, `Ich spreche ${name} auf meine Crew an.`);
      row.appendChild(btn);
      rl.appendChild(row);
    });
    rb.classList.remove("hidden");
  } else rb.classList.add("hidden");
}

async function combatAction(payload) {
  $("#turnError").textContent = "";
  hideRecapBanner();
  try {
    const view = await api(`/api/games/${state.gameId}/combat-action`, { method: "POST", body: JSON.stringify(payload) });
    renderScene(view);
  } catch (e) {
    $("#turnError").textContent = e.message;
  }
}

const STATUS_BADGE = { vergiftet: "☠️ Vergiftet", betaeubt: "😵 Betäubt" };
function statusBadges(statusList) {
  return (statusList || []).map((s) => `<span class="status-badge ${s}">${STATUS_BADGE[s] || s}</span>`).join("");
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
      `<div class="ce-top"><span>${escapeHtml(e.name)}</span><span>${e.hp}/${e.maxHp}</span></div><div class="bar"><div class="bar-fill foe" style="width:${w}%"></div></div>${statusBadges(e.status)}`);
    if (e.alive) node.onclick = () => { state.combatTarget = e.id; renderCombat(view); };
    enemyWrap.appendChild(node);
  });

  const p = cm.player;
  $("#combatPlayer").innerHTML =
    `<div class="ce-top"><span>${escapeHtml(p.name)}</span><span>❤️ ${p.hp}/${p.maxHp}</span></div>` +
    `<div class="bar"><div class="bar-fill hp" style="width:${pct(p.hp, p.maxHp)}%"></div></div>${statusBadges(p.status)}`;

  // Begleiter sind jetzt echte Kampfziele (eigene HP, können niedergehen) —
  // eigene Zeile pro Person statt nur einer Zahl ("+ 2 Crew").
  const partyWrap = $("#combatParty");
  partyWrap.innerHTML = "";
  (cm.party || []).forEach((member) => {
    const w = pct(member.hp, member.maxHp);
    const node = el("div", "combat-companion" + (member.alive ? "" : " dead"),
      `<div class="ce-top"><span>${escapeHtml(member.name)}</span><span>${member.hp}/${member.maxHp}</span></div>` +
      `<div class="bar"><div class="bar-fill hp" style="width:${w}%"></div></div>${statusBadges(member.status)}`);
    if (cm.options.canHeal && member.alive && member.hp < member.maxHp) {
      const healBtn = el("button", "combat-heal-btn", "✚");
      healBtn.title = `${member.name} verarzten`;
      healBtn.onclick = (ev) => { ev.stopPropagation(); combatAction({ action: "heal", targetId: member.id }); };
      node.appendChild(healBtn);
    }
    partyWrap.appendChild(node);
  });

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
    const b = el("button", "combat-btn", `⚔️ ${escapeHtml(skillLabel(sk))}`);
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
  if (cm.options.canHeal) {
    const heal = el("button", "combat-btn", "✚ Verarzten (selbst)");
    heal.title = "Nutzt deinen Medizin-Skill, um dich selbst zu verarzten. Einzelne Begleiter direkt über deren ✚-Knopf heilen.";
    heal.onclick = () => combatAction({ action: "heal" });
    btns.appendChild(heal);
  }
  const def = el("button", "combat-btn", "🛡️ Verteidigen");
  def.onclick = () => combatAction({ action: "defend" });
  btns.appendChild(def);
  const flee = el("button", "combat-btn", "🏃 Fliehen");
  flee.onclick = () => combatAction({ action: "flee" });
  btns.appendChild(flee);
}

// Kompakter Kurzstatus in der Kopfleiste (Profil-Icon) — dieselben Werte wie
// im Charakter-Panel des Logbuchs, aber ohne erst die ganze Schublade öffnen
// zu müssen.
function renderProfilePopover(view) {
  const c = view.character;
  $("#ppName").textContent = `${c.name} · Lvl ${c.level}`;
  $("#ppDay").textContent = `Tag ${view.day}`;
  $("#ppHpBar").style.width = pct(c.hp, c.maxHp) + "%";
  $("#ppHpText").textContent = `${c.hp}/${c.maxHp}`;
  const xpNext = 100 * c.level;
  $("#ppXpBar").style.width = pct(c.xp, xpNext) + "%";
  $("#ppXpText").textContent = `${c.xp}/${xpNext}`;
  $("#ppHeatBar").style.width = pct(c.heat, 100) + "%";
  $("#ppHeatText").textContent = `${c.heat}`;
  const st = c.standing;
  $("#ppStanding").textContent =
    st.typ === "marine_rang" ? `Marine-Rang: ${st.wert}` :
    st.typ === "ruf" ? `Ruf: ${st.wert}` : `Status: ${c.bountyTier.label}`;
  $("#ppBounty").innerHTML = `💰 Kopfgeld: <b>${c.bounty.toLocaleString("de-DE")} Ⓑ</b> <span class="tier t${c.bountyTier.level}">${c.bountyTier.label}</span>`;
}

// Fähigkeits-Icon in der Kopfleiste leuchtet auf, sobald ein Skillpunkt zu
// verteilen ist — derselbe Signalgeber wie der Punkt auf dem Skills-Tab.
function renderSkillReadyIndicator(view) {
  const points = view.character.unspentSkillPoints || 0;
  $("#skillReadyDot").classList.toggle("hidden", points <= 0);
  $("#skillReadyBtn").title = points > 0 ? `${points} Fähigkeitspunkt(e) verfügbar` : "Fertigkeiten";
  document.querySelector('.quick-nav [data-jump="panelSkills"]')?.classList.toggle("has-ping", points > 0);
}

function renderSidebar(view) {
  const c = view.character;
  $("#charTitle").textContent = `${c.name} · Lvl ${c.level}`;
  $("#charDay").textContent = `Tag ${view.day} · ${view.sceneLocation || view.location}`;
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
  Object.entries(c.attributes).forEach(([k, v]) => attrs.appendChild(el("div", "s-row", `<span>${escapeHtml(attrLabel(k))}</span><b>${v}</b>`)));

  const skills = $("#skills");
  skills.innerHTML = "";
  Object.entries(c.skills).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => {
    const prog = c.skillProgress?.[k] ? ` <small>(+${c.skillProgress[k]}/3)</small>` : "";
    skills.appendChild(el("div", "s-row", `<span>${escapeHtml(skillLabel(k))}</span><b>${v}${prog}</b>`));
  });
  if (!skills.children.length) skills.textContent = "—";

  const party = $("#party");
  party.innerHTML = "";
  if (view.party?.length) {
    view.party.forEach((p) => {
      const row = el("div", "li with-face");
      row.appendChild(npcFaceEl(p.name + p.role, 40)); // Crew gilt als wohlgesinnt -> Lächeln
      row.appendChild(el("div", null, `${escapeHtml(p.name)}<small>${escapeHtml(p.role)} · Loyalität ${p.loyalty ?? "?"}</small>`));
      party.appendChild(row);
    });
  } else party.textContent = "Noch niemand.";

  const mem = $("#memory");
  mem.innerHTML = "";
  const npcs = view.memory?.npcs || [];
  if (npcs.length) {
    npcs.slice(0, 12).forEach((n) => {
      const disp = n.gesinnung > 20 ? "friend" : n.gesinnung < -20 ? "foe" : "neutral";
      const note = n.letzteNotizen?.length ? n.letzteNotizen.at(-1) : "";
      const row = el("div", "li with-face");
      row.appendChild(npcFaceEl(n.id || n.name, n.gesinnung));
      row.appendChild(el("div", null, `${escapeHtml(n.name)} <span class="disp ${disp}">${n.gesinnung}</span><small>${escapeHtml(n.role || "")}${note ? " — " + escapeHtml(note) : ""}</small>`));
      mem.appendChild(row);
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
  const isLocked = actionsBlocked(view) || view.travelLocked;
  (view.travelOptions || []).forEach((o) => {
    const cost = o.hasShip ? "eigenes Schiff" : `${o.passageCost} Ⓑ`;
    const btn = el("button", "chip", `${escapeHtml(o.name)} · ${o.days}T · ${cost}`);
    btn.disabled = isLocked || !o.affordable;
    if (view.travelLocked) btn.title = "Du sitzt gerade fest — erst raus aus der Zelle.";
    else if (!o.affordable) btn.title = "Passage zu teuer";
    btn.onclick = () => post("/travel", { destId: o.to }, `Ich reise nach ${o.name}.`);
    list.appendChild(btn);
  });
  if (!list.children.length) list.textContent = "Keine Verbindungen.";
  if (view.travelLocked) list.appendChild(el("div", "hint", "🔒 Gerade nicht möglich — du sitzt fest."));
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
    // Kein Beitritt vom Sofa aus: nur wenn gerade ein echter Ansprechpartner da
    // ist (aktuell am richtigen Ort oder ein gerade lebendiges Angebot) — eine
    // Begegnung von vor Tagen reicht dafür allein nicht mehr aus.
    if (!aff && crew.available && !crew.affiliated) {
      if (crew.canJoinNow) {
        const btn = el("button", "chip", "Beitreten versuchen");
        btn.disabled = disabled;
        btn.onclick = () => post("/join-canon", { crewId: crew.id }, `Ich suche ${crew.name} auf und bitte um Aufnahme.`);
        row.appendChild(btn);
      } else {
        row.appendChild(el("div", "hint", "Nur möglich, wenn du gerade dort bist oder mit einem Vermittler sprichst."));
      }
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

document.addEventListener("keydown", (event) => {
  if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
  if (!["1", "2", "3", "4"].includes(event.key)) return;
  const target = event.target;
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement || target?.isContentEditable) return;
  if ($("#screen-game").classList.contains("hidden")) return;
  const buttons = [...document.querySelectorAll("#choices .choice:not(:disabled)")];
  const button = buttons[Number(event.key) - 1];
  if (!button) return;
  event.preventDefault();
  button.click();
});

// ---------- Mobile Drawer / PWA ----------
function closeNavMenu() {
  document.body.classList.remove("nav-menu-open");
  $("#menuToggle").setAttribute("aria-expanded", "false");
}
function closeProfilePopover() {
  $("#profilePopover").classList.add("hidden");
  $("#profileBtn").setAttribute("aria-expanded", "false");
}
function openDrawer() {
  closeNavMenu();
  closeProfilePopover();
  document.body.classList.add("drawer-open");
}
function closeDrawer() { document.body.classList.remove("drawer-open"); }

$("#menuToggle").addEventListener("click", () => {
  const willOpen = !document.body.classList.contains("nav-menu-open");
  closeDrawer();
  closeProfilePopover();
  document.body.classList.toggle("nav-menu-open", willOpen);
  $("#menuToggle").setAttribute("aria-expanded", String(willOpen));
});
$("#openLogbook").addEventListener("click", () => {
  if ($("#screen-game").classList.contains("hidden")) return;
  openDrawer();
});
$("#drawerOverlay").addEventListener("click", closeDrawer);
$("#recapClose").addEventListener("click", hideRecapBanner);
document.addEventListener("click", (event) => {
  if (!document.body.classList.contains("nav-menu-open")) return;
  if (event.target.closest("#navMenu, #menuToggle")) return;
  closeNavMenu();
});

// Schnellzugriff-Leiste im Logbuch: fungiert als Tab-Leiste statt als
// Sprungmarken-Liste. Vorher waren alle 13 Panels gleichzeitig gestapelt und
// die Leiste sprang nur (mit Aufblitzen) zwischen ihnen hin und her — das
// machte die Schublade sehr lang. Jetzt ist immer nur ein Panel sichtbar.
const LOG_TABS = [
  "panelCharacter", "panelNews", "panelThreads", "panelFactions", "panelMap",
  "panelActivities", "panelSkills", "panelLore", "panelParty", "panelCanon",
  "panelMemory", "panelInventory", "panelDenDen",
];
let activeLogTab = LOG_TABS[0];

function activateLogPanel(id) {
  if (!LOG_TABS.includes(id)) return;
  activeLogTab = id;
  LOG_TABS.forEach((pid) => $("#" + pid)?.classList.toggle("hidden", pid !== id));
  document.querySelectorAll(".quick-nav [data-jump]").forEach((btn) => {
    btn.setAttribute("aria-selected", String(btn.dataset.jump === id));
  });
}

document.querySelectorAll(".quick-nav [data-jump]").forEach((btn) => {
  btn.addEventListener("click", () => activateLogPanel(btn.dataset.jump));
});

// Profil-Icon: kompakter Popover mit Kurzstatus, ohne die ganze Schublade
// öffnen zu müssen.
$("#profileBtn").addEventListener("click", () => {
  const willOpen = $("#profilePopover").classList.contains("hidden");
  closeNavMenu();
  if (willOpen) {
    $("#profilePopover").classList.remove("hidden");
    $("#profileBtn").setAttribute("aria-expanded", "true");
  } else {
    closeProfilePopover();
  }
});
document.addEventListener("click", (event) => {
  if ($("#profilePopover").classList.contains("hidden")) return;
  if (event.target.closest("#profilePopover, #profileBtn")) return;
  closeProfilePopover();
});

// Fähigkeits-Icon: öffnet das Logbuch direkt auf dem Skills-Tab.
$("#skillReadyBtn").addEventListener("click", () => {
  if ($("#screen-game").classList.contains("hidden")) return;
  activateLogPanel("panelSkills");
  openDrawer();
});

// Schwarz-Weiß invertieren (paper <-> ink), Wahl merken.
$("#themeToggle").addEventListener("click", () => {
  const cur = document.documentElement.getAttribute("data-theme") === "ink" ? "ink" : "paper";
  const next = cur === "ink" ? "paper" : "ink";
  document.documentElement.setAttribute("data-theme", next);
  try { localStorage.setItem("ops-theme", next); } catch (e) {}
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", next === "ink" ? "#0f0f0f" : "#e7e4dc");
  closeNavMenu();
});

// ---------- Sprachausgabe (Gemini-TTS, optional) ----------
// Nicht-blockierend wie das KI-Bild-Panel: der Text steht sofort da, die
// Stimme trifft kurz danach ein. Schlägt die Anfrage fehl (kein Kontingent,
// Netzwerkfehler), bleibt es einfach still — kein Fehlerbanner, das den
// Spielfluss stört.
const TTS_KEY = "aops-tts";
let ttsOn = false;
try { ttsOn = localStorage.getItem(TTS_KEY) === "1"; } catch { /* optional */ }
let currentSpeech = null;

function updateTtsToggleLabel() {
  const btn = $("#ttsToggle");
  if (!btn) return;
  btn.textContent = `🔊 Sprachausgabe: ${ttsOn ? "An" : "Aus"}`;
  btn.setAttribute("aria-pressed", String(ttsOn));
}

function stopSpeech() {
  if (currentSpeech) {
    currentSpeech.pause();
    currentSpeech = null;
  }
}

async function speak(text) {
  if (!ttsOn || !text) return;
  stopSpeech();
  try {
    const res = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    const data = await res.json();
    if (!data?.audio) return;
    const audio = new Audio(`data:audio/wav;base64,${data.audio}`);
    currentSpeech = audio;
    audio.play().catch(() => {}); // Autoplay-Sperren o. Ä. -> einfach still bleiben
  } catch {
    /* Sprachausgabe ist ein Bonus, kein Kernfeature — Fehler bleiben leise. */
  }
}

$("#ttsToggle").addEventListener("click", () => {
  ttsOn = !ttsOn;
  try { localStorage.setItem(TTS_KEY, ttsOn ? "1" : "0"); } catch { /* optional */ }
  updateTtsToggleLabel();
  if (!ttsOn) stopSpeech();
  closeNavMenu();
});

// Das rechte Logbuch öffnet nur noch mit einer echten Randgeste. Horizontale
// Bewegungen auf Antworten, Buttons oder Eingaben dürfen niemals das Menü öffnen.
let _tsx = 0, _tsy = 0, _edgeSwipe = false;
window.addEventListener("touchstart", (e) => {
  const t = e.touches[0];
  _tsx = t.clientX;
  _tsy = t.clientY;
  const interactive = e.target instanceof Element && e.target.closest("#choices, .action-dock, input, textarea, select, button, [role='button']");
  _edgeSwipe = !interactive && _tsx >= window.innerWidth - 32;
}, { passive: true });
window.addEventListener("touchend", (e) => {
  const t = e.changedTouches[0];
  const dx = t.clientX - _tsx, dy = t.clientY - _tsy;
  if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
    if (document.body.classList.contains("drawer-open") && dx > 0) closeDrawer();
    else if (_edgeSwipe && dx < 0) openDrawer();
  }
  _edgeSwipe = false;
}, { passive: true });
window.addEventListener("touchcancel", () => { _edgeSwipe = false; }, { passive: true });

// Service-Worker (installierbare Web-App / Offline-Shell)
if ("serviceWorker" in navigator) {
  let swRefreshing = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (swRefreshing) return;
    swRefreshing = true;
    location.reload(); // neue App-Shell sofort sichtbar machen
  });
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" })
      .then((registration) => registration.update())
      .catch(() => {});
  });
}

// ---------- Helfer ----------
function pct(a, b) { return Math.max(0, Math.min(100, Math.round((a / (b || 1)) * 100))); }
function signed(n) { return n >= 0 ? "+" + n : "" + n; }
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
}
