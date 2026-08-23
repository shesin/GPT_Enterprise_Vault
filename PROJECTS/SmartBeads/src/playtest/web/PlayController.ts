import {
  DEFAULT_PRODUCT_BOARD,
  getCatalogEntry,
  getPlayConfig,
  listProductBoards,
  ProductBoardId,
  resolveEngineVariant,
} from '../../config/BoardCatalog';
import { cloneBoardDefinition, findJumpPath, Move, Player } from '../../models/GameState';
import { formatCenterDisplay } from './feature/centerScoring';
import {
  AiLevel,
  BGM_TRACKS,
  CenterRule,
  formatCenterRuleLabel,
  formatMatchTimerLabel,
  formatShotClockLabel,
  GameFeatureSettings,
  MatchTimerMinutes,
  parseMatchSeconds,
  ShotClockSeconds,
} from './feature/GameFeatureSettings';
import { applyAiHops, AiHopRecord } from './feature/aiTurnPath';
import { FeatureSession, SessionSnapshot } from './feature/FeatureSession';
import { selectAiTurnPath, shouldAcceptResignationDraw } from './feature/HonestAi';
import { AI_REPLY_DELAY_MS, AI_THINK_BUDGET_MS, HUMAN_JUMP_ANIM_MS, HUMAN_SLIDE_ANIM_MS } from './feature/pveTiming';
import { getBoardCanvasSize } from './layout/boardVisualProfile';
import { fitCanvasToFrame, installCanvasResizeObserver } from './layout/canvasDisplay';
import {
  BoardAnimState,
  drawCanvasBoard,
  hitTestNode,
} from './render/CanvasBoardRenderer';

