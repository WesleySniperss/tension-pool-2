import { MODULE_ID, getSetting, getGMWhisperIDs } from "./constants.js";
import { applyTheme } from "./theme.js";

export type AnnouncementType = "rise" | "ease" | "break" | "fade";

const DEFAULT_SOUNDS: Record<string, string> = {
  rise: `modules/${MODULE_ID}/assets/sounds/freesound_community-pearl-mlx-16-floor-tom-104999.mp3`,
  ease: `modules/${MODULE_ID}/assets/sounds/diogodasilvasimoes-magical-notification-tone-soft-fantasy-digital-alert-438278.mp3`,
  break: `modules/${MODULE_ID}/assets/sounds/soundreality-evil-bell-343686.mp3`,
};

export interface AnnouncementData {
  type: AnnouncementType;
  current: number;
  max: number;
  /**
   * True when Roll Visibility is "GM Only". The flag travels with the socket
   * payload so receiving clients can decide whether to draw the banner.
   */
  gmOnly: boolean;
}

/**
 * Show a banner/overlay announcement on screen.
 * "rise" and "ease" show a slide-in banner.
 * "break" shows a dramatic centered overlay.
 * "fade" is chat-only, no banner.
 */
export function showBanner(data: AnnouncementData): void {
  if (data.type === "fade") return;

  const i18n = game.i18n!;
  const isDramatic = data.type === "break";

  const container = document.createElement("div");
  container.classList.add("vtp-announcement");
  if (isDramatic) container.classList.add("vtp-announcement-dramatic");
  // The banner lives for two or three seconds, so the theme it is born with is
  // the theme it dies with — no need to watch for changes here.
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

  const duration = isDramatic ? 3000 : 2000;
  setTimeout(() => container.remove(), duration);
}

/**
 * Play a sound effect and broadcast it.
 *
 * In GM-only mode playback is pushed to GM clients alone — otherwise players
 * would hear the pool react to events they are not allowed to see.
 */
export function playSound(type: AnnouncementType, gmOnly = false): void {
  if (!getSetting("soundEnabled")) return;
  const src = (() => {
    switch (type) {
      case "rise": return getSetting("addDieSound") || DEFAULT_SOUNDS.rise;
      case "ease": return getSetting("removeDieSound") || DEFAULT_SOUNDS.ease;
      case "break": return getSetting("rollSound") || DEFAULT_SOUNDS.break;
      case "fade": return "";
    }
  })();
  if (!src) return;

  const socketOptions = gmOnly ? { recipients: getGMWhisperIDs() } : true;
  foundry.audio.AudioHelper.play({ src, volume: 0.8, loop: false }, socketOptions as any);
}

/**
 * Post a chat message for pool state changes.
 */
export async function postAnnouncementChat(data: AnnouncementData): Promise<void> {
  const i18n = game.i18n!;
  let content: string;

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
    whisper: data.gmOnly ? getGMWhisperIDs() : [],
  } as any);
}

/**
 * Broadcast an announcement to all clients via socket.
 * Only the GM should call this — other clients listen and show the banner.
 */
export function broadcastAnnouncement(data: AnnouncementData): void {
  (game as Game).socket!.emit(`module.${MODULE_ID}`, {
    action: "announcement",
    data,
  });
}

/**
 * Full announce: play sound, show banner locally, broadcast banner to others, post chat.
 * Call from GM client only.
 *
 * "GM Only" visibility covers the whole event rather than just the dice roll:
 * banner, sound and chat line all stay with the GMs.
 */
export async function announce(type: AnnouncementType, current: number, max: number): Promise<void> {
  const gmOnly = getSetting("rollVisibility") === "gmOnly";
  const data: AnnouncementData = { type, current, max, gmOnly };
  playSound(type, gmOnly);
  showBanner(data);
  broadcastAnnouncement(data);
  await postAnnouncementChat(data);
}
