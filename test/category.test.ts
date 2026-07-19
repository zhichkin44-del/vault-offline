import test from "node:test";
import assert from "node:assert/strict";
import { categoryToFilter, countByCategory, filterEntries } from "../src/entrylogic";
import type { Entry, EntryType } from "../src/types";

function mk(type: EntryType, title: string): Entry {
  return {
    id: title + type,
    type,
    title,
    login: "",
    password: "",
    url: "",
    fields: [],
    note: "",
    updated: 0,
  };
}

test("categoryToFilter maps all four categories", () => {
  assert.equal(categoryToFilter("all"), "all");
  assert.equal(categoryToFilter("login"), "login");
  assert.equal(categoryToFilter("note"), "note");
  assert.equal(categoryToFilter("custom"), "custom");
});

test("countByCategory counts per type and all", () => {
  const es = [mk("login", "a"), mk("login", "b"), mk("note", "c"), mk("custom", "d")];
  const c = countByCategory(es);
  assert.equal(c.all, 4);
  assert.equal(c.login, 2);
  assert.equal(c.note, 1);
  assert.equal(c.custom, 1);
});

test("filterEntries with a category yields the expected subset", () => {
  const es = [mk("login", "a"), mk("note", "b"), mk("custom", "c")];
  assert.equal(filterEntries(es, "", categoryToFilter("login")).length, 1);
  assert.equal(filterEntries(es, "", categoryToFilter("note")).length, 1);
  assert.equal(filterEntries(es, "", categoryToFilter("custom")).length, 1);
  assert.equal(filterEntries(es, "", categoryToFilter("all")).length, 3);
});
