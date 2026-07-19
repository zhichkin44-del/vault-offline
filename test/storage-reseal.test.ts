import test from "node:test";
import assert from "node:assert/strict";
import { NodeStorage } from "../src/storage";
import {
  emptyVault,
  makeEntry,
  addEntry,
  updateEntry,
  removeEntry,
  open,
  seal,
} from "../src/vault";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";

test("NodeStorage reseal roundtrip after CRUD", async () => {
  const file = path.join(os.tmpdir(), `vaulty-test-${Date.now()}.vault`);
  const storage = new NodeStorage(file);
  assert.equal(await storage.hasData(), false);

  let vault = emptyVault();
  const e1 = makeEntry({
    type: "login",
    title: "A",
    login: "u",
    password: "p",
  });
  vault = addEntry(vault, e1);
  await storage.save(await seal(vault, "masterpass"));
  assert.equal(await storage.hasData(), true);

  vault = updateEntry(vault, { ...e1, password: "new" });
  await storage.save(await seal(vault, "masterpass"));

  vault = removeEntry(vault, e1.id);
  await storage.save(await seal(vault, "masterpass"));

  const loaded = await storage.load();
  assert.ok(loaded);
  const reopened = await open(loaded!, "masterpass");
  assert.equal(reopened.entries.length, 0);

  await fs.unlink(file).catch(() => {});
});

test("open rejects wrong master", async () => {
  const file = path.join(os.tmpdir(), `vaulty-test2-${Date.now()}.vault`);
  const storage = new NodeStorage(file);
  await storage.save(await seal(emptyVault(), "right"));
  const loaded = await storage.load();
  await assert.rejects(() => open(loaded!, "wrong"));
  await fs.unlink(file).catch(() => {});
});
