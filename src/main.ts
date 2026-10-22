import "@fontsource-variable/inter";
import "./styles.css";
import { startApp } from "./app";
import { state } from "./state";
import { LocalStorageVaultStorage, TauriFileStorage, migrateLegacyStorage } from "./storage";
import { getLang } from "./i18n";

async function boot(root: HTMLElement): Promise<void> {
  document.documentElement.lang = getLang();
  const legacy = new LocalStorageVaultStorage();
  if ("__TAURI_INTERNALS__" in window) {
    const { invoke } = await import("@tauri-apps/api/core");
    const file = new TauriFileStorage(invoke);
    state.storage = file;
    try {
      // v0.1 kept the vault in WebView localStorage; move it to the file once.
      await migrateLegacyStorage(legacy, file);
    } catch (e) {
      // Never show "create vault" over an existing one: keep using the old copy.
      console.error("vault migration failed; staying on the old storage", e);
      state.storage = legacy;
    }
  } else {
    // Plain browser (vite dev without Tauri): keep the old backend.
    state.storage = legacy;
  }
  startApp(root);
}

const root = document.getElementById("app");
if (root) void boot(root);
