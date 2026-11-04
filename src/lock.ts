import { state } from "./state";
import { t, toggleLang } from "./i18n";
import { el, busy } from "./dom";
import { ICON } from "./icons";
import { createVault, openVault, type Unlocked } from "./vault";

interface LockOpts {
  onUnlock: (u: Unlocked) => void;
}

export async function renderLock(root: HTMLElement, opts: LockOpts): Promise<void> {
  let hasData = false;
  let storageError = false;
  try {
    hasData = await state.storage.hasData();
  } catch {
    storageError = true;
  }
  root.innerHTML = "";

  const screen = el("div", { class: "lock-screen" });

  const top = el("div", { class: "lock-top" });
  const langBtn = el("button", {
    class: "btn ghost small",
    type: "button",
    textContent: t("lang.short"),
    title: t("lang.switch"),
  });
  langBtn.setAttribute("aria-label", t("lang.switch"));
  langBtn.addEventListener("click", () => toggleLang());
  top.append(langBtn);

  const wrap = el("div", { class: "lock" });
  const mark = el("div", { class: "lock-mark" });
  mark.innerHTML = ICON.lock;
  wrap.append(
    mark,
    el("h1", { class: "lock-title", textContent: t("app.title") }),
    el("p", { class: "lock-tagline", textContent: t("app.tagline") }),
  );

  const form = el("form", { class: "lock-form" });
  form.noValidate = true;
  form.append(
    el("p", {
      class: "lock-hint",
      textContent: hasData ? t("lock.existing") : t("lock.firstRun"),
    }),
  );
  const master = el("input", {
    class: "input",
    type: "password",
    placeholder: t("lock.master"),
    autocomplete: hasData ? "current-password" : "new-password",
  });
  master.setAttribute("aria-label", t("lock.master"));
  form.append(master);

  let confirm: HTMLInputElement | null = null;
  if (!hasData) {
    confirm = el("input", {
      class: "input",
      type: "password",
      placeholder: t("lock.confirm"),
      autocomplete: "new-password",
    });
    confirm.setAttribute("aria-label", t("lock.confirm"));
    form.append(confirm);
  }

  const err = el("div", { class: "form-error" });
  err.setAttribute("role", "alert");
  if (storageError) err.textContent = t("lock.storageError");

  const submit = el("button", {
    class: "btn primary block",
    type: "submit",
    textContent: hasData ? t("lock.unlock") : t("lock.create"),
  });
  form.append(err, submit);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (submit.disabled) return;
    const m = master.value;
    err.textContent = "";
    if (m.length < 8) {
      err.textContent = t("lock.short");
      master.focus();
      return;
    }
    if (!hasData) {
      if (confirm && confirm.value !== m) {
        err.textContent = t("lock.mismatch");
        confirm.focus();
        return;
      }
      const u = await busy(submit, t("lock.creating"), async () => {
        const created = await createVault(m);
        await state.storage.save(created.file);
        return created;
      });
      master.value = "";
      if (confirm) confirm.value = "";
      opts.onUnlock(u);
      return;
    }
    const u = await busy(submit, t("lock.busy"), async () => {
      try {
        const file = await state.storage.load();
        if (!file) {
          err.textContent = t("lock.storageError");
          return null;
        }
        return await openVault(file, m);
      } catch {
        err.textContent = t("lock.wrong");
        return null;
      }
    });
    if (!u) {
      master.select();
      return;
    }
    master.value = "";
    opts.onUnlock(u);
  });

  wrap.append(form);

  const trust = el("div", { class: "lock-trust" });
  const shield = el("span", { class: "lock-trust-icon" });
  shield.innerHTML = ICON.shield;
  trust.append(shield, el("span", { textContent: t("lock.trust") }));
  wrap.append(trust);

  screen.append(top, wrap, el("div", { class: "lock-credit", textContent: "by Zhichkin" }));
  root.append(screen);
  master.focus();
}
