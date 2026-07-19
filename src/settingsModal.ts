import type { Settings, Theme, Accent } from "./settings";
import { state } from "./state";
import { loadSettings, saveSettings } from "./settings";
import { t } from "./i18n";
import { el } from "./dom";
import { open, seal } from "./vault";
import { deriveKey, b64ToBytes, legacyKdf } from "./crypto";

interface SettingsOpts {
  onClose: () => void;
  onApply: (s: Settings) => void;
}

export function openSettings(opts: SettingsOpts): void {
  const cur = loadSettings();

  const overlay = el("div", { class: "modal-overlay" });
  const modal = el("div", { class: "modal" });
  overlay.append(modal);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });

  function close(): void {
    overlay.remove();
  }

  modal.append(
    el("h2", { class: "modal-title", textContent: t("settings.title") }),
  );

  // Account
  modal.append(
    el("div", { class: "section-h", textContent: t("settings.account") }),
  );
  const curIn = el("input", {
    class: "input",
    type: "password",
    placeholder: t("settings.currentPassword"),
  }) as HTMLInputElement;
  const newIn = el("input", {
    class: "input",
    type: "password",
    placeholder: t("settings.newPassword"),
  }) as HTMLInputElement;
  const confIn = el("input", {
    class: "input",
    type: "password",
    placeholder: t("settings.confirmPassword"),
  }) as HTMLInputElement;
  modal.append(curIn, newIn, confIn);
  const pwErr = el("div", { class: "lock-error" });
  modal.append(pwErr);
  const changeBtn = el("button", {
    class: "btn",
    textContent: t("settings.changePassword"),
  });
  changeBtn.addEventListener("click", async () => {
    pwErr.style.color = "";
    pwErr.textContent = "";
    const curVal = curIn.value;
    const newVal = newIn.value;
    const confVal = confIn.value;
    if (newVal.length < 8) {
      pwErr.textContent = t("settings.pwShort");
      return;
    }
    if (newVal !== confVal) {
      pwErr.textContent = t("settings.pwMismatch");
      return;
    }
    const file = await state.storage.load();
    if (!file) {
      pwErr.textContent = t("settings.wrongCurrent");
      return;
    }
    try {
      await open(file, curVal);
    } catch {
      pwErr.textContent = t("settings.wrongCurrent");
      return;
    }
    const sealed = await seal(state.vault!, newVal);
    await state.storage.save(sealed);
    const kdf = sealed.kdf ?? legacyKdf(sealed.v);
    state.master = newVal;
    state.key = await deriveKey(newVal, b64ToBytes(sealed.salt), kdf);
    state.salt = sealed.salt;
    state.kdf = kdf;
    pwErr.style.color = "var(--accent)";
    pwErr.textContent = t("settings.pwChanged");
    curIn.value = "";
    newIn.value = "";
    confIn.value = "";
  });
  modal.append(changeBtn);

  // Security
  modal.append(
    el("div", { class: "section-h", textContent: t("settings.security") }),
  );
  const enabled = cur.autoLockMinutes !== null;
  const cb = el("input", { type: "checkbox" }) as HTMLInputElement;
  cb.checked = enabled;
  const cbLabel = el("label", { class: "cb-label" });
  cbLabel.append(cb, document.createTextNode(" " + t("settings.autoLock")));
  modal.append(cbLabel);
  const minIn = el("input", {
    class: "input small",
    type: "number",
    value: String(enabled ? cur.autoLockMinutes! : 5),
  }) as HTMLInputElement;
  minIn.min = "1";
  minIn.max = "120";
  const minLabel = el("label", { class: "cb-label" });
  minLabel.append(minIn, document.createTextNode(" " + t("settings.minutes")));
  modal.append(minLabel);

  // Appearance
  modal.append(
    el("div", { class: "section-h", textContent: t("settings.appearance") }),
  );
  function radioRow(
    labelKey: string,
    name: string,
    value: string,
    checked: boolean,
  ): HTMLElement {
    const input = el("input", { type: "radio", name }) as HTMLInputElement;
    input.value = value;
    input.checked = checked;
    const lab = el("label", { class: "cb-label" });
    lab.append(input, document.createTextNode(" " + t(labelKey)));
    return lab;
  }
  const themeRow = el("div", { class: "radio-row" });
  themeRow.append(
    radioRow("settings.themeDark", "theme", "dark", cur.theme === "dark"),
    radioRow("settings.themeLight", "theme", "light", cur.theme === "light"),
  );
  const accentRow = el("div", { class: "radio-row" });
  accentRow.append(
    radioRow("settings.accentTeal", "accent", "teal", cur.accent === "teal"),
    radioRow("settings.accentPurple", "accent", "purple", cur.accent === "purple"),
  );
  modal.append(themeRow, accentRow);

  const actions = el("div", { class: "modal-actions" });
  const cancel = el("button", {
    class: "btn",
    textContent: t("editor.cancel"),
  });
  cancel.addEventListener("click", close);
  const save = el("button", {
    class: "btn primary",
    textContent: t("settings.save"),
  });
  save.addEventListener("click", () => {
    const minutes = cb.checked
      ? Math.max(1, Math.min(120, Number(minIn.value) || 5))
      : null;
    const themeVal = (modal.querySelector<HTMLInputElement>(
      'input[name="theme"]:checked',
    )?.value ?? "dark") as Theme;
    const accentVal = (modal.querySelector<HTMLInputElement>(
      'input[name="accent"]:checked',
    )?.value ?? "teal") as Accent;
    const s: Settings = {
      autoLockMinutes: minutes,
      theme: themeVal,
      accent: accentVal,
    };
    saveSettings(s);
    opts.onApply(s);
    opts.onClose();
    close();
  });
  actions.append(cancel, save);
  modal.append(actions);

  document.body.append(overlay);
}
