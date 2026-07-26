const MODULE_ID = "vtools-tension-pool";
const LEGACY_MODULE_ID = "tension-pool-2";
function getSetting(key) {
  return game.settings.get(MODULE_ID, key);
}
function setSetting(key, value) {
  return game.settings.set(MODULE_ID, key, value);
}
function safeGetSetting(key, fallback) {
  try {
    return getSetting(key) || fallback;
  } catch {
    return fallback;
  }
}
function registerSetting(key, config) {
  game.settings.register(MODULE_ID, key, config);
}
function getGMWhisperIDs() {
  return game.users.filter((u) => u.isGM).map((u) => u.id);
}
function isGM() {
  return game.user.isGM;
}
const ICON_THEMES = {
  skull: { tension: "fa-solid fa-skull", noTension: "fa-regular fa-skull" },
  square: { tension: "fa-solid fa-square-exclamation", noTension: "fa-regular fa-square" },
  thunder: { tension: "fa-solid fa-bolt", noTension: "fa-solid fa-sun" }
};
function buildPoolContext(diceCount, theme, collapsed, isGM2, i18n) {
  const iconSet = ICON_THEMES[theme] ?? ICON_THEMES.skull;
  const icons = [];
  if (diceCount === 0) {
    icons.push({ class: iconSet.noTension });
  } else {
    for (let i = 0; i < diceCount; i++) {
      icons.push({ class: iconSet.tension });
    }
  }
  const tensionTooltip = diceCount === 0 ? i18n.localize("VTP.NoTension") : i18n.format("VTP.TensionCount", { count: String(diceCount) });
  return {
    isGM: isGM2,
    icons,
    diceCount,
    compactDisplayIcon: diceCount === 0 ? iconSet.noTension : iconSet.tension,
    tensionTooltip,
    collapsed,
    toggleIcon: collapsed ? "fa-solid fa-chevron-up" : "fa-solid fa-chevron-down",
    // Raw i18n key — Foundry's data-tooltip attribute auto-localizes it
    toggleTooltip: collapsed ? "VTP.Expand" : "VTP.Compact"
  };
}
const FACE_COUNTS = {
  d4: 4,
  d6: 6,
  d8: 8,
  d10: 10,
  d12: 12,
  d20: 20
};
const THEME_SYMBOLS = {
  skull: "☠",
  // ☠
  square: "❗",
  // ❗
  thunder: "⚡"
  // ⚡
};
class TensionDie extends foundry.dice.terms.Die {
  constructor(termData = {}) {
    const diceSize = TensionDie._getDiceSize();
    termData.faces = FACE_COUNTS[diceSize] ?? 6;
    super(termData);
  }
  static DENOMINATION = "t";
  get total() {
    return this.results.filter((r) => !r.discarded && r.result === 1).length;
  }
  static _getDiceSize() {
    return safeGetSetting("diceSize", "d6");
  }
}
function registerTensionDie() {
  CONFIG.Dice.terms["t"] = TensionDie;
}
function registerDiceSoNice(dice3d) {
  dice3d.addSystem(
    { id: MODULE_ID, name: "VTools Tension Pool" },
    "default"
  );
  dice3d.addColorset({
    name: MODULE_ID,
    description: "Tension Pool",
    category: "VTools Tension Pool",
    foreground: "#ffff00",
    background: "#1a1a1a",
    outline: "#000000",
    edge: "#1a1a1a",
    texture: "none",
    material: "plastic",
    visibility: "visible"
  }, "default");
  updateDiceSoNicePreset(dice3d);
}
function updateDiceSoNicePreset(dice3d) {
  const diceSize = safeGetSetting("diceSize", "d6");
  const faces = FACE_COUNTS[diceSize] ?? 6;
  const iconTheme = safeGetSetting("iconTheme", "skull");
  const symbol = THEME_SYMBOLS[iconTheme] ?? THEME_SYMBOLS.skull;
  const labels = [symbol, ...Array(faces - 1).fill("")];
  dice3d.addDicePreset({
    type: "dt",
    labels,
    system: MODULE_ID,
    fontScale: 1.5,
    colorset: MODULE_ID
  }, diceSize);
}
async function rollTensionPool(diceCount) {
  if (diceCount <= 0) {
    return { diceCount: 0, results: [], hasComplication: false, complicationCount: 0 };
  }
  const hasDSN = game.modules.get("dice-so-nice")?.active && game.dice3d;
  let results;
  if (hasDSN) {
    const roll = new Roll(`${diceCount}dt`);
    await roll.evaluate();
    results = roll.terms[0].results.map((r) => r.result).sort();
    await game.dice3d.showForRoll(roll, game.user, true);
  } else {
    const diceSize = getSetting("diceSize") || "d6";
    const roll = new Roll(`${diceCount}${diceSize}`);
    await roll.evaluate();
    results = roll.terms[0].results.map((r) => r.result).sort();
  }
  const complicationCount = results.filter((r) => r === 1).length;
  const hasComplication = complicationCount > 0;
  const i18n = game.i18n;
  const icons = hasComplication ? results.filter((r) => r === 1).map(() => '<i class="vtp-die vtp-die-hit" data-vtp-icon="tension"></i>').join("") : '<i class="vtp-die vtp-die-miss" data-vtp-icon="noTension"></i>';
  const outcome = hasComplication ? `<strong class="vtp-result-hit">${i18n.localize("VTP.Complication")}</strong>` : `<strong class="vtp-result-safe">${i18n.localize("VTP.Safe")}</strong>`;
  const gmOnly = getSetting("rollVisibility") === "gmOnly";
  const whisper = gmOnly ? getGMWhisperIDs() : [];
  await ChatMessage.create({
    content: `
      <div class="vtp-roll">
        <div class="vtp-dice-results">${icons}</div>
        <div>${outcome}</div>
      </div>
    `.trim(),
    speaker: { alias: i18n.localize("VTP.Title") },
    whisper
  });
  if (gmOnly) {
    await ChatMessage.create({
      content: `
        <div class="vtp-roll">
          <div class="vtp-dice-results"><i class="vtp-die vtp-die-hidden fa-solid fa-eye-slash"></i><i class="vtp-die vtp-die-hidden fa-solid fa-eye-slash"></i><i class="vtp-die vtp-die-hidden fa-solid fa-eye-slash"></i></div>
          <div><strong class="vtp-result-hidden">${i18n.localize("VTP.RollHidden")}</strong></div>
        </div>
      `.trim(),
      speaker: { alias: i18n.localize("VTP.Title") }
    });
  }
  const rollResult = { diceCount, results, hasComplication, complicationCount };
  Hooks.callAll("vtoolsTensionPoolRolled", rollResult);
  if (hasComplication) {
    Hooks.callAll("vtoolsTensionPoolComplication", rollResult);
  }
  return rollResult;
}
const THEME_CLASSES = ["theme-light", "theme-dark"];
function getColorScheme() {
  let chosen;
  try {
    const uiConfig = game.settings?.get("core", "uiConfig");
    chosen = uiConfig?.colorScheme?.interface || uiConfig?.colorScheme?.applications;
  } catch {
  }
  if (chosen === "light" || chosen === "dark") return chosen;
  const body = document.body;
  if (body?.classList.contains("theme-light")) return "light";
  if (body?.classList.contains("theme-dark")) return "dark";
  return window.matchMedia?.("(prefers-color-scheme: light)").matches ? "light" : "dark";
}
function applyTheme(el, scheme = getColorScheme()) {
  if (!el) return;
  el.classList.add("themed");
  el.classList.remove(...THEME_CLASSES);
  el.classList.add(`theme-${scheme}`);
}
const subscribers = /* @__PURE__ */ new Set();
let observer = null;
let media = null;
let lastScheme = null;
function notify() {
  const scheme = getColorScheme();
  if (scheme === lastScheme) return;
  lastScheme = scheme;
  for (const cb of [...subscribers]) cb(scheme);
}
function onColorSchemeChange(cb) {
  subscribers.add(cb);
  lastScheme ??= getColorScheme();
  if (!observer) {
    observer = new MutationObserver(notify);
    observer.observe(document.body, { attributes: true, attributeFilter: ["class"] });
  }
  if (!media && window.matchMedia) {
    media = window.matchMedia("(prefers-color-scheme: light)");
    media.addEventListener("change", notify);
  }
  return () => {
    subscribers.delete(cb);
    if (subscribers.size) return;
    observer?.disconnect();
    observer = null;
    media?.removeEventListener("change", notify);
    media = null;
  };
}
const DEFAULT_SOUNDS = {
  rise: `modules/${MODULE_ID}/assets/sounds/freesound_community-pearl-mlx-16-floor-tom-104999.mp3`,
  ease: `modules/${MODULE_ID}/assets/sounds/diogodasilvasimoes-magical-notification-tone-soft-fantasy-digital-alert-438278.mp3`,
  break: `modules/${MODULE_ID}/assets/sounds/soundreality-evil-bell-343686.mp3`
};
function showBanner(data) {
  if (data.type === "fade") return;
  const i18n = game.i18n;
  const isDramatic = data.type === "break";
  const container = document.createElement("div");
  container.classList.add("vtp-announcement");
  if (isDramatic) container.classList.add("vtp-announcement-dramatic");
  applyTheme(container);
  const text = (() => {
    switch (data.type) {
      case "rise":
        return `${i18n.localize("VTP.Announce.TensionRises")} (${data.current}/${data.max})`;
      case "ease":
        return `${i18n.localize("VTP.Announce.TensionEases")} (${data.current}/${data.max})`;
      case "break":
        return i18n.localize("VTP.Announce.TensionBreaks");
    }
  })();
  const span = document.createElement("span");
  span.classList.add("vtp-announcement-text");
  span.textContent = text;
  container.appendChild(span);
  document.getElementById("interface")?.appendChild(container);
  const duration = isDramatic ? 3e3 : 2e3;
  setTimeout(() => container.remove(), duration);
}
function playSound(type, gmOnly = false) {
  if (!getSetting("soundEnabled")) return;
  const src = (() => {
    switch (type) {
      case "rise":
        return getSetting("addDieSound") || DEFAULT_SOUNDS.rise;
      case "ease":
        return getSetting("removeDieSound") || DEFAULT_SOUNDS.ease;
      case "break":
        return getSetting("rollSound") || DEFAULT_SOUNDS.break;
      case "fade":
        return "";
    }
  })();
  if (!src) return;
  const socketOptions = gmOnly ? { recipients: getGMWhisperIDs() } : true;
  foundry.audio.AudioHelper.play({ src, volume: 0.8, loop: false }, socketOptions);
}
async function postAnnouncementChat(data) {
  const i18n = game.i18n;
  let content;
  switch (data.type) {
    case "rise":
      content = `<em>${i18n.localize("VTP.Announce.TensionRises")} (${data.current}/${data.max})</em>`;
      break;
    case "ease":
      content = `<em>${i18n.localize("VTP.Announce.TensionEases")} (${data.current}/${data.max})</em>`;
      break;
    case "break":
      content = `<strong>${i18n.localize("VTP.Announce.PoolOverflows")}</strong>`;
      break;
    case "fade":
      content = `<em>${i18n.localize("VTP.Announce.TensionFades")}</em>`;
      break;
  }
  await ChatMessage.create({
    content: `<div class="vtp-announce vtp-announce-${data.type}">${content}</div>`,
    speaker: { alias: i18n.localize("VTP.Title") },
    whisper: data.gmOnly ? getGMWhisperIDs() : []
  });
}
function broadcastAnnouncement(data) {
  game.socket.emit(`module.${MODULE_ID}`, {
    action: "announcement",
    data
  });
}
async function announce(type, current, max) {
  const gmOnly = getSetting("rollVisibility") === "gmOnly";
  const data = { type, current, max, gmOnly };
  playSound(type, gmOnly);
  showBanner(data);
  broadcastAnnouncement(data);
  await postAnnouncementChat(data);
}
function computeAddSteps(count, currentCount, max) {
  if (count <= 0 || max <= 0) return [];
  const steps = [];
  let remaining = count;
  let current = Math.min(Math.max(Number.isFinite(currentCount) ? Math.floor(currentCount) : 0, 0), max);
  while (remaining > 0) {
    const space = max - current;
    if (space <= 0) {
      steps.push({ type: "overflow", added: 0, newCount: max, max });
      current = 0;
      continue;
    }
    const toAdd = Math.min(remaining, space);
    const newCount = current + toAdd;
    remaining -= toAdd;
    if (newCount >= max) {
      steps.push({ type: "overflow", added: toAdd, newCount: max, max });
      current = 0;
    } else {
      steps.push({ type: "add", added: toAdd, newCount, max });
      current = newCount;
    }
  }
  return steps;
}
function sanitize(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.floor(value);
}
function requireGM() {
  if (isGM()) return true;
  ui.notifications?.warn(game.i18n.localize("VTP.GMOnly"));
  return false;
}
function createTensionPoolAPI() {
  async function rollAndClear(diceCount) {
    const result = await rollTensionPool(diceCount);
    await setSetting("diceCount", 0);
    return result;
  }
  return {
    async add(count = 1) {
      if (!requireGM()) return { diceCount: getSetting("diceCount"), rolls: [] };
      count = sanitize(count);
      if (count <= 0) return { diceCount: getSetting("diceCount"), rolls: [] };
      const clamped = Math.min(count, 50);
      const current = getSetting("diceCount");
      const max = getSetting("poolSize");
      const steps = computeAddSteps(clamped, current, max);
      const rolls = [];
      for (const step of steps) {
        if (step.type === "overflow") {
          if (step.added > 0) await setSetting("diceCount", step.newCount);
          await announce("break", step.newCount, max);
          rolls.push(await rollAndClear(max));
        } else {
          await setSetting("diceCount", step.newCount);
          await announce("rise", step.newCount, max);
        }
      }
      return { diceCount: getSetting("diceCount"), rolls };
    },
    async remove(count = 1) {
      if (!requireGM()) return;
      count = sanitize(count);
      if (count <= 0) return;
      const current = getSetting("diceCount");
      if (current <= 0) return;
      const max = getSetting("poolSize");
      const newCount = Math.max(current - count, 0);
      await setSetting("diceCount", newCount);
      await announce("ease", newCount, max);
    },
    async roll() {
      if (!requireGM()) return;
      const current = getSetting("diceCount");
      const max = getSetting("poolSize");
      await announce("break", current, max);
      return rollAndClear(Math.max(current, 1));
    },
    async clear() {
      if (!requireGM()) return;
      const max = getSetting("poolSize");
      await announce("fade", 0, max);
      await setSetting("diceCount", 0);
    },
    async customRoll(count) {
      if (!requireGM()) return;
      count = sanitize(count);
      const max = getSetting("poolSize");
      const clamped = Math.min(Math.max(count, 1), 50);
      await announce("break", clamped, max);
      return rollTensionPool(clamped);
    },
    getDiceCount() {
      return getSetting("diceCount");
    },
    getPoolSize() {
      return getSetting("poolSize");
    }
  };
}
const MIN_VISIBLE_PX = 40;
function pctToPixels(leftPct, topPct, vpWidth, vpHeight) {
  return {
    left: Math.round(leftPct * vpWidth),
    top: Math.round(topPct * vpHeight)
  };
}
function pixelsToPct(left, top, vpWidth, vpHeight) {
  return {
    leftPct: vpWidth > 0 ? left / vpWidth : 0.5,
    topPct: vpHeight > 0 ? top / vpHeight : 0.5
  };
}
function clampToViewport(left, top, elWidth, vpWidth, vpHeight) {
  return {
    left: Math.round(Math.max(MIN_VISIBLE_PX - elWidth, Math.min(left, vpWidth - MIN_VISIBLE_PX))),
    top: Math.round(Math.max(0, Math.min(top, vpHeight - MIN_VISIBLE_PX)))
  };
}
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
class TensionPoolApp extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: MODULE_ID,
    classes: [MODULE_ID],
    window: {
      frame: false,
      positioned: false
    },
    actions: {
      addDie: TensionPoolApp._onAddDie,
      removeDie: TensionPoolApp._onRemoveDie,
      rollPool: TensionPoolApp._onRollPool,
      clearPool: TensionPoolApp._onClearPool,
      customRoll: TensionPoolApp._onCustomRoll,
      bulkAdd: TensionPoolApp._onBulkAdd,
      togglePool: TensionPoolApp._onTogglePool
    }
  };
  static PARTS = {
    pool: {
      template: `modules/${MODULE_ID}/templates/pool.hbs`
    }
  };
  static _api = null;
  static _getAPI() {
    if (!TensionPoolApp._api) {
      TensionPoolApp._api = createTensionPoolAPI();
    }
    return TensionPoolApp._api;
  }
  _previousDiceCount = -1;
  _renderDebounceTimer = null;
  _dragState = null;
  _boundDragStart = null;
  _boundOnResize = null;
  _unwatchTheme = null;
  /**
   * Debounced render — batches rapid setting changes (e.g. fast add/remove)
   * into a single re-render after 100ms of quiet.
   */
  debouncedRender() {
    if (this._renderDebounceTimer) clearTimeout(this._renderDebounceTimer);
    this._renderDebounceTimer = setTimeout(() => {
      this._renderDebounceTimer = null;
      this.render({ force: true });
    }, 100);
  }
  async _onRender(_context, _options) {
    const el = this.element;
    if (!el) return;
    applyTheme(el);
    if (!this._unwatchTheme) {
      this._unwatchTheme = onColorSchemeChange(
        (scheme) => applyTheme(this.element, scheme)
      );
    }
    const saved = getSetting("windowPosition");
    el.style.position = "fixed";
    const elW = el.offsetWidth || 0;
    const elH = el.offsetHeight || 0;
    const vpW = window.innerWidth;
    const vpH = window.innerHeight;
    if (saved) {
      const pixels = pctToPixels(saved.leftPct, saved.topPct, vpW, vpH);
      if (pixels.left + elW < 0 || pixels.left > vpW || pixels.top + elH < 0 || pixels.top > vpH) {
        el.style.left = `${Math.round((vpW - elW) / 2)}px`;
        el.style.top = `${Math.round((vpH - elH) / 2)}px`;
        setSetting("windowPosition", null);
      } else {
        const clamped = clampToViewport(pixels.left, pixels.top, elW, vpW, vpH);
        el.style.left = `${clamped.left}px`;
        el.style.top = `${clamped.top}px`;
      }
    } else if (this._previousDiceCount === -1) {
      el.style.left = `${Math.round((vpW - elW) / 2)}px`;
      el.style.top = `${Math.round((vpH - elH) / 2)}px`;
    }
    const wrapper = el.querySelector(".vtp-wrapper");
    if (wrapper) {
      if (this._boundDragStart) wrapper.removeEventListener("pointerdown", this._boundDragStart);
      this._boundDragStart = this._onDragStart.bind(this);
      wrapper.addEventListener("pointerdown", this._boundDragStart);
    }
    if (!this._boundOnResize) {
      this._boundOnResize = () => this._clampToCurrentViewport();
      window.addEventListener("resize", this._boundOnResize);
    }
    const currentCount = getSetting("diceCount");
    if (this._previousDiceCount >= 0 && this._previousDiceCount !== currentCount) {
      const icons = el.querySelectorAll(".vtp-icons i, .vtp-compact-icons i");
      if (icons) {
        const animClass = currentCount > this._previousDiceCount ? "vtp-pulse" : "vtp-fade";
        icons.forEach((icon) => {
          icon.classList.add(animClass);
          icon.addEventListener("animationend", () => icon.classList.remove(animClass), { once: true });
        });
      }
    }
    this._previousDiceCount = currentCount;
  }
  /**
   * The resize listener is attached to window, which outlives the application, so
   * it has to be released explicitly — otherwise every close/reopen cycle leaks one.
   */
  _onClose(_options) {
    if (this._boundOnResize) {
      window.removeEventListener("resize", this._boundOnResize);
      this._boundOnResize = null;
    }
    if (this._renderDebounceTimer) {
      clearTimeout(this._renderDebounceTimer);
      this._renderDebounceTimer = null;
    }
    if (this._unwatchTheme) {
      this._unwatchTheme();
      this._unwatchTheme = null;
    }
    this._previousDiceCount = -1;
  }
  _onDragStart(event) {
    if (event.target.closest("button")) return;
    const el = this.element;
    if (!el) return;
    this._dragState = {
      startX: event.clientX,
      startY: event.clientY,
      startLeft: parseInt(el.style.left, 10) || 0,
      startTop: parseInt(el.style.top, 10) || 0
    };
    const onMove = (e) => {
      if (!this._dragState) return;
      const dx = e.clientX - this._dragState.startX;
      const dy = e.clientY - this._dragState.startY;
      el.style.left = `${this._dragState.startLeft + dx}px`;
      el.style.top = `${this._dragState.startTop + dy}px`;
    };
    const onUp = () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      if (this._dragState) {
        const rawLeft = parseInt(el.style.left, 10);
        const rawTop = parseInt(el.style.top, 10);
        if (!isNaN(rawLeft) && !isNaN(rawTop)) {
          const clamped = clampToViewport(rawLeft, rawTop, el.offsetWidth, window.innerWidth, window.innerHeight);
          el.style.left = `${clamped.left}px`;
          el.style.top = `${clamped.top}px`;
          setSetting("windowPosition", pixelsToPct(clamped.left, clamped.top, window.innerWidth, window.innerHeight));
        }
        this._dragState = null;
      }
    };
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
  }
  _clampToCurrentViewport() {
    const el = this.element;
    if (!el) return;
    const saved = getSetting("windowPosition");
    if (!saved) return;
    const elW = el.offsetWidth;
    const elH = el.offsetHeight;
    const vpW = window.innerWidth;
    const vpH = window.innerHeight;
    const pixels = pctToPixels(saved.leftPct, saved.topPct, vpW, vpH);
    if (pixels.left + elW < 0 || pixels.left > vpW || pixels.top + elH < 0 || pixels.top > vpH) {
      el.style.left = `${Math.round((vpW - elW) / 2)}px`;
      el.style.top = `${Math.round((vpH - elH) / 2)}px`;
      setSetting("windowPosition", null);
    } else {
      const clamped = clampToViewport(pixels.left, pixels.top, elW, vpW, vpH);
      el.style.left = `${clamped.left}px`;
      el.style.top = `${clamped.top}px`;
    }
  }
  async _prepareContext(_options) {
    return buildPoolContext(
      getSetting("diceCount"),
      getSetting("iconTheme"),
      getSetting("collapsed"),
      game.user.isGM,
      game.i18n
    );
  }
  static async _onAddDie() {
    await TensionPoolApp._getAPI().add();
  }
  static async _onRemoveDie() {
    await TensionPoolApp._getAPI().remove();
  }
  static async _onRollPool() {
    await TensionPoolApp._getAPI().roll();
  }
  static async _onClearPool() {
    await TensionPoolApp._getAPI().clear();
  }
  static async _onTogglePool() {
    const current = getSetting("collapsed");
    const next = !current;
    this.element?.classList.toggle("vtp-collapsed", next);
    await setSetting("collapsed", next);
  }
  static async _onBulkAdd() {
    const input = await foundry.applications.api.DialogV2.prompt({
      window: { title: game.i18n.localize("VTP.BulkAdd.Title") },
      content: `<form><div class="form-group"><label>${game.i18n.localize("VTP.BulkAdd.Label")}</label><input type="number" name="count" value="1" min="1" max="50" autofocus></div></form>`,
      ok: {
        label: game.i18n.localize("VTP.AddDie"),
        callback: (_event, button) => {
          return parseInt(button.form.elements.count.value, 10);
        }
      }
    });
    if (!input || input <= 0) return;
    await TensionPoolApp._getAPI().add(input);
  }
  static async _onCustomRoll() {
    const max = getSetting("poolSize");
    const input = await foundry.applications.api.DialogV2.prompt({
      window: { title: game.i18n.localize("VTP.CustomRoll.Title") },
      content: `<form><div class="form-group"><label>${game.i18n.localize("VTP.CustomRoll.Label")}</label><input type="number" name="count" value="${max}" min="1" max="50" autofocus></div></form>`,
      ok: {
        label: game.i18n.localize("VTP.Roll"),
        callback: (_event, button) => {
          return parseInt(button.form.elements.count.value, 10);
        }
      }
    });
    if (input && input > 0) {
      await TensionPoolApp._getAPI().customRoll(input);
    }
  }
}
const FOLDER_NAME = "VTools Tension Pool (Examples)";
const MACROS = [
  {
    name: "TP: Add Die",
    command: `game.modules.get("${MODULE_ID}")?.api?.add();`
  },
  {
    name: "TP: Remove Die",
    command: `game.modules.get("${MODULE_ID}")?.api?.remove();`
  },
  {
    name: "TP: Add (3)",
    command: `game.modules.get("${MODULE_ID}")?.api?.add(3);`
  },
  {
    name: "TP: Remove (2)",
    command: `game.modules.get("${MODULE_ID}")?.api?.remove(2);`
  },
  {
    name: "TP: Roll Pool",
    command: `game.modules.get("${MODULE_ID}")?.api?.roll();`
  },
  {
    name: "TP: Clear Pool",
    command: `game.modules.get("${MODULE_ID}")?.api?.clear();`
  },
  {
    name: "TP: Custom Roll (4)",
    command: `game.modules.get("${MODULE_ID}")?.api?.customRoll(4);`
  },
  {
    name: "TP: Get Dice Count",
    command: `const count = game.modules.get("${MODULE_ID}")?.api?.getDiceCount();
ui.notifications.info("Dice count: " + count);`
  },
  {
    name: "TP: Get Pool Size",
    command: `const size = game.modules.get("${MODULE_ID}")?.api?.getPoolSize();
ui.notifications.info("Pool size: " + size);`
  }
];
function findFolder() {
  return game.folders.find(
    (f) => f.name === FOLDER_NAME && f.type === "Macro"
  );
}
async function syncExampleMacros() {
  const g = game;
  let folder = findFolder();
  if (!folder) {
    folder = await Folder.create({
      name: FOLDER_NAME,
      type: "Macro",
      sorting: "a"
    });
  }
  const existing = g.macros.filter((m) => m.folder?.id === folder.id);
  if (existing.length > 0) {
    const ids = existing.map((m) => m.id);
    await Macro.deleteDocuments(ids);
  }
  const createData = MACROS.map((def) => ({
    name: def.name,
    type: "script",
    scope: "global",
    command: def.command,
    folder: folder.id
  }));
  await Macro.createDocuments(createData);
  console.log(`VTools Tension Pool | Example macros installed in "${FOLDER_NAME}"`);
}
async function deleteExampleMacros() {
  const g = game;
  const folder = findFolder();
  if (!folder) return;
  const existing = g.macros.filter((m) => m.folder?.id === folder.id);
  if (existing.length > 0) {
    const ids = existing.map((m) => m.id);
    await Macro.deleteDocuments(ids);
  }
  await folder.delete();
  console.log(`VTools Tension Pool | Example macros removed`);
}
const WORLD_KEYS = [
  "poolSize",
  "diceSize",
  "rollVisibility",
  "complicationMacro",
  "soundEnabled",
  "addDieSound",
  "removeDieSound",
  "rollSound",
  "exampleMacros",
  "diceCount"
];
const CLIENT_KEYS = [
  "iconTheme",
  "collapsed",
  "windowPosition"
];
function repointLegacyPath(value) {
  if (typeof value !== "string") return value;
  const needle = `modules/${LEGACY_MODULE_ID}/`;
  if (!value.includes(needle)) return value;
  return value.replaceAll(needle, `modules/${MODULE_ID}/`);
}
async function migrateLegacyWorldSettings() {
  if (!isGM() || getSetting("migratedFrom") === LEGACY_MODULE_ID) return;
  const world = game.settings.storage.get("world");
  let moved = 0;
  for (const key of WORLD_KEYS) {
    try {
      const doc = world?.getSetting(`${LEGACY_MODULE_ID}.${key}`);
      if (!doc || doc.value == null) continue;
      await setSetting(key, repointLegacyPath(doc.value));
      moved++;
    } catch (err) {
      console.error(`VTools Tension Pool | could not migrate world setting "${key}"`, err);
    }
  }
  await setSetting("migratedFrom", LEGACY_MODULE_ID);
  if (moved) {
    console.log(`VTools Tension Pool | migrated ${moved} world setting(s) from "${LEGACY_MODULE_ID}"`);
  }
}
async function migrateLegacyClientSettings() {
  if (getSetting("clientMigratedFrom") === LEGACY_MODULE_ID) return;
  let moved = 0;
  for (const key of CLIENT_KEYS) {
    try {
      const raw = window.localStorage.getItem(`${LEGACY_MODULE_ID}.${key}`);
      if (raw === null) continue;
      await setSetting(key, JSON.parse(raw));
      moved++;
    } catch (err) {
      console.error(`VTools Tension Pool | could not migrate client setting "${key}"`, err);
    }
  }
  await setSetting("clientMigratedFrom", LEGACY_MODULE_ID);
  if (moved) {
    console.log(`VTools Tension Pool | migrated ${moved} client setting(s) from "${LEGACY_MODULE_ID}"`);
  }
}
function getModuleVersion() {
  return game.modules.get(MODULE_ID)?.version ?? "0.0.0";
}
let poolApp = null;
Hooks.once("setup", () => {
  if (!isGM() || !window.VTools) return;
  window.VTools.onReady(() => {
    window.VTools.register({
      name: MODULE_ID,
      title: "Tension Pool",
      icon: "fa-solid fa-skull",
      onClick: () => {
        if (!poolApp) {
          poolApp = new TensionPoolApp();
          poolApp.render({ force: true });
          return;
        }
        if (!poolApp.rendered) {
          poolApp.render({ force: true });
          return;
        }
        const el = poolApp.element;
        if (el) el.style.display = el.style.display === "none" ? "" : "none";
      }
    });
  });
});
Hooks.once("init", () => {
  console.log("VTools Tension Pool | Initializing");
  registerTensionDie();
  registerSetting("windowPosition", {
    scope: "client",
    config: false,
    type: Object,
    default: null
  });
  registerSetting("poolSize", {
    name: "VTP.Settings.PoolSize.Name",
    hint: "VTP.Settings.PoolSize.Hint",
    scope: "world",
    config: true,
    type: Number,
    default: 6,
    range: { min: 1, max: 20, step: 1 },
    onChange: () => {
      poolApp?.debouncedRender();
    }
  });
  registerSetting("iconTheme", {
    name: "VTP.Settings.IconTheme.Name",
    hint: "VTP.Settings.IconTheme.Hint",
    scope: "client",
    config: true,
    type: String,
    choices: {
      skull: "VTP.Settings.IconTheme.Skull",
      square: "VTP.Settings.IconTheme.Square",
      thunder: "VTP.Settings.IconTheme.Thunder"
    },
    default: "skull",
    requiresReload: true
  });
  registerSetting("diceSize", {
    name: "VTP.Settings.DiceSize.Name",
    hint: "VTP.Settings.DiceSize.Hint",
    scope: "world",
    config: true,
    type: String,
    choices: {
      d4: "d4",
      d6: "d6",
      d8: "d8",
      d10: "d10",
      d12: "d12",
      d20: "d20"
    },
    default: "d6",
    requiresReload: true
  });
  registerSetting("rollVisibility", {
    name: "VTP.Settings.RollVisibility.Name",
    hint: "VTP.Settings.RollVisibility.Hint",
    scope: "world",
    config: true,
    type: String,
    choices: {
      public: "VTP.Settings.RollVisibility.Public",
      gmOnly: "VTP.Settings.RollVisibility.GMOnly"
    },
    default: "public"
  });
  registerSetting("complicationMacro", {
    name: "VTP.Settings.ComplicationMacro.Name",
    hint: "VTP.Settings.ComplicationMacro.Hint",
    scope: "world",
    config: true,
    type: String,
    default: ""
  });
  registerSetting("exampleMacros", {
    name: "VTP.Settings.ExampleMacros.Name",
    hint: "VTP.Settings.ExampleMacros.Hint",
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
    onChange: (enabled) => {
      if (isGM()) {
        if (enabled) {
          syncExampleMacros();
        } else {
          deleteExampleMacros();
        }
      }
    }
  });
  registerSetting("diceCount", {
    scope: "world",
    config: false,
    type: Number,
    default: 0,
    onChange: () => {
      poolApp?.debouncedRender();
    }
  });
  registerSetting("collapsed", {
    scope: "client",
    config: false,
    type: Boolean,
    default: true,
    onChange: () => {
      poolApp?.debouncedRender();
    }
  });
  registerSetting("soundEnabled", {
    name: "VTP.Settings.SoundEnabled.Name",
    hint: "VTP.Settings.SoundEnabled.Hint",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });
  registerSetting("addDieSound", {
    name: "VTP.Settings.AddDieSound.Name",
    hint: "VTP.Settings.AddDieSound.Hint",
    scope: "world",
    config: true,
    type: String,
    filePicker: "audio",
    default: `modules/${MODULE_ID}/assets/sounds/freesound_community-pearl-mlx-16-floor-tom-104999.mp3`
  });
  registerSetting("removeDieSound", {
    name: "VTP.Settings.RemoveDieSound.Name",
    hint: "VTP.Settings.RemoveDieSound.Hint",
    scope: "world",
    config: true,
    type: String,
    filePicker: "audio",
    default: `modules/${MODULE_ID}/assets/sounds/diogodasilvasimoes-magical-notification-tone-soft-fantasy-digital-alert-438278.mp3`
  });
  registerSetting("rollSound", {
    name: "VTP.Settings.RollSound.Name",
    hint: "VTP.Settings.RollSound.Hint",
    scope: "world",
    config: true,
    type: String,
    filePicker: "audio",
    default: `modules/${MODULE_ID}/assets/sounds/soundreality-evil-bell-343686.mp3`
  });
  registerSetting("acceptedVersion", {
    scope: "world",
    config: false,
    type: String,
    default: ""
  });
  registerSetting("migratedFrom", {
    scope: "world",
    config: false,
    type: String,
    default: ""
  });
  registerSetting("clientMigratedFrom", {
    scope: "client",
    config: false,
    type: String,
    default: ""
  });
});
async function showDisclaimerDialog() {
  const i18n = game.i18n;
  const result = await foundry.applications.api.DialogV2.confirm({
    window: { title: i18n.localize("VTP.Disclaimer.Title") },
    content: `<p>${i18n.localize("VTP.Disclaimer.Content")}</p>`,
    yes: { label: i18n.localize("VTP.Disclaimer.Accept"), callback: () => true },
    no: { label: i18n.localize("VTP.Disclaimer.Decline"), callback: () => false },
    rejectClose: false
  });
  return result ?? false;
}
async function showDisablePrompt() {
  const i18n = game.i18n;
  const wantsDisable = await foundry.applications.api.DialogV2.confirm({
    window: { title: i18n.localize("VTP.Disclaimer.DisablePrompt.Title") },
    content: `<p>${i18n.localize("VTP.Disclaimer.DisablePrompt.Content")}</p>`,
    yes: { label: i18n.localize("VTP.Disclaimer.DisablePrompt.Yes"), callback: () => true },
    no: { label: i18n.localize("VTP.Disclaimer.DisablePrompt.No"), callback: () => false },
    rejectClose: false
  });
  if (wantsDisable) {
    await setSetting("acceptedVersion", "");
    new foundry.applications.sidebar.apps.ModuleManagement().render({ force: true });
  }
}
Hooks.once("diceSoNiceReady", (dice3d) => {
  registerDiceSoNice(dice3d);
});
Hooks.on("renderChatMessageHTML", (_message, html) => {
  html.querySelectorAll(".vtp-roll, .vtp-announce").forEach((card) => applyTheme(card));
  const icons = html.querySelectorAll("[data-vtp-icon]");
  if (!icons.length) return;
  const theme = getSetting("iconTheme");
  const iconSet = ICON_THEMES[theme] ?? ICON_THEMES.skull;
  for (const el of icons) {
    const type = el.getAttribute("data-vtp-icon");
    const classes = iconSet[type];
    if (classes) {
      classes.split(" ").forEach((cls) => el.classList.add(cls));
    }
  }
});
Hooks.on("vtoolsTensionPoolComplication", (result) => {
  if (!isGM()) return;
  const setting = getSetting("complicationMacro");
  if (!setting) return;
  const macroNames = setting.split(",").map((s) => s.trim()).filter(Boolean);
  for (const name of macroNames) {
    const macro = game.macros.find((m) => m.name === name);
    if (macro) {
      macro.execute({ tensionResult: result });
    } else {
      ui.notifications?.warn(
        game.i18n.format("VTP.Settings.ComplicationMacro.NotFound", { name })
      );
    }
  }
});
Hooks.on("ready", async () => {
  game.socket.on(`module.${MODULE_ID}`, (payload) => {
    if (payload?.action !== "announcement") return;
    const data = payload.data;
    if (data?.gmOnly && !isGM()) return;
    showBanner(data);
  });
  const accepted = getSetting("acceptedVersion");
  const currentVersion = getModuleVersion();
  if (accepted !== currentVersion) {
    if (isGM()) {
      const consent = await showDisclaimerDialog();
      if (consent) {
        await setSetting("acceptedVersion", currentVersion);
      } else {
        await showDisablePrompt();
        return;
      }
    } else {
      return;
    }
  }
  await migrateLegacyClientSettings();
  const api = createTensionPoolAPI();
  game.modules.get(MODULE_ID).api = api;
  Hooks.callAll("vtoolsTensionPoolReady", api);
  if (!isGM()) return;
  await migrateLegacyWorldSettings();
  poolApp = new TensionPoolApp();
  if (!window.VTools) poolApp.render({ force: true });
  if (getSetting("exampleMacros")) {
    syncExampleMacros();
  }
  Hooks.on("updateSetting", (setting) => {
    if (setting.key !== "core.moduleConfiguration") return;
    const config = setting.value;
    if (config && config[MODULE_ID] === false) {
      setSetting("acceptedVersion", "");
    }
  });
});
//# sourceMappingURL=module.js.map
