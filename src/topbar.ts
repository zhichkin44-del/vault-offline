import { state } from "./state";
import { t } from "./i18n";
import { el, iconButton } from "./dom";
import { ICON } from "./icons";
import { countByCategory, type Category } from "./entrylogic";

export interface TopbarActions {
  onSearch: () => void;
  onFilter: () => void;
  onAdd: () => void;
  onLock: () => void;
  onSettings: () => void;
  onLang: () => void;
  onExport: () => void;
  onImport: () => void;
}

// One document listener for the whole app; it closes whichever menu is current.
let outsideClick: ((target: Node) => void) | null = null;
let docListening = false;

const CATS: [Category, string][] = [
  ["all", "cat.all"],
  ["login", "cat.logins"],
  ["note", "cat.notes"],
  ["custom", "cat.other"],
];

export function renderTopbar(root: HTMLElement, a: TopbarActions): HTMLInputElement {
  root.innerHTML = "";
  root.className = "topbar";

  const brand = el("div", { class: "brand" });
  const mark = el("span", { class: "brand-mark" });
  mark.innerHTML = ICON.lock;
  brand.append(mark, el("span", { class: "brand-name", textContent: t("app.title") }));

  const search = el("label", { class: "search" });
  const sIcon = el("span", { class: "search-icon" });
  sIcon.innerHTML = ICON.search;
  const input = el("input", {
    class: "search-input",
    type: "search",
    placeholder: t("search.placeholder"),
    value: state.query,
    spellcheck: false,
  });
  input.setAttribute("aria-label", t("search.placeholder"));
  input.autocomplete = "off";
  input.addEventListener("input", () => {
    state.query = input.value;
    a.onSearch();
  });
  input.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && input.value) {
      e.stopPropagation();
      input.value = "";
      state.query = "";
      a.onSearch();
    }
  });
  search.append(sIcon, input, el("kbd", { class: "kbd", textContent: "Ctrl K" }));

  const add = el("button", { class: "btn primary", type: "button" });
  const plus = el("span", { class: "btn-icon" });
  plus.innerHTML = ICON.plus;
  add.append(plus, el("span", { textContent: t("vault.add") }));
  add.addEventListener("click", a.onAdd);

  const lock = iconButton(ICON.lock, t("card.lock"), "topbar-lock");
  lock.addEventListener("click", a.onLock);

  const menuWrap = el("div", { class: "menu-wrap" });
  const more = iconButton(ICON.more, t("menu.more"));
  more.setAttribute("aria-haspopup", "menu");
  more.setAttribute("aria-expanded", "false");
  const menu = el("div", { class: "menu" });
  menu.setAttribute("role", "menu");
  menu.hidden = true;
  const items: [string, string, () => void][] = [
    [ICON.upload, t("export"), a.onExport],
    [ICON.download, t("import"), a.onImport],
    [ICON.settings, t("settings.title"), a.onSettings],
    [ICON.globe, t("lang.toggle"), a.onLang],
  ];
  const setOpen = (open: boolean): void => {
    menu.hidden = !open;
    more.setAttribute("aria-expanded", String(open));
  };
  for (const [svg, label, act] of items) {
    const it = el("button", { class: "menu-item", type: "button" });
    it.setAttribute("role", "menuitem");
    const ic = el("span", { class: "menu-icon" });
    ic.innerHTML = svg;
    it.append(ic, el("span", { textContent: label }));
    it.addEventListener("click", () => {
      setOpen(false);
      act();
    });
    menu.append(it);
  }
  more.addEventListener("click", (e) => {
    e.stopPropagation();
    setOpen(menu.hidden);
  });
  outsideClick = (target) => {
    if (!menuWrap.contains(target)) setOpen(false);
  };
  if (!docListening) {
    docListening = true;
    document.addEventListener("click", (e) => outsideClick?.(e.target as Node));
  }
  menuWrap.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !menu.hidden) {
      e.stopPropagation();
      setOpen(false);
      more.focus();
    }
  });
  menuWrap.append(more, menu);

  root.append(brand, search, add, lock, menuWrap);
  return input;
}

export function renderFilters(root: HTMLElement, onChange: () => void): void {
  root.innerHTML = "";
  root.className = "filters";
  root.setAttribute("role", "tablist");
  const counts = countByCategory(state.vault?.entries ?? []);
  for (const [cat, key] of CATS) {
    const active = state.activeCategory === cat;
    const chip = el("button", { class: "chip" + (active ? " active" : ""), type: "button" });
    chip.setAttribute("role", "tab");
    chip.setAttribute("aria-selected", String(active));
    chip.append(
      el("span", { textContent: t(key) }),
      el("span", { class: "chip-count", textContent: String(counts[cat]) }),
    );
    chip.addEventListener("click", () => {
      if (state.activeCategory === cat) return;
      state.activeCategory = cat;
      renderFilters(root, onChange);
      onChange();
    });
    root.append(chip);
  }
}

export function renderStatus(root: HTMLElement, autoLockOn: boolean): void {
  root.innerHTML = "";
  root.className = "statusbar";
  const left = el("div", { class: "status-left" });
  const shield = el("span", { class: "status-icon" });
  shield.innerHTML = ICON.shield;
  left.append(
    shield,
    el("span", { textContent: `${t("sec.offline")} · ${t("sec.encrypted")} AES-256-GCM` }),
  );
  const mid = el("div", { class: "status-lock" });
  if (autoLockOn) {
    mid.append(
      document.createTextNode(t("sec.autolock") + " "),
      el("span", { class: "mono", id: "lock-timer", textContent: "—" }),
    );
  } else {
    mid.textContent = t("sec.autolockOff");
  }
  root.append(left, mid, el("div", { class: "status-credit", textContent: "by Zhichkin" }));
}
