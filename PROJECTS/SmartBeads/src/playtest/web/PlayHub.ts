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

function renderCoachPicker(): string {
  return `
    <div class="hub-mode-picker-title">Coach · Video 1 · 7-bead</div>
    <p class="hub-coach-blurb">~2 min watch-only lesson: 3 moves, 3 captures, double chain, triple chain. Chains can run four, five, or more beads. Amber highlights show legal moves.</p>
    <div class="hub-mode-actions">
      <button type="button" class="hub-mode-btn hub-mode-btn--coach" data-hub-action="coach">
        Start Coach
      </button>
    </div>
  `;
}

export function bootstrapPlayHub(
  launchPve: (boardId: ProductBoardId) => void,
  launchCoach?: () => void,
): void {
  const gridEl = document.getElementById('hub-board-grid');
  const pickerEl = document.getElementById('hub-mode-picker');
  const coachCardEl = document.getElementById('hub-coach-card');
  if (!gridEl || !pickerEl) return;

  function clearBoardSelection(): void {
    for (const card of gridEl.querySelectorAll('.hub-board-card')) {
      card.classList.remove('is-selected');
    }
  }

  function showModePicker(boardId: ProductBoardId): void {
    clearBoardSelection();
    for (const card of gridEl.querySelectorAll<HTMLButtonElement>('.hub-board-card')) {
      card.classList.toggle('is-selected', card.dataset.boardId === boardId);
    }
    pickerEl.innerHTML = renderModePicker(boardId);
    pickerEl.classList.remove('is-hidden');
  }

  function showCoachPicker(): void {
    clearBoardSelection();
    pickerEl.innerHTML = renderCoachPicker();
    pickerEl.classList.remove('is-hidden');
    pickerEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
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

  coachCardEl?.addEventListener('click', () => showCoachPicker());

  for (const link of document.querySelectorAll<HTMLButtonElement>('.hub-sidebar-link')) {
    link.addEventListener('click', () => {
      const nav = link.dataset.hubNav ?? link.textContent ?? 'Section';
      if (nav === 'coach') {
        showCoachPicker();
        return;
      }
      clearBoardSelection();
      pickerEl.innerHTML = `<div class="hub-mode-picker-title">${nav}</div><p class="hub-coach-blurb">Coming soon.</p>`;
      pickerEl.classList.remove('is-hidden');
    });
  }

  pickerEl.addEventListener('click', (event) => {
    const target = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-hub-action]');
    if (!target) return;
    const action = target.dataset.hubAction;
    if (action === 'coach') {
      launchCoach?.();
      return;
    }
    if (action === 'pve' && target.dataset.boardId) {
      launchPve(target.dataset.boardId as ProductBoardId);
    }
  });

  pickerEl.classList.add('is-hidden');

  const coachParam = new URLSearchParams(window.location.search).get('coach');
  if (coachParam === '1' || coachParam === 'start') {
    showCoachPicker();
  }
}
