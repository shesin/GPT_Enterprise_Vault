/** The hub dialog where a player starts an online room or joins a friend by code (A4). */
import { getCatalogEntry, getPlayConfig, type ProductBoardId } from '../../../config/BoardCatalog';
import {
  formatShotClockOptionLabel,
  formatTimerOptionLabel,
  type ShotClockSeconds,
  type TimerMinutes,
} from '../feature/GameFeatureSettings';
import { ONLINE_BOARDS, type RoomSettings } from '../../../../server/protocol';
import { installModalFocus } from '../layout/modalFocus';
import { OnlineClient, type OnlineSession, type SocketLike } from './OnlineClient';

export interface OnlineGame {
  client: OnlineClient;
  session: OnlineSession;
}

/** Real browser client: same-origin API, WebSocket when the host allows it. */
export function createBrowserOnlineClient(): OnlineClient {
  return new OnlineClient({
    baseUrl: '',
    createSocket: (url) => {
      const full = url.startsWith('ws')
        ? url
        : `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}${url}`;
      return new WebSocket(full) as unknown as SocketLike;
    },
  });
}

export function wireOnlineLobby(onEnter: (game: OnlineGame) => void): {
  open: (preferBoard?: ProductBoardId) => void;
} {
  const modal = document.getElementById('online-lobby') as HTMLDivElement | null;
  const boardSel = document.getElementById('online-board-select') as HTMLSelectElement | null;
  const timerSel = document.getElementById('online-timer-select') as HTMLSelectElement | null;
  const shotSel = document.getElementById('online-shot-select') as HTMLSelectElement | null;
  const createBtn = document.getElementById('online-create-btn') as HTMLButtonElement | null;
  const joinBtn = document.getElementById('online-join-btn') as HTMLButtonElement | null;
  const cancelBtn = document.getElementById('online-cancel-btn') as HTMLButtonElement | null;
  const codeInput = document.getElementById('online-code-input') as HTMLInputElement | null;
  const errorEl = document.getElementById('online-lobby-error');
  if (
    !modal ||
    !boardSel ||
    !timerSel ||
    !shotSel ||
    !createBtn ||
    !joinBtn ||
    !cancelBtn ||
    !codeInput ||
    !errorEl
  ) {
    return { open: () => {} };
  }

  function option(value: string, label: string): HTMLOptionElement {
    const o = document.createElement('option');
    o.value = value;
    o.textContent = label;
    return o;
  }

  function fillBoards(): void {
    boardSel!.innerHTML = '';
    for (const id of ONLINE_BOARDS)
      boardSel!.appendChild(option(id, getCatalogEntry(id)?.displayName ?? id));
  }

  function fillClocks(): void {
    const id = boardSel!.value as ProductBoardId;
    const play = getPlayConfig(id);
    const prevTimer = timerSel!.value;
    const prevShot = shotSel!.value;
    timerSel!.innerHTML = '';
    for (const t of play.timerOptions)
      timerSel!.appendChild(option(t, formatTimerOptionLabel(t, play.timerBest)));
    shotSel!.innerHTML = '';
    for (const s of play.shotClockOptions)
      shotSel!.appendChild(option(s, formatShotClockOptionLabel(s, play.shotClockBest)));
    timerSel!.value = play.timerOptions.includes(prevTimer as TimerMinutes)
      ? prevTimer
      : play.defaultSettings.timer;
    shotSel!.value = play.shotClockOptions.includes(prevShot as ShotClockSeconds)
      ? prevShot
      : play.defaultSettings.shotClock;
  }

  function setError(message: string): void {
    errorEl!.textContent = message;
  }

  function setBusy(busy: boolean): void {
    createBtn!.disabled = busy;
    joinBtn!.disabled = busy;
  }

  function close(): void {
    modal!.style.display = 'none';
    setError('');
  }

  async function finish(
    client: OnlineClient,
    result: Awaited<ReturnType<OnlineClient['createRoom']>>,
  ): Promise<void> {
    setBusy(false);
    if ('error' in result) {
      setError(result.error);
      return;
    }
    close();
    onEnter({ client, session: result.session });
  }

  boardSel.addEventListener('change', fillClocks);
  cancelBtn.addEventListener('click', close);
  installModalFocus(modal, { onEscape: close });

  createBtn.addEventListener('click', async () => {
    setError('');
    setBusy(true);
    const client = createBrowserOnlineClient();
    const settings: Partial<RoomSettings> = {
      timer: timerSel.value as TimerMinutes,
      shotClock: shotSel.value as ShotClockSeconds,
    };
    await finish(client, await client.createRoom(boardSel.value, settings));
  });

  const doJoin = async (): Promise<void> => {
    const code = codeInput.value.trim();
    if (code.length < 5) {
      setError('Type the 5-letter room code your friend gave you.');
      return;
    }
    setError('');
    setBusy(true);
    const client = createBrowserOnlineClient();
    await finish(client, await client.joinRoom(code));
  };
  joinBtn.addEventListener('click', () => void doJoin());
  codeInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') void doJoin();
  });

  fillBoards();
  fillClocks();

  return {
    open(preferBoard) {
      if (preferBoard && (ONLINE_BOARDS as readonly string[]).includes(preferBoard)) {
        boardSel.value = preferBoard;
        fillClocks();
      }
      setError('');
      setBusy(false);
      modal.style.display = 'flex';
      codeInput.focus();
    },
  };
}
