/**
 * Browser side of online play (A9/A4): talks to the game server over a WebSocket and falls back to polling
 * when the host cannot keep WebSocket connections open. The server is the only authority; this class only
 * sends intents and reports the latest RoomView.
 */
import type { Intent, RoomSettings, RoomView, ServerMessage } from '../../../../server/protocol';
import type { Player } from '../../../models/GameState';
import type { ProductBoardId } from '../../../config/BoardCatalog';

export type OnlineStatus = 'idle' | 'connecting' | 'live' | 'polling' | 'closed';

export interface OnlineSession {
  code: string;
  token: string;
  seat: Player;
  boardId: ProductBoardId;
  settings: RoomSettings;
}

/** The slice of the WebSocket API this class uses (the browser one and the `ws` package both fit). */
export interface SocketLike {
  readyState: number;
  send(data: string): void;
  close(): void;
  onopen: ((ev: unknown) => void) | null;
  onmessage: ((ev: { data: unknown }) => void) | null;
  onclose: ((ev: unknown) => void) | null;
  onerror: ((ev: unknown) => void) | null;
}

export interface OnlineClientOptions {
  /** '' = same origin (production and the Vite dev proxy). Tests pass the server address. */
  baseUrl?: string;
  fetchFn?: typeof fetch;
  createSocket?: (url: string) => SocketLike;
  pollMs?: number;
  /** How long to wait for the WebSocket to open before polling instead. */
  socketTimeoutMs?: number;
}

type CreateResult = { session: OnlineSession } | { error: string };

const OPEN = 1;

function sessionFrom(json: Record<string, unknown>): OnlineSession {
  return {
    code: String(json.code),
    token: String(json.token),
    seat: json.seat as Player,
    boardId: json.boardId as ProductBoardId,
    settings: json.settings as RoomSettings,
  };
}

export class OnlineClient {
  onView: (view: RoomView) => void = () => {};
  onError: (message: string) => void = () => {};
  onStatus: (status: OnlineStatus) => void = () => {};

  private session: OnlineSession | null = null;
  private socket: SocketLike | null = null;
  private status: OnlineStatus = 'idle';
  private pollTimer: ReturnType<typeof setTimeout> | null = null;
  private socketTimer: ReturnType<typeof setTimeout> | null = null;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private lastVersion = 0;
  private retries = 0;
  private closed = false;
  private readonly base: string;
  private readonly fetchFn: typeof fetch;
  private readonly createSocket: ((url: string) => SocketLike) | undefined;
  private readonly pollMs: number;
  private readonly socketTimeoutMs: number;

  constructor(opts: OnlineClientOptions = {}) {
    this.base = opts.baseUrl ?? '';
    this.fetchFn = opts.fetchFn ?? ((...a) => fetch(...a));
    this.createSocket = opts.createSocket;
    this.pollMs = opts.pollMs ?? 1000;
    this.socketTimeoutMs = opts.socketTimeoutMs ?? 4000;
  }

  getSession(): OnlineSession | null {
    return this.session;
  }

  getStatus(): OnlineStatus {
    return this.status;
  }

  private setStatus(s: OnlineStatus): void {
    if (this.status === s) return;
    this.status = s;
    this.onStatus(s);
  }

