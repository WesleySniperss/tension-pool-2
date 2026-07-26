import "../styles/module.css";
import { TensionPoolApp, ICON_THEMES } from "./tension-pool-app.js";
import { registerTensionDie, registerDiceSoNice } from "./tension-die.js";
import { MODULE_ID, getSetting, setSetting, registerSetting, isGM } from "./constants.js";
import { showBanner } from "./announcements.js";
import type { AnnouncementData } from "./announcements.js";
import { createTensionPoolAPI } from "./api.js";
import { syncExampleMacros, deleteExampleMacros } from "./example-macros.js";
import { migrateLegacyWorldSettings, migrateLegacyClientSettings } from "./migration.js";
import { applyTheme } from "./theme.js";

/** Minimal surface of the VTools toolbar hub this module talks to. */
interface VToolsAPI {
  onReady(cb: () => void): void;
  register(tool: { name: string; title?: string; icon: string; onClick: () => void }): void;
  unregister(name: string): void;
}

declare global {
  interface Window {
    VTools?: VToolsAPI;
  }
}

function getModuleVersion(): string {
  return (game as Game).modules!.get(MODULE_ID)?.version ?? "0.0.0";
}

let poolApp: TensionPoolApp | null = null;

/**
 * Register the pool button with the VTools toolbar hub when it is installed.
 * VTools fires its ready hook during "setup", and its onReady helper also runs
 * the callback immediately if it is already up, so load order does not matter.
 */
Hooks.once("setup", () => {
  if (!isGM() || !window.VTools) return;

  window.VTools.onReady(() => {
    window.VTools!.register({
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
        const el = poolApp.element as HTMLElement | null;
        if (el) el.style.display = el.style.display === "none" ? "" : "none";
      },
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
    default: null,
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
    },
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
      thunder: "VTP.Settings.IconTheme.Thunder",
    },
    default: "skull",
    requiresReload: true,
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
      d20: "d20",
    },
    default: "d6",
    requiresReload: true,
  });

  registerSetting("rollVisibility", {
    name: "VTP.Settings.RollVisibility.Name",
    hint: "VTP.Settings.RollVisibility.Hint",
    scope: "world",
    config: true,
    type: String,
    choices: {
      public: "VTP.Settings.RollVisibility.Public",
      gmOnly: "VTP.Settings.RollVisibility.GMOnly",
    },
    default: "public",
  });

  registerSetting("complicationMacro", {
    name: "VTP.Settings.ComplicationMacro.Name",
    hint: "VTP.Settings.ComplicationMacro.Hint",
    scope: "world",
    config: true,
    type: String,
    default: "",
  });

  registerSetting("exampleMacros", {
    name: "VTP.Settings.ExampleMacros.Name",
    hint: "VTP.Settings.ExampleMacros.Hint",
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
    onChange: (enabled: boolean) => {
      if (isGM()) {
        if (enabled) {
          syncExampleMacros();
        } else {
          deleteExampleMacros();
        }
      }
    },
  });

  registerSetting("diceCount", {
    scope: "world",
    config: false,
    type: Number,
    default: 0,
    onChange: () => {
      poolApp?.debouncedRender();
    },
  });

  registerSetting("collapsed", {
    scope: "client",
    config: false,
    type: Boolean,
    default: true,
    onChange: () => {
      poolApp?.debouncedRender();
    },
  });

  registerSetting("soundEnabled", {
    name: "VTP.Settings.SoundEnabled.Name",
    hint: "VTP.Settings.SoundEnabled.Hint",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
  });

  registerSetting("addDieSound", {
    name: "VTP.Settings.AddDieSound.Name",
    hint: "VTP.Settings.AddDieSound.Hint",
    scope: "world",
    config: true,
    type: String,
    filePicker: "audio",
    default: `modules/${MODULE_ID}/assets/sounds/freesound_community-pearl-mlx-16-floor-tom-104999.mp3`,
  });

  registerSetting("removeDieSound", {
    name: "VTP.Settings.RemoveDieSound.Name",
    hint: "VTP.Settings.RemoveDieSound.Hint",
    scope: "world",
    config: true,
    type: String,
    filePicker: "audio",
    default: `modules/${MODULE_ID}/assets/sounds/diogodasilvasimoes-magical-notification-tone-soft-fantasy-digital-alert-438278.mp3`,
  });

  registerSetting("rollSound", {
    name: "VTP.Settings.RollSound.Name",
    hint: "VTP.Settings.RollSound.Hint",
    scope: "world",
    config: true,
    type: String,
    filePicker: "audio",
    default: `modules/${MODULE_ID}/assets/sounds/soundreality-evil-bell-343686.mp3`,
  });

  registerSetting("acceptedVersion", {
    scope: "world",
    config: false,
    type: String,
    default: "",
  });

  registerSetting("migratedFrom", {
    scope: "world",
    config: false,
    type: String,
    default: "",
  });

  registerSetting("clientMigratedFrom", {
    scope: "client",
    config: false,
    type: String,
    default: "",
  });
});

