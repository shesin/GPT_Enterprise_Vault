/**
 * @jest-environment jsdom
 */
import { bootstrapPlayHub, HUB_MODE_HELP_ALL } from '../PlayHub';
import { DEFAULT_PRODUCT_BOARD, listProductBoards } from '../../../config/BoardCatalog';

function mountHub(): void {
  document.body.innerHTML = `
    <div id="play-hub">
      <select id="hub-board-select"></select>
      <select id="hub-mode-select"><option value="pve"></option><option value="pvp"></option><option value="spectate"></option></select>
      <div id="hub-board-grid"></div>
      <div id="hub-mode-grid"></div>
      <button id="hub-lesson-basic" type="button">Lesson</button>
      <button id="hub-mode-help-btn" type="button" aria-expanded="false">?</button>
      <p id="hub-mode-help-text" hidden></p>
      <p id="hub-current-board"></p>
      <div id="hub-rail-notice" class="is-hidden"><span id="hub-rail-notice-text"></span><button id="hub-rail-notice-dismiss" type="button">x</button></div>
      <button class="hub-sidebar-link" data-hub-nav="community" type="button">Community</button>
    </div>`;
}

const tiles = () => Array.from(document.querySelectorAll<HTMLButtonElement>('.hub-board-tile'));
const modeTile = (v: string) =>
  document.querySelector<HTMLButtonElement>(`.hub-mode-tile[data-hub-mode="${v}"]`)!;

describe('PlayHub (W8, jsdom)', () => {
  let enterPlay: jest.Mock;

  beforeEach(() => {
    mountHub();
    enterPlay = jest.fn();
    bootstrapPlayHub(enterPlay);
  });

  it('shows one tile per product board with the default board selected and named above the Play buttons', () => {
    const boards = listProductBoards();
    expect(tiles()).toHaveLength(boards.length);
    const selected = tiles().filter((t) => t.classList.contains('is-selected'));
    expect(selected).toHaveLength(1);
    expect(selected[0]!.dataset.boardId).toBe(DEFAULT_PRODUCT_BOARD);
    const name = boards.find((b) => b.id === DEFAULT_PRODUCT_BOARD)!.displayName;
    expect(document.getElementById('hub-current-board')!.textContent).toBe(`Board: ${name}`);
  });

  it('every board tile has an accessible name', () => {
    for (const t of tiles()) expect(t.getAttribute('aria-label')).toBeTruthy();
  });

  it('clicking another board selects it and Play launches on that board', () => {
    const other = tiles().find((t) => t.dataset.boardId !== DEFAULT_PRODUCT_BOARD)!;
    other.click();
    expect(other.getAttribute('aria-selected')).toBe('true');
    expect(tiles().filter((t) => t.classList.contains('is-selected'))).toHaveLength(1);
    expect((document.getElementById('hub-board-select') as HTMLSelectElement).value).toBe(
      other.dataset.boardId,
    );
    modeTile('pve').click();
    expect(enterPlay).toHaveBeenCalledWith(other.dataset.boardId, 'pve', 'play');
  });

  it('mode tiles launch the right engine mode and action', () => {
    modeTile('pve').click();
    modeTile('pvp').click();
    modeTile('spectate').click();
    expect(enterPlay).toHaveBeenNthCalledWith(1, DEFAULT_PRODUCT_BOARD, 'pve', 'play');
    expect(enterPlay).toHaveBeenNthCalledWith(2, DEFAULT_PRODUCT_BOARD, 'pvp', 'play');
    expect(enterPlay).toHaveBeenNthCalledWith(3, DEFAULT_PRODUCT_BOARD, 'spectate', 'spectate');
  });

  it('the online tile opens the online lobby (with the selected board) and does not start a local game', () => {
    document.body.innerHTML = '';
    mountHub();
    const openLobby = jest.fn();
    const launch = jest.fn();
    bootstrapPlayHub(launch, openLobby);
    const online = modeTile('pvp-online');
    expect(online.disabled).toBe(false);
    online.click();
    expect(openLobby).toHaveBeenCalledWith(DEFAULT_PRODUCT_BOARD);
    expect(launch).not.toHaveBeenCalled();
  });

  it('the lesson button starts the coach lesson against the AI', () => {
    document.getElementById('hub-lesson-basic')!.click();
    expect(enterPlay).toHaveBeenCalledWith(DEFAULT_PRODUCT_BOARD, 'pve', 'coach');
  });

  it('the help button toggles the mode help text and aria-expanded', () => {
    const btn = document.getElementById('hub-mode-help-btn')!;
    const text = document.getElementById('hub-mode-help-text') as HTMLParagraphElement;
    expect(text.textContent).toBe(HUB_MODE_HELP_ALL);
    expect(text.hidden).toBe(true);
    btn.click();
    expect(text.hidden).toBe(false);
    expect(btn.getAttribute('aria-expanded')).toBe('true');
    btn.click();
    expect(text.hidden).toBe(true);
    expect(btn.getAttribute('aria-expanded')).toBe('false');
  });

  it('"coming soon" side links show a notice that can be dismissed', () => {
    const notice = document.getElementById('hub-rail-notice')!;
    document.querySelector<HTMLButtonElement>('[data-hub-nav="community"]')!.click();
    expect(notice.classList.contains('is-hidden')).toBe(false);
    expect(document.getElementById('hub-rail-notice-text')!.textContent).toContain('Community');
    document.getElementById('hub-rail-notice-dismiss')!.click();
    expect(notice.classList.contains('is-hidden')).toBe(true);
  });
});
