import { test } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { confirmModal } from "../src/confirm.ts";

// --- jsdom environment setup (must run before any DOM usage) ---
const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  url: "http://localhost/",
  pretendToBeVisual: true,
});
const win = dom.window as unknown as Record<string, unknown>;
const g = globalThis as Record<string, unknown>;
for (const k of ["window", "document", "localStorage", "HTMLElement", "Node", "DOMParser", "customElements", "KeyboardEvent"]) {
  g[k] = win[k];
}
if (typeof g.requestAnimationFrame !== "function") {
  g.requestAnimationFrame = (cb: (t: number) => void) =>
    (win.setTimeout as (fn: () => void, ms: number) => number)(() => cb(0), 0);
  g.cancelAnimationFrame = (id: number) =>
    (win.clearTimeout as (id: number) => void)(id);
}

function okBtn(): HTMLButtonElement {
  return Array.from(document.querySelectorAll(".confirm-modal .btn.danger"))[0] as HTMLButtonElement;
}
function cancelBtn(): HTMLButtonElement {
  return Array.from(
    document.querySelectorAll(".confirm-modal .btn:not(.danger)"),
  )[0] as HTMLButtonElement;
}

test("confirmModal resolves true when OK clicked", async () => {
  const p = confirmModal("Delete this entry? This cannot be undone.", "Delete", "Cancel");
  assert.ok(okBtn(), "OK button should exist");
  okBtn().click();
  const res = await p;
  assert.equal(res, true);
  assert.equal(document.querySelector(".confirm-modal"), null, "overlay removed after resolve");
});

test("confirmModal resolves false when Cancel clicked", async () => {
  const p = confirmModal("Delete this entry? This cannot be undone.", "Delete", "Cancel");
  cancelBtn().click();
  const res = await p;
  assert.equal(res, false);
  assert.equal(document.querySelector(".confirm-modal"), null, "overlay removed after resolve");
});

test("confirmModal resolves false on Escape", async () => {
  const p = confirmModal("Delete this entry? This cannot be undone.", "Delete", "Cancel");
  const KeyboardEventCtor = win.KeyboardEvent as typeof KeyboardEvent;
  window.dispatchEvent(new KeyboardEventCtor("keydown", { key: "Escape" }));
  const res = await p;
  assert.equal(res, false);
});

test("confirmModal resolves false on overlay click", async () => {
  const p = confirmModal("Delete this entry? This cannot be undone.", "Delete", "Cancel");
  const overlay = document.querySelector(".modal-overlay") as HTMLElement;
  assert.ok(overlay, "overlay should exist");
  overlay.click();
  const res = await p;
  assert.equal(res, false);
});
