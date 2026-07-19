import type { VaultFile } from "./vault";
import { seal, open } from "./vault";
import { state, persist } from "./state";
import { toast } from "./dom";
import { t } from "./i18n";
import { confirmModal } from "./confirm";
import { serializeVault, deserializeVault } from "./vaultio";
import { deriveKey, b64ToBytes, legacyKdf } from "./crypto";
import { save, open as pickFile } from "@tauri-apps/plugin-dialog";
import { writeTextFile, readTextFile } from "@tauri-apps/plugin-fs";

export async function exportVault(): Promise<void> {
  if (!state.vault || !state.master) return;
  const exportOk = await confirmModal(t("export.warn"), t("export"), t("editor.cancel"));
  if (!exportOk) return;
  const file = await seal(state.vault, state.master);
  const path = await save({
    defaultPath: "vault.vault",
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
  let text: string;
  try {
    text = await readTextFile(path);
  } catch {
    toast(t("import.invalid"));
    return;
  }
  let file: VaultFile;
  try {
    file = deserializeVault(text);
  } catch {
    toast(t("import.invalid"));
    return;
  }
  const master = window.prompt(t("import.master"));
  if (!master) return;
  let decrypted;
  try {
    decrypted = await open(file, master);
  } catch {
    toast(t("import.wrong"));
    return;
  }
  const kdf = file.kdf ?? legacyKdf(file.v);
  state.vault = decrypted;
  state.master = master;
  state.key = await deriveKey(master, b64ToBytes(file.salt), kdf);
  state.salt = file.salt;
  state.kdf = kdf;
  await persist();
  toast(t("import.ok"));
  onDone();
}