function fmtClock(sec: number): string {
  const clamped = sec < 0 ? 0 : sec;
  const m = Math.floor(clamped / 60).toString().padStart(2, '0');
  const s = (clamped % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function winnerLabel(winner: Player | 'DRAW' | undefined): string {
  if (winner === 'RED') return 'Ivory wins';
  if (winner === 'BLUE') return 'Ebony wins';
  return 'Draw';
}

function playerDisplayName(player: Player): string {
  return player === 'RED' ? 'Ivory (P1)' : 'Ebony (P2)';
}

/** After a hop lands, the live AI loop continues only while a chain is still open. */
export function shouldContinueAiTurn(chainPieceId: number | null, hopsRemaining: number): boolean {
  return chainPieceId !== null && hopsRemaining > 0;
}

/**
 * Capture optionality: AI may stop while follow-up jumps still exist.
 * Humans click Finish; AI has no Finish button, so the sequencer must end the turn.
 * Leaving the chain open keeps currentPlayer = BLUE and the shell sticks on “AI is thinking…”.
 */
export function completeAiTurnIfChainOpen(session: FeatureSession): void {
  if (!session.isGameOver() && session.getEngine().getChainPieceId() !== null) {
    session.finishChain();
  }
}

/**
 * Choose an AI path without throwing: Medium/Hard with a think budget, then Easy, then first legal hop.
 */
export function planAiTurnPath(session: FeatureSession): Move[] | null {
  const settings = session.getSettings();
  const aiPlayer = session.getAiPlayer();
  const variant = session.getBoardVariant();
  const snap = session.getEngine().exportSnapshot();
  try {
    const planned = selectAiTurnPath(variant, settings.aiLevel, snap, aiPlayer, AI_THINK_BUDGET_MS);
    if (planned?.length) return planned;
  } catch {
    /* Easy fallback below */
  }
  try {
    const easy = selectAiTurnPath(variant, 1, snap, aiPlayer, 200);
    if (easy?.length) return easy;
  } catch {
    /* first legal hop below */
  }
  const legal = session.getEngine().getLegalMoves();
  return legal.length ? [legal[0]] : null;
}

/**
 * Live AI turn sequencer (same continue/stop as the play-shell hop loop).
 * Animation is not used — engine rules must hold with the renderer unplugged.
 * Pass `path` to inject hops (leftover/stale cases). Omit it to use planAiTurnPath.
 */
export function runAiTurn(session: FeatureSession, path?: Move[] | null): AiHopRecord[] {
  const settings = session.getSettings();
  const aiPlayer = session.getAiPlayer();
  if (session.isGameOver() || settings.mode !== 'pve' || session.getEngine().getState().currentPlayer !== aiPlayer) {
    throw new Error('stale hop: AI turn is not live');
  }

  const planned = path === undefined
    ? planAiTurnPath(session)
    : path;

  if (!planned?.length) {
    if (path === undefined) {
      session.endGameByFeature('RED', 'AI has no legal moves.');
      return [];
    }
    throw new Error('stale hop: empty leftover path');
  }

  const records: AiHopRecord[] = [];
  for (let i = 0; i < planned.length; i++) {
    if (i > 0 && !shouldContinueAiTurn(session.getEngine().getChainPieceId(), planned.length - i)) {
      break;
    }
    const hopRecords = applyAiHops(session, [planned[i]], aiPlayer);
    records.push({ ...hopRecords[0], index: i });
    if (!shouldContinueAiTurn(session.getEngine().getChainPieceId(), planned.length - (i + 1))) {
      break;
    }
  }
  completeAiTurnIfChainOpen(session);
  return records;
}

export function bootstrapPlayShell(): void {
  let currentBoardId: ProductBoardId = DEFAULT_PRODUCT_BOARD;

  function createSession(boardId: ProductBoardId, settings?: GameFeatureSettings): FeatureSession {
    const play = getPlayConfig(boardId);
    return new FeatureSession(
      resolveEngineVariant(boardId),
      settings ?? { ...play.defaultSettings },
    );
  }

  let session = createSession(currentBoardId);
  let anim: BoardAnimState | null = null;
  let animating = false;
  let aiThinking = false;
  let turnPulse = 0;
  let timerId: ReturnType<typeof setInterval> | null = null;
  let pulseRaf = 0;
  let animRaf = 0;
  let aiRunId = 0;
  const undoStack: SessionSnapshot[] = [];
  let pendingResignPlayer: Player | null = null;

  const canvas = document.getElementById('board') as HTMLCanvasElement;
  const finishBtn = document.getElementById('finish-btn') as HTMLButtonElement;
  const resignBtn = document.getElementById('resign-btn') as HTMLButtonElement;
  const undoBtn = document.getElementById('undo-btn') as HTMLButtonElement;
  const restartBtn = document.getElementById('restart-btn') as HTMLButtonElement;
  const playAgainBtn = document.getElementById('play-again-btn') as HTMLButtonElement;
  const resultModal = document.getElementById('result-modal') as HTMLDivElement;
  const resignOfferModal = document.getElementById('resign-offer-modal') as HTMLDivElement;
  const resignOfferDesc = document.getElementById('resign-offer-desc') as HTMLParagraphElement;
  const resignAgreeBtn = document.getElementById('resign-agree-btn') as HTMLButtonElement;
  const resignDeclineBtn = document.getElementById('resign-decline-btn') as HTMLButtonElement;
  const resultTitle = document.getElementById('result-title') as HTMLHeadingElement;
  const resultDesc = document.getElementById('result-desc') as HTMLParagraphElement;
  const statusEl = document.getElementById('status') as HTMLDivElement | null;

  const boardSelect = document.getElementById('board-select') as HTMLSelectElement;
  const gameModeSelect = document.getElementById('game-mode-select') as HTMLSelectElement;
  const aiLevelSelect = document.getElementById('ai-level-select') as HTMLSelectElement;
  const matchTimerSelect = document.getElementById('match-timer-select') as HTMLSelectElement;
  const shotClockSelect = document.getElementById('shot-clock-select') as HTMLSelectElement;
  const centerRuleSelect = document.getElementById('center-rule-select') as HTMLSelectElement;
  const aiLevelContainer = document.getElementById('ai-level-container') as HTMLDivElement;

  const bgmAudio = document.getElementById('bgm-audio') as HTMLAudioElement;
  const bgmSelect = document.getElementById('bgm-select') as HTMLSelectElement;
  const bgmVol = document.getElementById('bgm-vol') as HTMLInputElement;
  const bgmPlay = document.getElementById('bgm-play') as HTMLButtonElement;
  const bgmPause = document.getElementById('bgm-pause') as HTMLButtonElement;

  populateBgmSelect(bgmSelect);
  populateBoardSelect(boardSelect);

  function readSettings(): GameFeatureSettings {
    return {
      mode: gameModeSelect.value as GameFeatureSettings['mode'],
      aiLevel: parseInt(aiLevelSelect.value, 10) as AiLevel,
      matchTimer: matchTimerSelect.value as GameFeatureSettings['matchTimer'],
      shotClock: shotClockSelect.value as GameFeatureSettings['shotClock'],
      centerRule: centerRuleSelect.value as GameFeatureSettings['centerRule'],
    };
  }

  function applyBoardDefaults(boardId: ProductBoardId): void {
    const defaults = getPlayConfig(boardId).defaultSettings;
    centerRuleSelect.value = defaults.centerRule;
    matchTimerSelect.value = defaults.matchTimer;
    shotClockSelect.value = defaults.shotClock;
  }

  function syncCenterRuleOptions(): void {
    const options = getPlayConfig(currentBoardId).centerRuleOptions;
    const current = centerRuleSelect.value as CenterRule;
    centerRuleSelect.innerHTML = '';
    for (const rule of options) {
      const opt = document.createElement('option');
      opt.value = rule;
      opt.textContent = formatCenterRuleLabel(rule);
      centerRuleSelect.appendChild(opt);
    }
    if (options.includes(current)) {
      centerRuleSelect.value = current;
    } else {
      centerRuleSelect.value = getPlayConfig(currentBoardId).defaultSettings.centerRule;
    }
  }

  function syncMatchTimerOptions(): void {
    const options = getPlayConfig(currentBoardId).matchTimerOptions;
    const current = matchTimerSelect.value as MatchTimerMinutes;
    matchTimerSelect.innerHTML = '';
    for (const value of options) {
      const opt = document.createElement('option');
      opt.value = value;
      opt.textContent = formatMatchTimerLabel(value);
      matchTimerSelect.appendChild(opt);
    }
    if (options.includes(current)) {
      matchTimerSelect.value = current;
    } else {
      matchTimerSelect.value = getPlayConfig(currentBoardId).defaultSettings.matchTimer;
    }
  }

  function syncShotClockOptions(): void {
    const options = getPlayConfig(currentBoardId).shotClockOptions;
    const current = shotClockSelect.value as ShotClockSeconds;
    shotClockSelect.innerHTML = '';
    for (const value of options) {
      const opt = document.createElement('option');
      opt.value = value;
      opt.textContent = formatShotClockLabel(value);
      shotClockSelect.appendChild(opt);
    }
    if (options.includes(current)) {
      shotClockSelect.value = current;
    } else {
      shotClockSelect.value = getPlayConfig(currentBoardId).defaultSettings.shotClock;
    }
  }

  function syncBoardPlayOptions(): void {
    syncCenterRuleOptions();
    syncMatchTimerOptions();
    syncShotClockOptions();
  }

  function syncBoardTitle(): void {
    const entry = getCatalogEntry(currentBoardId);
    if (entry) {
      document.title = `SmartBeads — ${entry.displayName}`;
    }
  }

  function setStatus(text: string): void {
    if (statusEl) statusEl.textContent = text;
  }

  function cancelAiWork(): void {
    aiRunId += 1;
    aiThinking = false;
  }

  function pushUndoSnapshot(): void {
    undoStack.push(session.exportSnapshot());
    if (undoStack.length > 80) undoStack.shift();
    undoBtn.disabled = undoStack.length === 0;
  }

  function canOfferResignation(): boolean {
    if (session.isGameOver() || animating || aiThinking) return false;
    if (pendingResignPlayer !== null) return false;
    return true;
  }

  function resigningPlayerForMode(): Player {
    const settings = session.getSettings();
    if (settings.mode === 'pve') return 'RED';
    return session.getEngine().getState().currentPlayer;
  }

  function finishResignation(resigning: Player, acceptDraw: boolean): void {
    if (timerId) clearInterval(timerId);
    cancelAiWork();
    resignOfferModal.style.display = 'none';
    pendingResignPlayer = null;
    session.resolveResignation(resigning, acceptDraw);
    updateUI();
  }

  function beginResignation(): void {
    if (!canOfferResignation()) return;
    const settings = session.getSettings();
    const resigning = resigningPlayerForMode();
    const confirmed = window.confirm(
      `Offer resignation as ${playerDisplayName(resigning)}? Opponent may accept a draw or claim a win.`,
    );
    if (!confirmed) return;

    if (settings.mode === 'pve') {
      const testOverride = sessionStorage.getItem('sb-test-resign-ai');
      let acceptDraw: boolean;
      if (testOverride === 'accept') {
        acceptDraw = true;
      } else if (testOverride === 'reject') {
        acceptDraw = false;
      } else {
        acceptDraw = shouldAcceptResignationDraw(
          session.getBoardVariant(),
          session.getEngine().exportSnapshot(),
          session.getAiPlayer(),
        );
      }
      finishResignation(resigning, acceptDraw);
      return;
    }

    pendingResignPlayer = resigning;
    resignOfferDesc.textContent =
      `${playerDisplayName(resigning)} offers resignation. Agree to a draw?`;
    resignOfferModal.style.display = 'flex';
  }

  function turnStatusText(): string {
    const player = session.getEngine().getState().currentPlayer;
    const label = player === 'RED' ? 'P1' : 'P2';
    const uiState = session.getUiState();
    if (uiState === 'chain') return `${label} — continue chain or Finish`;
    return `${label} turn — select a piece`;
  }

  function applyCanvasSizeForBoard(): void {
    const boardName = session.getEngine().getState().board.name;
    const { width, height } = getBoardCanvasSize(boardName);
    canvas.width = width;
    canvas.height = height;
    fitCanvasToFrame(canvas);
  }

  installCanvasResizeObserver(canvas, () => {
    fitCanvasToFrame(canvas);
    drawBoard();
  });

  function drawBoard(): void {
    const state = session.getEngine().getState();
    const board = anim ? cloneBoardDefinition(state.board) : state.board;
    if (anim && board.intersections[anim.from]) {
      board.intersections[anim.from].occupant = undefined;
    }
    drawCanvasBoard(canvas, {
      board,
      currentPlayer: state.currentPlayer,
      gameOver: session.isGameOver(),
      selectedId: session.getSelectedId(),
      legalTargets: session.getLegalTargetIds(),
      chainPieceId: session.getEngine().getChainPieceId(),
      anim,
      turnPulse,
    });
  }

  function updateUI(): void {
    const state = session.getEngine().getState();
    const settings = session.getSettings();
    const redPieces = session.getEngine().countPieces('RED');
    const bluePieces = session.getEngine().countPieces('BLUE');

    (document.getElementById('p1-pieces') as HTMLElement).textContent = String(redPieces);
    (document.getElementById('p2-pieces') as HTMLElement).textContent = String(bluePieces);
    (document.getElementById('p1-caps') as HTMLElement).textContent = String(state.captures.RED);
    (document.getElementById('p2-caps') as HTMLElement).textContent = String(state.captures.BLUE);
    (document.getElementById('turn-count') as HTMLElement).textContent = String(session.getMoveCount());

    const centerScores = session.getCenterDisplayScores();
    (document.getElementById('p1-center') as HTMLElement).textContent = formatCenterDisplay(settings.centerRule, centerScores.red);
    (document.getElementById('p2-center') as HTMLElement).textContent = formatCenterDisplay(settings.centerRule, centerScores.blue);

    document.getElementById('pill-p1')?.classList.toggle('active', state.currentPlayer === 'RED' && !session.isGameOver());
    document.getElementById('pill-p2')?.classList.toggle('active', state.currentPlayer === 'BLUE' && !session.isGameOver());

    const uiState = session.getUiState();
    const showFinish = uiState === 'chain'
      && !animating
      && !aiThinking
      && (settings.mode === 'pvp' || state.currentPlayer === 'RED');
    finishBtn.style.display = showFinish ? 'inline-block' : 'none';

    undoBtn.disabled = undoStack.length === 0 || animating || aiThinking;
    resignBtn.disabled = !canOfferResignation();

    const matchSecs = parseMatchSeconds(settings.matchTimer);
    if (matchSecs <= 0) {
      (document.getElementById('p1-clock') as HTMLElement).textContent = '--:--';
      (document.getElementById('p2-clock') as HTMLElement).textContent = '--:--';
      (document.getElementById('match-clock-val') as HTMLElement).textContent = 'OFF';
    } else if (settings.mode === 'pvp') {
      (document.getElementById('p1-clock') as HTMLElement).textContent = fmtClock(session.getP1Clock());
      (document.getElementById('p2-clock') as HTMLElement).textContent = fmtClock(session.getP2Clock());
      (document.getElementById('match-clock-val') as HTMLElement).textContent = 'CHESS';
    } else {
      (document.getElementById('p1-clock') as HTMLElement).textContent = '--:--';
      (document.getElementById('p2-clock') as HTMLElement).textContent = '--:--';
      (document.getElementById('match-clock-val') as HTMLElement).textContent = fmtClock(session.getGlobalMatchRemaining());
    }

    const shotLimit = session.getShotLimit();
    (document.getElementById('shot-clock-val') as HTMLElement).textContent =
      shotLimit > 0 ? `${session.getShotRemaining()}s` : 'OFF';

    (document.getElementById('p2-role') as HTMLElement).textContent = settings.mode === 'pve' ? '(AI)' : '(Human)';
    aiLevelSelect.disabled = settings.mode === 'pvp';
    aiLevelContainer.style.opacity = settings.mode === 'pvp' ? '0.45' : '1';

    if (session.isGameOver() && pendingResignPlayer === null) {
      resultModal.style.display = 'flex';
      resultTitle.textContent = winnerLabel(session.getDisplayedWinner());
      resultDesc.textContent = session.getDisplayedReason() ?? '';
    } else if (pendingResignPlayer === null) {
      resultModal.style.display = 'none';
    }

    drawBoard();
  }

  function startTimers(): void {
    if (timerId) clearInterval(timerId);
    timerId = setInterval(() => {
      if (session.isGameOver() || animating) return;
      if (aiThinking) return;
      session.timerTick();
      updateUI();
    }, 1000);
  }

  function loopPulse(ts: number): void {
    turnPulse = ts / 280;
    if (!animating) drawBoard();
    pulseRaf = requestAnimationFrame(loopPulse);
  }

  function afterHumanOrAiTurn(): void {
    updateUI();
    if (session.isGameOver()) {
      cancelAiWork();
      return;
    }
    const settings = session.getSettings();
    const state = session.getEngine().getState();
    if (settings.mode === 'pve' && state.currentPlayer === 'BLUE') {
      const runId = aiRunId;
      aiThinking = true;
      setStatus('AI is thinking…');
      setTimeout(() => {
        if (runId !== aiRunId) return;
        runAiTurn(runId);
      }, AI_REPLY_DELAY_MS);
    } else {
      cancelAiWork();
      setStatus(turnStatusText());
    }
  }

  function playAnimated(move: Move, player: Player, onDone: () => void): void {
    if (animating) {
      completeAiTurnIfChainOpen(session);
      cancelAiWork();
      setStatus(turnStatusText());
      updateUI();
      return;
    }
    const state = session.getEngine().getState();
    const jump = findJumpPath(state.board, move.from, move.to);
    const captured = jump?.over;
    const capturedPlayer = captured !== undefined
      ? state.board.intersections[captured].occupant
      : undefined;

    animating = true;
    anim = {
      from: move.from,
      to: move.to,
      captured,
      capturedPlayer,
      player,
      t: 0,
      duration: jump ? HUMAN_JUMP_ANIM_MS : HUMAN_SLIDE_ANIM_MS,
    };
    drawBoard();

    const start = performance.now();
    function step(now: number): void {
      if (!anim) return;
      anim.t = Math.min(1, (now - start) / anim.duration);
      drawBoard();
      if (anim.t < 1) {
        animRaf = requestAnimationFrame(step);
      } else {
        anim = null;
        animating = false;
        try {
          session.applyMove(move);
        } catch {
          completeAiTurnIfChainOpen(session);
          if (player === 'BLUE' && !session.isGameOver() && session.getEngine().getState().currentPlayer === 'BLUE') {
            const fallback = session.getEngine().getLegalMoves()[0];
            if (fallback) {
              try {
                session.applyMove(fallback);
              } catch {
                session.endGameByFeature('RED', 'AI move failed.');
              }
            } else {
              session.endGameByFeature('RED', 'AI has no legal moves.');
            }
            completeAiTurnIfChainOpen(session);
            cancelAiWork();
            afterHumanOrAiTurn();
            return;
          }
          cancelAiWork();
          setStatus('Move failed.');
          updateUI();
          return;
        }
        onDone();
      }
    }
    animRaf = requestAnimationFrame(step);
  }

  function executeMoveAnimated(move: Move, player: Player): void {
    playAnimated(move, player, () => {
      if (session.getUiState() === 'chain') {
        setStatus(turnStatusText());
        updateUI();
        return;
      }
      afterHumanOrAiTurn();
    });
  }

  function runAiTurn(runId: number): void {
    if (runId !== aiRunId) return;
    const settings = session.getSettings();
    const state = session.getEngine().getState();
    if (session.isGameOver() || settings.mode !== 'pve' || state.currentPlayer !== 'BLUE') {
      cancelAiWork();
      return;
    }

    // A previous optional-stop left the chain open: close it instead of planning a new piece.
    if (session.getEngine().getChainPieceId() !== null) {
      completeAiTurnIfChainOpen(session);
      cancelAiWork();
      afterHumanOrAiTurn();
      return;
    }

    let path: Move[] | null = null;
    try {
      path = planAiTurnPath(session);
    } catch {
      path = session.getEngine().getLegalMoves().slice(0, 1);
    }
    if (!path?.length) {
      session.endGameByFeature('RED', 'AI has no legal moves.');
      cancelAiWork();
      updateUI();
      return;
    }

    // FIX: Push snapshot before AI turn so Undo restores cleanly to human turn
    pushUndoSnapshot();

    let i = 0;
    function playNext(): void {
      if (runId !== aiRunId) return;
      if (session.isGameOver()) {
        cancelAiWork();
        return;
      }
      if (i >= path.length) {
        completeAiTurnIfChainOpen(session);
        cancelAiWork();
        afterHumanOrAiTurn();
        return;
      }

      const move = path[i];
      i += 1;
      playAnimated(move, 'BLUE', () => {
        if (runId !== aiRunId) return;
        const chain = session.getEngine().getChainPieceId();

        if (shouldContinueAiTurn(chain, path.length - i)) {
          setTimeout(playNext, 380);
          return;
        }

        completeAiTurnIfChainOpen(session);
        cancelAiWork();
        afterHumanOrAiTurn();
      });
    }
    playNext();
  }

  function handleCanvasClick(ev: MouseEvent): void {
    if (session.isGameOver() || aiThinking || animating) return;
    if (!session.canHumanAct()) return;

    const nodeId = hitTestNode(canvas, session.getEngine().getState().board, ev.clientX, ev.clientY);
    if (nodeId < 0) return;

    const state = session.getEngine().getState();

    const click = session.interpretClick(nodeId);
    if (click.kind === 'select') {
      session.selectNode(click.nodeId);
      updateUI();
      return;
    }
    if (click.kind === 'move') {
      pushUndoSnapshot();
      executeMoveAnimated(click.move, state.currentPlayer);
    }
  }

  function undoMove(): void {
    if (animating || aiThinking || undoStack.length === 0) return;
    cancelAiWork();
    anim = null;
    animating = false;
    const settings = session.getSettings();
    const uiState = session.getUiState();

    if (settings.mode === 'pve' && undoStack.length >= 2 && session.getEngine().getState().currentPlayer === 'RED' && uiState !== 'chain') {
      undoStack.pop();
      session.loadSnapshot(undoStack.pop()!);
    } else {
      session.loadSnapshot(undoStack.pop()!);
    }

    resultModal.style.display = 'none';
    resignOfferModal.style.display = 'none';
    pendingResignPlayer = null;
    undoBtn.disabled = undoStack.length === 0;
    if (!session.isGameOver()) startTimers();
    setStatus(turnStatusText());
    updateUI();
  }

  function resetGame(): void {
    if (timerId) clearInterval(timerId);
    cancelAnimationFrame(pulseRaf);
    cancelAnimationFrame(animRaf);
    cancelAiWork();
    undoStack.length = 0;
    anim = null;
    animating = false;
    aiThinking = false;

    const settings = readSettings();
    session = createSession(currentBoardId, settings);
    session.reset();
    applyCanvasSizeForBoard();
    resultModal.style.display = 'none';
    resignOfferModal.style.display = 'none';
    pendingResignPlayer = null;
    session.resetTurnClock();
    setStatus(turnStatusText());
    updateUI();
    startTimers();
    undoBtn.disabled = true;
    pulseRaf = requestAnimationFrame(loopPulse);
  }

  resignBtn.addEventListener('click', beginResignation);
  resignAgreeBtn.addEventListener('click', () => {
    if (pendingResignPlayer === null) return;
    finishResignation(pendingResignPlayer, true);
  });
  resignDeclineBtn.addEventListener('click', () => {
    if (pendingResignPlayer === null) return;
    finishResignation(pendingResignPlayer, false);
  });

  finishBtn.addEventListener('click', () => {
    if (session.getUiState() !== 'chain' || animating) return;
    pushUndoSnapshot();
    session.finishChain();
    afterHumanOrAiTurn();
  });

  function switchBoard(boardId: ProductBoardId): void {
    if (timerId) clearInterval(timerId);
    cancelAnimationFrame(pulseRaf);
    cancelAnimationFrame(animRaf);
    cancelAiWork();
    undoStack.length = 0;
    anim = null;
    animating = false;
    aiThinking = false;

    currentBoardId = boardId;
    boardSelect.value = boardId;
    syncBoardTitle();
    syncBoardPlayOptions();
    applyBoardDefaults(boardId);
    session = createSession(boardId, readSettings());
    applyCanvasSizeForBoard();
    resultModal.style.display = 'none';
    resignOfferModal.style.display = 'none';
    pendingResignPlayer = null;
    session.resetTurnClock();
    setStatus(turnStatusText());
    updateUI();
    startTimers();
    undoBtn.disabled = true;
    pulseRaf = requestAnimationFrame(loopPulse);
  }

  restartBtn.addEventListener('click', resetGame);
  playAgainBtn.addEventListener('click', resetGame);
  undoBtn.addEventListener('click', undoMove);
  boardSelect.addEventListener('change', () => {
    switchBoard(boardSelect.value as ProductBoardId);
  });
  gameModeSelect.addEventListener('change', resetGame);
  centerRuleSelect.addEventListener('change', resetGame);
  matchTimerSelect.addEventListener('change', resetGame);
  shotClockSelect.addEventListener('change', resetGame);
  aiLevelSelect.addEventListener('change', resetGame);
  canvas.addEventListener('click', handleCanvasClick);

  bgmAudio.volume = parseFloat(bgmVol.value) || 0.3;
  bgmSelect.addEventListener('change', () => {
    if (bgmSelect.value) {
      bgmAudio.src = bgmSelect.value;
      bgmAudio.play().catch(() => {});
    } else {
      bgmAudio.pause();
    }
  });
  bgmPlay.addEventListener('click', () => {
    if (!bgmAudio.src && bgmSelect.value) bgmAudio.src = bgmSelect.value;
    if (bgmSelect.value) bgmAudio.play().catch(() => {});
  });
  bgmPause.addEventListener('click', () => bgmAudio.pause());
  bgmVol.addEventListener('input', () => {
    bgmAudio.volume = parseFloat(bgmVol.value) || 0;
  });

  syncBoardTitle();
  syncBoardPlayOptions();
  resetGame();

  (window as unknown as { __SB_TEST__?: any }).__SB_TEST__ = {
    // switchBoard/resetGame rebind `session`; a captured value would hand browser
    // gates a dead session while snapshot() reported the live one.
    get session() {
      return session;
    },
    updateUI,
    afterHumanOrAiTurn,
    snapshot: () => {
      const state = session.getEngine().getState();
      return {
        currentPlayer: state.currentPlayer,
        selectedId: session.getSelectedId(),
        moveCount: session.getMoveCount(),
        canHumanAct: session.canHumanAct(),
        gameOver: session.isGameOver(),
        mode: session.getSettings().mode,
        boardName: state.board.name,
        uiState: session.getUiState(),
        chainPieceId: session.getEngine().getChainPieceId(),
        occupants: state.board.intersections.map((n) => ({
          id: n.id,
          label: n.label,
          occupant: n.occupant,
          x: n.x,
          y: n.y,
        })),
        animating,
        aiThinking,
        statusText: statusEl?.textContent ?? '',
        animFrom: anim?.from ?? null,
        animTo: anim?.to ?? null,
      };
    },
  };
}

function populateBoardSelect(select: HTMLSelectElement): void {
  select.innerHTML = '';
  for (const entry of listProductBoards()) {
    const opt = document.createElement('option');
    opt.value = entry.id;
    opt.textContent = entry.displayName;
    select.appendChild(opt);
  }
  select.value = DEFAULT_PRODUCT_BOARD;
}

function populateBgmSelect(select: HTMLSelectElement): void {
  select.innerHTML = '<option value="">— Select Music —</option>';
  for (const track of BGM_TRACKS) {
    const opt = document.createElement('option');
    opt.value = track.url;
    opt.textContent = track.label;
    select.appendChild(opt);
  }
}

