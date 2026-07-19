import type { Entry } from "./types";
import { state } from "./state";
import { t } from "./i18n";
import { el } from "./dom";
import { renderCard } from "./card";
import {
  filterEntries,
  sortEntries,
  categoryToFilter,
  type SortBy,
} from "./entrylogic";

let sortBy: SortBy = "updated";

export interface GridCallbacks {
  onEdit: (e: Entry) => void;
  onDelete: (e: Entry) => void;
}

export function renderGrid(root: HTMLElement, cb: GridCallbacks): void {
  root.innerHTML = "";
  const grid = el("div", { class: "grid" });

  function renderBody(): void {
    grid.innerHTML = "";
    const all = state.vault?.entries ?? [];
    const visible = sortEntries(
      filterEntries(all, "", categoryToFilter(state.activeCategory)),
      sortBy,
    );
    if (visible.length === 0) {
      const card = el("div", { class: "empty-card" });
      const ic = el("div", { class: "empty-icon" });
      ic.innerHTML =
        `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="5" width="16" height="14" rx="2.5"/><path d="M8 5V3.5A1.5 1.5 0 0 1 9.5 2h5A1.5 1.5 0 0 1 16 3.5V5"/><circle cx="12" cy="12" r="2.4"/></svg>`;
      card.append(ic);
      card.append(
        el("div", {
          class: "empty-title",
          textContent: all.length === 0 ? t("vault.empty") : t("grid.emptyCat"),
        }),
      );
      if (all.length === 0)
        card.append(
          el("div", { class: "empty-hint", textContent: t("vault.emptyHint") }),
        );
      grid.append(card);
      return;
    }
    for (const e of visible) grid.append(renderCard(e, cb));
  }

  renderBody();
  root.append(grid);
}