async function showDisclaimerDialog(): Promise<boolean> {
  const i18n = game.i18n!;
  const result = await foundry.applications.api.DialogV2.confirm({
    window: { title: i18n.localize("VTP.Disclaimer.Title") },
    content: `<p>${i18n.localize("VTP.Disclaimer.Content")}</p>`,
    yes: { label: i18n.localize("VTP.Disclaimer.Accept"), callback: () => true },
    no: { label: i18n.localize("VTP.Disclaimer.Decline"), callback: () => false },
    rejectClose: false,
  });
  return result ?? false;
}

async function showDisablePrompt(): Promise<void> {
  const i18n = game.i18n!;
  const wantsDisable = await foundry.applications.api.DialogV2.confirm({
    window: { title: i18n.localize("VTP.Disclaimer.DisablePrompt.Title") },
    content: `<p>${i18n.localize("VTP.Disclaimer.DisablePrompt.Content")}</p>`,
    yes: { label: i18n.localize("VTP.Disclaimer.DisablePrompt.Yes"), callback: () => true },
    no: { label: i18n.localize("VTP.Disclaimer.DisablePrompt.No"), callback: () => false },
    rejectClose: false,
  });

  if (wantsDisable) {
    // Clear consent so disclaimer re-appears if module is re-enabled
    await setSetting("acceptedVersion", "");
    new foundry.applications.sidebar.apps.ModuleManagement().render({ force: true });
  }
}

// @ts-expect-error — diceSoNiceReady is registered by Dice So Nice at runtime
Hooks.once("diceSoNiceReady", (dice3d: any) => {
  registerDiceSoNice(dice3d);
});

// Resolve tension icons in chat messages based on each client's icon theme, and
// pin the colour scheme on our own cards so their light-dark() colours resolve
// against the interface theme rather than whatever the chat log happens to be.
Hooks.on("renderChatMessageHTML", (_message: ChatMessage, html: HTMLElement) => {
  html.querySelectorAll<HTMLElement>(".vtp-roll, .vtp-announce").forEach((card) => applyTheme(card));

  const icons = html.querySelectorAll("[data-vtp-icon]");
  if (!icons.length) return;

  const theme = getSetting("iconTheme");
  const iconSet = ICON_THEMES[theme] ?? ICON_THEMES.skull;

  for (const el of icons) {
    const type = el.getAttribute("data-vtp-icon") as "tension" | "noTension";
    const classes = iconSet[type];
    if (classes) {
      classes.split(" ").forEach((cls: string) => el.classList.add(cls));
    }
  }
});

// Run configured macros on complication
// @ts-expect-error — custom hook not in Foundry's HookConfig
Hooks.on("vtoolsTensionPoolComplication", (result: any) => {
  if (!isGM()) return;
  const setting = getSetting("complicationMacro");
  if (!setting) return;
  const macroNames = setting.split(",").map((s: string) => s.trim()).filter(Boolean);
  for (const name of macroNames) {
    const macro = (game as Game).macros!.find((m: any) => m.name === name);
    if (macro) {
      macro.execute({ tensionResult: result } as any);
    } else {
      (ui as any).notifications?.warn(
        game.i18n!.format("VTP.Settings.ComplicationMacro.NotFound", { name })
      );
    }
  }
});

Hooks.on("ready", async () => {
  // Announcements are broadcast to every client, so this listener has to be
  // registered before any of the GM-only guards below — otherwise nobody but the
  // (non-receiving) sender would ever be subscribed and no banner would appear.
  (game as Game).socket!.on(`module.${MODULE_ID}`, (payload: any) => {
    if (payload?.action !== "announcement") return;
    const data = payload.data as AnnouncementData;
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
      // Non-GM: module not yet accepted by GM, stay inert
      return;
    }
  }

  await migrateLegacyClientSettings();

  // Exposed to every client: the getters are useful in player macros, and the
  // mutating calls warn rather than throwing a permission error.
  const api = createTensionPoolAPI();
  // @ts-expect-error — Foundry module API convention not in type definitions
  (game as Game).modules!.get(MODULE_ID)!.api = api;
  // @ts-expect-error — custom hook not in Foundry's HookConfig
  Hooks.callAll("vtoolsTensionPoolReady", api);

  // The pool UI itself is GM-only.
  if (!isGM()) return;

  await migrateLegacyWorldSettings();

  poolApp = new TensionPoolApp();
  // With VTools installed the pool stays hidden until its toolbar button is
  // clicked; without it there is no other way to summon the pool, so show it.
  if (!window.VTools) poolApp.render({ force: true });

  if (getSetting("exampleMacros")) {
    syncExampleMacros();
  }

  // Clear consent when the module is disabled via Module Management
  Hooks.on("updateSetting", (setting: any) => {
    if (setting.key !== "core.moduleConfiguration") return;
    const config = setting.value as Record<string, boolean> | undefined;
    if (config && config[MODULE_ID] === false) {
      setSetting("acceptedVersion", "");
    }
  });
});
