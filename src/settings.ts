const KEY = "vaulty.settings";

export type Theme = "dark" | "light";
export type Accent = "teal" | "purple";

export interface Settings {
  autoLockMinutes: number | null;
  theme: Theme;
  accent: Accent;
}

const mem: Record<string, string> = {};

function getRaw(k: string): string | null {
  try {
    if (typeof localStorage !== "undefined" && localStorage) return localStorage.getItem(k);
  } catch {
    /* localStorage unavailable */
  }
  return k in mem ? mem[k] : null;
}

function setRaw(k: string, v: string): void {
  try {
    if (typeof localStorage !== "undefined" && localStorage) {
      localStorage.setItem(k, v);
      return;
    }
  } catch {
    /* localStorage unavailable */
  }
  mem[k] = v;
}

export function defaultSettings(): Settings {
  return { autoLockMinutes: 5, theme: "light", accent: "teal" };
}

export function loadSettings(): Settings {
  const raw = getRaw(KEY);
  if (!raw) return defaultSettings();
  try {
    const p = JSON.parse(raw) as Partial<Settings>;
    if (p && (typeof p.autoLockMinutes === "number" || p.autoLockMinutes === null)) {
      return {
        autoLockMinutes: p.autoLockMinutes,
        theme: p.theme === "dark" ? "dark" : "light",
        accent: p.accent === "purple" ? "purple" : "teal",
      };
    }
  } catch {
    /* corrupted */
  }
  return defaultSettings();
}

export function saveSettings(s: Settings): void {
  setRaw(KEY, JSON.stringify(s));
}
