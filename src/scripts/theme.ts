/**
 * Foundry v13 drives its colours from a pair of classes — `themed` plus
 * `theme-light` / `theme-dark` — which is where both its `--color-*` variables
 * and the `color-scheme` property that makes CSS `light-dark()` resolve are set.
 *
 * The pool is a frameless ApplicationV2 and the announcement banner is appended
 * straight into `#interface`, so neither is guaranteed to sit under a themed
 * ancestor. Rather than hard-coding a palette we mirror Foundry's own classes
 * onto our roots, which means the module follows the user's interface theme and
 * any accent overrides layered on top of it (Carolingian UI's colour picker
 * rewrites the same `--color-*` variables, so those come along for free).
 */

export type ColorScheme = "light" | "dark";

const THEME_CLASSES = ["theme-light", "theme-dark"] as const;

/**
 * The interface colour scheme currently in effect.
 *
 * `core.uiConfig` stores `""` for "follow the browser"; Foundry resolves that
 * onto `<body>`, so the body classes are consulted before the media query.
 */
export function getColorScheme(): ColorScheme {
  let chosen: string | undefined;
  try {
    const uiConfig = (game as Game).settings?.get("core", "uiConfig") as any;
    chosen = uiConfig?.colorScheme?.interface || uiConfig?.colorScheme?.applications;
  } catch {
    // Settings are not ready yet — fall through to the DOM.
  }
  if (chosen === "light" || chosen === "dark") return chosen;

  const body = document.body;
  if (body?.classList.contains("theme-light")) return "light";
  if (body?.classList.contains("theme-dark")) return "dark";

  return window.matchMedia?.("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

/** Stamp `themed theme-*` onto an element so Foundry's palette applies inside it. */
export function applyTheme(el: HTMLElement | null | undefined, scheme: ColorScheme = getColorScheme()): void {
  if (!el) return;
  el.classList.add("themed");
  el.classList.remove(...THEME_CLASSES);
  el.classList.add(`theme-${scheme}`);
}

const subscribers = new Set<(scheme: ColorScheme) => void>();
let observer: MutationObserver | null = null;
let media: MediaQueryList | null = null;
let lastScheme: ColorScheme | null = null;

function notify(): void {
  const scheme = getColorScheme();
  if (scheme === lastScheme) return;
  lastScheme = scheme;
  for (const cb of [...subscribers]) cb(scheme);
}

/**
 * Run `cb` whenever the interface theme changes. Returns an unsubscribe function.
 *
 * `core.uiConfig` is client-scoped, so the `updateSetting` hook never fires for
 * it. What does reliably happen is that Foundry re-stamps the classes on
 * `<body>` — watching that covers both an explicit setting change and the OS
 * flipping while "follow the browser" is selected.
 */
export function onColorSchemeChange(cb: (scheme: ColorScheme) => void): () => void {
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