  private async postJson(
    path: string,
    body: unknown,
  ): Promise<{ ok: boolean; json: Record<string, unknown> }> {
    try {
      const r = await this.fetchFn(this.base + path, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = (await r.json().catch(() => ({}))) as Record<string, unknown>;
      return { ok: r.ok, json };
    } catch {
      return { ok: false, json: { error: 'Cannot reach the game server.' } };
    }
  }

  async createRoom(boardId: string, settings?: Partial<RoomSettings>): Promise<CreateResult> {
    const r = await this.postJson('/api/rooms', { boardId, settings });
    if (!r.ok) return { error: String(r.json.error ?? 'Could not create the room.') };
    this.session = sessionFrom(r.json);
    return { session: this.session };
  }

  async joinRoom(code: string): Promise<CreateResult> {
    const clean = code.trim().toUpperCase();
    const r = await this.postJson(`/api/rooms/${encodeURIComponent(clean)}/join`, {});
    if (!r.ok) return { error: String(r.json.error ?? 'Could not join the room.') };
    this.session = sessionFrom(r.json);
    return { session: this.session };
  }

  /** Re-attach to a room after a page reload (the secret token is kept in sessionStorage by the caller). */
  resume(session: OnlineSession): void {
    this.session = session;
  }

  /** Start receiving state: WebSocket first, polling if it cannot open. */
  connect(): void {
    if (!this.session) throw new Error('No room: create or join one first.');
    this.closed = false;
    this.setStatus('connecting');
    this.openSocket();
  }

  private openSocket(): void {
    const s = this.session;
    if (!s || this.closed) return;
    if (!this.createSocket) return this.startPolling();
    const wsBase = this.base.replace(/^http/, 'ws');
    const url = `${wsBase}/ws?code=${encodeURIComponent(s.code)}&token=${encodeURIComponent(s.token)}`;
    let socket: SocketLike;
    try {
      socket = this.createSocket(url);
    } catch {
      return this.startPolling();
    }
    this.socket = socket;
    this.socketTimer = setTimeout(() => {
      if (this.socket === socket && socket.readyState !== OPEN) {
        socket.onclose = null;
        socket.close();
        this.socket = null;
        this.startPolling();
      }
    }, this.socketTimeoutMs);
    socket.onopen = () => {
      if (this.socketTimer) clearTimeout(this.socketTimer);
      this.retries = 0;
      this.stopPolling();
      this.setStatus('live');
    };
    socket.onmessage = (ev) => this.handleMessage(String(ev.data));
    socket.onerror = () => {};
    socket.onclose = () => {
      if (this.socketTimer) clearTimeout(this.socketTimer);
      if (this.socket === socket) this.socket = null;
      if (this.closed) return;
      // Dropped connection: poll right away so nothing is missed, and try the socket again shortly.
      this.startPolling();
      if (this.retries < 3) {
        this.retries += 1;
        this.retryTimer = setTimeout(() => this.openSocket(), 2000);
      }
    };
  }

  private handleMessage(raw: string): void {
    let msg: ServerMessage;
    try {
      msg = JSON.parse(raw) as ServerMessage;
    } catch {
      return;
    }
    if (msg.type === 'state') this.deliver(msg.view);
    else if (msg.type === 'error') this.onError(msg.message);
  }

  private deliver(view: RoomView): void {
    if (view.version <= this.lastVersion && view.version !== 0) return;
    this.lastVersion = view.version;
    this.onView(view);
  }

  private startPolling(): void {
    if (this.closed || this.pollTimer) return;
    this.setStatus('polling');
    const tick = async (): Promise<void> => {
      this.pollTimer = null;
      if (this.closed || !this.session) return;
      if (this.getStatus() === 'live') return;
      await this.pollOnce();
      if (!this.closed && this.getStatus() !== 'live')
        this.pollTimer = setTimeout(() => void tick(), this.pollMs);
    };
    void tick();
  }

  private stopPolling(): void {
    if (this.pollTimer) clearTimeout(this.pollTimer);
    this.pollTimer = null;
  }

  private async pollOnce(): Promise<void> {
    const s = this.session;
    if (!s) return;
    try {
      const url = `${this.base}/api/rooms/${encodeURIComponent(s.code)}/state?token=${encodeURIComponent(
        s.token,
      )}&since=${this.lastVersion}`;
      const r = await this.fetchFn(url);
      if (r.status === 204) return;
      if (r.status === 403 || r.status === 404) {
        this.onError('This game is no longer available.');
        this.close();
        return;
      }
      if (r.ok) this.deliver((await r.json()) as RoomView);
    } catch {
      /* temporary network trouble: the next poll tries again */
    }
  }

  /** Send a move / resign / answer. Resolves with an error message when the server refused it. */
  async sendIntent(intent: Intent): Promise<{ ok: true } | { error: string }> {
    const s = this.session;
    if (!s) return { error: 'No room.' };
    if (this.socket && this.socket.readyState === OPEN) {
      this.socket.send(JSON.stringify({ type: 'intent', intent }));
      return { ok: true }; // the server answers with the new state, or with an error message
    }
    const r = await this.postJson(`/api/rooms/${encodeURIComponent(s.code)}/action`, {
      token: s.token,
      intent,
    });
    if (!r.ok) return { error: String(r.json.error ?? 'The server refused that.') };
    void this.pollOnce();
    return { ok: true };
  }

  close(): void {
    this.closed = true;
    this.stopPolling();
    for (const t of [this.socketTimer, this.retryTimer]) if (t) clearTimeout(t);
    if (this.socket) {
      this.socket.onclose = null;
      this.socket.close();
      this.socket = null;
    }
    this.setStatus('closed');
  }
}
