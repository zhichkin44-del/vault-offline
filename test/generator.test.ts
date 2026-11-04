import test from "node:test";
import assert from "node:assert/strict";
import { generatePassword } from "../src/generator";

test("generatePassword respects length", () => {
  const p = generatePassword({
    length: 20,
    lower: true,
    upper: true,
    digits: true,
    symbols: false,
  });
  assert.equal(p.length, 20);
});

test("generatePassword uses only selected character sets", () => {
  const p = generatePassword({
    length: 50,
    lower: true,
    upper: false,
    digits: false,
    symbols: false,
  });
  assert.match(p, /^[a-z]+$/);
  const q = generatePassword({
    length: 50,
    lower: false,
    upper: false,
    digits: true,
    symbols: false,
  });
  assert.match(q, /^[0-9]+$/);
});

test("generatePassword returns empty when no set selected", () => {
  const p = generatePassword({
    length: 12,
    lower: false,
    upper: false,
    digits: false,
    symbols: false,
  });
  assert.equal(p, "");
});

test("generatePassword produces different output across calls", () => {
  const opts = {
    length: 32,
    lower: true,
    upper: true,
    digits: true,
    symbols: true,
  };
  const a = generatePassword(opts);
  const b = generatePassword(opts);
  assert.notEqual(a, b);
});
