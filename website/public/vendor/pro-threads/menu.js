/*
 * A dropdown for Tweakpane's list bindings, in place of the browser's own.
 * The binding's select stays (it holds the value and keeps the layout),
 * but clicking it or pressing a key on it opens this menu instead. Options
 * can be grouped under headings, and each can show a detail on its right.
 * Shared by the wallpaper and the hero scenes.
 */

import { t } from './i18n.js';

const CSS = `
  .tp-menu {
    position: fixed;
    z-index: 1000;
    box-sizing: border-box;
    min-width: 200px;
    overflow-y: auto;
    padding: 4px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 6px;
    background: #1f2126;
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.55);
    color: #c9ced8;
    scrollbar-width: thin;
    user-select: none;
  }
  .tp-menu_h {
    padding: 8px 8px 4px 24px;
    color: #6f7581;
    font-size: 0.85em;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }
  .tp-menu_h:first-child { padding-top: 4px; }
  .tp-menu_i {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 6px 8px;
    border-radius: 4px;
    white-space: nowrap;
    cursor: pointer;
  }
  .tp-menu_i[data-active] { background: rgba(255, 255, 255, 0.08); }
  .tp-menu_i[aria-selected="true"] { color: #ffffff; }
  .tp-menu_c { width: 8px; flex: none; text-align: center; }
  .tp-menu_d { margin-left: auto; color: #7d8390; font-variant-numeric: tabular-nums; }
`;

let current = null; // the menu showing: { el, select, items, active }

function close() {
  current?.el.remove();
  current = null;
}

function setActive(index) {
  const { items } = current;
  current.active = (index + items.length) % items.length;
  items.forEach((item, i) => item.toggleAttribute('data-active', i === current.active));
  items[current.active].scrollIntoView({ block: 'nearest' });
}

function pick(select, value) {
  close();
  if (select.value === value) return;
  select.value = value;
  select.dispatchEvent(new Event('change', { bubbles: true }));
}

function show(select, groups, detail) {
  close();
  const el = document.createElement('div');
  el.className = 'tp-menu';
  el.setAttribute('role', 'listbox');
  el.style.font = getComputedStyle(select).font;
  // Pressing in the menu keeps the focus on the select.
  el.addEventListener('mousedown', (event) => event.preventDefault());
  const options = [...select.options].map((o) => o.value);
  const labels = Object.fromEntries([...select.options].map((o) => [o.value, o.textContent]));
  const sections = groups ?? [{ keys: options }];
  const items = [];
  for (const { title, keys } of sections) {
    if (title) {
      const heading = document.createElement('div');
      heading.className = 'tp-menu_h';
      heading.textContent = t(title);
      el.append(heading);
    }
    for (const value of keys.filter((k) => options.includes(k))) {
      const item = document.createElement('div');
      item.className = 'tp-menu_i';
      item.setAttribute('role', 'option');
      item.setAttribute('aria-selected', value === select.value);
      item.innerHTML = '<span class="tp-menu_c"></span><span></span><span class="tp-menu_d"></span>';
      item.children[0].textContent = value === select.value ? '✓' : '';
      item.children[1].textContent = labels[value];
      item.children[2].textContent = detail?.(value) ?? '';
      const index = items.length;
      item.addEventListener('pointermove', () => current.active !== index && setActive(index));
      item.addEventListener('click', () => pick(select, value));
      el.append(item);
      items.push(item);
    }
  }
  document.body.append(el);

  // Below the select, right-aligned with it (the panel sits on the right);
  // above it when there is more room there.
  const box = select.getBoundingClientRect();
  const width = Math.max(box.width, el.offsetWidth);
  el.style.left = `${Math.max(8, box.right - width)}px`;
  const below = innerHeight - box.bottom - 12;
  const above = box.top - 12;
  const up = el.offsetHeight > below && above > below;
  el.style.maxHeight = `${up ? above : below}px`;
  el.style.top = `${up ? box.top - 4 - Math.min(el.offsetHeight, above) : box.bottom + 4}px`;

  current = { el, select, items, active: -1 };
  const chosen = items.findIndex((item) => item.getAttribute('aria-selected') === 'true');
  setActive(Math.max(0, chosen));
}

// Turns a list binding's select into a trigger for the menu. groups:
// [{ title, keys }] in order (options left out of every group aren't
// listed); detail(key): text shown on an option's right.
export function menu(binding, { groups, detail } = {}) {
  if (!document.querySelector('style[data-tp-menu]')) {
    const style = document.createElement('style');
    style.dataset.tpMenu = '';
    style.textContent = CSS;
    document.head.append(style);
  }
  const select = binding.element?.querySelector('select');
  // Without the panel (embedded, or its library unavailable) there is no select.
  if (!select) return;
  const isOpen = () => current?.select === select;
  select.addEventListener('mousedown', (event) => {
    event.preventDefault();
    select.focus();
    if (isOpen()) close();
    else show(select, groups, detail);
  });
  select.addEventListener('keydown', (event) => {
    if (event.key === 'Tab') return close();
    event.preventDefault();
    if (!isOpen()) {
      if (['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(event.key)) show(select, groups, detail);
      return;
    }
    if (event.key === 'ArrowDown') setActive(current.active + 1);
    if (event.key === 'ArrowUp') setActive(current.active - 1);
    if (event.key === 'Escape') close();
    if (event.key === 'Enter' || event.key === ' ') current.items[current.active].click();
  });
  select.addEventListener('blur', () => isOpen() && close());
}

// Anything else closes it: a press outside, scrolling the panel, resizing.
addEventListener('pointerdown', (event) => current && !current.el.contains(event.target) && event.target !== current.select && close(), true);
addEventListener('scroll', (event) => current && !current.el.contains(event.target) && close(), true);
addEventListener('resize', close);
addEventListener('blur', close);
