import { MODULE_ID, getSetting, setSetting } from "./constants.js";
import { buildPoolContext, ICON_THEMES } from "./pool-context.js";
import { createTensionPoolAPI } from "./api.js";
import type { TensionPoolAPI } from "./api.js";
import type { TensionPoolContext } from "./pool-context.js";
import { clampToViewport, pctToPixels, pixelsToPct } from "./clamp-to-viewport.js";
import { applyTheme, onColorSchemeChange } from "./theme.js";

export { ICON_THEMES, buildPoolContext };
export type { TensionPoolContext };

const { ApplicationV2, HandlebarsApplicationMixin } =
  foundry.applications.api;

export class TensionPoolApp extends HandlebarsApplicationMixin(ApplicationV2)<TensionPoolContext> {
  static override DEFAULT_OPTIONS = {
    id: MODULE_ID,
    classes: [MODULE_ID],
    window: {
      frame: false,
      positioned: false,
    },
    actions: {
      addDie: TensionPoolApp._onAddDie,
      removeDie: TensionPoolApp._onRemoveDie,
      rollPool: TensionPoolApp._onRollPool,
      clearPool: TensionPoolApp._onClearPool,
      customRoll: TensionPoolApp._onCustomRoll,
      bulkAdd: TensionPoolApp._onBulkAdd,
      togglePool: TensionPoolApp._onTogglePool,
    },
  };

  static override PARTS = {
    pool: {
      template: `modules/${MODULE_ID}/templates/pool.hbs`,
    },
  };

  private static _api: TensionPoolAPI | null = null;
  private static _getAPI(): TensionPoolAPI {
    if (!TensionPoolApp._api) {
      TensionPoolApp._api = createTensionPoolAPI();
    }
    return TensionPoolApp._api;
  }

  private _previousDiceCount: number = -1;
  private _renderDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private _dragState: { startX: number; startY: number; startLeft: number; startTop: number } | null = null;
  private _boundDragStart: ((e: PointerEvent) => void) | null = null;
  private _boundOnResize: (() => void) | null = null;
  private _unwatchTheme: (() => void) | null = null;

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

  override async _onRender(_context: any, _options: any) {
    const el = this.element as HTMLElement;
    if (!el) return;

    // Follow Foundry's interface theme. The pool is frameless, so ApplicationV2
    // does not hand it a themed frame to inherit from — stamp the classes here
    // and re-stamp whenever the user switches scheme.
    applyTheme(el);
    if (!this._unwatchTheme) {
      this._unwatchTheme = onColorSchemeChange((scheme) =>
        applyTheme(this.element as HTMLElement | null, scheme)
      );
    }

    // Apply saved or default position, clamped to viewport
    const saved = getSetting("windowPosition");
    el.style.position = "fixed";
    const elW = el.offsetWidth || 0;
    const elH = el.offsetHeight || 0;
    const vpW = window.innerWidth;
    const vpH = window.innerHeight;

    if (saved) {
      const pixels = pctToPixels(saved.leftPct, saved.topPct, vpW, vpH);
      // If the element would be entirely outside the viewport, reset to centre
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
      // Center on screen for first-time users
      el.style.left = `${Math.round((vpW - elW) / 2)}px`;
      el.style.top = `${Math.round((vpH - elH) / 2)}px`;
    }

    // Set up drag handling — bind once, replace on re-render to avoid stacking
    const wrapper = el.querySelector(".vtp-wrapper") as HTMLElement;
    if (wrapper) {
      if (this._boundDragStart) wrapper.removeEventListener("pointerdown", this._boundDragStart);
      this._boundDragStart = this._onDragStart.bind(this);
      wrapper.addEventListener("pointerdown", this._boundDragStart);
    }

    // Re-clamp position when viewport resizes
    if (!this._boundOnResize) {
      this._boundOnResize = () => this._clampToCurrentViewport();
      window.addEventListener("resize", this._boundOnResize);
    }

    // Animate icons on dice count change. Both layouts are covered: .vtp-icons
    // when the pool is expanded, .vtp-compact-icons when it is collapsed.
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
  override _onClose(_options: any) {
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

  private _onDragStart(event: PointerEvent) {
    if ((event.target as HTMLElement).closest("button")) return;
    const el = this.element as HTMLElement;
    if (!el) return;

    this._dragState = {
      startX: event.clientX,
      startY: event.clientY,
      startLeft: parseInt(el.style.left, 10) || 0,
      startTop: parseInt(el.style.top, 10) || 0,
    };

    const onMove = (e: PointerEvent) => {
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

  private _clampToCurrentViewport() {
    const el = this.element as HTMLElement;
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

  override async _prepareContext(
    _options: foundry.applications.api.ApplicationV2.RenderOptions
  ) {
    return buildPoolContext(
      getSetting("diceCount"),
      getSetting("iconTheme"),
      getSetting("collapsed"),
      (game as Game).user!.isGM,
      game.i18n!,
    );
  }

  static async _onAddDie(this: TensionPoolApp) {
    await TensionPoolApp._getAPI().add();
  }

  static async _onRemoveDie(this: TensionPoolApp) {
    await TensionPoolApp._getAPI().remove();
  }

  static async _onRollPool(this: TensionPoolApp) {
    await TensionPoolApp._getAPI().roll();
  }

  static async _onClearPool(this: TensionPoolApp) {
    await TensionPoolApp._getAPI().clear();
  }

  static async _onTogglePool(this: TensionPoolApp) {
    const current = getSetting("collapsed");
    const next = !current;
    this.element?.classList.toggle("vtp-collapsed", next);
    await setSetting("collapsed", next);
  }

  static async _onBulkAdd(this: TensionPoolApp) {
    const input = await foundry.applications.api.DialogV2.prompt({
      window: { title: game.i18n!.localize("VTP.BulkAdd.Title") },
      content: `<form><div class="form-group"><label>${game.i18n!.localize("VTP.BulkAdd.Label")}</label><input type="number" name="count" value="1" min="1" max="50" autofocus></div></form>`,
      ok: {
        label: game.i18n!.localize("VTP.AddDie"),
        callback: (_event: any, button: any) => {
          return parseInt(button.form.elements.count.value, 10);
        },
      },
    });
    if (!input || input <= 0) return;
    await TensionPoolApp._getAPI().add(input);
  }

  static async _onCustomRoll(this: TensionPoolApp) {
    const max = getSetting("poolSize");
    const input = await foundry.applications.api.DialogV2.prompt({
      window: { title: game.i18n!.localize("VTP.CustomRoll.Title") },
      content: `<form><div class="form-group"><label>${game.i18n!.localize("VTP.CustomRoll.Label")}</label><input type="number" name="count" value="${max}" min="1" max="50" autofocus></div></form>`,
      ok: {
        label: game.i18n!.localize("VTP.Roll"),
        callback: (_event: any, button: any) => {
          return parseInt(button.form.elements.count.value, 10);
        },
      },
    });
    if (input && input > 0) {
      await TensionPoolApp._getAPI().customRoll(input);
    }
  }
}
