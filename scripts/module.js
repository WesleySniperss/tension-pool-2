const g = "tension-pool-2";
function l(t) {
  return game.settings.get(g, t);
}
function p(t, e) {
  return game.settings.set(g, t, e);
}
function b(t, e) {
  try {
    return l(t) || e;
  } catch {
    return e;
  }
}
function m(t, e) {
  game.settings.register(g, t, e);
}
function $() {
  return game.users.filter((t) => t.isGM).map((t) => t.id);
}
const T = {
  skull: { tension: "fa-solid fa-skull", noTension: "fa-regular fa-skull" },
  square: { tension: "fa-solid fa-square-exclamation", noTension: "fa-regular fa-square" },
  thunder: { tension: "fa-solid fa-bolt", noTension: "fa-solid fa-sun" }
};
function A(t, e, o, n, i) {
  const s = T[e] ?? T.skull, c = [];
  if (t === 0)
    c.push({ class: s.noTension });
  else
    for (let r = 0; r < t; r++)
      c.push({ class: s.tension });
  const a = t === 0 ? i.localize("TENSION_POOL.NoTension") : i.format("TENSION_POOL.TensionCount", { count: String(t) });
  return {
    isGM: n,
    icons: c,
    diceCount: t,
    compactDisplayIcon: t === 0 ? s.noTension : s.tension,
    tensionTooltip: a,
    collapsed: o,
    toggleIcon: o ? "fa-solid fa-chevron-up" : "fa-solid fa-chevron-down",
    // Raw i18n key — Foundry's data-tooltip attribute auto-localizes it
    toggleTooltip: o ? "TENSION_POOL.Expand" : "TENSION_POOL.Compact"
  };
}
const M = {
  d4: 4,
  d6: 6,
  d8: 8,
  d10: 10,
  d12: 12,
  d20: 20
}, L = {
  skull: "☠",
  // ☠
  square: "❗",
  // ❗
  thunder: "⚡"
  // ⚡
};
class D extends foundry.dice.terms.Die {
  constructor(e = {}) {
    const o = D._getDiceSize();
    e.faces = M[o] ?? 6, super(e);
  }
  static DENOMINATION = "t";
  get total() {
    return this.results.filter((e) => !e.discarded && e.result === 1).length;
  }
  static _getDiceSize() {
    return b("diceSize", "d6");
  }
}
function H() {
  CONFIG.Dice.terms.t = D;
}
function V(t) {
  t.addSystem(
    { id: g, name: "Tension Pool 2" },
    "default"
  ), t.addColorset({
    name: "tension-pool-2",
    description: "Tension Pool",
    category: "Tension Pool 2",
    foreground: "#ffff00",
    background: "#1a1a1a",
    outline: "#000000",
    edge: "#1a1a1a",
    texture: "none",
    material: "plastic",
    visibility: "visible"
  }, "default"), B(t);
}
function B(t) {
  const e = b("diceSize", "d6"), o = M[e] ?? 6, n = b("iconTheme", "skull"), s = [L[n] ?? L.skull, ...Array(o - 1).fill("")];
  t.addDicePreset({
    type: "dt",
    labels: s,
    system: g,
    fontScale: 1.5,
    colorset: "tension-pool-2"
  }, e);
}
async function v(t) {
  if (t <= 0)
    return { diceCount: 0, results: [], hasComplication: !1, complicationCount: 0 };
  const e = game.modules.get("dice-so-nice")?.active && game.dice3d;
  let o;
  if (e) {
    const d = new Roll(`${t}dt`);
    await d.evaluate(), o = d.terms[0].results.map((f) => f.result).sort(), await game.dice3d.showForRoll(d, game.user, !0);
  } else {
    const d = l("diceSize") || "d6", f = new Roll(`${t}${d}`);
    await f.evaluate(), o = f.terms[0].results.map((h) => h.result).sort();
  }
  const n = o.filter((d) => d === 1).length, i = n > 0, s = game.i18n, c = i ? o.filter((d) => d === 1).map(() => '<i class="tp-die tp-die-hit" data-tp-icon="tension"></i>').join("") : '<i class="tp-die tp-die-miss" data-tp-icon="noTension"></i>', a = i ? `<strong class="tp-result-hit">${s.localize("TENSION_POOL.Complication")}</strong>` : `<strong class="tp-result-safe">${s.localize("TENSION_POOL.Safe")}</strong>`, r = l("rollVisibility") === "gmOnly", N = r ? $() : [];
  await ChatMessage.create({
    content: `
      <div class="tension-pool-roll">
        <div class="tp-dice-results">${c}</div>
        <div>${a}</div>
      </div>
    `.trim(),
    speaker: { alias: s.localize("TENSION_POOL.Title") },
    whisper: N
  }), r && await ChatMessage.create({
    content: `
        <div class="tension-pool-roll">
          <div class="tp-dice-results"><i class="tp-die tp-die-hidden fa-solid fa-eye-slash"></i><i class="tp-die tp-die-hidden fa-solid fa-eye-slash"></i><i class="tp-die tp-die-hidden fa-solid fa-eye-slash"></i></div>
          <div><strong class="tp-result-hidden">${s.localize("TENSION_POOL.RollHidden")}</strong></div>
        </div>
      `.trim(),
    speaker: { alias: s.localize("TENSION_POOL.Title") }
  });
  const O = { diceCount: t, results: o, hasComplication: i, complicationCount: n };
  return Hooks.callAll("tensionPoolRolled", O), i && Hooks.callAll("tensionPoolComplication", O), O;
}
const y = {
  rise: "modules/tension-pool-2/assets/sounds/freesound_community-pearl-mlx-16-floor-tom-104999.mp3",
  ease: "modules/tension-pool-2/assets/sounds/diogodasilvasimoes-magical-notification-tone-soft-fantasy-digital-alert-438278.mp3",
  break: "modules/tension-pool-2/assets/sounds/soundreality-evil-bell-343686.mp3"
};
function z(t) {
  if (t.type === "fade") return;
  const e = game.i18n, o = t.type === "break", n = document.createElement("div");
  n.classList.add("tp-announcement"), o && n.classList.add("tp-announcement-dramatic");
  const i = (() => {
    switch (t.type) {
      case "rise":
        return `${e.localize("TENSION_POOL.Announce.TensionRises")} (${t.current}/${t.max})`;
      case "ease":
        return `${e.localize("TENSION_POOL.Announce.TensionEases")} (${t.current}/${t.max})`;
      case "break":
        return e.localize("TENSION_POOL.Announce.TensionBreaks");
    }
  })(), s = document.createElement("span");
  s.classList.add("tp-announcement-text"), s.textContent = i, n.appendChild(s), document.getElementById("interface")?.appendChild(n), setTimeout(() => n.remove(), o ? 3e3 : 2e3);
}
function G(t) {
  if (!l("soundEnabled")) return;
  const e = (() => {
    switch (t) {
      case "rise":
        return l("addDieSound") || y.rise;
      case "ease":
        return l("removeDieSound") || y.ease;
      case "break":
        return l("rollSound") || y.break;
      case "fade":
        return "";
    }
  })();
  e && foundry.audio.AudioHelper.play({ src: e, volume: 0.8, loop: !1 }, !0);
}
async function q(t) {
  const e = game.i18n;
  let o;
  switch (t.type) {
    case "rise":
      o = `<em>${e.localize("TENSION_POOL.Announce.TensionRises")} (${t.current}/${t.max})</em>`;
      break;
    case "ease":
      o = `<em>${e.localize("TENSION_POOL.Announce.TensionEases")} (${t.current}/${t.max})</em>`;
      break;
    case "break":
      o = `<strong>${e.localize("TENSION_POOL.Announce.PoolOverflows")}</strong>`;
      break;
    case "fade":
      o = `<em>${e.localize("TENSION_POOL.Announce.TensionFades")}</em>`;
      break;
  }
  await ChatMessage.create({
    content: `<div class="tension-pool-announce tp-announce-${t.type}">${o}</div>`,
    speaker: { alias: e.localize("TENSION_POOL.Title") }
  });
}
function F(t) {
  game.socket.emit(`module.${g}`, {
    action: "announcement",
    data: t
  });
}
async function S(t, e, o) {
  const n = { type: t, current: e, max: o };
  G(t), z(n), F(n), await q(n);
}
function W(t, e, o) {
  if (t <= 0 || o <= 0) return [];
  const n = [];
  let i = t, s = e;
  for (; i > 0; ) {
    const c = o - s;
    if (c <= 0) {
      n.push({ type: "overflow", added: 0, newCount: o, max: o }), s = 0;
      continue;
    }
    const a = Math.min(i, c), r = s + a;
    i -= a, r >= o ? (n.push({ type: "overflow", added: a, newCount: o, max: o }), s = 0) : (n.push({ type: "add", added: a, newCount: r, max: o }), s = r);
  }
  return n;
}
function P(t) {
  return Number.isFinite(t) ? Math.floor(t) : 0;
}
function x() {
  async function t(e) {
    const o = await v(e);
    return await p("diceCount", 0), o;
  }
  return {
    async add(e = 1) {
      if (e = P(e), e <= 0) return { diceCount: l("diceCount"), rolls: [] };
      const o = Math.min(e, 50), n = l("diceCount"), i = l("poolSize"), s = W(o, n, i), c = [];
      for (const a of s)
        a.type === "overflow" ? (a.added > 0 && await p("diceCount", a.newCount), await S("break", a.newCount, i), c.push(await t(i))) : (await p("diceCount", a.newCount), await S("rise", a.newCount, i));
      return { diceCount: l("diceCount"), rolls: c };
    },
    async remove(e = 1) {
      if (e = P(e), e <= 0) return;
      const o = l("diceCount");
      if (o <= 0) return;
      const n = l("poolSize"), i = Math.max(o - e, 0);
      await p("diceCount", i), await S("ease", i, n);
    },
    async roll() {
      const e = l("diceCount"), o = l("poolSize");
      return await S("break", e, o), t(Math.max(e, 1));
    },
    async clear() {
      const e = l("poolSize");
      await S("fade", 0, e), await p("diceCount", 0);
    },
    async customRoll(e) {
      e = P(e);
      const o = l("poolSize"), n = Math.min(Math.max(e, 1), 50);
      return await S("break", n, o), v(n);
    },
    getDiceCount() {
      return l("diceCount");
    },
    getPoolSize() {
      return l("poolSize");
    }
  };
}
const _ = 40;
function C(t, e, o, n) {
  return {
    left: Math.round(t * o),
    top: Math.round(e * n)
  };
}
function U(t, e, o, n) {
  return {
    leftPct: o > 0 ? t / o : 0.5,
    topPct: n > 0 ? e / n : 0.5
  };
}
function E(t, e, o, n, i) {
  return {
    left: Math.round(Math.max(_ - o, Math.min(t, n - _))),
    top: Math.round(Math.max(0, Math.min(e, i - _)))
  };
}
const { ApplicationV2: Y, HandlebarsApplicationMixin: X } = foundry.applications.api;
class u extends X(Y) {
  static DEFAULT_OPTIONS = {
    id: "tension-pool",
    classes: ["tension-pool"],
    window: {
      frame: !1,
      positioned: !1
    },
    nonDismissible: !0,
    actions: {
      addDie: u._onAddDie,
      removeDie: u._onRemoveDie,
      rollPool: u._onRollPool,
      clearPool: u._onClearPool,
      customRoll: u._onCustomRoll,
      bulkAdd: u._onBulkAdd,
      togglePool: u._onTogglePool
    }
  };
  static PARTS = {
    pool: {
      template: "modules/tension-pool-2/templates/pool.hbs"
    }
  };
  static _api = null;
  static _getAPI() {
    return u._api || (u._api = x()), u._api;
  }
  _previousDiceCount = -1;
  _renderDebounceTimer = null;
  _dragState = null;
  _boundDragStart = null;
  _boundOnResize = null;
  /**
   * Debounced render — batches rapid setting changes (e.g. fast add/remove)
   * into a single re-render after 100ms of quiet.
   */
  debouncedRender() {
    this._renderDebounceTimer && clearTimeout(this._renderDebounceTimer), this._renderDebounceTimer = setTimeout(() => {
      this._renderDebounceTimer = null, this.render({ force: !0 });
    }, 100);
  }
  async _onRender(e, o) {
    const n = this.element;
    if (!n) return;
    const i = l("windowPosition");
    n.style.position = "fixed";
    const s = n.offsetWidth || 0, c = n.offsetHeight || 0, a = window.innerWidth, r = window.innerHeight;
    if (i) {
      const d = C(i.leftPct, i.topPct, a, r);
      if (d.left + s < 0 || d.left > a || d.top + c < 0 || d.top > r)
        n.style.left = `${Math.round((a - s) / 2)}px`, n.style.top = `${Math.round((r - c) / 2)}px`, p("windowPosition", null);
      else {
        const f = E(d.left, d.top, s, a, r);
        n.style.left = `${f.left}px`, n.style.top = `${f.top}px`;
      }
    } else this._previousDiceCount === -1 && (n.style.left = `${Math.round((a - s) / 2)}px`, n.style.top = `${Math.round((r - c) / 2)}px`);
    const N = n.querySelector(".tp-wrapper");
    N && (this._boundDragStart && N.removeEventListener("pointerdown", this._boundDragStart), this._boundDragStart = this._onDragStart.bind(this), N.addEventListener("pointerdown", this._boundDragStart)), this._boundOnResize || (this._boundOnResize = () => this._clampToCurrentViewport(), window.addEventListener("resize", this._boundOnResize));
    const O = l("diceCount");
    if (this._previousDiceCount >= 0 && this._previousDiceCount !== O) {
      const d = n.querySelectorAll(".tp-icons i");
      if (d) {
        const f = O > this._previousDiceCount ? "tp-pulse" : "tp-fade";
        d.forEach((h) => {
          h.classList.add(f), h.addEventListener("animationend", () => h.classList.remove(f), { once: !0 });
        });
      }
    }
    this._previousDiceCount = O;
  }
  _onDragStart(e) {
    if (e.target.closest("button")) return;
    const o = this.element;
    if (!o) return;
    this._dragState = {
      startX: e.clientX,
      startY: e.clientY,
      startLeft: parseInt(o.style.left, 10) || 0,
      startTop: parseInt(o.style.top, 10) || 0
    };
    const n = (s) => {
      if (!this._dragState) return;
      const c = s.clientX - this._dragState.startX, a = s.clientY - this._dragState.startY;
      o.style.left = `${this._dragState.startLeft + c}px`, o.style.top = `${this._dragState.startTop + a}px`;
    }, i = () => {
      if (document.removeEventListener("pointermove", n), document.removeEventListener("pointerup", i), this._dragState) {
        const s = parseInt(o.style.left, 10), c = parseInt(o.style.top, 10);
        if (!isNaN(s) && !isNaN(c)) {
          const a = E(s, c, o.offsetWidth, window.innerWidth, window.innerHeight);
          o.style.left = `${a.left}px`, o.style.top = `${a.top}px`, p("windowPosition", U(a.left, a.top, window.innerWidth, window.innerHeight));
        }
        this._dragState = null;
      }
    };
    document.addEventListener("pointermove", n), document.addEventListener("pointerup", i);
  }
  _clampToCurrentViewport() {
    const e = this.element;
    if (!e) return;
    const o = l("windowPosition");
    if (!o) return;
    const n = e.offsetWidth, i = e.offsetHeight, s = window.innerWidth, c = window.innerHeight, a = C(o.leftPct, o.topPct, s, c);
    if (a.left + n < 0 || a.left > s || a.top + i < 0 || a.top > c)
      e.style.left = `${Math.round((s - n) / 2)}px`, e.style.top = `${Math.round((c - i) / 2)}px`, p("windowPosition", null);
    else {
      const r = E(a.left, a.top, n, s, c);
      e.style.left = `${r.left}px`, e.style.top = `${r.top}px`;
    }
  }
  async _prepareContext(e) {
    return A(
      l("diceCount"),
      l("iconTheme"),
      l("collapsed"),
      game.user.isGM,
      game.i18n
    );
  }
  static async _onAddDie() {
    await u._getAPI().add();
  }
  static async _onRemoveDie() {
    await u._getAPI().remove();
  }
  static async _onRollPool() {
    await u._getAPI().roll();
  }
  static async _onClearPool() {
    await u._getAPI().clear();
  }
  static async _onTogglePool() {
    const o = !l("collapsed");
    this.element?.classList.toggle("tp-collapsed", o), await p("collapsed", o);
  }
  static async _onBulkAdd() {
    const e = await foundry.applications.api.DialogV2.prompt({
      window: { title: game.i18n.localize("TENSION_POOL.BulkAdd.Title") },
      content: `<form><div class="form-group"><label>${game.i18n.localize("TENSION_POOL.BulkAdd.Label")}</label><input type="number" name="count" value="1" min="1" max="50" autofocus></div></form>`,
      ok: {
        label: game.i18n.localize("TENSION_POOL.AddDie"),
        callback: (o, n) => parseInt(n.form.elements.count.value, 10)
      }
    });
    !e || e <= 0 || await u._getAPI().add(e);
  }
  static async _onCustomRoll() {
    const e = l("poolSize"), o = await foundry.applications.api.DialogV2.prompt({
      window: { title: game.i18n.localize("TENSION_POOL.CustomRoll.Title") },
      content: `<form><div class="form-group"><label>${game.i18n.localize("TENSION_POOL.CustomRoll.Label")}</label><input type="number" name="count" value="${e}" min="1" max="50" autofocus></div></form>`,
      ok: {
        label: game.i18n.localize("TENSION_POOL.Roll"),
        callback: (n, i) => parseInt(i.form.elements.count.value, 10)
      }
    });
    o && o > 0 && await u._getAPI().customRoll(o);
  }
}
const I = "Tension Pool 2 (Examples)", j = [
  {
    name: "TP: Add Die",
    command: 'game.modules.get("tension-pool-2")?.api?.add();'
  },
  {
    name: "TP: Remove Die",
    command: 'game.modules.get("tension-pool-2")?.api?.remove();'
  },
  {
    name: "TP: Add (3)",
    command: 'game.modules.get("tension-pool-2")?.api?.add(3);'
  },
  {
    name: "TP: Remove (2)",
    command: 'game.modules.get("tension-pool-2")?.api?.remove(2);'
  },
  {
    name: "TP: Roll Pool",
    command: 'game.modules.get("tension-pool-2")?.api?.roll();'
  },
  {
    name: "TP: Clear Pool",
    command: 'game.modules.get("tension-pool-2")?.api?.clear();'
  },
  {
    name: "TP: Custom Roll (4)",
    command: 'game.modules.get("tension-pool-2")?.api?.customRoll(4);'
  },
  {
    name: "TP: Get Dice Count",
    command: `const count = game.modules.get("tension-pool-2")?.api?.getDiceCount();
ui.notifications.info("Dice count: " + count);`
  },
  {
    name: "TP: Get Pool Size",
    command: `const size = game.modules.get("tension-pool-2")?.api?.getPoolSize();
ui.notifications.info("Pool size: " + size);`
  }
];
function k() {
  return game.folders.find(
    (t) => t.name === I && t.type === "Macro"
  );
}
async function R() {
  const t = game;
  let e = k();
  e || (e = await Folder.create({
    name: I,
    type: "Macro",
    sorting: "a"
  }));
  const o = t.macros.filter((i) => i.folder?.id === e.id);
  if (o.length > 0) {
    const i = o.map((s) => s.id);
    await Macro.deleteDocuments(i);
  }
  const n = j.map((i) => ({
    name: i.name,
    type: "script",
    scope: "global",
    command: i.command,
    folder: e.id
  }));
  await Macro.createDocuments(n), console.log(`Tension Pool 2 | Example macros installed in "${I}"`);
}
async function J() {
  const t = game, e = k();
  if (!e) return;
  const o = t.macros.filter((n) => n.folder?.id === e.id);
  if (o.length > 0) {
    const n = o.map((i) => i.id);
    await Macro.deleteDocuments(n);
  }
  await e.delete(), console.log("Tension Pool 2 | Example macros removed");
}
function K() {
  return game.modules.get(g)?.version ?? "0.0.0";
}
let w = null;
Hooks.once("setup", () => {
  if (!game.user.isGM || !window.VTools) return;
  window.VTools.onReady(() => {
    window.VTools.register({
      name: "tension-pool",
      title: "Tension Pool",
      icon: "fa-solid fa-skull",
      onClick: () => {
        if (!w) { w = new u(); w.render({ force: !0 }); return; }
        if (!w.rendered) { w.render({ force: !0 }); return; }
        if (w.element) w.element.style.display = w.element.style.display === "none" ? "" : "none";
      }
    });
  });
});
Hooks.once("init", () => {
  console.log("Tension Pool 2 | Initializing"), H(), m("windowPosition", {
    scope: "client",
    config: !1,
    type: Object,
    default: null
  }), m("poolSize", {
    name: "TENSION_POOL.Settings.PoolSize.Name",
    hint: "TENSION_POOL.Settings.PoolSize.Hint",
    scope: "world",
    config: !0,
    type: Number,
    default: 6,
    range: { min: 1, max: 20, step: 1 },
    onChange: () => {
      w?.debouncedRender();
    }
  }), m("iconTheme", {
    name: "TENSION_POOL.Settings.IconTheme.Name",
    hint: "TENSION_POOL.Settings.IconTheme.Hint",
    scope: "client",
    config: !0,
    type: String,
    choices: {
      skull: "TENSION_POOL.Settings.IconTheme.Skull",
      square: "TENSION_POOL.Settings.IconTheme.Square",
      thunder: "TENSION_POOL.Settings.IconTheme.Thunder"
    },
    default: "skull",
    requiresReload: !0
  }), m("diceSize", {
    name: "TENSION_POOL.Settings.DiceSize.Name",
    hint: "TENSION_POOL.Settings.DiceSize.Hint",
    scope: "world",
    config: !0,
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
    requiresReload: !0
  }), m("rollVisibility", {
    name: "TENSION_POOL.Settings.RollVisibility.Name",
    hint: "TENSION_POOL.Settings.RollVisibility.Hint",
    scope: "world",
    config: !0,
    type: String,
    choices: {
      public: "TENSION_POOL.Settings.RollVisibility.Public",
      gmOnly: "TENSION_POOL.Settings.RollVisibility.GMOnly"
    },
    default: "public"
  }), m("complicationMacro", {
    name: "TENSION_POOL.Settings.ComplicationMacro.Name",
    hint: "TENSION_POOL.Settings.ComplicationMacro.Hint",
    scope: "world",
    config: !0,
    type: String,
    default: ""
  }), m("exampleMacros", {
    name: "TENSION_POOL.Settings.ExampleMacros.Name",
    hint: "TENSION_POOL.Settings.ExampleMacros.Hint",
    scope: "world",
    config: !0,
    type: Boolean,
    default: !1,
    onChange: (t) => {
      game.user.isGM && (t ? R() : J());
    }
  }), m("diceCount", {
    scope: "world",
    config: !1,
    type: Number,
    default: 0,
    onChange: () => {
      w?.debouncedRender();
    }
  }), m("collapsed", {
    scope: "client",
    config: !1,
    type: Boolean,
    default: !0,
    onChange: () => {
      w?.debouncedRender();
    }
  }), m("soundEnabled", {
    name: "TENSION_POOL.Settings.SoundEnabled.Name",
    hint: "TENSION_POOL.Settings.SoundEnabled.Hint",
    scope: "world",
    config: !0,
    type: Boolean,
    default: !0
  }), m("addDieSound", {
    name: "TENSION_POOL.Settings.AddDieSound.Name",
    hint: "TENSION_POOL.Settings.AddDieSound.Hint",
    scope: "world",
    config: !0,
    type: String,
    filePicker: "audio",
    default: "modules/tension-pool-2/assets/sounds/freesound_community-pearl-mlx-16-floor-tom-104999.mp3"
  }), m("removeDieSound", {
    name: "TENSION_POOL.Settings.RemoveDieSound.Name",
    hint: "TENSION_POOL.Settings.RemoveDieSound.Hint",
    scope: "world",
    config: !0,
    type: String,
    filePicker: "audio",
    default: "modules/tension-pool-2/assets/sounds/diogodasilvasimoes-magical-notification-tone-soft-fantasy-digital-alert-438278.mp3"
  }), m("rollSound", {
    name: "TENSION_POOL.Settings.RollSound.Name",
    hint: "TENSION_POOL.Settings.RollSound.Hint",
    scope: "world",
    config: !0,
    type: String,
    filePicker: "audio",
    default: "modules/tension-pool-2/assets/sounds/soundreality-evil-bell-343686.mp3"
  }), m("acceptedVersion", {
    scope: "world",
    config: !1,
    type: String,
    default: ""
  });
});
async function Q() {
  const t = game.i18n;
  return await foundry.applications.api.DialogV2.confirm({
    window: { title: t.localize("TENSION_POOL.Disclaimer.Title") },
    content: `<p>${t.localize("TENSION_POOL.Disclaimer.Content")}</p>`,
    yes: { label: t.localize("TENSION_POOL.Disclaimer.Accept"), callback: () => !0 },
    no: { label: t.localize("TENSION_POOL.Disclaimer.Decline"), callback: () => !1 },
    rejectClose: !1
  }) ?? !1;
}
async function Z() {
  const t = game.i18n;
  await foundry.applications.api.DialogV2.confirm({
    window: { title: t.localize("TENSION_POOL.Disclaimer.DisablePrompt.Title") },
    content: `<p>${t.localize("TENSION_POOL.Disclaimer.DisablePrompt.Content")}</p>`,
    yes: { label: t.localize("TENSION_POOL.Disclaimer.DisablePrompt.Yes"), callback: () => !0 },
    no: { label: t.localize("TENSION_POOL.Disclaimer.DisablePrompt.No"), callback: () => !1 },
    rejectClose: !1
  }) && (await p("acceptedVersion", ""), new foundry.applications.sidebar.apps.ModuleManagement().render({ force: !0 }));
}
Hooks.once("diceSoNiceReady", (t) => {
  V(t);
});
Hooks.on("renderChatMessageHTML", (t, e) => {
  const o = e.querySelectorAll("[data-tp-icon]");
  if (!o.length) return;
  const n = l("iconTheme"), i = T[n] ?? T.skull;
  for (const s of o) {
    const c = s.getAttribute("data-tp-icon"), a = i[c];
    a && a.split(" ").forEach((r) => s.classList.add(r));
  }
});
Hooks.on("tensionPoolComplication", (t) => {
  if (!game.user.isGM) return;
  const e = l("complicationMacro");
  if (!e) return;
  const o = e.split(",").map((n) => n.trim()).filter(Boolean);
  for (const n of o) {
    const i = game.macros.find((s) => s.name === n);
    i ? i.execute({ tensionResult: t }) : ui.notifications?.warn(
      game.i18n.format("TENSION_POOL.Settings.ComplicationMacro.NotFound", { name: n })
    );
  }
});
Hooks.on("ready", async () => {
  const t = l("acceptedVersion"), e = K();
  if (t !== e)
    if (game.user.isGM)
      if (await Q())
        await p("acceptedVersion", e);
      else {
        await Z();
        return;
      }
    else
      return;
  if (!game.user.isGM) return;
  w = new u();
  w.render({ force: !0 });
  if (window.VTools) setTimeout(() => { if (w?.element) w.element.style.display = "none"; }, 200);
  const o = x();
  game.modules.get(g).api = o, Hooks.callAll("tensionPool2Ready", o), game.user.isGM && l("exampleMacros") && R(), game.socket.on(`module.${g}`, (n) => {
    n.action === "announcement" && z(n.data);
  }), Hooks.on("updateSetting", (n) => {
    if (n.key !== "core.moduleConfiguration") return;
    const i = n.value;
    i && i[g] === !1 && p("acceptedVersion", "");
  });
});
//# sourceMappingURL=module.js.map
