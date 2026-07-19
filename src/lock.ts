import type { Vault } from "./types";
import { state } from "./state";
import { t, toggleLang } from "./i18n";
import { el } from "./dom";
import { seal, open, emptyVault } from "./vault";
import { deriveKey, b64ToBytes, legacyKdf } from "./crypto";

interface LockOpts {
  onUnlock: (vault: Vault, key: CryptoKey) => void;
}

export async function renderLock(root: HTMLElement, opts: LockOpts): Promise<void> {
  const hasData = await state.storage.hasData();
  root.innerHTML = "";

  const wrap = el("div", { class: "lock" });
  wrap.append(el("h1", { class: "brand big", textContent: t("app.title") }));

  const top = el("div", { class: "lock-top" });
  const langBtn = el("button", {
    class: "btn small ghost",
    textContent: t("lang.toggle"),
    title: t("lang.switch"),
  });
  langBtn.setAttribute("aria-label", t("lang.switch"));
  langBtn.addEventListener("click", () => toggleLang());
  top.append(langBtn);
  root.append(top);

  wrap.append(
    el("p", {
      class: "lock-hint",
      textContent: hasData ? t("lock.existing") : t("lock.firstRun"),
    }),
  );

  const form = el("form", { class: "lock-form" });
  const master = el("input", {
    class: "input",
    type: "password",
    placeholder: t("lock.master"),
    autocomplete: hasData ? "current-password" : "new-password",
  });
  form.append(master);

  let confirm: HTMLInputElement | null = null;
  if (!hasData) {
    confirm = el("input", {
      class: "input",
      type: "password",
      placeholder: t("lock.confirm"),
      autocomplete: "new-password",
    });
    form.append(confirm);
  }

  const submit = el("button", {
    class: "btn primary",
    type: "submit",
    textContent: hasData ? t("lock.unlock") : t("lock.create"),
  });
  form.append(submit);

  const err = el("div", { class: "lock-error" });
  form.append(err);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const m = master.value;
    err.textContent = "";
    if (m.length < 8) {
      err.textContent = t("lock.short");
      return;
    }
    if (!hasData) {
      if (confirm && confirm.value !== m) {
        err.textContent = t("lock.mismatch");
        return;
      }
      const vault = emptyVault();
      const file = await seal(vault, m);
      await state.storage.save(file);
      const kdf = file.kdf ?? legacyKdf(file.v);
      const key = await deriveKey(m, b64ToBytes(file.salt), kdf);
      state.salt = file.salt;
      state.kdf = kdf;
      state.master = m;
      opts.onUnlock(vault, key);
    } else {
      const file = await state.storage.load();
      if (!file) {
        err.textContent = t("lock.wrong");
        return;
      }
      let vault: Vault;
      let key: CryptoKey;
      try {
        vault = await open(file, m);
        const kdf = file.kdf ?? legacyKdf(file.v);
        key = await deriveKey(m, b64ToBytes(file.salt), kdf);
      } catch {
        err.textContent = t("lock.wrong");
        return;
      }
      state.salt = file.salt;
      state.kdf = file.kdf ?? legacyKdf(file.v);
      state.master = m;
      opts.onUnlock(vault, key);
    }
  });

  wrap.append(form);
  root.append(wrap);

  const credit = el("div", { class: "lock-credit", textContent: "by zhichkin44-del" });
  root.append(credit);
}
