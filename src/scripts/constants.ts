export const MODULE_ID = "vtools-tension-pool";

/**
 * The id this module shipped under before it was renamed to sit alongside VTools.
 * Only the one-time settings migration in migration.ts still refers to it.
 */
export const LEGACY_MODULE_ID = "tension-pool-2";

export type SettingsMap = {
  windowPosition: { leftPct: number; topPct: number } | null;
  poolSize: number;
  iconTheme: string;
  diceSize: string;
  complicationMacro: string;
  diceCount: number;
  collapsed: boolean;
  soundEnabled: boolean;
  addDieSound: string;
  removeDieSound: string;
  rollSound: string;
  exampleMacros: boolean;
  rollVisibility: string;
  acceptedVersion: string;
  /** Set once the world-scoped settings have been pulled across from LEGACY_MODULE_ID. */
  migratedFrom: string;
  /** Same, for the client-scoped settings held in localStorage. */
  clientMigratedFrom: string;
};

export function getSetting<K extends keyof SettingsMap>(key: K): SettingsMap[K] {
  return (game as Game).settings!.get(MODULE_ID as any, key as any) as SettingsMap[K];
}

export function setSetting<K extends keyof SettingsMap>(key: K, value: SettingsMap[K]): Promise<SettingsMap[K]> {
  return (game as Game).settings!.set(MODULE_ID as any, key as any, value as any) as Promise<SettingsMap[K]>;
}

export function safeGetSetting<K extends keyof SettingsMap>(key: K, fallback: SettingsMap[K]): SettingsMap[K] {
  try {
    return getSetting(key) || fallback;
  } catch {
    return fallback;
  }
}

export function registerSetting<K extends keyof SettingsMap>(key: K, config: Record<string, unknown>): void {
  (game as Game).settings!.register(MODULE_ID as any, key as any, config);
}

export function getGMWhisperIDs(): string[] {
  return (game as Game).users!.filter((u: any) => u.isGM).map((u: any) => u.id);
}

export function isGM(): boolean {
  return (game as Game).user!.isGM;
}
