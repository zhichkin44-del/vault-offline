import type { Entry, EntryType } from "./types";
import { t } from "./i18n";
import { el, copyText, toast } from "./dom";

const TYPE_ICONS: Record<EntryType, string> = {
  login: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="4"/><path d="M11 11l8 8"/><path d="M16 16l2.2-2.2"/></svg>`,
  note: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M6.5 3.5h8l4 4v13h-12z"/><path d="M14 3.5v5h5"/><path d="M9 12.5h6M9 16h6"/></svg>`,
  custom: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3.2l2.5 5.4 5.8.6-4.4 4 1.3 5.7L12 16.9 6.8 19.5 8.1 13.8 3.7 9.8l5.8-.6z"/></svg>`,
};

const EYE_SVG =
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12 Q12 4 22 12 Q12 20 2 12 Z"/><circle cx="12" cy="12" r="3"/></svg>`;
const EYE_OFF_SVG =
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12 Q12 4 22 12 Q12 20 2 12 Z"/><line x1="4" y1="4" x2="20" y2="20"/><circle cx="12" cy="12" r="3"/></svg>`;

interface CardCallbacks {
  onEdit: (e: Entry) => void;
  onDelete: (e: Entry) => void;
}

interface DisplayField {
  label: string;
  value: string;
  secret: boolean;
}

function displayFields(entry: Entry): DisplayField[] {
  if (entry.type === "login") {
    const f: DisplayField[] = [];
    if (entry.login)
      f.push({ label: t("card.login"), value: entry.login, secret: false });
    f.push({ label: t("card.password"), value: entry.password, secret: true });
    if (entry.url)
      f.push({ label: t("card.url"), value: entry.url, secret: false });
    return f;
  }
  if (entry.type === "note") {
    return [{ label: t("card.note"), value: entry.note, secret: true }];
  }
  return entry.fields.map((x) => ({
    label: x.k,
    value: x.v,
    secret: true,
  }));
}

export function renderCard(entry: Entry, cb: CardCallbacks): HTMLElement {
  const card = el("div", { class: "card" });
  const titleWrap = el("div", { class: "card-title" });
  const tIcon = el("span", { class: "card-type-icon" });
  tIcon.innerHTML = TYPE_ICONS[entry.type];
  titleWrap.append(
    tIcon,
    el("span", { textContent: entry.title || t("vault.empty") }),
  );
  card.append(titleWrap);
  for (const f of displayFields(entry)) {
    const row = el("div", { class: "card-row" });
    const labelBtn = el("button", {
      class: "card-label-btn",
      textContent: f.label,
    });
    labelBtn.setAttribute("aria-label", f.label + " — " + t("card.copy"));
    labelBtn.addEventListener("click", async () => {
      const ok = await copyText(f.value);
      if (ok) toast(t("card.copied"));
    });
    row.append(labelBtn);

    const valueEl = el("span", {
      class: "card-value" + (f.secret ? " secret" : ""),
      textContent: f.secret ? "••••••••" : f.value,
    });
    row.append(valueEl);

    if (f.secret) {
      const eye = el("button", {
        class: "icon-inline",
        title: t("card.reveal"),
      });
      eye.setAttribute("aria-label", t("card.reveal"));
      eye.innerHTML = EYE_SVG;
      let revealed = false;
      eye.addEventListener("click", () => {
        revealed = !revealed;
        valueEl.textContent = revealed ? f.value : "••••••••";
        eye.innerHTML = revealed ? EYE_OFF_SVG : EYE_SVG;
        eye.setAttribute("title", revealed ? t("card.hide") : t("card.reveal"));
      });
      row.append(eye);
    }
    card.append(row);
  }

  const foot = el("div", { class: "card-foot" });
  const editBtn = el("button", {
    class: "btn small",
    textContent: t("card.edit"),
  });
  editBtn.addEventListener("click", () => cb.onEdit(entry));
  const delBtn = el("button", {
    class: "btn small danger",
    textContent: t("card.delete"),
  });
  delBtn.addEventListener("click", () => cb.onDelete(entry));
  foot.append(editBtn, delBtn);
  card.append(foot);

  return card;
}
