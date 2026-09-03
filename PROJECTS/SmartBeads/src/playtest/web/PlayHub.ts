import { listProductBoards, ProductBoardId } from '../../config/BoardCatalog';
import type { BoardCatalogEntry } from '../../config/BoardCatalog';

function hubBoardTitle(entry: BoardCatalogEntry): string {
  if (entry.id === '16') return '16 bead Classic';
  return `${entry.beadCount}-Bead`;
}

function hubBoardSizeLabel(entry: BoardCatalogEntry): string {
  if (entry.id === '16') return 'Board: 5*5';
  return `Board: ${entry.lattice.replace(/×/g, '*')}`;
}

function renderModePicker(boardId: ProductBoardId): string {
  const entry = listProductBoards().find((b) => b.id === boardId);
  const title = entry ? hubBoardTitle(entry) : boardId;
  return `
    <div class="hub-mode-picker-title">Play ${title}</div>
    <div class="hub-mode-actions">
      <button type="button" class="hub-mode-btn hub-mode-btn--ai" data-hub-action="pve" data-board-id="${boardId}">
        Human vs AI
      </button>
      <button type="button" class="hub-mode-btn hub-mode-btn--human" disabled title="Online — Phase 2">
        Human vs Human
      </button>
    </div>
  `;
}

export function bootstrapPlayHub(launchPve: (boardId: ProductBoardId) => void): void {
  const gridEl = document.getElementById('hub-board-grid');
  const pickerEl = document.getElementById('hub-mode-picker');
  const tutorialEl = document.getElementById('hub-tutorial-card');
  if (!gridEl || !pickerEl) return;

  function showModePicker(boardId: ProductBoardId): void {
    for (const card of gridEl.querySelectorAll<HTMLButtonElement>('.hub-board-card')) {
      card.classList.toggle('is-selected', card.dataset.boardId === boardId);
    }
    pickerEl.innerHTML = renderModePicker(boardId);
    pickerEl.classList.remove('is-hidden');
  }

  gridEl.innerHTML = '';
  for (const entry of listProductBoards()) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'hub-board-card';
    btn.dataset.boardId = entry.id;
    btn.innerHTML = `
      <div class="hub-card-name">${hubBoardTitle(entry)}</div>
      <div class="hub-card-size">${hubBoardSizeLabel(entry)}</div>
    `;
    btn.addEventListener('click', () => showModePicker(entry.id));
    gridEl.appendChild(btn);
  }

  tutorialEl?.addEventListener('click', () => {
    for (const card of gridEl.querySelectorAll('.hub-board-card')) {
      card.classList.remove('is-selected');
    }
    pickerEl.innerHTML = `
      <div class="hub-mode-picker-title">Tutorial · 6-bead board</div>
      <p class="hub-card-size" style="margin-top:8px;color:var(--text);">Slide, capture, chains, centre, and timers — interactive lesson coming in the next phase.</p>
    `;
    pickerEl.classList.remove('is-hidden');
  });

  for (const link of document.querySelectorAll<HTMLButtonElement>('.hub-sidebar-link')) {
    link.addEventListener('click', () => {
      const label = link.dataset.hubNav ?? link.textContent ?? 'Section';
      pickerEl.innerHTML = `<div class="hub-mode-picker-title">${label}</div><p class="hub-card-size" style="margin-top:8px;color:var(--text);">Coming soon.</p>`;
      pickerEl.classList.remove('is-hidden');
    });
  }

  pickerEl.addEventListener('click', (event) => {
    const target = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-hub-action="pve"]');
    if (!target?.dataset.boardId) return;
    launchPve(target.dataset.boardId as ProductBoardId);
  });

  pickerEl.classList.add('is-hidden');
}
