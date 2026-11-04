import test from "node:test";
import assert from "node:assert/strict";
import {
  serializeVault,
  deserializeVault,
  VAULT_MAGIC,
} from "../src/vaultio";
import type { VaultFile } from "../src/vault";

const file: VaultFile = { v: 1, salt: "abc", iv: "def", ct: "ghi" };
const fileV2: VaultFile = {
  v: 2,
  kdf: { id: "pbkdf2", iterations: 600000 },
  salt: "abc",
  iv: "def",
  ct: "ghi",
};

const fileV2A: VaultFile = {
  v: 2,
  kdf: { id: "argon2id", iterations: 2, memory: 8192, parallelism: 1 },
  salt: "abc",
  iv: "def",
  ct: "ghi",
};

test("roundtrip serialize/deserialize", () => {
  const text = serializeVault(file);
  assert.match(text, /^VAULTY1\n/);
  const back = deserializeVault(text);
  assert.deepEqual(back, file);
});

test("deserialize accepts plain JSON without magic", () => {
  const back = deserializeVault(JSON.stringify(file));
  assert.deepEqual(back, file);
});

test("rejects invalid JSON", () => {
  assert.throws(() => deserializeVault("not json"), /invalid/);
});

test("roundtrip serialize/deserialize v2 with kdf", () => {
  const text = serializeVault(fileV2);
  assert.match(text, /^VAULTY1\n/);
  const back = deserializeVault(text);
  assert.deepEqual(back, fileV2);
});

test("roundtrip serialize/deserialize v2 with argon2id kdf", () => {
  const text = serializeVault(fileV2A);
  assert.match(text, /^VAULTY1\n/);
  const back = deserializeVault(text);
  assert.deepEqual(back, fileV2A);
});

test("rejects unsupported version", () => {
  assert.throws(
    () => deserializeVault(JSON.stringify({ v: 99, salt: "a", iv: "b", ct: "c" })),
    /version/,
  );
});

test("rejects missing fields", () => {
  assert.throws(() => deserializeVault(JSON.stringify({ v: 1 })), /invalid/);
  assert.throws(
    () => deserializeVault(VAULT_MAGIC + JSON.stringify({ v: 1, salt: "a" })),
    /invalid/,
  );
});
