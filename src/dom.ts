type Props = Record<string, unknown> & { class?: string };

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Partial<HTMLElementTagNameMap[K]> & { class?: string } = {},
  children: (Node | string)[] = [],
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props as Props)) {
    if (k === "class") node.className = v as string;
    else (node as Record<string, unknown>)[k] = v;
  }
  for (const c of children) node.append(c as Node | string);
  return node;
}

export function toast(msg: string): void {
  let wrap = document.querySelector<HTMLDivElement>("#toast-wrap");
  if (!wrap) {
    wrap = document.createElement("div");
    wrap.id = "toast-wrap";
    document.body.appendChild(wrap);
  }
  const item = document.createElement("div");
  item.className = "toast";
  item.textContent = msg;
  wrap.appendChild(item);
  requestAnimationFrame(() => item.classList.add("show"));
  window.setTimeout(() => {
    item.classList.remove("show");
    window.setTimeout(() => item.remove(), 220);
  }, 1800);
}

let clearTimer: number | undefined;

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch {
      ok = false;
    }
    document.body.removeChild(ta);
    if (!ok) return false;
  }
  if (clearTimer) window.clearTimeout(clearTimer);
  clearTimer = window.setTimeout(() => {
    navigator.clipboard.writeText("").catch(() => {});
  }, 15000);
  return true;
}

export interface ModalHandle {
  overlay: HTMLDivElement;
  modal: HTMLDivElement;
  body: HTMLDivElement;
  footer: HTMLDivElement;
  close: () => void;
}

/** Shared modal shell: title, scrollable body, footer; Escape and backdrop close it. */
export function openModal(opts: {
  title: string;
  className?: string;
  onClose?: () => void;
}): ModalHandle {
  const overlay = el("div", { class: "modal-overlay" });
  const modal = el("div", { class: "modal" + (opts.className ? " " + opts.className : "") });
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  modal.setAttribute("aria-label", opts.title);
  const head = el("div", { class: "modal-head" });
  head.append(el("h2", { class: "modal-title", textContent: opts.title }));
  const body = el("div", { class: "modal-body" });
  const footer = el("div", { class: "modal-actions" });
  modal.append(head, body, footer);
  overlay.append(modal);

  const onKey = (e: KeyboardEvent): void => {
    // Only the top-most modal reacts, so Escape in a confirm dialog doesn't close the editor under it.
    const all = document.querySelectorAll(".modal-overlay");
    if (all[all.length - 1] !== overlay) return;
    if (e.key === "Escape") {
      e.preventDefault();
      close();
    }
  };
  function close(): void {
    window.removeEventListener("keydown", onKey);
    overlay.remove();
    opts.onClose?.();
  }
  overlay.addEventListener("mousedown", (e) => {
    if (e.target === overlay) close();
  });
  window.addEventListener("keydown", onKey);
  document.body.append(overlay);
  return { overlay, modal, body, footer, close };
}

export function field(label: string, control: HTMLElement, hint?: string): HTMLElement {
  const wrap = el("label", { class: "field" });
  wrap.append(el("span", { class: "field-label", textContent: label }), control);
  if (hint) wrap.append(el("span", { class: "field-hint", textContent: hint }));
  return wrap;
}

export function iconButton(svg: string, label: string, extra = ""): HTMLButtonElement {
  const b = el("button", { class: "icon-btn" + (extra ? " " + extra : ""), type: "button", title: label });
  b.setAttribute("aria-label", label);
  b.innerHTML = svg;
  return b;
}

/** Disables a button and swaps its label while an async task runs. */
export async function busy<T>(btn: HTMLButtonElement, label: string, task: () => Promise<T>): Promise<T> {
  const prev = btn.textContent;
  btn.disabled = true;
  btn.classList.add("is-busy");
  btn.textContent = label;
  try {
    return await task();
  } finally {
    btn.disabled = false;
    btn.classList.remove("is-busy");
    btn.textContent = prev;
  }
}
