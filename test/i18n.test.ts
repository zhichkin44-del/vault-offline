import test from "node:test";
import assert from "node:assert/strict";
import { t, setLang } from "../src/i18n";

test("t() returns strings for current language", () => {
  setLang("ru");
    assert.equal(t("app.title"), "Vault");
  assert.equal(t("card.copy"), "Копировать");
  setLang("en");
  assert.equal(t("card.copy"), "Copy");
    assert.equal(t("app.title"), "Vault");
});

test("t() falls back to the key for unknown ids", () => {
  setLang("ru");
  assert.equal(t("missing.key.xyz"), "missing.key.xyz");
});
