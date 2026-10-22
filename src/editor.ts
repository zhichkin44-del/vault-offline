import type { Entry, EntryType } from "./types";
import { state, persist } from "./state";
import { makeEntry, addEntry, updateEntry, removeEntry } from "./vault";
import { generatePassword } from "./generator";
import { t } from "./i18n";
import { el, openModal, field, iconButton } from "./dom";
import { ICON } from "./icons";
import { confirmModal } from "./confirm";

interface EditorOpts {
  entry?: Entry;
  onClose: () => void;
}

const TYPES: [EntryType, string][] = [
  ["login", "type.login"],
  ["note", "type.note"],
  ["custom", "type.custom"],
];

function toggle(checked: boolean, label: string): { wrap: HTMLLabelElement; input: HTMLInputElement } {
  const input = el("input", { type: "checkbox" });
  input.checked = checked;
  const wrap = el("label", { class: "toggle-chip" });
  wrap.append(input, el("span", { textContent: label }));
  return { wrap, input };
}

export function openEditor(opts: EditorOpts): void {
  const editing = opts.entry;
  let type: EntryType = editing?.type ?? "login";
  const m = openModal({ title: editing ? t("editor.edit") : t("editor.new"), className: "editor" });

  // Type: segmented control instead of a raw <select>
  const seg = el("div", { class: "segmented" });
  seg.setAttribute("role", "radiogroup");
  seg.setAttribute("aria-label", t("editor.type"));
  const segBtns = new Map<EntryType, HTMLButtonElement>();
  for (const [ty, key] of TYPES) {
    const b = el("button", { class: "seg", type: "button", textContent: t(key) });
    b.setAttribute("role", "radio");
    b.addEventListener("click", () => {
      type = ty;
      syncSeg();
      renderBody();
    });
    segBtns.set(ty, b);
    seg.append(b);
  }
  function syncSeg(): void {
    for (const [ty, b] of segBtns) {
      b.classList.toggle("active", ty === type);
      b.setAttribute("aria-checked", String(ty === type));
    }
  }
  syncSeg();

  const form = el("div", { class: "form-body" });
  m.body.append(seg, form);

  const titleInput = el("input", {
    class: "input",
    type: "text",
    placeholder: t("editor.titlePh"),
    value: editing?.title ?? "",
  });
  const loginInput = el("input", {
    class: "input",
    type: "text",
    value: editing?.login ?? "",
    spellcheck: false,
  });
  loginInput.autocomplete = "off";
  const urlInput = el("input", {
    class: "input",
    type: "text",
    placeholder: "github.com",
    value: editing?.url ?? "",
    spellcheck: false,
  });
  const passInput = el("input", {
    class: "input mono",
    type: "password",
    value: editing?.password ?? "",
    spellcheck: false,
  });
  passInput.autocomplete = "new-password";
  const noteInput = el("textarea", { class: "input", rows: 6 });
  noteInput.value = editing?.note ?? "";

  // Password field with reveal + generator
  const passWrap = el("div", { class: "input-group" });
  const reveal = iconButton(ICON.eye, t("card.reveal"), "in-input");
  reveal.addEventListener("click", () => {
    const show = passInput.type === "password";
    passInput.type = show ? "text" : "password";
    reveal.innerHTML = show ? ICON.eyeOff : ICON.eye;
    reveal.setAttribute("aria-label", show ? t("card.hide") : t("card.reveal"));
  });
  const regen = iconButton(ICON.refresh, t("editor.generate"), "in-input");
  passWrap.append(passInput, reveal, regen);

  const gen = el("div", { class: "generator" });
  const lenOut = el("span", { class: "gen-len mono", textContent: "20" });
  const lenIn = el("input", { type: "range", min: "8", max: "64", value: "20", class: "range" });
  lenIn.setAttribute("aria-label", t("editor.length"));
  const cbLower = toggle(true, t("editor.useLower"));
  const cbUpper = toggle(true, t("editor.useUpper"));
  const cbDigits = toggle(true, t("editor.useDigits"));
  const cbSymbols = toggle(true, t("editor.useSymbols"));
  const genBtn = el("button", { class: "btn small", type: "button", textContent: t("editor.generate") });
  const lenRow = el("div", { class: "gen-row" });
  lenRow.append(el("span", { class: "gen-label", textContent: t("editor.length") }), lenIn, lenOut);
  const setRow = el("div", { class: "gen-row" });
  setRow.append(cbLower.wrap, cbUpper.wrap, cbDigits.wrap, cbSymbols.wrap, genBtn);
  gen.append(lenRow, setRow);

  function generate(): void {
    passInput.value = generatePassword({
      length: Number(lenIn.value) || 20,
      lower: cbLower.input.checked,
      upper: cbUpper.input.checked,
      digits: cbDigits.input.checked,
      symbols: cbSymbols.input.checked,
    });
    passInput.type = "text";
    reveal.innerHTML = ICON.eyeOff;
  }
  lenIn.addEventListener("input", () => {
    lenOut.textContent = lenIn.value;
    generate();
  });
  for (const c of [cbLower, cbUpper, cbDigits, cbSymbols]) c.input.addEventListener("change", generate);
  genBtn.addEventListener("click", generate);
  regen.addEventListener("click", generate);

  // Custom fields
  const fieldsWrap = el("div", { class: "fields-wrap" });
  const fields: { key: HTMLInputElement; val: HTMLInputElement; row: HTMLElement }[] = [];
  function addFieldRow(k = "", v = ""): void {
    const row = el("div", { class: "field-row" });
    const keyI = el("input", { class: "input", type: "text", placeholder: t("editor.fieldKey"), value: k });
    const valI = el("input", { class: "input mono", type: "text", placeholder: t("editor.fieldValue"), value: v, spellcheck: false });
    const del = iconButton(ICON.x, t("editor.removeField"));
    const entry = { key: keyI, val: valI, row };
    del.addEventListener("click", () => {
      row.remove();
      fields.splice(fields.indexOf(entry), 1);
    });
    row.append(keyI, valI, del);
    fieldsWrap.append(row);
    fields.push(entry);
  }
  for (const f of editing?.fields ?? []) addFieldRow(f.k, f.v);
  const addFieldBtn = el("button", { class: "btn ghost small", type: "button" });
  const pl = el("span", { class: "btn-icon" });
  pl.innerHTML = ICON.plus;
  addFieldBtn.append(pl, el("span", { textContent: t("editor.addField") }));
  addFieldBtn.addEventListener("click", () => {
    addFieldRow();
    fields[fields.length - 1].key.focus();
  });

  const err = el("div", { class: "form-error" });
  err.setAttribute("role", "alert");

  function renderBody(): void {
    form.innerHTML = "";
    form.append(field(t("editor.title"), titleInput));
    if (type === "login") {
      form.append(
        field(t("card.login"), loginInput),
        field(t("editor.password"), passWrap),
        gen,
        field(t("editor.url"), urlInput),
      );
    } else if (type === "note") {
      form.append(field(t("editor.note"), noteInput));
    } else {
      if (fields.length === 0) addFieldRow();
      form.append(el("div", { class: "field-label", textContent: t("editor.fields") }), fieldsWrap, addFieldBtn);
    }
    form.append(err);
  }
  renderBody();

  const cancel = el("button", { class: "btn", type: "button", textContent: t("editor.cancel") });
  cancel.addEventListener("click", () => m.close());
  const save = el("button", { class: "btn primary", type: "button", textContent: t("editor.save") });
  save.addEventListener("click", async () => {
    if (!titleInput.value.trim()) {
      err.textContent = t("editor.titleRequired");
      titleInput.focus();
      return;
    }
    const partial: Partial<Entry> & { type: EntryType; title: string } = {
      type,
      title: titleInput.value.trim(),
      login: type === "login" ? loginInput.value : "",
      password: type === "login" ? passInput.value : "",
      url: type === "login" ? urlInput.value.trim() : "",
      note: type === "note" ? noteInput.value : "",
      fields:
        type === "custom"
          ? fields.map((f) => ({ k: f.key.value.trim(), v: f.val.value })).filter((f) => f.k.length > 0)
          : [],
    };
    state.vault = editing
      ? updateEntry(state.vault!, { ...editing, ...partial, updated: Date.now() })
      : addEntry(state.vault!, makeEntry(partial));
    await persist();
    m.close();
    opts.onClose();
  });

  if (editing) {
    const del = el("button", { class: "btn danger ghost push-left", type: "button", textContent: t("editor.delete") });
    del.addEventListener("click", async () => {
      if (!(await confirmModal(t("editor.confirmDelete"), t("editor.delete"), t("editor.cancel")))) return;
      state.vault = removeEntry(state.vault!, editing.id);
      await persist();
      m.close();
      opts.onClose();
    });
    m.footer.append(del);
  }
  m.footer.append(cancel, save);
  titleInput.focus();
}
