/**
 * Dev-only visual edit mode for Page 1 Hub. Drag blocks to reorder (sets
 * inline `order`, which wins over the CSS `order:` rules for board/mode
 * tiles), drag/resize the `.hub-sections` grid boxes freely (row + column),
 * edit text in place, delete blocks, or export the current arrangement as
 * JSON to hand back for a permanent code change. Nothing here persists on
 * its own except via the "Save to index.html" button.
 */

const REORDER_GROUPS: Array<{ container: string; item: string }> = [
  { container: '.hub-sidebar-nav', item: '.hub-sidebar-link' },
  { container: '.hub-rail-foot', item: '.hub-rail-foot-link' },
  { container: '#hub-board-grid', item: '.hub-board-tile' },
  { container: '#hub-mode-grid', item: '.hub-mode-tile' },
];

const GRID_COLS = 12;
const GRID_ROW_UNIT_PX = 40;
const GRID_MAX_ROWS = 40;

const TEXT_SELECTORS = [
  '.hub-sidebar-link',
  '.hub-rail-foot-link',
  '.hub-slogan',
  '.hub-title',
  '.hub-section-title',
  '.hub-lesson-btn',
  '.hub-board-tile-label',
  '.hub-board-tile-sub',
  '.hub-mode-tile',
];

let active = false;
let toolbar: HTMLElement | null = null;

function reindex(container: Element, itemSelector: string): void {
  container.querySelectorAll(itemSelector).forEach((el, i) => {
    (el as HTMLElement).style.order = String(i);
  });
}

/** Pointer-based drag (not native HTML5 DnD, which synthetic/touch input
 * can't reliably trigger). A dedicated handle starts the drag so clicking
 * the block's own text still edits it instead of dragging. */
function startItemDrag(e: PointerEvent, container: Element, itemSelector: string, item: HTMLElement): void {
  e.preventDefault();
  item.setPointerCapture(e.pointerId);
  item.classList.add('hub-edit-dragging');

  function onMove(ev: PointerEvent): void {
    const target = document
      .elementsFromPoint(ev.clientX, ev.clientY)
      .find((el) => el !== item && el.matches(itemSelector) && container.contains(el));
    if (!target) return;
    const rect = target.getBoundingClientRect();
    const before = ev.clientY < rect.top + rect.height / 2 || ev.clientX < rect.left + rect.width / 2;
    target.parentElement?.insertBefore(item, before ? target : target.nextSibling);
    reindex(container, itemSelector);
  }
  function onUp(): void {
    item.classList.remove('hub-edit-dragging');
    item.removeEventListener('pointermove', onMove);
    item.removeEventListener('pointerup', onUp);
  }
  item.addEventListener('pointermove', onMove);
  item.addEventListener('pointerup', onUp);
}

function wireReorder(container: Element, itemSelector: string): void {
  container.querySelectorAll(itemSelector).forEach((raw) => {
    const el = raw as HTMLElement;
    if (el.dataset.hubReorderWired === '1') return;
    el.dataset.hubReorderWired = '1';
    const handle = document.createElement('span');
    handle.className = 'hub-edit-handle';
    handle.textContent = '☰';
    handle.title = 'Drag to reorder';
    handle.addEventListener('pointerdown', (e) => startItemDrag(e, container, itemSelector, el));
    el.insertBefore(handle, el.firstChild);
  });
}

function clampNum(v: number, lo: number, hi: number): number {
  return Math.min(Math.max(v, lo), hi);
}

/** Parses a `grid-column`/`grid-row` value of the form "N / span M". */
function parseGridLine(value: string): { start: number; span: number } {
  const m = value.match(/(\d+)\s*\/\s*span\s*(\d+)/);
  return m ? { start: Number(m[1]), span: Number(m[2]) } : { start: 1, span: 1 };
}

