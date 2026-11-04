import test from "node:test";
import assert from "node:assert/strict";
import { loadSettings, saveSettings, defaultSettings } from "../src/settings";

test("defaultSettings returns 5 minutes and default theme/accent", () => {
  const d = defaultSettings();
  assert.equal(d.autoLockMinutes, 5);
  assert.equal(d.theme, "light");
  assert.equal(d.accent, "teal");
});

test("save/load roundtrip preserves minutes", () => {
  saveSettings({ autoLockMinutes: 15, theme: "dark", accent: "teal" });
  const s = loadSettings();
  assert.equal(s.autoLockMinutes, 15);
  assert.equal(s.theme, "dark");
  assert.equal(s.accent, "teal");
});

test("save/load roundtrip preserves disabled (null) and light/purple", () => {
  saveSettings({ autoLockMinutes: null, theme: "light", accent: "purple" });
  const s = loadSettings();
  assert.equal(s.autoLockMinutes, null);
  assert.equal(s.theme, "light");
  assert.equal(s.accent, "purple");
});

test("loadSettings returns a valid Settings object", () => {
  const s = loadSettings();
  assert.ok(
    typeof s.autoLockMinutes === "number" || s.autoLockMinutes === null,
  );
  assert.ok(s.theme === "dark" || s.theme === "light");
  assert.ok(s.accent === "teal" || s.accent === "purple");
});
