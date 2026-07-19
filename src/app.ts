import type { Vault, Entry } from "./types";
import { state, persist } from "./state";
import { onLangChange, t, toggleLang } from "./i18n";
import { el } from "./dom";
import { renderLock } from "./lock";
import { renderGrid } from "./grid";
import { renderSidebar } from "./sidebar";
import { openEditor } from "./editor";
import { removeEntry } from "./vault";
import { exportVault, importVault } from "./exportimport";
import { confirmModal } from "./confirm";
import {
  createState,
  recordActivity,
  shouldLock,
  disable,
  DEFAULT_TIMEOUT_MS,
  type AutoLockState,
} from "./autolock";
import { openSettings } from "./settingsModal";
import { loadSettings, type Settings } from "./settings";

let rootEl: HTMLElement;
let contentEl: HTMLElement;
let settings: Settings = loadSettings();
let alState: AutoLockState =
  settings.autoLockMinutes === null
    ? disable(createState(DEFAULT_TIMEOUT_MS, Date.now()))
    : createState(settings.autoLockMinutes * 60000, Date.now());
let lastPointerX = 0;
let lastPointerY = 0;
let windowFocused = false;

function applyAppearance(): void {
  const root = document.documentElement;
  root.dataset.theme = settings.theme;
  root.dataset.accent = settings.accent;
}

function applyAutoLock(s: Settings): void {
  settings = s;
  applyAppearance();
  alState =
    s.autoLockMinutes === null
      ? disable(createState(DEFAULT_TIMEOUT_MS, Date.now()))
      : createState(s.autoLockMinutes * 60000, Date.now());
}

function alActivity(): void {
  if (state.unlocked) alState = recordActivity(alState, Date.now());
}

function onMouseMove(e: MouseEvent): void {
  if (Math.abs(e.clientX - lastPointerX) < 2 && Math.abs(e.clientY - lastPointerY) < 2)
    return;
  lastPointerX = e.clientX;
  lastPointerY = e.clientY;
  alActivity();
}

function onFocus(): void {
  if (windowFocused) return;
  windowFocused = true;
  alActivity();
}

function onBlur(): void {
  windowFocused = false;
}

function lockNow(): void {
  alState = disable(alState);
  state.unlocked = false;
  state.vault = null;
  state.key = null;
  state.master = null;
  state.salt = null;
  state.kdf = null;
  render();
}

function unlock(vault: Vault, key: CryptoKey, master: string): void {
  state.unlocked = true;
  state.vault = vault;
  state.key = key;
  state.master = master;
  alState =
    settings.autoLockMinutes === null
      ? disable(createState(DEFAULT_TIMEOUT_MS, Date.now()))
      : createState(settings.autoLockMinutes * 60000, Date.now());
  render();
}

function renderContent(): void {
  if (!contentEl) return;
  renderGrid(contentEl, {
    onEdit: (e: Entry) => openEditor({ entry: e, onClose: render }),
    onDelete: async (e: Entry) => {
      if (!(await confirmModal(t("editor.confirmDelete"), t("editor.delete"), t("editor.cancel")))) return;
      state.vault = removeEntry(state.vault!, e.id);
      await persist();
      render();
    },
  });
}

function render(): void {
  if (state.unlocked && state.vault) {
    rootEl.innerHTML = "";
    const layout = el("div", { class: "app-layout" });
    const sidebarEl = el("aside", { id: "sidebar" });
    contentEl = el("main", { class: "content" });
    layout.append(sidebarEl, contentEl);
    rootEl.append(layout);
    renderSidebar(sidebarEl, {
      onChange: renderContent,
      onAdd: () => openEditor({ onClose: render }),
      onSettings: () =>
        openSettings({ onClose: render, onApply: applyAutoLock }),
      onLock: lockNow,
      onLang: () => toggleLang(),
      onExport: () => exportVault(),
      onImport: () => importVault(render),
    });
    renderContent();
  } else {
    renderLock(rootEl, {
      onUnlock: (vault: Vault, key: CryptoKey) =>
        unlock(vault, key, state.master ?? ""),
    });
  }
}

export function startApp(root: HTMLElement): void {
  rootEl = root;
  applyAppearance();
  onLangChange(render);
  window.addEventListener("mousemove", onMouseMove, { passive: true });
  for (const ev of ["keydown", "click", "visibilitychange"] as const)
    window.addEventListener(ev, alActivity, { passive: true });
  window.addEventListener("focus", onFocus, { passive: true });
  window.addEventListener("blur", onBlur, { passive: true });
  window.setInterval(() => {
    if (state.unlocked && shouldLock(alState, Date.now())) lockNow();
    const tm = document.getElementById("lock-timer");
    if (tm && state.unlocked) {
      if (settings.autoLockMinutes === null) {
        tm.textContent = "—";
      } else {
        const ms = Math.max(
          0,
          alState.lastActivity + alState.timeoutMs - Date.now(),
        );
        const s = Math.round(ms / 1000);
        tm.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
      }
    }
  }, 1000);
  render();
}
