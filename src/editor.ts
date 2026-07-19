import type { Entry, EntryType } from "./types";
import { state, persist } from "./state";
import { makeEntry, addEntry, updateEntry, removeEntry } from "./vault";
import { generatePassword } from "./generator";
import { t } from "./i18n";
import { el } from "./dom";
import { confirmModal } from "./confirm";

interface EditorOpts {
  entry?: Entry;
  onClose: () => void;
}

function labeled(label: string, control: HTMLElement): HTMLElement {
  const wrap = el("div", { class: "form-row" });
  wrap.append(el("label", { class: "form-label", textContent: label }));
  wrap.append(control);
  return wrap;
}

function checkbox(
  checked: boolean,
  labelText: string,
): { wrap: HTMLLabelElement; input: HTMLInputElement } {
  const input = el("input", { type: "checkbox" }) as HTMLInputElement;
  input.checked = checked;
  const lab = el("label", { class: "cb-label" });
  lab.append(input, document.createTextNode(" " + labelText));
  return { wrap: lab, input };
}

export function openEditor(opts: EditorOpts): void {
  const editing = opts.entry;
  const overlay = el("div", { class: "modal-overlay" });
  const modal = el("div", { class: "modal" });
  overlay.append(modal);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });

  function close(): void {
    overlay.remove();
  }

  modal.append(
    el("h2", {
      class: "modal-title",
      textContent: editing ? t("editor.edit") : t("editor.new"),
    }),
  );

  let type: EntryType = editing?.type ?? "login";

  const typeRow = el("div", { class: "form-row" });
  typeRow.append(el("label", { class: "form-label", textContent: t("editor.type") }));
  const typeSel = el("select", { class: "input" }) as HTMLSelectElement;
  for (const ty of ["login", "note", "custom"] as EntryType[]) {
    const o = el("option", { value: ty, textContent: ty }) as HTMLOptionElement;
    if (ty === type) o.selected = true;
    typeSel.append(o);
  }
  typeRow.append(typeSel);
  modal.append(typeRow);

  const body = el("div", { class: "form-body" });
  modal.append(body);

  const titleInput = el("input", {
    class: "input",
    type: "text",
    placeholder: t("editor.title"),
    value: editing?.title ?? "",
  }) as HTMLInputElement;
  const loginInput = el("input", {
    class: "input",
    type: "text",
    placeholder: t("card.login"),
    value: editing?.login ?? "",
  }) as HTMLInputElement;
  const urlInput = el("input", {
    class: "input",
    type: "text",
    placeholder: t("editor.url"),
    value: editing?.url ?? "",
  }) as HTMLInputElement;
  const passInput = el("input", {
    class: "input",
    type: "text",
    placeholder: t("editor.password"),
    value: editing?.password ?? "",
  }) as HTMLInputElement;
  const noteInput = el("textarea", {
    class: "input",
    placeholder: t("editor.note"),
  }) as HTMLTextAreaElement;
  noteInput.value = editing?.note ?? "";

  const fieldsWrap = el("div", { class: "fields-wrap" });
  const fields: { key: HTMLInputElement; val: HTMLInputElement; row: HTMLElement }[] = [];
  function addFieldRow(k = "", v = ""): void {
    const row = el("div", { class: "field-row" });
    const keyI = el("input", {
      class: "input",
      type: "text",
      placeholder: t("editor.fieldKey"),
    }) as HTMLInputElement;
    const valI = el("input", {
      class: "input",
      type: "text",
      placeholder: t("editor.fieldValue"),
    }) as HTMLInputElement;
    keyI.value = k;
    valI.value = v;
    const del = el("button", { class: "btn small", textContent: "✕" });
    del.addEventListener("click", () => row.remove());
    row.append(keyI, valI, del);
    fieldsWrap.append(row);
    fields.push({ key: keyI, val: valI, row });
  }

  const genLen = el("input", {
    class: "input small",
    type: "number",
    value: "16",
  }) as HTMLInputElement;
  const cbLower = checkbox(true, t("editor.useLower"));
  const cbUpper = checkbox(true, t("editor.useUpper"));
  const cbDigits = checkbox(true, t("editor.useDigits"));
  const cbSymbols = checkbox(true, t("editor.useSymbols"));
  const genBtn = el("button", { class: "btn small", textContent: t("editor.generate") });
  genBtn.addEventListener("click", () => {
    passInput.value = generatePassword({
      length: Number(genLen.value) || 16,
      lower: cbLower.input.checked,
      upper: cbUpper.input.checked,
      digits: cbDigits.input.checked,
      symbols: cbSymbols.input.checked,
    });
  });

  function renderBody(): void {
    body.innerHTML = "";
    body.append(labeled(t("editor.title"), titleInput));
    if (type === "login") {
      body.append(labeled(t("card.login"), loginInput));
      const genRow = el("div", { class: "gen-row" });
      genRow.append(
        genBtn,
        el("span", { class: "cb-label", textContent: t("editor.length") }),
        genLen,
        cbLower.wrap,
        cbUpper.wrap,
        cbDigits.wrap,
        cbSymbols.wrap,
      );
      body.append(labeled(t("editor.password"), passInput));
      body.append(genRow);
      body.append(labeled(t("editor.url"), urlInput));
    } else if (type === "note") {
      body.append(labeled(t("editor.note"), noteInput));
    } else {
      body.append(el("div", { class: "form-label", textContent: t("editor.fields") }));
      fieldsWrap.innerHTML = "";
      fields.length = 0;
      const seed = editing?.fields ?? [];
      if (seed.length === 0) addFieldRow();
      else seed.forEach((f) => addFieldRow(f.k, f.v));
      const addBtn = el("button", { class: "btn small", textContent: t("editor.addField") });
      addBtn.addEventListener("click", () => addFieldRow());
      body.append(fieldsWrap, addBtn);
    }
  }

  typeSel.addEventListener("change", () => {
    type = typeSel.value as EntryType;
    renderBody();
  });
  renderBody();

  const err = el("div", { class: "lock-error" });
  modal.append(err);

  const actions = el("div", { class: "modal-actions" });
  const cancel = el("button", { class: "btn", textContent: t("editor.cancel") });
  cancel.addEventListener("click", close);
  const save = el("button", { class: "btn primary", textContent: t("editor.save") });
  save.addEventListener("click", async () => {
    if (!titleInput.value.trim()) {
      err.textContent = t("editor.title") + "!";
      return;
    }
    const partial: Partial<Entry> & { type: EntryType; title: string } = {
      type,
      title: titleInput.value.trim(),
      login: loginInput.value,
      password: passInput.value,
      url: urlInput.value,
      note: noteInput.value,
      fields: [],
    };
    if (type === "custom") {
      partial.fields = fields
        .map((f) => ({ k: f.key.value.trim(), v: f.val.value }))
        .filter((f) => f.k.length > 0);
    }
    let next = state.vault!;
    if (editing) {
      next = updateEntry(next, { ...editing, ...partial, updated: Date.now() });
    } else {
      next = addEntry(next, makeEntry(partial));
    }
    state.vault = next;
    await persist();
    close();
    opts.onClose();
  });
  actions.append(cancel, save);
  if (editing) {
    const del = el("button", { class: "btn danger", textContent: t("editor.delete") });
    del.addEventListener("click", async () => {
      if (!(await confirmModal(t("editor.confirmDelete"), t("editor.delete"), t("editor.cancel")))) return;
      state.vault = removeEntry(state.vault!, editing.id);
      await persist();
      close();
      opts.onClose();
    });
    actions.append(del);
  }
  modal.append(actions);

  document.body.append(overlay);
}
