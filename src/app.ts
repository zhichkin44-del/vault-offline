import { state, clearSession } from "./state";
import { onLangChange, toggleLang } from "./i18n";
import { el } from "./dom";
import { renderLock } from "./lock";
import { renderGrid } from "./grid";
import { renderTopbar, renderFilters, renderStatus } from "./topbar";
import { openEditor } from "./editor";
import { exportVault, importVault } from "./exportimport";
import type { Unlocked } from "./vault";
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
let contentEl: HTMLElement | null = null;
let filtersEl: HTMLElement | null = null;
let searchEl: HTMLInputElement | null = null;
let settings: Settings = loadSettings();
let alState: AutoLockState = freshAutoLock();
let lastPointerX = 0;
let lastPointerY = 0;
let windowFocused = false;

function freshAutoLock(): AutoLockState {
  return settings.autoLockMinutes === null
    ? disable(createState(DEFAULT_TIMEOUT_MS, Date.now()))
    : createState(settings.autoLockMinutes * 60000, Date.now());
}

function applyAppearance(): void {
  const root = document.documentElement;
  root.dataset.theme = settings.theme;
  root.dataset.accent = settings.accent;
}

function applySettings(s: Settings): void {
  settings = s;
  applyAppearance();
  alState = freshAutoLock();
}

function alActivity(): void {
  if (state.unlocked) alState = recordActivity(alState, Date.now());
}

function onMouseMove(e: MouseEvent): void {
  if (Math.abs(e.clientX - lastPointerX) < 2 && Math.abs(e.clientY - lastPointerY) < 2) return;
  lastPointerX = e.clientX;
  lastPointerY = e.clientY;
  alActivity();
}

function closeModals(): void {
  document.querySelectorAll(".modal-overlay").forEach((n) => n.remove());
}

function lockNow(): void {
  alState = disable(alState);
  closeModals();
  clearSession();
  render();
}

function unlock(u: Unlocked): void {
  state.unlocked = true;
  state.vault = u.vault;
  state.key = u.key;
  state.salt = u.salt;
  state.kdf = u.kdf;
  alState = freshAutoLock();
  render();
}

function renderContent(): void {
  if (!contentEl) return;
  renderGrid(contentEl, {
    onEdit: (e) => openEditor({ entry: e, onClose: refresh }),
    onAdd: () => openEditor({ onClose: refresh }),
  });
}

/** Re-renders counts and cards without rebuilding the top bar (keeps search focus). */
function refresh(): void {
  if (filtersEl) renderFilters(filtersEl, renderContent);
  renderContent();
}

function render(): void {
  closeModals();
  rootEl.innerHTML = "";
  contentEl = filtersEl = searchEl = null;
  if (!(state.unlocked && state.vault)) {
    void renderLock(rootEl, { onUnlock: unlock });
    return;
  }
  const layout = el("div", { class: "app-layout" });
  const top = el("header");
  filtersEl = el("div");
  contentEl = el("main", { class: "content" });
  const status = el("footer");
  layout.append(top, filtersEl, contentEl, status);
  rootEl.append(layout);
  searchEl = renderTopbar(top, {
    onSearch: renderContent,
    onFilter: renderContent,
    onAdd: () => openEditor({ onClose: refresh }),
    onLock: lockNow,
    onSettings: () => openSettings({ onClose: render, onApply: applySettings }),
    onLang: () => toggleLang(),
    onExport: () => void exportVault(),
    onImport: () => void importVault(refresh),
  });
  renderFilters(filtersEl, renderContent);
  renderStatus(status, settings.autoLockMinutes !== null);
  renderContent();
  tickTimer();
}

function onKeyDown(e: KeyboardEvent): void {
  alActivity();
  if (!state.unlocked) return;
  const mod = e.ctrlKey || e.metaKey;
  if (mod && (e.key === "k" || e.key === "K" || e.key === "f" || e.key === "F")) {
    if (document.querySelector(".modal-overlay")) return;
    e.preventDefault();
    searchEl?.focus();
    searchEl?.select();
  } else if (mod && (e.key === "l" || e.key === "L")) {
    e.preventDefault();
    lockNow();
  } else if (mod && (e.key === "n" || e.key === "N") && !document.querySelector(".modal-overlay")) {
    e.preventDefault();
    openEditor({ onClose: refresh });
  }
}

function tickTimer(): void {
  const tm = document.getElementById("lock-timer");
  if (!tm || !state.unlocked || settings.autoLockMinutes === null) return;
  const ms = Math.max(0, alState.lastActivity + alState.timeoutMs - Date.now());
  const s = Math.round(ms / 1000);
  tm.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function startApp(root: HTMLElement): void {
  rootEl = root;
  applyAppearance();
  onLangChange(render);
  window.addEventListener("mousemove", onMouseMove, { passive: true });
  window.addEventListener("keydown", onKeyDown);
  for (const ev of ["click", "visibilitychange", "wheel"] as const)
    window.addEventListener(ev, alActivity, { passive: true });
  window.addEventListener("focus", () => {
    if (windowFocused) return;
    windowFocused = true;
    alActivity();
  });
  window.addEventListener("blur", () => (windowFocused = false));
  window.setInterval(() => {
    if (state.unlocked && shouldLock(alState, Date.now())) lockNow();
    tickTimer();
  }, 1000);
  render();
}
