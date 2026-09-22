import { DEFAULT_PRODUCT_BOARD, listProductBoards } from '../../../config/BoardCatalog';
import { BGM_TRACKS } from '../feature/GameFeatureSettings';

export function populateBoardSelect(select: HTMLSelectElement): void {
  select.innerHTML = '';
  for (const entry of listProductBoards()) {
    const opt = document.createElement('option');
    opt.value = entry.id;
    opt.textContent = entry.displayName;
    select.appendChild(opt);
  }
  select.value = DEFAULT_PRODUCT_BOARD;
}

export function populateBgmSelect(select: HTMLSelectElement): void {
  select.innerHTML = '<option value="">— Select Music —</option>';
  for (const track of BGM_TRACKS) {
    const opt = document.createElement('option');
    opt.value = track.url;
    opt.textContent = track.label;
    select.appendChild(opt);
  }
}
