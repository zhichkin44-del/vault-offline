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
