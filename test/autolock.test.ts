import test from "node:test";
import assert from "node:assert/strict";
import {
  createState,
  recordActivity,
  shouldLock,
  disable,
  enable,
  DEFAULT_TIMEOUT_MS,
} from "../src/autolock";

test("shouldLock false before timeout", () => {
  const s = createState(1000, 1000);
  assert.equal(shouldLock(s, 1000), false);
  assert.equal(shouldLock(s, 1500), false);
});

test("shouldLock true after timeout", () => {
  const s = createState(1000, 1000);
  assert.equal(shouldLock(s, 2000), true);
});

test("disabled never locks", () => {
  let s = createState(1000, 1000);
  s = disable(s);
  assert.equal(shouldLock(s, 99999), false);
});

test("recordActivity resets timer", () => {
  let s = createState(1000, 1000);
  assert.equal(shouldLock(s, 2000), true);
  s = recordActivity(s, 5000);
  assert.equal(shouldLock(s, 5500), false);
  assert.equal(shouldLock(s, 6500), true);
});

test("enable re-enables and resets", () => {
  let s = createState(1000, 1000);
  s = disable(s);
  s = enable(s, 5000);
  assert.equal(shouldLock(s, 5500), false);
  assert.equal(shouldLock(s, 6500), true);
});

test("DEFAULT_TIMEOUT_MS is 5 minutes", () => {
  assert.equal(DEFAULT_TIMEOUT_MS, 5 * 60 * 1000);
});
