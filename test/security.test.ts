import { test } from "node:test";
import assert from "node:assert/strict";
import { parseKdf, ARGON2_DEFAULT, legacyKdf } from "../src/crypto";
import { deserializeVault, serializeVault } from "../src/vaultio";
import {
  createVault,
  openVault,
  open,
  sealWithKey,
  mergeEntries,
  emptyVault,
  addEntry,
  makeEntry,
  type VaultFile,
} from "../src/vault";
import { MemoryStorage, TauriFileStorage, migrateLegacyStorage } from "../src/storage";
import { state, persist, clearSession } from "../src/state";

const base = { v: 2, salt: "AAAAAAAAAAAAAAAAAAAAAA==", iv: "AAAAAAAAAAAAAAAA", ct: "AA==" };

test("KDF bounds accept the defaults and legacy PBKDF2 settings", () => {
  assert.deepEqual(parseKdf(ARGON2_DEFAULT), ARGON2_DEFAULT);
  assert.deepEqual(parseKdf(legacyKdf(1)), legacyKdf(1));
  assert.deepEqual(parseKdf(legacyKdf(2)), legacyKdf(2));
});

test("KDF bounds reject hostile or unknown parameters", () => {
  const bad = [
    { id: "argon2id", iterations: 3, memory: 64 * 1024 * 1024, parallelism: 1 }, // 64 GiB
    { id: "argon2id", iterations: 1e9, memory: 65536, parallelism: 1 },
    { id: "argon2id", iterations: 3, memory: 65536, parallelism: 1000 },
    { id: "argon2id", iterations: 3, memory: 1024, parallelism: 1 }, // too weak
    { id: "pbkdf2", iterations: 1e12 },
    { id: "pbkdf2", iterations: 1000 },
    { id: "scrypt", iterations: 1 },
    { id: "argon2id", iterations: "3", memory: 65536, parallelism: 1 },
  ];
  for (const kdf of bad) {
    assert.equal(parseKdf(kdf), null, JSON.stringify(kdf));
    assert.throws(() => deserializeVault(serializeVault({ ...base, kdf } as VaultFile)), /unsupported-kdf/);
  }
});

test("createVault and openVault derive one key that opens the file", async () => {
  const c = await createVault("correct horse battery");
  const u = await openVault(c.file, "correct horse battery");
  assert.equal(u.salt, c.salt);
  assert.deepEqual(u.kdf, ARGON2_DEFAULT);
  // the returned key is usable for re-sealing without another KDF run
  const v = addEntry(u.vault, makeEntry({ type: "note", title: "n", note: "x" }));
  const f2 = await sealWithKey(v, u.key, u.salt, u.kdf);
  assert.equal(f2.salt, c.salt);
  assert.equal((await open(f2, "correct horse battery")).entries.length, 1);
  await assert.rejects(() => openVault(c.file, "wrong password"));
});

test("persist needs only the derived key; the session keeps no master password", async () => {
  const c = await createVault("session-pass");
  state.storage = new MemoryStorage();
  state.unlocked = true;
  state.vault = c.vault;
  state.key = c.key;
  state.salt = c.salt;
  state.kdf = c.kdf;
  assert.ok(!("master" in state), "state has no master password field");
  state.vault = addEntry(state.vault, makeEntry({ type: "login", title: "acct" }));
  await persist();
  const saved = await state.storage.load();
  assert.equal((await open(saved!, "session-pass")).entries[0].title, "acct");
  clearSession();
  assert.equal(state.key, null);
  assert.equal(state.vault, null);
  state.storage = new MemoryStorage();
});

test("mergeEntries adds new, keeps newer, never removes", () => {
  const a = { ...makeEntry({ type: "login", title: "A" }), id: "a", updated: 10 };
  const b = { ...makeEntry({ type: "login", title: "B" }), id: "b", updated: 10 };
  const cur = { ...emptyVault(), entries: [a, b] };
  const incoming = [
    { ...a, title: "A-old", updated: 5 },
    { ...b, title: "B-new", updated: 20 },
    { ...makeEntry({ type: "note", title: "C" }), id: "c" },
  ];
  const r = mergeEntries(cur, incoming);
  assert.equal(r.added, 1);
  assert.equal(r.updated, 1);
  const titles = r.vault.entries.map((e) => e.title).sort();
  assert.deepEqual(titles, ["A", "B-new", "C"]);
});

test("migrateLegacyStorage copies, verifies, then removes the old copy", async () => {
  const from = new MemoryStorage();
  const to = new MemoryStorage();
  const file = { ...base, kdf: ARGON2_DEFAULT } as VaultFile;
  await from.save(file);
  assert.equal(await migrateLegacyStorage(from, to), true);
  assert.deepEqual(await to.load(), file);
  assert.equal(await from.hasData(), false);
  // second run is a no-op
  assert.equal(await migrateLegacyStorage(from, to), false);
});

test("migrateLegacyStorage never overwrites an existing file vault", async () => {
  const from = new MemoryStorage();
  const to = new MemoryStorage();
  await from.save({ ...base, ct: "old" } as VaultFile);
  await to.save({ ...base, ct: "new" } as VaultFile);
  assert.equal(await migrateLegacyStorage(from, to), false);
  assert.equal((await to.load())!.ct, "new");
  assert.equal(await from.hasData(), true, "old copy is kept");
});

test("migrateLegacyStorage keeps the old copy if verification fails", async () => {
  const from = new MemoryStorage();
  await from.save({ ...base } as VaultFile);
  const broken = new MemoryStorage();
  broken.load = async () => null;
  await assert.rejects(() => migrateLegacyStorage(from, broken), /verify/);
  assert.equal(await from.hasData(), true);
});

test("TauriFileStorage falls back to the backup when the main file is corrupt", async () => {
  const good = serializeVault({ ...base, ct: "from-backup" } as VaultFile);
  const files: Record<string, string | null> = { main: "VAULTY1\n{truncated", backup: good };
  const calls: string[] = [];
  const invoke = async <T,>(cmd: string, args?: Record<string, unknown>): Promise<T> => {
    calls.push(cmd);
    if (cmd === "vault_read") return files[(args as { which: string }).which] as T;
    if (cmd === "vault_exists") return true as T;
    if (cmd === "vault_write") {
      files.main = (args as { data: string }).data;
      return undefined as T;
    }
    throw new Error("unexpected " + cmd);
  };
  const s = new TauriFileStorage(invoke);
  assert.equal((await s.load())!.ct, "from-backup");
  await s.save({ ...base, ct: "next" } as VaultFile);
  assert.match(files.main!, /^VAULTY1\n/);
  assert.equal((await s.load())!.ct, "next");
});
