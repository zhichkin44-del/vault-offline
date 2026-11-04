import type { Settings, Theme, Accent } from "./settings";
import { state } from "./state";
import { loadSettings, saveSettings } from "./settings";
import { t } from "./i18n";
import { el, openModal, field, busy } from "./dom";
import { openVault, createVault } from "./vault";

interface SettingsOpts {
  onClose: () => void;
  onApply: (s: Settings) => void;
}

function segmented<T extends string>(
  label: string,
  options: [T, string][],
  value: T,
): { wrap: HTMLElement; get: () => T } {
  let cur = value;
  const seg = el("div", { class: "segmented" });
  seg.setAttribute("role", "radiogroup");
  seg.setAttribute("aria-label", label);
  const btns: [T, HTMLButtonElement][] = [];
  const sync = (): void => {
    for (const [v, b] of btns) {
      b.classList.toggle("active", v === cur);
      b.setAttribute("aria-checked", String(v === cur));
    }
  };
  for (const [v, key] of options) {
    const b = el("button", { class: "seg", type: "button", textContent: t(key) });
    b.setAttribute("role", "radio");
    b.addEventListener("click", () => {
      cur = v;
      sync();
    });
    btns.push([v, b]);
    seg.append(b);
  }
  sync();
  return { wrap: field(label, seg), get: () => cur };
}

export function openSettings(opts: SettingsOpts): void {
  const cur = loadSettings();
  const m = openModal({ title: t("settings.title"), className: "settings" });

  // Master password
  const pwSection = el("section", { class: "settings-section" });
  pwSection.append(el("h3", { class: "section-h", textContent: t("settings.account") }));
  const mk = (ph: string, ac: string): HTMLInputElement => {
    const i = el("input", { class: "input", type: "password", placeholder: ph });
    i.setAttribute("autocomplete", ac);
    i.setAttribute("aria-label", ph);
    return i;
  };
  const curIn = mk(t("settings.currentPassword"), "current-password");
  const newIn = mk(t("settings.newPassword"), "new-password");
  const confIn = mk(t("settings.confirmPassword"), "new-password");
  const pwMsg = el("div", { class: "form-error" });
  pwMsg.setAttribute("role", "status");
  const changeBtn = el("button", { class: "btn", type: "button", textContent: t("settings.changePassword") });
  changeBtn.addEventListener("click", async () => {
    pwMsg.className = "form-error";
    pwMsg.textContent = "";
    if (newIn.value.length < 8) {
      pwMsg.textContent = t("settings.pwShort");
      return;
    }
    if (newIn.value !== confIn.value) {
      pwMsg.textContent = t("settings.pwMismatch");
      return;
    }
    await busy(changeBtn, t("settings.changing"), async () => {
      const file = await state.storage.load();
      try {
        if (!file) throw new Error("no-file");
        await openVault(file, curIn.value);
      } catch {
        pwMsg.textContent = t("settings.wrongCurrent");
        return;
      }
      // New salt + new key; one KDF run for the new password.
      const next = await createVault(newIn.value, state.vault!);
      await state.storage.save(next.file);
      state.vault = next.vault;
      state.key = next.key;
      state.salt = next.salt;
      state.kdf = next.kdf;
      pwMsg.className = "form-ok";
      pwMsg.textContent = t("settings.pwChanged");
      curIn.value = newIn.value = confIn.value = "";
    });
  });
  pwSection.append(curIn, newIn, confIn, pwMsg, changeBtn);

  // Auto-lock
  const alSection = el("section", { class: "settings-section" });
  alSection.append(el("h3", { class: "section-h", textContent: t("settings.security") }));
  const enabled = cur.autoLockMinutes !== null;
  const cb = el("input", { type: "checkbox" });
  cb.checked = enabled;
  const minIn = el("input", { class: "input small", type: "number", value: String(enabled ? cur.autoLockMinutes! : 5) });
  minIn.min = "1";
  minIn.max = "120";
  minIn.setAttribute("aria-label", t("settings.minutes"));
  minIn.disabled = !enabled;
  cb.addEventListener("change", () => (minIn.disabled = !cb.checked));
  const alRow = el("div", { class: "inline-row" });
  const cbLabel = el("label", { class: "check" });
  cbLabel.append(cb, el("span", { textContent: t("settings.autoLock") }));
  alRow.append(cbLabel, minIn, el("span", { class: "muted", textContent: t("settings.minutes") }));
  alSection.append(alRow);

  // Appearance
  const apSection = el("section", { class: "settings-section" });
  apSection.append(el("h3", { class: "section-h", textContent: t("settings.appearance") }));
  const theme = segmented<Theme>(t("settings.theme"), [["light", "settings.themeLight"], ["dark", "settings.themeDark"]], cur.theme);
  const accent = segmented<Accent>(t("settings.accent"), [["teal", "settings.accentTeal"], ["purple", "settings.accentPurple"]], cur.accent);
  const apRow = el("div", { class: "two-col" });
  apRow.append(theme.wrap, accent.wrap);
  apSection.append(apRow);

  m.body.append(pwSection, alSection, apSection);

  const cancel = el("button", { class: "btn", type: "button", textContent: t("editor.cancel") });
  cancel.addEventListener("click", () => m.close());
  const save = el("button", { class: "btn primary", type: "button", textContent: t("settings.save") });
  save.addEventListener("click", () => {
    const minutes = cb.checked ? Math.max(1, Math.min(120, Number(minIn.value) || 5)) : null;
    const s: Settings = { autoLockMinutes: minutes, theme: theme.get(), accent: accent.get() };
    saveSettings(s);
    opts.onApply(s);
    m.close();
    opts.onClose();
  });
  m.footer.append(cancel, save);
}
