const preview = document.querySelector<HTMLElement>("[data-preview]");
if (preview) {
  const modes = preview.querySelectorAll<HTMLButtonElement>("[data-mode]");
  const notes = Array.from(
    document.querySelectorAll<HTMLButtonElement>("[data-note]"),
  );
  const panels = preview.querySelectorAll<HTMLElement>("[data-panel]");
  const filename = preview.querySelector<HTMLElement>("[data-filename]");
  const noteMeta = preview.querySelector<HTMLElement>("[data-note-meta]");
  const body = preview.querySelector<HTMLElement>(".sheet-body");

  function selectNote(index: number) {
    for (const [i, button] of notes.entries()) {
      button.setAttribute("aria-pressed", String(i === index));
    }
    for (const panel of panels) {
      panel.hidden = panel.dataset.panel !== String(index);
    }
    const panel = panels[index];
    if (filename && panel?.dataset.path)
      filename.textContent = panel.dataset.path;
    if (filename && panel?.dataset.path)
      filename.setAttribute("title", panel.dataset.path);
    if (noteMeta && panel?.dataset.meta)
      noteMeta.textContent = panel.dataset.meta;
    if (body) body.scrollTop = 0;
  }

  for (const button of modes) {
    button.disabled = false;
    button.addEventListener("click", () => {
      preview.dataset.view = button.dataset.mode;
      for (const other of modes)
        other.setAttribute("aria-pressed", String(other === button));
      if (body) body.scrollTop = 0;
    });
  }

  for (const [index, button] of notes.entries()) {
    button.disabled = false;
    button.addEventListener("click", () => selectNote(index));
  }

  const group = notes[0]?.parentElement;
  group?.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    const current = notes.indexOf(
      document.activeElement as HTMLButtonElement,
    );
    if (current < 0) return;
    event.preventDefault();
    const next =
      (current + (event.key === "ArrowDown" ? 1 : -1) + notes.length) %
      notes.length;
    notes[next]?.focus();
    selectNote(next);
  });
}
