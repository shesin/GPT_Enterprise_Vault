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
  aiLevelForActingPlayer,
  BGM_TRACKS,
  COACH_MAX_AI_LEVEL,
  COACH_MOVE_PREVIEW_MS,
  buildCoachWatchSettings,
  clampUiAiLevel,
  DEFAULT_BGM_VOLUME,
  getDefaultBgmTrack,
  CenterRule,
  formatCenterRuleLabel,
  formatMatchTimerOptionLabel,
  formatShotClockOptionLabel,
  formatAiLevelLabel,
  GameFeatureSettings,
  HUMAN_PVE_MAX_AI_LEVEL,
  isHumanVsAiMode,
  MatchTimerMinutes,
  parseMatchSeconds,
  populateAiLevelSelect,
  SPECTATE_INTER_MOVE_DELAY_MS,
  ShotClockSeconds,
} from './feature/GameFeatureSettings';
import { applyAiHops, AiHopRecord } from './feature/aiTurnPath';
import {
  buildCoachLessonSettings,
  COACH_VIDEO,
  COACH_VIDEO_BOARD_ID,
  COACH_VIDEO_DURATION_MS,
  coachSpeechForTime,
  formatCoachTime,
} from './feature/CoachLesson';
import { applyCoachVideoKeyframe } from './feature/coachVideoBoard';
import { CoachVideoPlayer } from './feature/CoachVideoPlayer';
import { renderCoachPanelHtml } from './feature/coachPanelRender';
import { CoachVoice } from './feature/CoachVoice';
import { FeatureSession, SessionSnapshot } from './feature/FeatureSession';
import { shellTimerShouldSkip } from './feature/clockPolicy';
import {
  selectAiTurnPath,
  shouldAcceptResignationDraw,
  thinkBudgetForLevel,
  AiCenterContext,
  AiMatchTimerContext,
} from './feature/HonestAi';
import { AI_REPLY_DELAY_MS, HUMAN_JUMP_ANIM_MS, HUMAN_SLIDE_ANIM_MS } from './feature/pveTiming';
import { getBoardCanvasSize } from './layout/boardVisualProfile';
import { fitCanvasToFrame, installCanvasResizeObserver } from './layout/canvasDisplay';
import {
  BoardAnimState,
  drawCanvasBoard,
  hitTestNode,
  LastMoveHighlight,
  CapturePulse,
} from './render/CanvasBoardRenderer';
import { soundEffects } from './audio/SoundEffects';

