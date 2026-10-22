import type { Vault } from "./types";
import { MemoryStorage, type VaultStorage } from "./storage";
import { sealWithKey } from "./vault";
import type { KdfInfo } from "./crypto";
import type { Category } from "./entrylogic";

// The master password is never kept here: after unlock only the derived,
// non-extractable CryptoKey is held, and it is dropped on lock.
export interface AppState {
  unlocked: boolean;
  vault: Vault | null;
  key: CryptoKey | null;
  salt: string | null;
  kdf: KdfInfo | null;
  storage: VaultStorage;
  activeCategory: Category;
  query: string;
}

export const state: AppState = {
  unlocked: false,
  vault: null,
  key: null,
  salt: null,
  kdf: null,
  storage: new MemoryStorage(),
  activeCategory: "all",
  query: "",
};

export async function persist(): Promise<void> {
  if (!state.vault || !state.key || !state.salt || !state.kdf) return;
  const file = await sealWithKey(state.vault, state.key, state.salt, state.kdf);
  await state.storage.save(file);
}

export function clearSession(): void {
  state.unlocked = false;
  state.vault = null;
  state.key = null;
  state.salt = null;
  state.kdf = null;
  state.query = "";
}