/** A side rail a `.hub-grid-box` can be dropped into. */
function getRails(): Array<{ el: HTMLElement; side: 'left' | 'right' }> {
  const rails: Array<{ el: HTMLElement; side: 'left' | 'right' }> = [];
  const left = document.querySelector<HTMLElement>('.hub-rail--left');
  const right = document.querySelector<HTMLElement>('.hub-rail--right');
  if (left) rails.push({ el: left, side: 'left' });
  if (right) rails.push({ el: right, side: 'right' });
  return rails;
}

/** Which rail (if any) the pointer is currently over. */
function railAt(ev: PointerEvent, rails: Array<{ el: HTMLElement; side: 'left' | 'right' }>) {
  return rails.find(({ el }) => {
    const r = el.getBoundingClientRect();
    return ev.clientX >= r.left && ev.clientX <= r.right;
  });
}

/** Pointer-based move for a `.hub-grid-box`: drag anywhere in the
 * `.hub-sections` grid (row and column), or drag into the left nav rail
 * or right ad rail to drop the whole box there (a plain vertical stack,
 * not a grid — dropping clears grid-column/row and the resize handle
 * stops applying, since span math needs the grid). Dragging a rail-parked
 * box back over `.hub-sections` re-establishes a grid position from the
 * drop point. */
function startBoxDrag(e: PointerEvent, box: HTMLElement, container: HTMLElement): void {
  e.preventDefault();
  box.setPointerCapture(e.pointerId);
  box.classList.add('hub-edit-dragging');
  const startX = e.clientX;
  const startY = e.clientY;
  const startedInRail = box.dataset.hubRailSide as 'left' | 'right' | undefined;
  const colW = container.getBoundingClientRect().width / GRID_COLS;
  const { start: startCol, span: colSpan } = startedInRail
    ? { start: 1, span: 4 }
    : parseGridLine(box.style.gridColumn);
  const { start: startRow, span: rowSpan } = startedInRail
    ? { start: 1, span: 4 }
    : parseGridLine(box.style.gridRow);
  const rails = getRails();

  function onMove(ev: PointerEvent): void {
    const target = railAt(ev, rails);
    rails.forEach(({ el }) => el.classList.toggle('hub-edit-drop-target', el === target?.el));
    if (startedInRail || target) return;
    const dCol = Math.round((ev.clientX - startX) / colW);
    const dRow = Math.round((ev.clientY - startY) / GRID_ROW_UNIT_PX);
    const col = clampNum(startCol + dCol, 1, GRID_COLS - colSpan + 1);
    const row = clampNum(startRow + dRow, 1, GRID_MAX_ROWS - rowSpan + 1);
    box.style.gridColumn = `${col} / span ${colSpan}`;
    box.style.gridRow = `${row} / span ${rowSpan}`;
  }
  function onUp(ev: PointerEvent): void {
    box.classList.remove('hub-edit-dragging');
    rails.forEach(({ el }) => el.classList.remove('hub-edit-drop-target'));
    box.removeEventListener('pointermove', onMove);
    box.removeEventListener('pointerup', onUp);
    const target = railAt(ev, rails);
    if (target && target.side !== startedInRail) {
      box.style.removeProperty('grid-column');
      box.style.removeProperty('grid-row');
      box.classList.add('hub-grid-box--in-rail');
      box.dataset.hubRailSide = target.side;
      target.el.insertBefore(box, target.el.firstChild);
    } else if (!target && startedInRail) {
      box.classList.remove('hub-grid-box--in-rail');
      delete box.dataset.hubRailSide;
      const dCol = Math.round((ev.clientX - container.getBoundingClientRect().left) / colW) + 1;
      const dRow = Math.round((ev.clientY - container.getBoundingClientRect().top) / GRID_ROW_UNIT_PX) + 1;
      box.style.gridColumn = `${clampNum(dCol, 1, GRID_COLS - colSpan + 1)} / span ${colSpan}`;
      box.style.gridRow = `${clampNum(dRow, 1, GRID_MAX_ROWS - rowSpan + 1)} / span ${rowSpan}`;
      container.appendChild(box);
    }
  }
  box.addEventListener('pointermove', onMove);
  box.addEventListener('pointerup', onUp);
}

