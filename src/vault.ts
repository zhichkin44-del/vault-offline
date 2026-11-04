import {
  deriveKey,
  encryptJSON,
  decryptJSON,
  randomSaltB64,
  b64ToBytes,
  ARGON2_DEFAULT,
  legacyKdf,
  type KdfInfo,
} from "./crypto";
import type { Vault, Entry, EntryType } from "./types";

export interface VaultFile {
  v: number;
  kdf?: KdfInfo;
  salt: string;
  iv: string;
  ct: string;
}

export function emptyVault(): Vault {
  return { v: 1, salt: "", entries: [] };
}

export function makeEntry(
  partial: Partial<Entry> & { type: EntryType; title: string },
): Entry {
  return {
    id: crypto.randomUUID(),
    type: partial.type,
    title: partial.title,
    login: partial.login ?? "",
    password: partial.password ?? "",
    url: partial.url ?? "",
    fields: partial.fields ?? [],
    note: partial.note ?? "",
    updated: Date.now(),
  };
}

export function addEntry(v: Vault, e: Entry): Vault {
  return { ...v, entries: [...v.entries, e] };
}

export function updateEntry(v: Vault, e: Entry): Vault {
  return {
    ...v,
    entries: v.entries.map((x) =>
      x.id === e.id ? { ...e, updated: Date.now() } : x,
    ),
  };
}

export function removeEntry(v: Vault, id: string): Vault {
  return { ...v, entries: v.entries.filter((x) => x.id !== id) };
}

export interface SealOpts {
  key?: CryptoKey;
  salt?: string;
  kdf?: KdfInfo;
}

/** Encrypts entries with an already-derived key (no KDF run). */
export async function sealWithKey(
  vault: Vault,
  key: CryptoKey,
  salt: string,
  kdf: KdfInfo,
): Promise<VaultFile> {
  const blob = await encryptJSON(key, vault.entries);
  return { v: 2, kdf, salt, iv: blob.iv, ct: blob.ct };
}

export async function seal(
  vault: Vault,
  master: string,
  opts: SealOpts = {},
): Promise<VaultFile> {
  const salt = opts.salt ?? randomSaltB64();
  const kdf = opts.kdf ?? ARGON2_DEFAULT;
  const key = opts.key ?? (await deriveKey(master, b64ToBytes(salt), kdf));
  return sealWithKey(vault, key, salt, kdf);
}

export interface Unlocked {
  vault: Vault;
  key: CryptoKey;
  salt: string;
  kdf: KdfInfo;
  file: VaultFile;
}

/** Creates a new encrypted vault; derives the key exactly once. */
export async function createVault(master: string, vault = emptyVault()): Promise<Unlocked> {
  const salt = randomSaltB64();
  const kdf = ARGON2_DEFAULT;
  const key = await deriveKey(master, b64ToBytes(salt), kdf);
  const file = await sealWithKey(vault, key, salt, kdf);
  return { vault: { ...vault, salt }, key, salt, kdf, file };
}

/** Decrypts a vault file and returns the derived key with it (one KDF run). */
export async function openVault(file: VaultFile, master: string): Promise<Unlocked> {
  const kdf: KdfInfo = file.kdf ?? legacyKdf(file.v);
  const key = await deriveKey(master, b64ToBytes(file.salt), kdf);
  const entries = (await decryptJSON(key, { iv: file.iv, ct: file.ct })) as Entry[];
  if (!Array.isArray(entries)) throw new Error("invalid-vault-format");
  return { vault: { v: file.v, salt: file.salt, entries }, key, salt: file.salt, kdf, file };
}

export async function open(file: VaultFile, master: string): Promise<Vault> {
  return (await openVault(file, master)).vault;
}

export interface MergeResult {
  vault: Vault;
  added: number;
  updated: number;
}

/**
 * Merges entries from a backup into the current vault. Entries are matched by
 * id; when both sides have one, the more recently updated copy wins. Nothing
 * from the current vault is ever removed.
 */
export function mergeEntries(current: Vault, incoming: Entry[]): MergeResult {
  const byId = new Map(current.entries.map((e) => [e.id, e] as const));
  let added = 0;
  let updated = 0;
  for (const e of incoming) {
    const mine = byId.get(e.id);
    if (!mine) {
      byId.set(e.id, e);
      added++;
    } else if ((e.updated ?? 0) > (mine.updated ?? 0)) {
      byId.set(e.id, e);
      updated++;
    }
  }
  return { vault: { ...current, entries: [...byId.values()] }, added, updated };
}
