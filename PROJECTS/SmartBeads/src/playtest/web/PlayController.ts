import {
  DEFAULT_PRODUCT_BOARD,
  getCatalogEntry,
  getPlayConfig,
  listProductBoards,
  ProductBoardId,
  resolveEngineVariant,
} from '../../config/BoardCatalog';
import { findJumpPath, Move, Player } from '../../models/GameState';
import { countCenterOccupancy, formatCenterDisplay } from './feature/centerScoring';
import {
  AiLevel,
  BGM_TRACKS,
  CenterRule,
  GameFeatureSettings,
  parseMatchSeconds,
} from './feature/GameFeatureSettings';
import { FeatureSession, SessionSnapshot } from './feature/FeatureSession';
import { selectAiTurnPath } from './feature/HonestAi';
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
  let rafId = 0;
  let aiRunId = 0;
  const undoStack: SessionSnapshot[] = [];

  const canvas = document.getElementById('board') as HTMLCanvasElement;
  const finishBtn = document.getElementById('finish-btn') as HTMLButtonElement;
  const undoBtn = document.getElementById('undo-btn') as HTMLButtonElement;
  const restartBtn = document.getElementById('restart-btn') as HTMLButtonElement;
  const playAgainBtn = document.getElementById('play-again-btn') as HTMLButtonElement;
  const resultModal = document.getElementById('result-modal') as HTMLDivElement;
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

  function syncCenterRuleOptions(): void {
    const options = getPlayConfig(currentBoardId).centerRuleOptions;
    const current = centerRuleSelect.value as CenterRule;
    centerRuleSelect.innerHTML = '';
    for (const rule of options) {
      const opt = document.createElement('option');
      opt.value = rule;
      opt.textContent = rule === 'off' ? 'Off' : rule === 'endgame' ? 'End-Game' : 'Cumulative';
      centerRuleSelect.appendChild(opt);
    }
    if (options.includes(current)) {
      centerRuleSelect.value = current;
    } else {
      centerRuleSelect.value = getPlayConfig(currentBoardId).defaultSettings.centerRule;
    }
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

  function drawBoard(): void {
    const state = session.getEngine().getState();
    drawCanvasBoard(canvas, {
      board: state.board,
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

    const c1 = countCenterOccupancy(state.board, 'RED');
    const c2 = countCenterOccupancy(state.board, 'BLUE');
    (document.getElementById('p1-center') as HTMLElement).textContent = formatCenterDisplay(settings.centerRule, c1);
    (document.getElementById('p2-center') as HTMLElement).textContent = formatCenterDisplay(settings.centerRule, c2);

    document.getElementById('pill-p1')?.classList.toggle('active', state.currentPlayer === 'RED' && !session.isGameOver());
    document.getElementById('pill-p2')?.classList.toggle('active', state.currentPlayer === 'BLUE' && !session.isGameOver());

    const uiState = session.getUiState();
    const showFinish = uiState === 'chain'
      && state.currentPlayer === 'RED'
      && !animating
      && !aiThinking;
    finishBtn.style.display = showFinish ? 'inline-block' : 'none';

    undoBtn.disabled = undoStack.length === 0 || animating || aiThinking;

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

    if (session.isGameOver()) {
      resultModal.style.display = 'flex';
      resultTitle.textContent = winnerLabel(session.getDisplayedWinner());
      resultDesc.textContent = session.getDisplayedReason() ?? '';
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
    rafId = requestAnimationFrame(loopPulse);
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
      }, 40);
    } else {
      cancelAiWork();
      setStatus(state.currentPlayer === 'RED' ? 'P1 turn' : 'P2 turn');
    }
  }

  function animateMove(move: Move, player: Player, onDone: () => void): void {
    animating = true;
    const state = session.getEngine().getState();
    const jump = findJumpPath(state.board, move.from, move.to);
    const captured = jump?.over;
    const capturedPlayer = captured !== undefined
      ? state.board.intersections[captured].occupant
      : undefined;

    anim = {
      from: move.from,
      to: move.to,
      captured,
      capturedPlayer,
      player,
      t: 0,
      duration: jump ? 280 : 200,
    };

    const start = performance.now();
    function step(now: number): void {
      if (!anim) return;
      anim.t = Math.min(1, (now - start) / anim.duration);
      drawBoard();
      if (anim.t < 1) {
        rafId = requestAnimationFrame(step);
      } else {
        anim = null;
        animating = false;
        onDone();
      }
    }
    rafId = requestAnimationFrame(step);
  }

  function executeMoveAnimated(move: Move, player: Player): void {
    if (animating) return;
    animateMove(move, player, () => {
      session.applyMove(move);
      if (session.getUiState() === 'chain' && player === 'RED') {
        setStatus('Continue chain or Finish.');
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

    const path = selectAiTurnPath(
      session.getBoardVariant(),
      settings.aiLevel,
      session.getEngine().exportSnapshot(),
      'BLUE',
    );
    if (!path?.length) {
      session.endGameByFeature('RED', 'AI has no legal moves.');
      cancelAiWork();
      updateUI();
      return;
    }

    let i = 0;
    function playNext(): void {
      if (runId !== aiRunId) return;
      if (session.isGameOver()) {
        cancelAiWork();
        return;
      }
      if (i >= path.length) {
        cancelAiWork();
        updateUI();
        setStatus('P1 turn');
        return;
      }

      const move = path[i];
      i += 1;
      animateMove(move, 'BLUE', () => {
        if (runId !== aiRunId) return;
        session.applyMove(move);
        const chain = session.getEngine().getChainPieceId();
        if (chain !== null && i < path.length) {
          setTimeout(playNext, 60);
          return;
        }
        if (chain !== null) {
          session.finishChain();
        }
        if (i >= path.length) {
          cancelAiWork();
          afterHumanOrAiTurn();
        } else {
          setTimeout(playNext, 60);
        }
      });
    }
    playNext();
  }

  function handleCanvasClick(ev: MouseEvent): void {
    if (session.isGameOver() || aiThinking || animating) return;
    if (!session.canHumanAct()) return;

    const nodeId = hitTestNode(canvas, session.getEngine().getState().board, ev.clientX, ev.clientY);
    if (nodeId < 0) return;

    const uiState = session.getUiState();
    const state = session.getEngine().getState();

    if (uiState === 'chain') {
      const move = session.getEngine().getLegalMoves().find((m) => m.to === nodeId);
      if (move) {
        pushUndoSnapshot();
        executeMoveAnimated(move, state.currentPlayer);
      }
      return;
    }

    if (state.board.intersections[nodeId]?.occupant === state.currentPlayer) {
      session.selectNode(nodeId);
      updateUI();
      return;
    }

    if (uiState === 'selected') {
      const move = session.getLegalMovesForSelection().find((m) => m.to === nodeId);
      if (move) {
        pushUndoSnapshot();
        executeMoveAnimated(move, state.currentPlayer);
      }
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
    undoBtn.disabled = undoStack.length === 0;
    if (!session.isGameOver()) startTimers();
    setStatus('Your turn — select a piece');
    updateUI();
  }

  function resetGame(): void {
    if (timerId) clearInterval(timerId);
    cancelAnimationFrame(rafId);
    cancelAiWork();
    undoStack.length = 0;
    anim = null;
    animating = false;
    aiThinking = false;

    const settings = readSettings();
    session = createSession(currentBoardId, settings);
    session.reset();
    resultModal.style.display = 'none';
    session.resetTurnClock();
    setStatus('Your turn — select a piece');
    updateUI();
    startTimers();
    undoBtn.disabled = true;
    rafId = requestAnimationFrame(loopPulse);
  }

  finishBtn.addEventListener('click', () => {
    if (session.getUiState() !== 'chain' || animating) return;
    pushUndoSnapshot();
    session.finishChain();
    afterHumanOrAiTurn();
  });

  function switchBoard(boardId: ProductBoardId): void {
    if (timerId) clearInterval(timerId);
    cancelAnimationFrame(rafId);
    cancelAiWork();
    undoStack.length = 0;
    anim = null;
    animating = false;
    aiThinking = false;

    currentBoardId = boardId;
    boardSelect.value = boardId;
    syncBoardTitle();
    syncCenterRuleOptions();
    session = createSession(boardId, getPlayConfig(boardId).defaultSettings);
    resultModal.style.display = 'none';
    session.resetTurnClock();
    setStatus('Your turn — select a piece');
    updateUI();
    startTimers();
    undoBtn.disabled = true;
    rafId = requestAnimationFrame(loopPulse);
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
  syncCenterRuleOptions();
  resetGame();
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

