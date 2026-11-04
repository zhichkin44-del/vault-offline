import { test } from "node:test";
import assert from "node:assert/strict";
import * as os from "node:os";
import * as path from "node:path";
import { mkdtemp, rm } from "node:fs/promises";
import {
  emptyVault,
  makeEntry,
  addEntry,
  updateEntry,
  removeEntry,
  seal,
  open,
  type VaultFile,
} from "../src/vault";
import { deriveKey, encryptJSON, decryptJSON } from "../src/crypto";
import { NodeStorage } from "../src/storage";

function bytesToB64(b: Uint8Array): string {
  let s = "";
  for (const x of b) s += String.fromCharCode(x);
  return btoa(s);
}

test("seal/open round-trip preserves entries", async () => {
  let v = emptyVault();
  v = addEntry(
    v,
    makeEntry({ type: "login", title: "GitHub", login: "me", password: "s3cret", url: "https://github.com" }),
  );
  v = addEntry(v, makeEntry({ type: "note", title: "PIN", note: "1234" }));
  const master = "correct horse battery staple";
  const file = await seal(v, master);
  assert.notEqual(file.ct, "");
  assert.notEqual(file.salt, "");
  assert.equal(file.v, 2);
  assert.ok(file.kdf);
  assert.equal(file.kdf!.id, "argon2id");
  if (file.kdf!.id === "argon2id") {
    assert.equal(file.kdf!.iterations, 3);
    assert.equal(file.kdf!.memory, 65536);
    assert.equal(file.kdf!.parallelism, 1);
  }
  const back = await open(file, master);
  assert.equal(back.entries.length, 2);
  assert.equal(back.entries[0].title, "GitHub");
  assert.equal(back.entries[0].password, "s3cret");
});

test("wrong master fails to decrypt", async () => {
  const v = addEntry(
    emptyVault(),
    makeEntry({ type: "login", title: "x", login: "a", password: "b" }),
  );
  const file = await seal(v, "right");
  await assert.rejects(() => open(file, "wrong"));
});

test("CRUD preserves data", () => {
  let v = emptyVault();
  const e = makeEntry({
    type: "custom",
    title: "WiFi",
    fields: [
      { k: "ssid", v: "home" },
      { k: "pass", v: "pw" },
    ],
  });
  v = addEntry(v, e);
  v = updateEntry(v, { ...e, title: "WiFi2" });
  assert.equal(v.entries[0].title, "WiFi2");
  v = removeEntry(v, e.id);
  assert.equal(v.entries.length, 0);
  assert.equal(removeEntry(v, e.id).entries.length, 0);
});

test("NodeStorage file round-trip", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "vaulty-"));
  const p = path.join(dir, "vault.vault");
  const storage = new NodeStorage(p);
  assert.equal(await storage.load(), null);
  const v = addEntry(
    emptyVault(),
    makeEntry({ type: "login", title: "A", login: "u", password: "p" }),
  );
  const file = await seal(v, "m");
  await storage.save(file);
  const loaded = await storage.load();
  assert.ok(loaded);
  const back = await open(loaded!, "m");
  assert.equal(back.entries.length, 1);
  assert.equal(back.entries[0].login, "u");
  await rm(dir, { recursive: true, force: true });
});

test("legacy v1 file (250k KDF) still opens", async () => {
  const master = "legacy-master";
  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);
  const key = await deriveKey(master, salt, { id: "pbkdf2", iterations: 250000 });
  const blob = await encryptJSON(key, [
    { id: "1", type: "login", title: "L", login: "u", password: "p", url: "", fields: [], note: "", updated: 1 },
  ] as any);
  const legacy: VaultFile = { v: 1, salt: bytesToB64(salt), iv: blob.iv, ct: blob.ct };
  const back = await open(legacy, master);
  assert.equal(back.entries.length, 1);
  assert.equal(back.entries[0].login, "u");
});

test("argon2id derives a working AES-GCM key", async () => {
  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);
  const key = await deriveKey("pw", salt, { id: "argon2id", iterations: 2, memory: 8192, parallelism: 1 });
  const blob = await encryptJSON(key, { hello: "world" });
  const back = (await decryptJSON(key, blob)) as { hello: string };
  assert.equal(back.hello, "world");
});

test("re-seal of opened legacy becomes v2 (migration)", async () => {
  const master = "legacy-master";
  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);
  const key = await deriveKey(master, salt, { id: "pbkdf2", iterations: 250000 });
  const blob = await encryptJSON(key, [
    { id: "1", type: "login", title: "L", login: "u", password: "p", url: "", fields: [], note: "", updated: 1 },
  ] as any);
  const legacy: VaultFile = { v: 1, salt: bytesToB64(salt), iv: blob.iv, ct: blob.ct };
  const v = await open(legacy, master);
  const resealed = await seal(v, master);
  assert.equal(resealed.v, 2);
  assert.ok(resealed.kdf);
  assert.equal(resealed.kdf!.id, "argon2id");
  const back = await open(resealed, master);
  assert.equal(back.entries.length, 1);
});
