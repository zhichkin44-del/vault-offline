import type { VaultFile } from "./vault";
import { parseKdf } from "./crypto";

export const VAULT_MAGIC = "VAULTY1\n";

export function serializeVault(file: VaultFile): string {
  return VAULT_MAGIC + JSON.stringify(file);
}

/**
 * Parses a vault file: either the `VAULTY1` header line + JSON (current format)
 * or plain JSON (older localStorage blobs). Rejects unknown versions and KDF
 * parameters outside safe bounds before any key derivation happens.
 */
export function deserializeVault(text: string): VaultFile {
  const body = text.startsWith(VAULT_MAGIC)
    ? text.slice(VAULT_MAGIC.length)
    : text.startsWith("VAULTY")
      ? text.slice(text.indexOf("\n") + 1)
      : text;
  let obj: unknown;
  try {
    obj = JSON.parse(body);
  } catch {
    throw new Error("invalid-vault-format");
  }
  if (!obj || typeof obj !== "object") throw new Error("invalid-vault-format");
  const o = obj as Record<string, unknown>;
  if (o.v !== 1 && o.v !== 2) {
    throw new Error("unsupported-vault-version");
  }
  if (
    typeof o.salt !== "string" ||
    typeof o.iv !== "string" ||
    typeof o.ct !== "string"
  ) {
    throw new Error("invalid-vault-format");
  }
  const file: VaultFile = { v: o.v, salt: o.salt, iv: o.iv, ct: o.ct };
  if (o.kdf !== undefined) {
    const kdf = parseKdf(o.kdf);
    if (!kdf) throw new Error("unsupported-kdf");
    file.kdf = kdf;
  }
  return file;
}
