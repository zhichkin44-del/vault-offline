import type { Entry } from "./types";
import { getLang, t } from "./i18n";
import { el, copyText, toast, iconButton } from "./dom";
import { ICON } from "./icons";

interface CardCallbacks {
  onEdit: (e: Entry) => void;
}

interface DisplayField {
  label: string;
  value: string;
  secret: boolean;
  multiline?: boolean;
}

const MASK = "••••••••••";

export function hostOf(url: string): string {
  const s = url.trim();
  if (!s) return "";
  try {
    return new URL(s.includes("://") ? s : "https://" + s).host.replace(/^www\./, "");
  } catch {
    return s;
  }
}

/** Stable 0–5 tone for the monogram tile, derived from the title. */
export function toneOf(title: string): number {
  let h = 0;
  for (const ch of title.toLowerCase()) h = (h * 31 + ch.codePointAt(0)!) >>> 0;
  return h % 6;
}

function subtitle(entry: Entry): string {
  if (entry.type === "login") return entry.login || hostOf(entry.url);
  if (entry.type === "note") return t("card.secureNote");
  const keys = entry.fields.map((f) => f.k).join(", ");
  return keys ? `${t("type.custom")} · ${keys}` : t("type.custom");
}

function displayFields(entry: Entry): DisplayField[] {
  if (entry.type === "login") {
    const f: DisplayField[] = [];
    if (entry.login) f.push({ label: t("card.login"), value: entry.login, secret: false });
    f.push({ label: t("card.password"), value: entry.password, secret: true });
    if (entry.url) f.push({ label: t("card.url"), value: entry.url, secret: false });
    return f;
  }
  if (entry.type === "note") {
    return [{ label: t("card.note"), value: entry.note, secret: true, multiline: true }];
  }
  return entry.fields.map((x) => ({ label: x.k, value: x.v, secret: true }));
}

function formatDate(ms: number): string {
  try {
    const d = new Date(ms);
    const sameYear = d.getFullYear() === new Date().getFullYear();
    return new Intl.DateTimeFormat(getLang() === "ru" ? "ru-RU" : "en-GB", {
      day: "numeric",
      month: "short",
      ...(sameYear ? {} : { year: "numeric" }),
    }).format(d);
  } catch {
    return "";
  }
}

export function renderCard(entry: Entry, cb: CardCallbacks): HTMLElement {
  const card = el("article", { class: "card" });
  card.dataset.type = entry.type;

  const head = el("div", { class: "card-head" });
  const mono = el("span", {
    class: "monogram",
    textContent: (entry.title.trim()[0] ?? "?").toUpperCase(),
  });
  mono.dataset.tone = String(toneOf(entry.title));
  mono.setAttribute("aria-hidden", "true");
  const titles = el("div", { class: "card-titles" });
  titles.append(
    el("h3", { class: "card-title", textContent: entry.title || t("vault.empty") }),
    el("div", { class: "card-sub", textContent: subtitle(entry) }),
  );
  const edit = iconButton(ICON.edit, t("card.edit"), "card-edit");
  edit.addEventListener("click", () => cb.onEdit(entry));
  head.append(mono, titles, edit);
  card.append(head);

  const rows = el("div", { class: "card-rows" });
  for (const f of displayFields(entry)) {
    const row = el("div", { class: "card-row" + (f.multiline ? " multiline" : "") });
    row.append(el("span", { class: "card-label", textContent: f.label }));
    const shown = f.secret ? MASK : f.label === t("card.url") ? hostOf(f.value) : f.value;
    const valueEl = el("span", {
      class: "card-value" + (f.secret ? " secret" : ""),
      textContent: shown || "—",
    });
    row.append(valueEl);

    const tools = el("span", { class: "card-tools" });
    if (f.secret) {
      const eye = iconButton(ICON.eye, t("card.reveal"), "icon-inline");
      let revealed = false;
      eye.addEventListener("click", () => {
        revealed = !revealed;
        valueEl.textContent = revealed ? f.value || "—" : MASK;
        valueEl.classList.toggle("revealed", revealed);
        eye.innerHTML = revealed ? ICON.eyeOff : ICON.eye;
        const lab = revealed ? t("card.hide") : t("card.reveal");
        eye.title = lab;
        eye.setAttribute("aria-label", lab);
      });
      tools.append(eye);
    }
    const copy = iconButton(ICON.copy, `${t("card.copy")}: ${f.label}`, "icon-inline");
    copy.addEventListener("click", async () => {
      const ok = await copyText(f.value);
      toast(ok ? t("card.copied") : t("card.copyFailed"));
    });
    tools.append(copy);
    row.append(tools);
    rows.append(row);
  }
  card.append(rows);

  card.append(
    el("div", {
      class: "card-foot",
      textContent: `${t("card.updated")} ${formatDate(entry.updated)}`,
    }),
  );
  return card;
}