/** Pointer-based resize for a `.hub-grid-box`: drag the corner handle to
 * change how many grid columns/rows it spans. */
function startBoxResize(e: PointerEvent, box: HTMLElement, container: HTMLElement): void {
  e.preventDefault();
  e.stopPropagation();
  box.setPointerCapture(e.pointerId);
  const startX = e.clientX;
  const startY = e.clientY;
  const colW = container.getBoundingClientRect().width / GRID_COLS;
  const { start: col, span: startColSpan } = parseGridLine(box.style.gridColumn);
  const { start: row, span: startRowSpan } = parseGridLine(box.style.gridRow);

  function onMove(ev: PointerEvent): void {
    const dCol = Math.round((ev.clientX - startX) / colW);
    const dRow = Math.round((ev.clientY - startY) / GRID_ROW_UNIT_PX);
    const colSpan = clampNum(startColSpan + dCol, 1, GRID_COLS - col + 1);
    const rowSpan = clampNum(startRowSpan + dRow, 1, GRID_MAX_ROWS - row + 1);
    box.style.gridColumn = `${col} / span ${colSpan}`;
    box.style.gridRow = `${row} / span ${rowSpan}`;
  }
  function onUp(): void {
    box.removeEventListener('pointermove', onMove);
    box.removeEventListener('pointerup', onUp);
  }
  box.addEventListener('pointermove', onMove);
  box.addEventListener('pointerup', onUp);
}

/** Wires drag (move) + resize + delete on every `.hub-sections` grid box.
 * Reuses the same `data-hub-reorder-wired` bookkeeping as list-reorder
 * items so save-time cleanup (buildCleanInnerHtml) handles both uniformly. */
function wireGridBoxes(): void {
  const container = document.querySelector<HTMLElement>('.hub-sections');
  if (!container) return;
  container.querySelectorAll<HTMLElement>('.hub-grid-box').forEach((box) => {
    if (box.dataset.hubReorderWired === '1') return;
    box.dataset.hubReorderWired = '1';
    box.style.position = 'relative';

    const handle = document.createElement('span');
    handle.className = 'hub-edit-handle';
    handle.textContent = '☰';
    handle.title = 'Drag to move';
    handle.addEventListener('pointerdown', (e) => startBoxDrag(e, box, container));
    box.insertBefore(handle, box.firstChild);

    const resize = document.createElement('span');
    resize.className = 'hub-box-resize-handle';
    resize.title = 'Drag to resize';
    resize.addEventListener('pointerdown', (e) => startBoxResize(e, box, container));
    box.appendChild(resize);

    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'hub-edit-del';
    del.textContent = '×';
    del.title = 'Delete this block';
    del.addEventListener('click', (e) => {
      e.stopPropagation();
      box.remove();
    });
    box.appendChild(del);
  });
}

function setDisabled(el: HTMLElement, disabled: boolean): void {
  if (!('disabled' in el)) return;
  (el as HTMLButtonElement).disabled = disabled;
}

function addAffordances(): void {
  TEXT_SELECTORS.forEach((sel) => {
    document.querySelectorAll(sel).forEach((raw) => {
      const el = raw as HTMLElement;
      if ('disabled' in el && (el as HTMLButtonElement).disabled) {
        el.dataset.hubWasDisabled = '1';
        setDisabled(el, false);
      }
      el.contentEditable = 'true';
    });
  });
  REORDER_GROUPS.forEach(({ container, item }) => {
    const group = document.querySelector(container);
    if (!group) return;
    group.querySelectorAll(item).forEach((raw) => {
      const el = raw as HTMLElement;
      if (el.querySelector(':scope > .hub-edit-del')) return;
      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'hub-edit-del';
      del.textContent = '×';
      del.title = 'Delete this block';
      del.addEventListener('click', (e) => {
        e.stopPropagation();
        el.remove();
      });
      el.style.position = 'relative';
      el.appendChild(del);
    });
  });
}

