import { test } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { state } from "../src/state.ts";
import { renderLock } from "../src/lock.ts";
import { renderSidebar } from "../src/sidebar.ts";
import { renderGrid } from "../src/grid.ts";

// --- jsdom environment setup (must run before any DOM usage) ---
const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  url: "http://localhost/",
  pretendToBeVisual: true,
});
const win = dom.window as unknown as Record<string, unknown>;
const g = globalThis as Record<string, unknown>;
for (const k of ["window", "document", "localStorage", "HTMLElement", "Node", "DOMParser", "customElements"]) {
  g[k] = win[k];
}
if (typeof g.requestAnimationFrame !== "function") {
  g.requestAnimationFrame = (cb: (t: number) => void) =>
    (win.setTimeout as (fn: () => void, ms: number) => number)(() => cb(0), 0);
  g.cancelAnimationFrame = (id: number) =>
    (win.clearTimeout as (id: number) => void)(id);
}

// --- seed state so grid/sidebar render real entries ---
state.vault = {
  version: 2,
  salt: "AAAA",
  entries: [
    { id: "e1", type: "login", title: "GitHub", login: "me", password: "s3cret", url: "https://github.com", note: "", createdAt: 1, updatedAt: 2, fields: [] },
    { id: "e2", type: "note", title: "Recipe", note: "do not tell", login: "", password: "", url: "", createdAt: 1, updatedAt: 2, fields: [] },
    { id: "e3", type: "custom", title: "API", note: "", login: "", password: "", url: "", createdAt: 1, updatedAt: 2, fields: [{ k: "token", v: "abc" }] },
  ],
} as unknown as typeof state.vault;
state.activeCategory = "all";

const noop = (): void => {};
const sidebarActions = {
  onChange: noop, onAdd: noop, onSettings: noop, onLock: noop, onLang: noop, onExport: noop, onImport: noop,
} as never;
const gridCb = { onEdit: noop, onDelete: async () => {} } as never;

test("renderLock produces lock card with language toggle outside it", async () => {
  const root = document.createElement("div");
  document.body.appendChild(root);
  await renderLock(root, { onUnlock: noop });
  assert.ok(root.querySelector(".lock-top"), "lock-top (lang) should exist");
  assert.ok(root.querySelector(".lock"), "lock card should exist");
});

test("renderSidebar produces nav, actions and security status", () => {
  const root = document.createElement("div");
  document.body.appendChild(root);
  renderSidebar(root, sidebarActions);
  assert.ok(root.querySelector(".nav"), "nav should exist");
  assert.ok(root.querySelector(".sidebar-actions"), "sidebar actions should exist");
  assert.ok(root.querySelector(".sidebar-add"), "add button should exist");
  assert.ok(root.querySelector(".sec-status"), "security status should exist");
  assert.ok(root.querySelector("[aria-label]"), "interactive items should expose aria-label");
});

test("renderGrid produces cards with reveal controls", () => {
  const root = document.createElement("div");
  document.body.appendChild(root);
  renderGrid(root, gridCb);
  assert.ok(root.querySelector(".card"), "at least one card should render");
  assert.ok(root.querySelector(".card .icon-inline svg"), "eye/reveal svg should render");
});

// --- path data validation (catches malformed SVG path commands) ---
const PATH_CMDS: Record<string, number> = {
  M: 2, m: 2, L: 2, l: 2, H: 1, h: 1, V: 1, v: 1,
  C: 6, c: 6, S: 4, s: 4, Q: 4, q: 4, T: 2, t: 2,
  A: 7, a: 7, Z: 0, z: 0,
};

function validatePathD(d: string): string | null {
  const tokens = d.match(/[a-zA-Z]|-?(?:\d*\.\d+|\d+\.?\d*)(?:[eE]-?\d+)?/g);
  if (!tokens) return d.trim() ? "no tokens" : null;
  let i = 0;
  let cmd = "";
  while (i < tokens.length) {
    const tok = tokens[i] as string;
    if (/[a-zA-Z]/.test(tok)) {
      if (!(tok in PATH_CMDS)) return `unknown command '${tok}'`;
      cmd = tok;
      i++;
    } else if (!cmd) {
      return `path starts with number '${tok}'`;
    }
    const n = PATH_CMDS[cmd];
    if (n === 0) continue;
    let count = 0;
    while (i < tokens.length && !/[a-zA-Z]/.test(tokens[i] as string)) {
      i++;
      count++;
    }
    if (count === 0) return `command '${cmd}' has no coordinates`;
    if (count % n !== 0) return `command '${cmd}' needs multiples of ${n} numbers, got ${count}`;
  }
  return null;
}

test("all rendered SVGs are well-formed with valid path data", () => {
  const svgs = Array.from(document.querySelectorAll("svg"));
  assert.ok(svgs.length > 0, "some svg should be present after renders");
  for (const s of svgs) {
    const elSvg = s as SVGElement;
    const xml = new DOMParser().parseFromString(elSvg.outerHTML, "image/svg+xml");
    assert.equal(
      xml.getElementsByTagName("parsererror").length,
      0,
      `svg failed xml parse: ${elSvg.outerHTML.slice(0, 80)}`,
    );
    for (const p of Array.from(elSvg.querySelectorAll("path"))) {
      const d = p.getAttribute("d");
      if (d) {
        const err = validatePathD(d);
        assert.equal(err, null, `invalid path d in svg: ${err} -> "${d}"`);
      }
    }
  }
});
