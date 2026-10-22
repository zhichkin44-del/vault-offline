import type { VaultFile } from "./vault";
import { serializeVault, deserializeVault } from "./vaultio";

export interface VaultStorage {
  hasData(): Promise<boolean>;
  load(): Promise<VaultFile | null>;
  save(file: VaultFile): Promise<void>;
  remove(): Promise<void>;
}

export class MemoryStorage implements VaultStorage {
  private data: VaultFile | null = null;
  async hasData(): Promise<boolean> {
    return this.data != null;
  }
  async load(): Promise<VaultFile | null> {
    return this.data;
  }
  async save(file: VaultFile): Promise<void> {
    this.data = file;
  }
  async remove(): Promise<void> {
    this.data = null;
  }
}

export class NodeStorage implements VaultStorage {
  constructor(private path: string) {}
  async hasData(): Promise<boolean> {
    try {
      const fs: any = await import("node:fs/promises");
      await fs.access(this.path);
      return true;
    } catch {
      return false;
    }
  }
  async load(): Promise<VaultFile | null> {
    try {
      const fs: any = await import("node:fs/promises");
      const txt = await fs.readFile(this.path, "utf8");
      return deserializeVault(txt);
    } catch {
      return null;
    }
  }
  async save(file: VaultFile): Promise<void> {
    const fs: any = await import("node:fs/promises");
    await fs.writeFile(this.path, serializeVault(file), "utf8");
  }
  async remove(): Promise<void> {
    try {
      const fs: any = await import("node:fs/promises");
      await fs.unlink(this.path);
    } catch {
      /* ignore */
    }
  }
}

/** Legacy backend (v0.1): the encrypted blob in WebView localStorage. Kept for migration and browser dev. */
export class LocalStorageVaultStorage implements VaultStorage {
  constructor(private key = "vaulty.vault") {}
  async hasData(): Promise<boolean> {
    return localStorage.getItem(this.key) != null;
  }
  async load(): Promise<VaultFile | null> {
    const s = localStorage.getItem(this.key);
    return s ? deserializeVault(s) : null;
  }
  async save(file: VaultFile): Promise<void> {
    localStorage.setItem(this.key, JSON.stringify(file));
  }
  async remove(): Promise<void> {
    localStorage.removeItem(this.key);
  }
}

type Invoke = <T>(cmd: string, args?: Record<string, unknown>) => Promise<T>;

/**
 * Desktop backend: `vault.vault` in the app data folder, written by the Rust
 * side atomically (temp file + rename) with the previous version kept as
 * `vault.vault.bak`. If the main file is unreadable, the backup is used.
 */
export class TauriFileStorage implements VaultStorage {
  constructor(private invoke: Invoke) {}
  async hasData(): Promise<boolean> {
    return this.invoke<boolean>("vault_exists");
  }
  async load(): Promise<VaultFile | null> {
    for (const which of ["main", "backup"] as const) {
      const text = await this.invoke<string | null>("vault_read", { which });
      if (text == null) continue;
      try {
        return deserializeVault(text);
      } catch {
        /* corrupted: fall through to the backup */
      }
    }
    return null;
  }
  async save(file: VaultFile): Promise<void> {
    await this.invoke<void>("vault_write", { data: serializeVault(file) });
  }
  async remove(): Promise<void> {
    throw new Error("not-supported");
  }
}

/**
 * Moves a vault from the old localStorage backend into the new one. The old
 * copy is removed only after the new copy reads back identically.
 */
export async function migrateLegacyStorage(
  from: VaultStorage,
  to: VaultStorage,
): Promise<boolean> {
  if (await to.hasData()) return false;
  if (!(await from.hasData())) return false;
  const file = await from.load();
  if (!file) return false;
  await to.save(file);
  const back = await to.load();
  if (!back || JSON.stringify(back) !== JSON.stringify(file)) {
    throw new Error("migration-verify-failed");
  }
  await from.remove();
  return true;
}