function removeAffordances(): void {
  TEXT_SELECTORS.forEach((sel) => {
    document.querySelectorAll(sel).forEach((raw) => {
      const el = raw as HTMLElement;
      el.contentEditable = 'false';
      if (el.dataset.hubWasDisabled === '1') {
        setDisabled(el, true);
        delete el.dataset.hubWasDisabled;
      }
    });
  });
  document.querySelectorAll('.hub-edit-del').forEach((el) => el.remove());
  document.querySelectorAll('.hub-edit-handle').forEach((el) => el.remove());
  document.querySelectorAll('.hub-box-resize-handle').forEach((el) => el.remove());
  document.querySelectorAll('[data-hub-reorder-wired]').forEach((el) => {
    delete (el as HTMLElement).dataset.hubReorderWired;
  });
}

/** Swallows clicks/keys that would otherwise trigger the real page's own
 * handlers (nav links, board/mode selection, keyboard shortcuts) while
 * editing, so clicking or typing in a block never navigates away. */
function onCaptureClick(e: MouseEvent): void {
  if (!active) return;
  const target = e.target as HTMLElement;
  if (target.closest('.hub-edit-del') || target.closest('.hub-edit-handle')) return;
  const editable = target.closest(TEXT_SELECTORS.join(',')) as HTMLElement | null;
  if (editable) {
    e.preventDefault();
    e.stopImmediatePropagation();
    editable.focus();
  }
}

function onCaptureKeydown(e: KeyboardEvent): void {
  if (!active) return;
  const focused = document.activeElement as HTMLElement | null;
  if (focused && focused.isContentEditable) {
    e.stopPropagation();
  }
}

function exportLayout(): void {
  const result: Record<string, Array<{ order: number; text: string }>> = {};
  REORDER_GROUPS.forEach(({ container, item }) => {
    const group = document.querySelector(container);
    if (!group) return;
    result[container] = Array.from(group.querySelectorAll(item)).map((el, i) => ({
      order: i,
      text: (el.textContent || '').replace(/[×☰]/g, '').trim(),
    }));
  });
  const json = JSON.stringify(result, null, 2);
  // eslint-disable-next-line no-console
  console.log('[hub-edit] layout export:\n' + json);
  navigator.clipboard?.writeText(json).catch(() => {});
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'hub-layout-export.json';
  a.click();
  URL.revokeObjectURL(url);
}

/** Containers PlayHub.ts clears and regenerates from source data
 * (BoardCatalog / HUB_MODE_TILES) on every load — baking their current
 * runtime content into index.html would just leave stale, immediately-
 * overwritten markup. Reordering tiles inside these stays a live/export-only
 * feature; it does not persist via Save (the source data order would need
 * to change instead). */
const JS_REGENERATED_SELECTORS = ['#hub-board-grid', '#hub-mode-grid', '#hub-board-select'];

/** Clones #play-hub and strips everything that isn't a deliberate edit:
 * edit-mode-only additions (handles, delete buttons, contentEditable,
 * reorder bookkeeping attributes/inline position), each reorder group's
 * drag order baked into real DOM order, and JS-regenerated containers
 * reset to their empty shell so they don't get duplicated as stale HTML.
 * Returns only the inner content — the caller keeps index.html's own
 * `<div id="play-hub" ...>` opening tag untouched, so live runtime state
 * (theme preview vars, is-active classes) never leaks into the saved file. */
