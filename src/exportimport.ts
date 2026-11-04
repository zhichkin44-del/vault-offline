import type { VaultFile } from "./vault";
import { sealWithKey, openVault, mergeEntries } from "./vault";
import { state, persist } from "./state";
import { el, toast, openModal, field, busy } from "./dom";
import { t } from "./i18n";
import { confirmModal } from "./confirm";
import { serializeVault, deserializeVault } from "./vaultio";
import { save, open as pickFile } from "@tauri-apps/plugin-dialog";
import { writeTextFile, readTextFile } from "@tauri-apps/plugin-fs";

/** Exports the vault encrypted with the current key, so the current master password opens it. */
export async function exportVault(): Promise<void> {
  if (!state.vault || !state.key || !state.salt || !state.kdf) return;
  const ok = await confirmModal(t("export.warn"), t("export.confirm"), t("editor.cancel"), "primary");
  if (!ok) return;
  const file = await sealWithKey(state.vault, state.key, state.salt, state.kdf);
  const date = new Date().toISOString().slice(0, 10);
  const path = await save({
    defaultPath: `vault-${date}.vault`,
    filters: [{ name: "Vault", extensions: ["vault"] }],
  });
  if (!path) return;
  await writeTextFile(path, serializeVault(file));
  toast(t("export.done"));
}

export async function importVault(onDone: () => void): Promise<void> {
  const path = await pickFile({
    multiple: false,
    filters: [{ name: "Vault", extensions: ["vault", "json"] }],
  });
  if (!path || Array.isArray(path)) return;
  let file: VaultFile;
  try {
    file = deserializeVault(await readTextFile(path));
  } catch (e) {
    toast((e as Error).message === "unsupported-kdf" ? t("import.unsupported") : t("import.invalid"));
    return;
  }
  openImportDialog(file, String(path).split(/[\\/]/).pop() ?? "", onDone);
}

export function openImportDialog(file: VaultFile, fileName: string, onDone: () => void): void {
  const m = openModal({ title: t("import.title"), className: "import" });

  m.body.append(field(t("import.file"), el("div", { class: "file-pill mono", textContent: fileName })));

  const master = el("input", { class: "input", type: "password", autocomplete: "off" });
  m.body.append(field(t("import.master"), master));

  const modes = el("div", { class: "choice-list" });
  modes.setAttribute("role", "radiogroup");
  modes.setAttribute("aria-label", t("import.mode"));
  const mkChoice = (value: "merge" | "replace", title: string, hint: string, checked: boolean): HTMLInputElement => {
    const input = el("input", { type: "radio", name: "import-mode", value });
    input.checked = checked;
    const lab = el("label", { class: "choice" + (value === "replace" ? " danger" : "") });
    const txt = el("span", { class: "choice-text" });
    txt.append(el("span", { class: "choice-title", textContent: title }), el("span", { class: "choice-hint", textContent: hint }));
    lab.append(input, txt);
    modes.append(lab);
    return input;
  };
  const merge = mkChoice("merge", t("import.merge"), t("import.mergeHint"), true);
  mkChoice("replace", t("import.replace"), t("import.replaceHint"), false);
  m.body.append(el("div", { class: "field-label", textContent: t("import.mode") }), modes);

  const err = el("div", { class: "form-error" });
  err.setAttribute("role", "alert");
  m.body.append(err);

  const cancel = el("button", { class: "btn", type: "button", textContent: t("editor.cancel") });
  cancel.addEventListener("click", () => m.close());
  const run = el("button", { class: "btn primary", type: "button", textContent: t("import.run") });
  run.addEventListener("click", async () => {
    err.textContent = "";
    const pw = master.value;
    const opened = await busy(run, t("import.busy"), async () => {
      try {
        return await openVault(file, pw);
      } catch {
        return null;
      }
    });
    if (!opened) {
      err.textContent = t("import.wrong");
      master.select();
      return;
    }
    master.value = "";
    if (merge.checked) {
      const r = mergeEntries(state.vault!, opened.vault.entries);
      state.vault = r.vault;
      await persist();
      m.close();
      toast(t("import.merged", { a: r.added, u: r.updated }));
      onDone();
      return;
    }
    const sure = await confirmModal(
      t("import.replaceConfirm", { n: state.vault?.entries.length ?? 0, m: opened.vault.entries.length }),
      t("import.replace"),
      t("editor.cancel"),
    );
    if (!sure) return;
    state.vault = opened.vault;
    state.key = opened.key;
    state.salt = opened.salt;
    state.kdf = opened.kdf;
    await persist();
    m.close();
    toast(t("import.ok"));
    onDone();
  });
  master.addEventListener("keydown", (e) => {
    if (e.key === "Enter") run.click();
  });
  m.footer.append(cancel, run);
  master.focus();
}
