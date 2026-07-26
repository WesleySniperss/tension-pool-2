import { MODULE_ID, LEGACY_MODULE_ID, getSetting, setSetting, isGM } from "./constants.js";
import type { SettingsMap } from "./constants.js";

/**
 * One-time migration from the pre-rename module id.
 *
 * This module used to ship as "tension-pool-2". Its stored settings live under
 * that namespace and are no longer reachable through game.settings once the id
 * changes, so they are copied across on first launch. The old values are only
 * read, never deleted, so reinstalling the old module still finds its own data.
 */

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
  "diceCount",
] as const satisfies readonly (keyof SettingsMap)[];

const CLIENT_KEYS = [
  "iconTheme",
  "collapsed",
  "windowPosition",
] as const satisfies readonly (keyof SettingsMap)[];

/** Sound paths stored by the old module point at the old folder — repoint them. */
function repointLegacyPath<T>(value: T): T {
  if (typeof value !== "string") return value;
  const needle = `modules/${LEGACY_MODULE_ID}/`;
  if (!value.includes(needle)) return value;
  return value.replaceAll(needle, `modules/${MODULE_ID}/`) as unknown as T;
}

/**
 * Copy world-scoped settings across. GM only — players may not write them.
 * Reads the Setting documents straight out of the world collection, because the
 * old namespace is no longer registered with game.settings.
 */
export async function migrateLegacyWorldSettings(): Promise<void> {
  if (!isGM() || getSetting("migratedFrom") === LEGACY_MODULE_ID) return;

  const world = (game as Game).settings!.storage.get("world") as any;
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

/**
 * Copy client-scoped settings across. Runs on every client, since these live in
 * that browser's localStorage as plain JSON under "<module-id>.<key>".
 */
export async function migrateLegacyClientSettings(): Promise<void> {
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