function fmtClock(sec: number): string {
  const clamped = sec < 0 ? 0 : sec;
  const m = Math.floor(clamped / 60).toString().padStart(2, '0');
  const s = (clamped % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function updateShotRing(
  ringEl: HTMLElement | null,
  secEl: HTMLElement | null,
  secs: number,
  limit: number,
  active: boolean,
): void {
  if (!ringEl || !secEl) return;
  if (limit <= 0) {
    ringEl.classList.add('off');
    ringEl.style.setProperty('--shot-pct', '1');
    secEl.textContent = '—';
    return;
  }
  ringEl.classList.toggle('off', !active);
  const clamped = Math.max(0, secs);
  const pct = limit > 0 ? clamped / limit : 0;
  ringEl.style.setProperty('--shot-pct', String(pct));
  secEl.textContent = String(clamped);
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

function aiCenterFromSession(session: FeatureSession): AiCenterContext {
  const settings = session.getSettings();
  const scores = session.getCenterDisplayScores();
  return {
    centerRule: settings.centerRule,
    cumulativeRed: scores.red,
    cumulativeBlue: scores.blue,
  };
}

function aiMatchTimerFromSession(session: FeatureSession): AiMatchTimerContext {
  const settings = session.getSettings();
  const matchLimitSec = parseMatchSeconds(settings.matchTimer);
  return {
    matchLimitSec,
    globalRemainingSec: session.getGlobalMatchRemaining(),
    redRemainingSec: session.getP1Clock(),
    blueRemainingSec: session.getP2Clock(),
    mode: settings.mode,
  };
}

/**
 * Choose an AI path without throwing.
 * Never silently downgrade Hard/Medium to Easy — that broke the difficulty contract.
 * Only emergency fallback: first legal hop if search returns empty.
 * Center + match timer rules are passed so eval matches session scoring.
 */
export function planAiTurnPath(session: FeatureSession, actingPlayer?: Player): Move[] | null {
  const settings = session.getSettings();
  const aiPlayer = actingPlayer ?? session.getAiPlayer();
  const level = aiLevelForActingPlayer(settings, aiPlayer);
  const variant = session.getBoardVariant();
  const snap = session.getEngine().exportSnapshot();
  const center = aiCenterFromSession(session);
  const matchTimer = aiMatchTimerFromSession(session);
  try {
    const planned = selectAiTurnPath(variant, level, snap, aiPlayer, {
      budgetMs: thinkBudgetForLevel(level, variant),
      center,
      matchTimer,
    });
    if (planned?.length) return planned;
  } catch {
    /* fall through to emergency legal hop — do not substitute Easy search */
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
  if (session.isGameOver() || !isHumanVsAiMode(settings.mode) || session.getEngine().getState().currentPlayer !== aiPlayer) {
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
  let lastGameOverPlayed = false;
  let turnCaptures = 0;
  let lastMove: LastMoveHighlight | null = null;
  const capturePulseStarts: Array<{ nodeId: number; startMs: number }> = [];
  const CAPTURE_PULSE_MS = 420;
  let prevCaptures = { RED: 0, BLUE: 0 };
  /** Alternates who opens each new match (New game / Play again). RED = cream/human in PvE. */
  let nextGameStarter: Player = 'RED';
  let coachVideoPlayer: CoachVideoPlayer | null = null;
  let coachScrubbing = false;

  /** Start overlay + board switch: human (RED) always opens. New game alternates via applyGameStarter(). */
  function ensureHumanOpensStartScreen(): void {
    session.setStartingPlayer('RED');
  }

  function applyGameStarter(): void {
    session.setStartingPlayer(nextGameStarter);
    nextGameStarter = nextGameStarter === 'RED' ? 'BLUE' : 'RED';
  }

  const creamNameInput = document.getElementById('pvp-cream-name') as HTMLInputElement;
  const blackNameInput = document.getElementById('pvp-black-name') as HTMLInputElement;
  const pvpNamesContainer = document.getElementById('pvp-names-container') as HTMLDivElement;
  const canvas = document.getElementById('board') as HTMLCanvasElement;
  const finishBtn = document.getElementById('finish-btn') as HTMLButtonElement;
  const resignBtn = document.getElementById('resign-btn') as HTMLButtonElement;
  const undoBtn = document.getElementById('undo-btn') as HTMLButtonElement;
  const restartBtn = document.getElementById('restart-btn') as HTMLButtonElement;
  const playAgainBtn = document.getElementById('play-again-btn') as HTMLButtonElement;
  const sfxMuteBtn = document.getElementById('sfx-mute-btn') as HTMLButtonElement | null;
  const resultModal = document.getElementById('result-modal') as HTMLDivElement;
  const resignOfferModal = document.getElementById('resign-offer-modal') as HTMLDivElement;
  const resignOfferDesc = document.getElementById('resign-offer-desc') as HTMLParagraphElement;
  const resignAgreeBtn = document.getElementById('resign-agree-btn') as HTMLButtonElement;
  const resignDeclineBtn = document.getElementById('resign-decline-btn') as HTMLButtonElement;
  const resultTitle = document.getElementById('result-title') as HTMLHeadingElement;
  const resultDesc = document.getElementById('result-desc') as HTMLParagraphElement;
  const startScreenOverlay = document.getElementById('start-screen-overlay') as HTMLDivElement | null;
  const startGameBtn = document.getElementById('start-game-btn') as HTMLButtonElement | null;
  const startModeSelect = document.getElementById('start-mode-select') as HTMLSelectElement | null;
  const celebrationFx = document.getElementById('board-celebration-fx') as HTMLDivElement | null;
  const celebrationParticles = document.getElementById('celebration-particles') as HTMLDivElement | null;
  const modalCelebrationParticles = document.getElementById('modal-celebration-particles') as HTMLDivElement | null;
  const modalCelebrationHalo = document.getElementById('modal-celebration-halo') as HTMLDivElement | null;
  const startBanner = document.getElementById('start-banner') as HTMLDivElement | null;
  const startBannerTitle = document.getElementById('start-banner-title') as HTMLDivElement | null;
  const startBannerSubtitle = document.getElementById('start-banner-subtitle') as HTMLDivElement | null;
  let bannerTimer: number | null = null;
  let bannerPhase2Timer: number | null = null;

  function emitCelebrationSparkles(targetContainer: HTMLElement | null = celebrationParticles): void {
    if (!targetContainer) return;
    targetContainer.innerHTML = '';

    const colors = ['#ffd700', '#fbbf24', '#ffffff', '#f8fafc', '#fef08a'];
    const shapes = ['★', '✦', '✧', '★', '✦'];
    const count = 20;

    for (let i = 0; i < count; i++) {
      const p = document.createElement('div');
      p.className = 'celebration-particle';
      const shape = shapes[i % shapes.length];
      p.textContent = shape;

      const angle = (i / count) * 2 * Math.PI + (Math.random() - 0.5) * 0.3;
      const distance = 60 + Math.random() * 130;
      const dx = Math.cos(angle) * distance;
      const dy = Math.sin(angle) * distance;
      const rot = (Math.random() - 0.5) * 360;
      const dur = 1.4 + Math.random() * 0.6;
      const delay = Math.random() * 0.25;
      const size = 12 + Math.random() * 12;
      const color = colors[i % colors.length];

      p.style.setProperty('--dx', `${dx.toFixed(1)}px`);
      p.style.setProperty('--dy', `${dy.toFixed(1)}px`);
      p.style.setProperty('--rot', `${rot.toFixed(0)}deg`);
      p.style.setProperty('--dur', `${dur.toFixed(2)}s`);
      p.style.setProperty('--delay', `${delay.toFixed(2)}s`);
      p.style.setProperty('--size', `${size.toFixed(0)}px`);
      p.style.setProperty('--color', color);

      targetContainer.appendChild(p);
    }
  }

  function triggerStartBanner(initialTitle?: string, subtitle?: string): void {
    if (!startBanner || !startBannerTitle || !startBannerSubtitle) return;
    const boardName = subtitle ?? getCatalogEntry(currentBoardId)?.displayName ?? 'SMARTBEADS';
    startBannerSubtitle.textContent = `★ ${boardName.toUpperCase()} ★`;
    startBannerTitle.textContent = initialTitle ?? '★ MATCH START ★';

    if (bannerTimer !== null) {
      clearTimeout(bannerTimer);
      bannerTimer = null;
    }
    if (bannerPhase2Timer !== null) {
      clearTimeout(bannerPhase2Timer);
      bannerPhase2Timer = null;
    }

    // Reset and trigger animations
    celebrationFx?.classList.remove('animate');
    startBanner.classList.remove('animate');
    void startBanner.offsetWidth;

    celebrationFx?.classList.add('animate');
    startBanner.classList.add('animate');
    emitCelebrationSparkles();

    // Phase 2: Pop into "READY... PLAY!" at 0.75s
    bannerPhase2Timer = window.setTimeout(() => {
      if (startBannerTitle && startBanner.classList.contains('animate')) {
        startBannerTitle.textContent = 'READY... PLAY!';
        emitCelebrationSparkles();
      }
      bannerPhase2Timer = null;
    }, 750);

    // Total duration: 2.0 seconds
    bannerTimer = window.setTimeout(() => {
      dismissStartBanner();
    }, 2000);
  }

  function dismissStartBanner(): void {
    if (celebrationFx) celebrationFx.classList.remove('animate');
    if (startBanner) startBanner.classList.remove('animate');
    if (celebrationParticles) celebrationParticles.innerHTML = '';
    if (bannerTimer !== null) {
      clearTimeout(bannerTimer);
      bannerTimer = null;
    }
    if (bannerPhase2Timer !== null) {
      clearTimeout(bannerPhase2Timer);
      bannerPhase2Timer = null;
    }
  }

  const boardSelect = document.getElementById('board-select') as HTMLSelectElement;
  const aiLevelSelect = document.getElementById('ai-level-select') as HTMLSelectElement;
  const aiLevelSetting = document.getElementById('ai-level-setting') as HTMLDivElement | null;
  const coachLevelSelect = document.getElementById('coach-level-select') as HTMLSelectElement | null;
  const coachLevelSetting = document.getElementById('coach-level-setting') as HTMLDivElement | null;
  const matchTimerSelect = document.getElementById('match-timer-select') as HTMLSelectElement;
  const shotClockSelect = document.getElementById('shot-clock-select') as HTMLSelectElement;
  const centerRuleSelect = document.getElementById('center-rule-select') as HTMLSelectElement;
  const coachPanel = document.getElementById('coach-panel') as HTMLDivElement | null;
  const coachLessonTitle = document.getElementById('coach-lesson-title') as HTMLElement | null;
  const coachLessonBody = document.getElementById('coach-lesson-body') as HTMLElement | null;
  const coachTimeLabel = document.getElementById('coach-time-label') as HTMLElement | null;
  const coachPlayBtn = document.getElementById('coach-play-btn') as HTMLButtonElement | null;
  const coachPauseBtn = document.getElementById('coach-pause-btn') as HTMLButtonElement | null;
  const coachScrub = document.getElementById('coach-scrub') as HTMLInputElement | null;
  const coachVoiceReplayBtn = document.getElementById('coach-voice-replay') as HTMLButtonElement | null;
  const coachVoiceMuteBtn = document.getElementById('coach-voice-mute') as HTMLButtonElement | null;
  const coachSpeakingLabel = document.getElementById('coach-speaking-label') as HTMLElement | null;
  const coachVoice = new CoachVoice();

  coachVoice.setOnSpeakingChange((speaking) => {
    coachSpeakingLabel?.classList.toggle('is-hidden', !speaking);
  });

  function updateCoachVoiceMuteButton(): void {
    if (!coachVoiceMuteBtn) return;
    coachVoiceMuteBtn.textContent = coachVoice.isMuted() ? 'Unmute voice' : 'Mute voice';
  }

  function speakCoachText(text: string): void {
    coachVoice.speak(text);
    updateCoachVoiceMuteButton();
  }

  function stopCoachVideo(): void {
    coachVideoPlayer?.destroy();
    coachVideoPlayer = null;
    stopCoachVoice();
  }

  function syncCoachVideoControls(timeMs: number, playing: boolean): void {
    if (coachTimeLabel) {
      coachTimeLabel.textContent = `${formatCoachTime(timeMs)} / ${formatCoachTime(COACH_VIDEO_DURATION_MS)}`;
    }
    if (coachScrub && !coachScrubbing) {
      coachScrub.max = String(COACH_VIDEO_DURATION_MS);
      coachScrub.value = String(Math.round(timeMs));
    }
    coachPlayBtn?.classList.toggle('is-hidden', playing);
    coachPauseBtn?.classList.toggle('is-hidden', !playing);
  }

  function updateCoachVideoPanel(): void {
    coachPanel?.classList.remove('is-hidden');
    if (coachLessonTitle) coachLessonTitle.textContent = COACH_VIDEO.title;
    if (coachLessonBody) {
      coachLessonBody.innerHTML = renderCoachPanelHtml({
        intro: COACH_VIDEO.intro,
        points: COACH_VIDEO.points,
      });
    }
  }

  function initCoachVideoPlayer(autoPlay = false): void {
    stopCoachVideo();
    undoStack.length = 0;
    undoBtn.disabled = true;
    turnCaptures = 0;
    clearMoveFeedback();
    prevCaptures = { RED: 0, BLUE: 0 };
    anim = null;
    animating = false;
    cancelAiWork();

    coachVideoPlayer = new CoachVideoPlayer(COACH_VIDEO, {
      onTimeChange: (ms) => {
        syncCoachVideoControls(ms, coachVideoPlayer?.isPlaying() ?? false);
      },
      onApplyKeyframe: (keyframe) => {
        applyCoachVideoKeyframe(session, keyframe);
        updateUI();
      },
      onPlayMove: (move, onDone) => {
        playAnimated({ from: move.from, to: move.to }, move.player, () => {
          turnCaptures = 0;
          onDone();
          updateUI();
        });
      },
      onSpeak: (speech) => {
        speakCoachText(speech.text);
      },
      onPlayingChange: (playing) => {
        syncCoachVideoControls(coachVideoPlayer?.getTimeMs() ?? 0, playing);
        if (!playing) stopCoachVoice();
      },
      onEnded: () => {
        syncCoachVideoControls(COACH_VIDEO_DURATION_MS, false);
      },
    });

    updateCoachVideoPanel();
    coachVideoPlayer.seek(0);
    syncCoachVideoControls(0, false);
    if (autoPlay) coachVideoPlayer.play();
  }

  function stopCoachVoice(): void {
    coachVoice.stop();
    coachSpeakingLabel?.classList.add('is-hidden');
  }

  const bgmAudio = document.getElementById('bgm-audio') as HTMLAudioElement;
  const bgmSelect = document.getElementById('bgm-select') as HTMLSelectElement;
  const bgmVol = document.getElementById('bgm-vol') as HTMLInputElement;
  const bgmPlay = document.getElementById('bgm-play') as HTMLButtonElement;
  const bgmPause = document.getElementById('bgm-pause') as HTMLButtonElement;

  populateBgmSelect(bgmSelect);
  bgmVol.value = String(DEFAULT_BGM_VOLUME);
  bgmAudio.volume = DEFAULT_BGM_VOLUME;
  if (bgmSelect.value) {
    bgmAudio.src = bgmSelect.value;
  }
  populateBoardSelect(boardSelect);

  function syncAiLevelOptions(): void {
    const current = clampUiAiLevel(parseInt(aiLevelSelect.value, 10) || 2);
    populateAiLevelSelect(aiLevelSelect, HUMAN_PVE_MAX_AI_LEVEL, current);
  }

  function syncCoachLevelOptions(): void {
    if (!coachLevelSelect) return;
    const current = clampUiAiLevel(parseInt(coachLevelSelect.value, 10) || 3);
    populateAiLevelSelect(coachLevelSelect, COACH_MAX_AI_LEVEL, current);
  }

  syncAiLevelOptions();
  syncCoachLevelOptions();

  function isCoachMode(): boolean {
    return session.getSettings().mode === 'coach';
  }

  function syncCoachShellUi(): void {
    const coach = isCoachMode();
    if (!coach) {
      coachPanel?.classList.add('is-hidden');
      stopCoachVideo();
    }
    boardSelect.disabled = coach;
    centerRuleSelect.disabled = coach;
    matchTimerSelect.disabled = coach;
    shotClockSelect.disabled = coach;
    aiLevelSelect.disabled = coach;
    if (coachLevelSelect) coachLevelSelect.disabled = coach;
    if (startModeSelect) startModeSelect.disabled = coach;
    restartBtn.textContent = coach ? 'Restart video' : 'New game';
  }

  function launchCoachLesson(): void {
    if (timerId) clearInterval(timerId);
    cancelAnimationFrame(pulseRaf);
    cancelAnimationFrame(animRaf);
    cancelAiWork();
    aiThinking = false;

    currentBoardId = COACH_VIDEO_BOARD_ID;
    boardSelect.value = COACH_VIDEO_BOARD_ID;
    syncBoardTitle();
    syncBoardPlayOptions();
    applyBoardDefaults(COACH_VIDEO_BOARD_ID);

    session = createSession(COACH_VIDEO_BOARD_ID, buildCoachLessonSettings());
    session.reset();
    session.resetTurnClock();

    applyCanvasSizeForBoard();
    resultModal.style.display = 'none';
    resultModal.classList.remove('animate');
    resignOfferModal.style.display = 'none';
    pendingResignPlayer = null;

    if (startScreenOverlay) startScreenOverlay.classList.add('hidden');
    if (startModeSelect) startModeSelect.value = 'pve';

    syncCoachShellUi();
    syncModeUi();
    initCoachVideoPlayer(true);
    undoBtn.disabled = true;
    pulseRaf = requestAnimationFrame(loopPulse);

    if (bgmSelect.value && bgmAudio.paused) {
      if (!bgmAudio.src) bgmAudio.src = bgmSelect.value;
      bgmAudio.play().catch(() => {});
    }
    triggerStartBanner('★ COACH VIDEO ★', '6-bead · 3×5');
    soundEffects.playGameStart();
  }

  function isCoachWatchMode(): boolean {
    return readGameMode() === 'spectate';
  }

  function readCoachWatchSettings(): GameFeatureSettings {
    const coachLevel = coachLevelSelect
      ? clampUiAiLevel(parseInt(coachLevelSelect.value, 10))
      : 3;
    const aiLevel = clampUiAiLevel(parseInt(aiLevelSelect.value, 10));
    return buildCoachWatchSettings({
      coachRedLevel: coachLevel,
      coachBlueLevel: aiLevel,
      matchTimer: matchTimerSelect.value as GameFeatureSettings['matchTimer'],
      shotClock: shotClockSelect.value as GameFeatureSettings['shotClock'],
      centerRule: centerRuleSelect.value as GameFeatureSettings['centerRule'],
    });
  }

  /** Mode comes from start-screen picker only (not duplicated in Settings). */
  function readGameMode(): GameFeatureSettings['mode'] {
    return (startModeSelect?.value ?? 'pve') as GameFeatureSettings['mode'];
  }

  function readSettings(): GameFeatureSettings {
    if (isCoachWatchMode()) {
      return readCoachWatchSettings();
    }
    const aiLevel = clampUiAiLevel(parseInt(aiLevelSelect.value, 10));
    return {
      mode: readGameMode(),
      aiLevel,
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
    const play = getPlayConfig(currentBoardId);
    const options = play.matchTimerOptions;
    const current = matchTimerSelect.value as MatchTimerMinutes;
    matchTimerSelect.innerHTML = '';
    for (const value of options) {
      const opt = document.createElement('option');
      opt.value = value;
      opt.textContent = formatMatchTimerOptionLabel(value, play.matchTimerBest);
      matchTimerSelect.appendChild(opt);
    }
    if (options.includes(current)) {
      matchTimerSelect.value = current;
    } else {
      matchTimerSelect.value = getPlayConfig(currentBoardId).defaultSettings.matchTimer;
    }
  }

  function syncShotClockOptions(): void {
    const play = getPlayConfig(currentBoardId);
    const options = play.shotClockOptions;
    const current = shotClockSelect.value as ShotClockSeconds;
    shotClockSelect.innerHTML = '';
    for (const value of options) {
      const opt = document.createElement('option');
      opt.value = value;
      opt.textContent = formatShotClockOptionLabel(value, play.shotClockBest);
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
    syncAiLevelOptions();
    syncCoachLevelOptions();
  }

  function syncBoardTitle(): void {
    const entry = getCatalogEntry(currentBoardId);
    if (entry) {
      document.title = `SmartBeads — ${entry.displayName}`;
      const startHeading = document.getElementById('start-screen-heading');
      if (startHeading) {
        startHeading.textContent = `${entry.displayName.toUpperCase()} TOURNAMENT`;
      }
    }
  }

  function isAwaitingStart(): boolean {
    return !!startScreenOverlay && !startScreenOverlay.classList.contains('hidden');
  }

  function showStartScreen(): void {
    if (!startScreenOverlay) return;
    if (timerId) clearInterval(timerId);
    timerId = null;
    cancelAiWork();
    if (startModeSelect) {
      startModeSelect.value = session.getSettings().mode;
    }
    syncModeUi();
    startScreenOverlay.classList.remove('hidden');
  }

  function applyStartOverlayModeToSession(): void {
    syncModeUi();
    session = createSession(currentBoardId, readSettings());
    session.reset();
    ensureHumanOpensStartScreen();
    updateUI();
  }

  function beginCoachWatch(): void {
    if (timerId) clearInterval(timerId);
    timerId = null;
    cancelAiWork();
    undoStack.length = 0;
    session = createSession(currentBoardId, readSettings());
    session.reset();
    ensureHumanOpensStartScreen();
    session.resetTurnClock();
    if (startScreenOverlay) {
      startScreenOverlay.classList.add('hidden');
    }
    if (bgmSelect.value && bgmAudio.paused) {
      if (!bgmAudio.src) bgmAudio.src = bgmSelect.value;
      bgmAudio.play().catch(() => {});
    }
    syncModeUi();
    updateUI();
    undoBtn.disabled = true;
    startTimers();
    maybeScheduleAutomatedTurn();
    triggerStartBanner();
    soundEffects.playGameStart();
  }

  function beginPlayAfterStart(): void {
    applyStartOverlayModeToSession();
    if (startScreenOverlay) {
      startScreenOverlay.classList.add('hidden');
    }
    // Start overlay always opens with human (RED). Next New game / Play again alternates from AI (BLUE).
    nextGameStarter = 'BLUE';
    if (bgmSelect.value && bgmAudio.paused) {
      if (!bgmAudio.src) bgmAudio.src = bgmSelect.value;
      bgmAudio.play().catch(() => {});
    }
    startTimers();
    maybeScheduleAutomatedTurn();
    triggerStartBanner();
    soundEffects.playGameStart();
  }

  function creamPlayerLabel(): string {
    const settings = session.getSettings();
    if (settings.mode === 'spectate') {
      return `Watch AI · ${formatAiLevelLabel(aiLevelForActingPlayer(settings, 'RED'))}`;
    }
    if (settings.mode === 'coach' || settings.mode === 'pve') return 'You';
    const name = creamNameInput?.value.trim();
    return name || 'Player 1';
  }

  function blackPlayerLabel(): string {
    const settings = session.getSettings();
    if (settings.mode === 'spectate') {
      return `AI · ${formatAiLevelLabel(aiLevelForActingPlayer(settings, 'BLUE'))}`;
    }
    if (settings.mode === 'coach' || settings.mode === 'pve') {
      return `AI · ${formatAiLevelLabel(settings.aiLevel)}`;
    }
    const name = blackNameInput?.value.trim();
    return name || 'Player 2';
  }

  function sideDisplayName(player: Player): string {
    return player === 'RED' ? creamPlayerLabel() : blackPlayerLabel();
  }

  function syncModeUi(): void {
    const settings = session.getSettings();
    const coachWatch = settings.mode === 'spectate';
    const coachLesson = settings.mode === 'coach';
    const pve = settings.mode === 'pve';
    const pvp = settings.mode === 'pvp';
    if (pvpNamesContainer) {
      pvpNamesContainer.style.display = pvp ? 'flex' : 'none';
      pvpNamesContainer.style.flexDirection = 'column';
      pvpNamesContainer.style.gap = '4px';
    }
    if (aiLevelSetting) {
      aiLevelSetting.style.display = (pve || coachWatch) && !coachLesson ? '' : 'none';
    }
    if (coachLevelSetting) {
      coachLevelSetting.style.display = coachWatch ? '' : 'none';
    }
    syncCoachShellUi();
  }

  function interMoveDelayMs(): number {
    return session.getSettings().mode === 'spectate'
      ? SPECTATE_INTER_MOVE_DELAY_MS
      : AI_REPLY_DELAY_MS;
  }

  function shouldScheduleAutomatedTurn(): boolean {
    if (session.isGameOver()) return false;
    if (session.getSettings().mode === 'coach') return false;
    const settings = session.getSettings();
    if (settings.mode === 'spectate') return true;
    if (isHumanVsAiMode(settings.mode)) {
      return session.getEngine().getState().currentPlayer === 'BLUE';
    }
    return false;
  }

  function maybeScheduleAutomatedTurn(): void {
    if (!shouldScheduleAutomatedTurn()) return;
    const runId = aiRunId;
    aiThinking = true;
    const delay = interMoveDelayMs();
    const run = (): void => {
      if (runId !== aiRunId) return;
      runAutomatedTurn(runId);
    };
    if (delay <= 0) run();
    else setTimeout(run, delay);
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
    if (session.getSettings().mode === 'spectate' || session.getSettings().mode === 'coach') return false;
    if (session.isGameOver() || animating || aiThinking) return false;
    if (pendingResignPlayer !== null) return false;
    // Only the side to move may resign (PvE: human only on cream's turn).
    if (session.getSettings().mode === 'pve'
      && session.getEngine().getState().currentPlayer !== 'RED') {
      return false;
    }
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
      `Offer resignation as ${sideDisplayName(resigning)}? Opponent may accept a draw or claim a win.`,
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
          aiCenterFromSession(session),
          aiMatchTimerFromSession(session),
        );
      }
      finishResignation(resigning, acceptDraw);
      return;
    }

    pendingResignPlayer = resigning;
    resignOfferDesc.textContent =
      `${sideDisplayName(resigning)} offers resignation. Agree to a draw?`;
    resignOfferModal.style.display = 'flex';
  }

  function applyShellBoardClass(): void {
    const shell = document.getElementById('play-shell');
    if (!shell) return;
    shell.classList.toggle('shell--board-16', currentBoardId === '16');
  }

  function applyCanvasSizeForBoard(): void {
    applyShellBoardClass();
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

  function clearMoveFeedback(): void {
    lastMove = null;
    capturePulseStarts.length = 0;
  }

  function activeCapturePulses(): CapturePulse[] {
    const now = performance.now();
    return capturePulseStarts
      .map((pulse) => ({
        nodeId: pulse.nodeId,
        progress: (now - pulse.startMs) / CAPTURE_PULSE_MS,
      }))
      .filter((pulse) => pulse.progress < 1);
  }

  function flashCaptureTick(side: 'cream' | 'black'): void {
    const el = document.getElementById(`${side}-cap-tick`) as HTMLElement | null;
    if (!el) return;
    el.textContent = '+1';
    el.classList.remove('show');
    void el.offsetWidth;
    el.classList.add('show');
  }

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
      lastMove,
      capturePulses: activeCapturePulses(),
    });
  }

  function updateUI(): void {
    const state = session.getEngine().getState();
    const settings = session.getSettings();
    const redPieces = session.getEngine().countPieces('RED');
    const bluePieces = session.getEngine().countPieces('BLUE');
    const centerScores = session.getCenterDisplayScores();

    (document.getElementById('black-panel-name') as HTMLElement).textContent = blackPlayerLabel();
    (document.getElementById('cream-panel-name') as HTMLElement).textContent = creamPlayerLabel();
    (document.getElementById('black-panel-role') as HTMLElement).textContent =
      settings.mode === 'spectate' ? '(AI)' : settings.mode === 'pve' || settings.mode === 'coach' ? '(AI)' : '(Human)';
    (document.getElementById('cream-panel-role') as HTMLElement).textContent =
      settings.mode === 'spectate' ? '(AI)' : settings.mode === 'coach' ? '(Lesson)' : '(Human)';

    (document.getElementById('top-p1-capture') as HTMLElement).textContent = String(state.captures.RED);
    (document.getElementById('top-p2-capture') as HTMLElement).textContent = String(state.captures.BLUE);
    (document.getElementById('top-p1-centre') as HTMLElement).textContent = formatCenterDisplay(
      settings.centerRule,
      centerScores.red,
    );
    (document.getElementById('top-p2-centre') as HTMLElement).textContent = formatCenterDisplay(
      settings.centerRule,
      centerScores.blue,
    );
    (document.getElementById('top-p1-beads') as HTMLElement).textContent = String(redPieces);
    (document.getElementById('top-p2-beads') as HTMLElement).textContent = String(bluePieces);

    if (state.captures.RED > prevCaptures.RED) {
      flashCaptureTick('cream');
    }
    if (state.captures.BLUE > prevCaptures.BLUE) {
      flashCaptureTick('black');
    }
    prevCaptures = { RED: state.captures.RED, BLUE: state.captures.BLUE };
    (document.getElementById('turn-count') as HTMLElement).textContent = String(session.getMoveCount());

    document.getElementById('play-block-p1')?.classList.toggle(
      'active',
      state.currentPlayer === 'RED' && !session.isGameOver(),
    );
    document.getElementById('play-block-p2')?.classList.toggle(
      'active',
      state.currentPlayer === 'BLUE' && !session.isGameOver(),
    );

    const uiState = session.getUiState();
    const showFinish = uiState === 'chain'
      && !animating
      && !aiThinking
      && settings.mode !== 'spectate'
      && (settings.mode === 'pvp' || (isHumanVsAiMode(settings.mode) && state.currentPlayer === 'RED'));
    finishBtn.style.display = showFinish ? 'inline-block' : 'none';

    undoBtn.disabled = undoStack.length === 0 || animating || aiThinking || settings.mode === 'spectate';
    resignBtn.disabled = !canOfferResignation();

    syncModeUi();

    const matchSecs = parseMatchSeconds(settings.matchTimer);
    const shotLimit = session.getShotLimit();
    const matchMmssEl = document.getElementById('top-match-mmss');
    if (matchMmssEl) {
      if (matchSecs <= 0) {
        matchMmssEl.textContent = 'OFF';
        matchMmssEl.classList.add('off');
      } else {
        matchMmssEl.classList.remove('off');
        if (settings.mode === 'pvp') {
          const clock = state.currentPlayer === 'RED' ? session.getP1Clock() : session.getP2Clock();
          matchMmssEl.textContent = fmtClock(clock);
        } else {
          matchMmssEl.textContent = fmtClock(session.getGlobalMatchRemaining());
        }
      }
    }

    const shotRemaining = session.getShotRemaining();
    const shotActiveRed =
      shotLimit > 0 && state.currentPlayer === 'RED' && !session.isGameOver() && !aiThinking;
    const shotActiveBlue =
      shotLimit > 0 && state.currentPlayer === 'BLUE' && !session.isGameOver() && !aiThinking;
    updateShotRing(
      document.getElementById('shot-ring-p1'),
      document.getElementById('shot-sec-p1'),
      shotActiveRed ? shotRemaining : shotLimit,
      shotLimit,
      shotActiveRed,
    );
    updateShotRing(
      document.getElementById('shot-ring-p2'),
      document.getElementById('shot-sec-p2'),
      shotActiveBlue ? shotRemaining : shotLimit,
      shotLimit,
      shotActiveBlue,
    );

    if (session.isGameOver() && pendingResignPlayer === null && !isCoachMode()) {
      resultModal.style.display = 'flex';
      const winner = session.getDisplayedWinner();
      const redCaps = state.captures.RED;
      const blueCaps = state.captures.BLUE;
      const creamName = creamPlayerLabel();
      const blackName = blackPlayerLabel();
      resultTitle.className = 'result-title';

      let scoreLine = '';
      if (winner === 'DRAW') {
        resultTitle.textContent = "WELL PLAYED! IT'S A DRAW";
        resultTitle.classList.add('draw');
        scoreLine = `Tied in captures (${redCaps} vs ${blueCaps} beads)`;
      } else if (winner === 'RED') {
        const diff = redCaps - blueCaps;
        if (isHumanVsAiMode(settings.mode)) {
          resultTitle.textContent = 'CONGRATULATIONS! YOU WON!';
          scoreLine = diff > 0
            ? `You won by ${diff} bead${diff > 1 ? 's' : ''} (${redCaps} vs ${blueCaps})`
            : `You won (${redCaps} vs ${blueCaps} beads)`;
        } else {
          resultTitle.textContent = `CONGRATULATIONS! ${creamName.toUpperCase()} WON!`;
          scoreLine = diff > 0
            ? `${creamName} won by ${diff} bead${diff > 1 ? 's' : ''} (${redCaps} vs ${blueCaps})`
            : `${creamName} won (${redCaps} vs ${blueCaps} beads)`;
        }
        resultTitle.classList.add('victory');
      } else if (winner === 'BLUE') {
        const diff = blueCaps - redCaps;
        if (isHumanVsAiMode(settings.mode)) {
          resultTitle.textContent = 'WELL PLAYED! BETTER LUCK NEXT TIME';
          scoreLine = diff > 0
            ? `${blackName} won by ${diff} bead${diff > 1 ? 's' : ''} (${blueCaps} vs ${redCaps})`
            : `${blackName} won (${blueCaps} vs ${redCaps} beads)`;
          resultTitle.classList.add('defeat');
        } else {
          resultTitle.textContent = `CONGRATULATIONS! ${blackName.toUpperCase()} WON!`;
          scoreLine = diff > 0
            ? `${blackName} won by ${diff} bead${diff > 1 ? 's' : ''} (${blueCaps} vs ${redCaps})`
            : `${blackName} won (${blueCaps} vs ${redCaps} beads)`;
          resultTitle.classList.add('victory');
        }
      }

      const reason = session.getDisplayedReason();
      resultDesc.textContent = reason && reason !== 'Normal' ? `${scoreLine} • ${reason}` : scoreLine;

      if (!lastGameOverPlayed) {
        lastGameOverPlayed = true;
        resultModal.classList.remove('animate');
        void resultModal.offsetWidth;
        resultModal.classList.add('animate');
        emitCelebrationSparkles(modalCelebrationParticles);

        if (winner === 'DRAW') {
          soundEffects.playDraw();
        } else if (winner === 'RED') {
          soundEffects.playVictory();
        } else if (winner === 'BLUE') {
          if (isHumanVsAiMode(settings.mode)) {
            soundEffects.playDefeat();
          } else {
            soundEffects.playVictory();
          }
        }
      }
    } else if (pendingResignPlayer === null) {
      resultModal.style.display = 'none';
      resultModal.classList.remove('animate');
      lastGameOverPlayed = false;
    }

    drawBoard();
  }

  function startTimers(): void {
    if (timerId) clearInterval(timerId);
    timerId = setInterval(() => {
      if (shellTimerShouldSkip({
        gameOver: session.isGameOver(),
        aiThinking,
        animating,
      })) return;
      // Clocks must keep running during AI think and piece animation.
      // Freezing on aiThinking made Ebony immune to shot clock in PvE.
      session.timerTick();
      const shotRem = session.getShotRemaining();
      const matchRem = session.getGlobalMatchRemaining();
      const shotLimit = session.getShotLimit();
      const matchLimit = parseMatchSeconds(session.getSettings().matchTimer);
      if ((shotLimit > 0 && shotRem <= 3 && shotRem > 0) || (matchLimit > 0 && matchRem <= 5 && matchRem > 0)) {
        soundEffects.playTimerWarning();
      }
      updateUI();
    }, 1000);
  }

  function loopPulse(ts: number): void {
    turnPulse = ts / 280;
    const now = performance.now();
    for (let i = capturePulseStarts.length - 1; i >= 0; i -= 1) {
      if (now - capturePulseStarts[i].startMs >= CAPTURE_PULSE_MS) {
        capturePulseStarts.splice(i, 1);
      }
    }
    const pulsesActive = capturePulseStarts.length > 0;
    if (!animating || pulsesActive) drawBoard();
    pulseRaf = requestAnimationFrame(loopPulse);
  }

  function afterHumanOrAiTurn(): void {
    updateUI();
    if (session.isGameOver()) {
      cancelAiWork();
      return;
    }
    if (shouldScheduleAutomatedTurn()) {
      maybeScheduleAutomatedTurn();
    } else {
      cancelAiWork();
    }
  }

  function endAutomatedTurnForNoMoves(actingPlayer: Player): void {
    const winner = actingPlayer === 'RED' ? 'BLUE' : 'RED';
    session.endGameByFeature(winner, `${sideDisplayName(actingPlayer)} has no legal moves.`);
    cancelAiWork();
    updateUI();
  }

  function playAnimated(move: Move, player: Player, onDone: () => void): void {
    if (animating) {
      completeAiTurnIfChainOpen(session);
      cancelAiWork();
      updateUI();
      return;
    }
    const state = session.getEngine().getState();
    const jump = findJumpPath(state.board, move.from, move.to);
    const captured = jump?.over;
    const capturedPlayer = captured !== undefined
      ? state.board.intersections[captured].occupant
      : undefined;

    if (jump) {
      soundEffects.playCapture(turnCaptures);
      turnCaptures += 1;
      if (captured !== undefined) {
        capturePulseStarts.push({ nodeId: captured, startMs: performance.now() });
      }
    } else {
      soundEffects.playSlide();
      turnCaptures = 0;
    }

    if (session.getSettings().mode === 'spectate') {
      session.clearArmedSelection();
    }

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
          lastMove = { from: move.from, to: move.to, player };
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
        updateUI();
        return;
      }
      if (turnCaptures >= 3 && !session.isGameOver()) {
        soundEffects.playFlourish();
      }
      turnCaptures = 0;
      afterHumanOrAiTurn();
    });
  }

  function runAutomatedTurn(runId: number): void {
    if (runId !== aiRunId) return;
    const settings = session.getSettings();
    const state = session.getEngine().getState();
    const actingPlayer = state.currentPlayer;

    if (session.isGameOver()) {
      cancelAiWork();
      return;
    }
    if (isHumanVsAiMode(settings.mode) && actingPlayer !== 'BLUE') {
      cancelAiWork();
      return;
    }
    if (!isHumanVsAiMode(settings.mode) && settings.mode !== 'spectate') {
      cancelAiWork();
      return;
    }

    if (session.getEngine().getChainPieceId() !== null) {
      completeAiTurnIfChainOpen(session);
      cancelAiWork();
      afterHumanOrAiTurn();
      return;
    }

    let path: Move[] | null = null;
    try {
      path = planAiTurnPath(
        session,
        settings.mode === 'spectate' ? actingPlayer : undefined,
      );
    } catch {
      path = session.getEngine().getLegalMoves().slice(0, 1);
    }
    if (!path?.length) {
      if (isHumanVsAiMode(settings.mode)) {
        session.endGameByFeature('RED', 'AI has no legal moves.');
      } else {
        endAutomatedTurnForNoMoves(actingPlayer);
      }
      cancelAiWork();
      updateUI();
      return;
    }

    pushUndoSnapshot();

    let i = 0;
    function playNext(): void {
      if (runId !== aiRunId) return;
      if (session.isGameOver()) {
        cancelAiWork();
        return;
      }
      if (i >= path!.length) {
        completeAiTurnIfChainOpen(session);
        cancelAiWork();
        if (turnCaptures >= 3) {
          soundEffects.playFlourish();
        }
        turnCaptures = 0;
        afterHumanOrAiTurn();
        return;
      }

      const move = path![i];
      i += 1;

      const playHop = () => {
        playAnimated(move, actingPlayer, () => {
          if (runId !== aiRunId) return;
          const chain = session.getEngine().getChainPieceId();

          if (shouldContinueAiTurn(chain, path!.length - i)) {
            setTimeout(playNext, 380);
            return;
          }

          completeAiTurnIfChainOpen(session);
          cancelAiWork();
          if (turnCaptures >= 3) {
            soundEffects.playFlourish();
          }
          turnCaptures = 0;
          afterHumanOrAiTurn();
        });
      };

      if (settings.mode === 'spectate') {
        session.previewAutomatedSelection(move.from);
        soundEffects.playSelect();
        updateUI();
        setTimeout(() => {
          if (runId !== aiRunId) return;
          playHop();
        }, COACH_MOVE_PREVIEW_MS);
        return;
      }

      playHop();
    }
    playNext();
  }

  function handleCanvasClick(ev: MouseEvent): void {
    if (isAwaitingStart()) return;
    dismissStartBanner();
    if (session.isGameOver() || aiThinking || animating) return;
    if (!session.canHumanAct()) return;

    const nodeId = hitTestNode(canvas, session.getEngine().getState().board, ev.clientX, ev.clientY);
    if (nodeId < 0) return;

    const state = session.getEngine().getState();

    const click = session.interpretClick(nodeId);
    if (click.kind === 'select') {
      soundEffects.playSelect();
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
    turnCaptures = 0;
    clearMoveFeedback();
    const settings = session.getSettings();
    const uiState = session.getUiState();

    if (isHumanVsAiMode(settings.mode) && undoStack.length >= 2 && session.getEngine().getState().currentPlayer === 'RED' && uiState !== 'chain') {
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
    turnCaptures = 0;
    clearMoveFeedback();
    prevCaptures = { RED: 0, BLUE: 0 };

    const wasCoach = session.getSettings().mode === 'coach';
    if (wasCoach) {
      session = createSession(COACH_VIDEO_BOARD_ID, buildCoachLessonSettings());
      session.reset();
      initCoachVideoPlayer(false);
    } else {
      const settings = readSettings();
      session = createSession(currentBoardId, settings);
      session.reset();
    }
    if (isAwaitingStart()) {
      ensureHumanOpensStartScreen();
    } else if (wasCoach) {
      ensureHumanOpensStartScreen();
    } else {
      applyGameStarter();
    }
    applyCanvasSizeForBoard();
    resultModal.style.display = 'none';
    resultModal.classList.remove('animate');
    resignOfferModal.style.display = 'none';
    pendingResignPlayer = null;
    session.resetTurnClock();
    updateUI();
    undoBtn.disabled = true;
    pulseRaf = requestAnimationFrame(loopPulse);
    if (!isAwaitingStart()) {
      startTimers();
      if (!wasCoach) {
        maybeScheduleAutomatedTurn();
      }
      triggerStartBanner();
      soundEffects.playGameStart();
    }
  }

  if (startGameBtn) {
    startGameBtn.addEventListener('click', () => {
      if (readGameMode() === 'spectate') beginCoachWatch();
      else beginPlayAfterStart();
    });
  }

  startModeSelect?.addEventListener('change', () => {
    if (!isAwaitingStart()) return;
    applyStartOverlayModeToSession();
  });

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
    soundEffects.playButtonTap();
    pushUndoSnapshot();
    session.finishChain();
    if (turnCaptures >= 3 && !session.isGameOver()) {
      soundEffects.playFlourish();
    }
    turnCaptures = 0;
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
    turnCaptures = 0;
    clearMoveFeedback();
    prevCaptures = { RED: 0, BLUE: 0 };

    currentBoardId = boardId;
    boardSelect.value = boardId;
    syncBoardTitle();
    syncBoardPlayOptions();
    applyBoardDefaults(boardId);
    session = createSession(boardId, readSettings());
    session.reset();
    stopCoachVideo();
    ensureHumanOpensStartScreen();
    applyCanvasSizeForBoard();
    resultModal.style.display = 'none';
    resultModal.classList.remove('animate');
    resignOfferModal.style.display = 'none';
    pendingResignPlayer = null;
    session.resetTurnClock();
    updateUI();
    undoBtn.disabled = true;
    pulseRaf = requestAnimationFrame(loopPulse);
    showStartScreen();
  }

  function updateSfxButton(): void {
    if (!sfxMuteBtn) return;
    const isMuted = soundEffects.isMuted();
    sfxMuteBtn.textContent = isMuted ? '🔇 Off' : '🔊 On';
    if (isMuted) {
      sfxMuteBtn.classList.add('muted');
    } else {
      sfxMuteBtn.classList.remove('muted');
    }
  }

  sfxMuteBtn?.addEventListener('click', () => {
    soundEffects.toggleMuted();
    updateSfxButton();
    if (!soundEffects.isMuted()) {
      soundEffects.playButtonTap();
    }
  });

  coachPlayBtn?.addEventListener('click', () => {
    soundEffects.playButtonTap();
    if (isCoachMode()) coachVideoPlayer?.play();
  });

  coachPauseBtn?.addEventListener('click', () => {
    soundEffects.playButtonTap();
    if (isCoachMode()) coachVideoPlayer?.pause();
  });

  coachScrub?.addEventListener('pointerdown', () => {
    coachScrubbing = true;
    coachVideoPlayer?.pause();
  });

  coachScrub?.addEventListener('input', () => {
    if (!isCoachMode() || !coachScrub) return;
    coachVideoPlayer?.seek(parseInt(coachScrub.value, 10) || 0);
  });

  coachScrub?.addEventListener('pointerup', () => {
    coachScrubbing = false;
  });

  coachVoiceReplayBtn?.addEventListener('click', () => {
    if (!isCoachMode() || !coachVideoPlayer) return;
    speakCoachText(coachSpeechForTime(coachVideoPlayer.getTimeMs()));
  });

  coachVoiceMuteBtn?.addEventListener('click', () => {
    coachVoice.toggleMuted();
    updateCoachVoiceMuteButton();
    if (!coachVoice.isMuted() && isCoachMode() && coachVideoPlayer) {
      speakCoachText(coachSpeechForTime(coachVideoPlayer.getTimeMs()));
    }
  });

  restartBtn.addEventListener('click', () => {
    resetGame();
  });
  playAgainBtn.addEventListener('click', () => {
    resetGame();
  });
  undoBtn.addEventListener('click', () => {
    soundEffects.playButtonTap();
    undoMove();
  });
  boardSelect.addEventListener('change', () => {
    switchBoard(boardSelect.value as ProductBoardId);
  });
  centerRuleSelect.addEventListener('change', resetGame);
  matchTimerSelect.addEventListener('change', resetGame);
  shotClockSelect.addEventListener('change', resetGame);
  aiLevelSelect.addEventListener('change', resetGame);
  coachLevelSelect?.addEventListener('change', resetGame);
  canvas.addEventListener('click', handleCanvasClick);

  bgmAudio.volume = parseFloat(bgmVol.value) || DEFAULT_BGM_VOLUME;
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

  const playShell = document.getElementById('play-shell') as HTMLDivElement | null;

  function applyPremiumShell(isPremium: boolean): void {
    if (!playShell) return;
    playShell.classList.toggle('shell--ads-on', !isPremium);
    playShell.classList.toggle('shell--no-ads', isPremium);
    try {
      localStorage.setItem('sb-premium', isPremium ? '1' : '0');
    } catch {
      /* storage unavailable */
    }
  }

  if (playShell) {
    let savedPremium = false;
    try {
      savedPremium = localStorage.getItem('sb-premium') === '1';
    } catch {
      savedPremium = false;
    }
    applyPremiumShell(savedPremium);
  }

  syncBoardTitle();
  syncBoardPlayOptions();
  updateSfxButton();
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
        animFrom: anim?.from ?? null,
        animTo: anim?.to ?? null,
      };
    },
    /** Browser gates: deterministic cream-first without consuming alternation counter. */
    forceStarter: (player: Player) => {
      cancelAiWork();
      aiThinking = false;
      session.setStartingPlayer(player);
      updateUI();
    },
    setPremium: (isPremium: boolean) => {
      applyPremiumShell(isPremium);
    },
    switchBoard,
    launchCoachLesson,
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
  const defaultTrack = getDefaultBgmTrack();
  for (const track of BGM_TRACKS) {
    const opt = document.createElement('option');
    opt.value = track.url;
    opt.textContent = track.label;
    if (track.url === defaultTrack.url) {
      opt.selected = true;
    }
    select.appendChild(opt);
  }
}

