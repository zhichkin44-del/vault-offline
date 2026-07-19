import { el } from "./dom";

export function confirmModal(
  message: string,
  okLabel: string,
  cancelLabel: string,
): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    const overlay = el("div", { class: "modal-overlay" });
    const modal = el("div", { class: "modal confirm-modal" });

    const msg = el("p", { class: "confirm-msg", textContent: message });
    modal.append(msg);

    const actions = el("div", { class: "modal-actions" });
    const cancelBtn = el("button", {
      class: "btn",
      type: "button",
      textContent: cancelLabel,
    });
    const okBtn = el("button", {
      class: "btn danger",
      type: "button",
      textContent: okLabel,
    });
    actions.append(cancelBtn, okBtn);
    modal.append(actions);

    const close = (result: boolean): void => {
      window.removeEventListener("keydown", onKey);
      overlay.remove();
      resolve(result);
    };

    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") {
        e.preventDefault();
        close(false);
      }
    };

    cancelBtn.addEventListener("click", () => close(false));
    okBtn.addEventListener("click", () => close(true));
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) close(false);
    });
    window.addEventListener("keydown", onKey);

    overlay.append(modal);
    document.body.append(overlay);
    okBtn.focus();
  });
}