function buildCleanInnerHtml(): string {
  const live = document.getElementById('play-hub');
  if (!live) throw new Error('#play-hub not found');
  const clone = live.cloneNode(true) as HTMLElement;
  clone.querySelectorAll('.hub-edit-handle, .hub-edit-del, .hub-box-resize-handle').forEach((el) => el.remove());
  clone.querySelectorAll('[contenteditable]').forEach((el) => el.removeAttribute('contenteditable'));
  clone.querySelectorAll<HTMLElement>('[data-hub-was-disabled]').forEach((el) => {
    setDisabled(el, true);
    delete el.dataset.hubWasDisabled;
  });
  clone.querySelectorAll<HTMLElement>('[data-hub-reorder-wired]').forEach((el) => {
    delete el.dataset.hubReorderWired;
    el.style.removeProperty('position');
    if (!el.getAttribute('style')) el.removeAttribute('style');
  });
  REORDER_GROUPS.forEach(({ container, item }) => {
    const group = clone.querySelector(container);
    if (!group) return;
    const items = Array.from(group.querySelectorAll(item)) as HTMLElement[];
    items.sort((a, b) => Number(a.style.order || '0') - Number(b.style.order || '0'));
    items.forEach((el) => {
      el.style.removeProperty('order');
      if (!el.getAttribute('style')) el.removeAttribute('style');
      group.appendChild(el);
    });
  });
  JS_REGENERATED_SELECTORS.forEach((sel) => {
    const el = clone.querySelector(sel);
    if (el) el.innerHTML = '';
  });
  return clone.innerHTML;
}

async function saveToDisk(statusEl: HTMLElement): Promise<void> {
  statusEl.textContent = 'saving…';
  try {
    const html = buildCleanInnerHtml();
    const res = await fetch('/__hub-edit-save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ html }),
    });
    if (!res.ok) throw new Error(await res.text());
    statusEl.textContent = 'saved to index.html';
  } catch (err) {
    statusEl.textContent = 'save failed: ' + (err instanceof Error ? err.message : String(err));
  }
}

function buildToolbar(): HTMLElement {
  const bar = document.createElement('div');
  bar.id = 'hub-edit-toolbar';
  const msg = document.createElement('span');
  msg.textContent =
    'Edit mode: drag ☰ to move/reorder, drag the gold corner to resize, click text to edit, × to delete.';
  const status = document.createElement('span');
  status.id = 'hub-edit-save-status';
  const saveBtn = document.createElement('button');
  saveBtn.type = 'button';
  saveBtn.textContent = 'Save to index.html';
  saveBtn.addEventListener('click', () => saveToDisk(status));
  const exportBtn = document.createElement('button');
  exportBtn.type = 'button';
  exportBtn.textContent = 'Export layout';
  exportBtn.addEventListener('click', exportLayout);
  const exitBtn = document.createElement('button');
  exitBtn.type = 'button';
  exitBtn.textContent = 'Exit edit mode';
  exitBtn.addEventListener('click', () => setActive(false));
  bar.append(msg, saveBtn, status, exportBtn, exitBtn);
  document.body.appendChild(bar);
  return bar;
}

function setActive(next: boolean): void {
  active = next;
  document.body.classList.toggle('hub-edit-active', active);
  if (active) {
    if (!toolbar) toolbar = buildToolbar();
    toolbar.style.display = 'flex';
    REORDER_GROUPS.forEach(({ container, item }) => {
      const group = document.querySelector(container);
      if (group) wireReorder(group, item);
    });
    wireGridBoxes();
    addAffordances();
  } else {
    if (toolbar) toolbar.style.display = 'none';
    removeAffordances();
  }
}

export function initHubEditMode(): void {
  document.addEventListener('click', onCaptureClick, true);
  document.addEventListener('keydown', onCaptureKeydown, true);
  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.altKey && e.key.toLowerCase() === 'e') {
      setActive(!active);
    }
  });
  const toggleBtn = document.createElement('button');
  toggleBtn.id = 'hub-edit-toggle';
  toggleBtn.type = 'button';
  toggleBtn.textContent = 'Edit layout';
  toggleBtn.addEventListener('click', () => setActive(!active));
  document.body.appendChild(toggleBtn);
  if (new URLSearchParams(window.location.search).get('hubEdit') === '1') setActive(true);
}
