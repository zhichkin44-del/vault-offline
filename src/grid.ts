import type { Entry } from "./types";
import { state } from "./state";
import { t } from "./i18n";
import { el } from "./dom";
import { ICON } from "./icons";
import { renderCard } from "./card";
import { filterEntries, sortEntries, categoryToFilter } from "./entrylogic";

export interface GridCallbacks {
  onEdit: (e: Entry) => void;
  onAdd: () => void;
}

export function renderGrid(root: HTMLElement, cb: GridCallbacks): void {
  root.innerHTML = "";
  const all = state.vault?.entries ?? [];
  const visible = sortEntries(
    filterEntries(all, state.query, categoryToFilter(state.activeCategory)),
    state.query ? "title" : "updated",
  );

  if (visible.length === 0) {
    const empty = el("div", { class: "empty" });
    const ic = el("div", { class: "empty-icon" });
    ic.innerHTML = all.length === 0 ? ICON.shield : ICON.search;
    empty.append(ic);
    if (all.length === 0) {
      empty.append(
        el("div", { class: "empty-title", textContent: t("vault.emptyTitle") }),
        el("div", { class: "empty-hint", textContent: t("vault.emptyHint") }),
      );
      const add = el("button", { class: "btn primary", type: "button", textContent: t("vault.addFirst") });
      add.addEventListener("click", cb.onAdd);
      empty.append(add);
    } else {
      empty.append(
        el("div", {
          class: "empty-title",
          textContent: state.query ? t("grid.noResults") : t("grid.emptyCat"),
        }),
      );
    }
    root.append(empty);
    return;
  }

  const grid = el("div", { class: "grid" });
  for (const e of visible) grid.append(renderCard(e, cb));
  root.append(grid);
}
