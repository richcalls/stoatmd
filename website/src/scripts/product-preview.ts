const preview = document.querySelector<HTMLElement>("[data-preview]");
if (preview) {
  const modes = preview.querySelectorAll<HTMLButtonElement>("[data-mode]");
  const notes = preview.querySelectorAll<HTMLButtonElement>("[data-note]");
  const panels = preview.querySelectorAll<HTMLElement>("[data-panel]");
  const filename = preview.querySelector<HTMLElement>("[data-filename]");
  const label = preview.querySelector<HTMLElement>("[data-view-label]");
  for (const button of modes) {
    button.disabled = false;
    button.addEventListener("click", () => {
      preview.dataset.view = button.dataset.mode;
      for (const other of modes)
        other.setAttribute("aria-pressed", String(other === button));
      if (label) label.textContent = button.getAttribute("aria-label");
    });
  }
  for (const button of notes) {
    button.disabled = false;
    button.addEventListener("click", () => {
      for (const other of notes)
        other.setAttribute("aria-pressed", String(other === button));
      for (const panel of panels)
        panel.hidden = panel.dataset.panel !== button.dataset.note;
      if (filename) filename.textContent = `${button.title}.md`;
    });
  }
}
