import type { VaultFile } from "./vault";

export const VAULT_MAGIC = "VAULTY1\n";

export function serializeVault(file: VaultFile): string {
  return VAULT_MAGIC + JSON.stringify(file);
}

export function deserializeVault(text: string): VaultFile {
  const idx = text.indexOf("\n");
  const body = idx >= 0 ? text.slice(idx + 1) : text;
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
  if (o.kdf && typeof o.kdf === "object") {
    const k = o.kdf as Record<string, unknown>;
    if (k.id === "pbkdf2" && typeof k.iterations === "number") {
      file.kdf = { id: "pbkdf2", iterations: k.iterations };
    } else if (
      k.id === "argon2id" &&
      typeof k.iterations === "number" &&
      typeof k.memory === "number" &&
      typeof k.parallelism === "number"
    ) {
      file.kdf = {
        id: "argon2id",
        iterations: k.iterations,
        memory: k.memory,
        parallelism: k.parallelism,
      };
    }
  }
  return file;
}
