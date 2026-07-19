import { state } from "./state";
import { t } from "./i18n";
import { el } from "./dom";
import { countByCategory, type Category } from "./entrylogic";
import { loadSettings } from "./settings";

const ICONS: Record<Category, string> = {
  all: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="3.5" width="7" height="7" rx="1.6"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.6"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.6"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.6"/></svg>`,
  login: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="4"/><path d="M11 11l8 8"/><path d="M16 16l2.2-2.2"/><path d="M14 14l2.2-2.2"/></svg>`,
  note: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M6.5 3.5h8l4 4v13h-12z"/><path d="M14 3.5v5h5"/><path d="M9 12.5h6M9 16h6"/></svg>`,
  custom: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3.2l2.5 5.4 5.8.6-4.4 4 1.3 5.7L12 16.9 6.8 19.5 8.1 13.8 3.7 9.8l5.8-.6z"/></svg>`,
};

const GEAR_SVG =
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>`;
const LOCK_SVG =
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="9" rx="2.2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>`;
const LANG_SVG =
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"/></svg>`;
const EXPORT_SVG =
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15V4"/><path d="M8 8l4-4 4 4"/><path d="M5 20h14"/></svg>`;
const IMPORT_SVG =
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v11"/><path d="M8 11l4 4 4-4"/><path d="M5 20h14"/></svg>`;
const PLUS_SVG =
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>`;

interface NavItem {
  cat: Category;
  labelKey: string;
}

const NAV: NavItem[] = [
  { cat: "all", labelKey: "cat.all" },
  { cat: "login", labelKey: "cat.logins" },
  { cat: "note", labelKey: "cat.notes" },
  { cat: "custom", labelKey: "cat.other" },
];

export interface SidebarActions {
  onChange: () => void;
  onAdd: () => void;
  onSettings: () => void;
  onLock: () => void;
  onLang: () => void;
  onExport: () => void;
  onImport: () => void;
}

export function renderSidebar(root: HTMLElement, actions: SidebarActions): void {
  root.innerHTML = "";
  root.className = "sidebar";

  const brand = el("div", { class: "brand" });
  const mark = el("span", { class: "brand-mark" });
  mark.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4.5" y="10" width="15" height="10" rx="2.6"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/><circle cx="12" cy="15" r="1.5" fill="currentColor" stroke="none"/></svg>`;
  brand.append(mark, el("span", { class: "brand-name", textContent: t("app.title") }));
  root.append(brand);

  const nav = el("nav", { class: "nav" });
  const counts = countByCategory(state.vault?.entries ?? []);
  for (const item of NAV) {
    const active = state.activeCategory === item.cat;
    const btn = el("button", {
      class: "nav-item" + (active ? " active" : ""),
    });
    const icon = el("span", { class: "nav-icon" });
    icon.innerHTML = ICONS[item.cat];
    btn.append(icon);
    btn.append(el("span", { class: "nav-label", textContent: t(item.labelKey) }));
    btn.append(
      el("span", { class: "nav-count mono", textContent: String(counts[item.cat]) }),
    );
    if (active) btn.append(el("span", { class: "nav-seam" }));
    btn.addEventListener("click", () => {
      if (state.activeCategory === item.cat) return;
      state.activeCategory = item.cat;
      renderSidebar(root, actions);
      actions.onChange();
    });
    nav.append(btn);
  }
  root.append(nav);

  root.append(el("div", { class: "sidebar-sep" }));

  const actionsWrap = el("div", { class: "sidebar-actions" });
  const actionItems: [string, string, () => void][] = [
    [GEAR_SVG, t("settings.title"), actions.onSettings],
    [LOCK_SVG, t("card.lock"), actions.onLock],
    [LANG_SVG, t("lang.toggle"), actions.onLang],
    [EXPORT_SVG, t("export"), actions.onExport],
    [IMPORT_SVG, t("import"), actions.onImport],
  ];
  for (const [svg, label, act] of actionItems) {
    const item = el("button", { class: "nav-item" });
    const icon = el("span", { class: "nav-icon" });
    icon.innerHTML = svg;
    item.append(icon, el("span", { class: "nav-label", textContent: label }));
    item.setAttribute("aria-label", label);
    item.addEventListener("click", act);
    actionsWrap.append(item);
  }
  root.append(actionsWrap);

  const addBtn = el("button", { class: "btn primary sidebar-add" });
  const plus = el("span");
  plus.innerHTML = PLUS_SVG;
  addBtn.append(plus, el("span", { textContent: t("vault.add") }));
  addBtn.addEventListener("click", actions.onAdd);
  root.append(addBtn);

  const sec = el("div", { class: "sec-status" });
  sec.append(el("span", { class: "sec-dot" }));
  const s = loadSettings();
  if (s.autoLockMinutes === null) {
    sec.append(
      el("div", { class: "sec-text" }, [
        el("div", { class: "sec-protected", textContent: t("sec.protected") }),
        el("div", { class: "sec-sub", textContent: t("settings.autoLockOff") }),
      ]),
    );
  } else {
    sec.append(
      el("div", { class: "sec-text" }, [
        el("div", { class: "sec-protected", textContent: t("sec.protected") }),
        el("div", { class: "sec-sub" }, [
          document.createTextNode(t("sec.autolock") + " "),
          el("span", { class: "mono", id: "lock-timer", textContent: "5:00" }),
        ]),
      ]),
    );
  }
  root.append(el("div", { class: "sidebar-credit", textContent: "by zhichkin44-del" }));
  root.append(sec);
}
