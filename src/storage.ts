import type { VaultFile } from "./vault";

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
      return JSON.parse(txt) as VaultFile;
    } catch {
      return null;
    }
  }
  async save(file: VaultFile): Promise<void> {
    const fs: any = await import("node:fs/promises");
    await fs.writeFile(this.path, JSON.stringify(file), "utf8");
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

export class LocalStorageVaultStorage implements VaultStorage {
  constructor(private key = "vaulty.vault") {}
  async hasData(): Promise<boolean> {
    return localStorage.getItem(this.key) != null;
  }
  async load(): Promise<VaultFile | null> {
    const s = localStorage.getItem(this.key);
    return s ? (JSON.parse(s) as VaultFile) : null;
  }
  async save(file: VaultFile): Promise<void> {
    localStorage.setItem(this.key, JSON.stringify(file));
  }
  async remove(): Promise<void> {
    localStorage.removeItem(this.key);
  }
}
