import test from "node:test";
import assert from "node:assert/strict";
import {
  filterEntries,
  sortEntries,
  validateEntry,
} from "../src/entrylogic";
import type { Entry } from "../src/types";

function mk(partial: Partial<Entry> & { id: string; title: string }): Entry {
  return {
    id: partial.id,
    type: partial.type ?? "login",
    title: partial.title,
    login: partial.login ?? "",
    password: partial.password ?? "",
    url: partial.url ?? "",
    fields: partial.fields ?? [],
    note: partial.note ?? "",
    updated: partial.updated ?? 0,
  };
}

const entries: Entry[] = [
  mk({ id: "1", title: "GitHub", login: "alice", type: "login", updated: 10 }),
  mk({ id: "2", title: "Bank", note: "secret", type: "note", updated: 30 }),
  mk({
    id: "3",
    title: "Api Key",
    type: "custom",
    fields: [{ k: "token", v: "abc" }],
    updated: 20,
  }),
];

test("filterEntries: empty query returns all", () => {
  assert.equal(filterEntries(entries, "", "all").length, 3);
});

test("filterEntries: matches title and login", () => {
  assert.equal(filterEntries(entries, "git", "all").length, 1);
  assert.equal(filterEntries(entries, "alice", "all").length, 1);
  assert.equal(filterEntries(entries, "token", "all").length, 1);
});

test("filterEntries: by type", () => {
  assert.equal(filterEntries(entries, "", "note").length, 1);
  assert.equal(filterEntries(entries, "", "custom").length, 1);
  assert.equal(filterEntries(entries, "", "login").length, 1);
});

test("filterEntries: type + query combined", () => {
  assert.equal(filterEntries(entries, "git", "login").length, 1);
  assert.equal(filterEntries(entries, "bank", "login").length, 0);
});

test("sortEntries: by title asc", () => {
  const sorted = sortEntries(entries, "title").map((e) => e.title);
  assert.deepEqual(sorted, ["Api Key", "Bank", "GitHub"]);
});

test("sortEntries: by updated desc (default)", () => {
  const sorted = sortEntries(entries, "updated").map((e) => e.id);
  assert.deepEqual(sorted, ["2", "3", "1"]);
});

test("validateEntry: empty title fails", () => {
  assert.equal(validateEntry({ title: "" }).title, "required");
  assert.equal(validateEntry({ title: "  " }).title, "required");
  assert.equal(validateEntry({ title: "ok" }).title, undefined);
});
