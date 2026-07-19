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

export async function seal(
  vault: Vault,
  master: string,
  opts: SealOpts = {},
): Promise<VaultFile> {
  const salt = opts.salt ?? randomSaltB64();
  const kdf = opts.kdf ?? ARGON2_DEFAULT;
  const key = opts.key ?? (await deriveKey(master, b64ToBytes(salt), kdf));
  const blob = await encryptJSON(key, vault.entries);
  return { v: 2, kdf, salt, iv: blob.iv, ct: blob.ct };
}

export async function open(file: VaultFile, master: string): Promise<Vault> {
  const kdf: KdfInfo = file.kdf ?? legacyKdf(file.v);
  const key = await deriveKey(master, b64ToBytes(file.salt), kdf);
  const entries = (await decryptJSON(key, { iv: file.iv, ct: file.ct })) as Entry[];
  return { v: file.v, salt: file.salt, entries };
}
