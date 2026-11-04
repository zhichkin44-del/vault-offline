import { test } from "node:test";
import assert from "node:assert/strict";
import { state, persist } from "../src/state";
import { seal, open, emptyVault, addEntry, makeEntry } from "../src/vault";
import { deriveKey, b64ToBytes } from "../src/crypto";
import { MemoryStorage } from "../src/storage";

test("T13: persist reuses cached key (stable salt, no re-derive)", async () => {
  const storage = new MemoryStorage();
  // simulate an unlocked session: derive the key once, cache it in state
  const master = "T13-password";
  const vault0 = emptyVault();
  const sealed0 = await seal(vault0, master);
  const kdf0 = sealed0.kdf!;
  const key0 = await deriveKey(master, b64ToBytes(sealed0.salt), kdf0);

  state.storage = storage;
  state.vault = vault0;
  state.key = key0;
  state.salt = sealed0.salt;
  state.kdf = kdf0;

  // first save through persist() — should use the cached key + cached salt
  await persist();
  const f1 = await storage.load();
  assert.ok(f1, "file saved");
  const salt1 = f1!.salt;
  assert.equal(salt1, sealed0.salt, "salt unchanged on first cached persist");

  // second save after editing — salt must stay stable => no new KDF derivation
  state.vault = addEntry(state.vault!, makeEntry({ type: "login", title: "acct" }));
  await persist();
  const f2 = await storage.load();
  assert.equal(f2!.salt, salt1, "salt stable across cached persists (no re-derive)");

  // round-trip with the master password still works
  const reopened = await open(f2!, master);
  assert.equal(reopened.entries.length, 1);
  assert.equal(reopened.entries[0].title, "acct");

  // cleanup singleton state
  state.storage = new MemoryStorage();
  state.vault = null;
  state.key = null;
  state.salt = null;
  state.kdf = null;
});
