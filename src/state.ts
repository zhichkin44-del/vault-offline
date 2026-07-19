import type { Vault } from "./types";
import { LocalStorageVaultStorage, type VaultStorage } from "./storage";
import { seal } from "./vault";
import type { KdfInfo } from "./crypto";
import type { Category } from "./entrylogic";

export interface AppState {
  unlocked: boolean;
  vault: Vault | null;
  key: CryptoKey | null;
  master: string | null;
  salt: string | null;
  kdf: KdfInfo | null;
  storage: VaultStorage;
  activeCategory: Category;
}

export const state: AppState = {
  unlocked: false,
  vault: null,
  key: null,
  master: null,
  salt: null,
  kdf: null,
  storage: new LocalStorageVaultStorage(),
  activeCategory: "all",
};

export async function persist(): Promise<void> {
  if (!state.vault || !state.master) return;
  const file = await seal(state.vault, state.master, {
    key: state.key ?? undefined,
    salt: state.salt ?? undefined,
    kdf: state.kdf ?? undefined,
  });
  await state.storage.save(file);
}
