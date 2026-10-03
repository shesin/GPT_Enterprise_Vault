import {
  DEFAULT_PRODUCT_BOARD,
  getCatalogEntry,
  getPlayConfig,
  ProductBoardId,
  resolveEngineVariant,
} from '../../config/BoardCatalog';
import { cloneBoardDefinition, findJumpPath, Move, Player } from '../../models/GameState';
import {
  applyPlayLookFromSwatch,
  applyPlayLookState,
  isLookSwatchId,
  readStoredBoardLookId,
  readStoredSideLookId,
  syncPlayLookFromStorageIfDrifted,
  wirePlayLookPreviewSetting,
  type PlayShellThemeId,
} from './layout/playShellThemes';
import { formatCenterDisplay } from './feature/centerScoring';
import {
  aiLevelForActingPlayer,
  clampUiAiLevel,
  COACH_MOVE_PREVIEW_MS,
  buildCoachWatchSettings,
  DEFAULT_BGM_VOLUME,
  formatAiLevelLabel,
  GameFeatureSettings,
  isHumanVsAiMode,
  isTournamentTimerActive,
  normalizeTimerSettings,
  parseTimerSeconds,
  spectateInterMoveDelayMs,
} from './feature/GameFeatureSettings';
import {
  aiCenterFromSession,
  aiTimerFromSession,
  buildAiPlanRequest,
  completeAiTurnIfChainOpen,
  emergencyLegalPath,
  planAiTurnPath,
  runAiTurn,
  shouldContinueAiTurn,
} from './feature/aiTurnRunner';
import { AiSearchCancelled, type AiSearchClient } from './feature/aiSearchClient';
import {
  buildCoachLessonSettings,
  COACH_POST_DEMO_PAUSE_MS,
  COACH_VIDEO,
  COACH_VIDEO_BOARD_ID,
  COACH_VIDEO_DURATION_MS,
  COACH_FINISH_CAPTURE_SPEECH_TEXT,
  isCoachFinishCaptureDemoActive,
  coachPanelPointIndexAtTime,
  coachSpeechForTime,
  findCoachKeyframeAt,
  findCoachSegmentBannerAtTime,
  formatCoachTime,
  type CoachVideoCue,
} from './feature/CoachLesson';
import { applyCoachVideoHighlight, applyCoachVideoKeyframe } from './feature/coachVideoBoard';
import { CoachVideoPlayer } from './feature/CoachVideoPlayer';
import { renderCoachPanelHtml } from './feature/coachPanelRender';
import { CoachVoice } from './feature/CoachVoice';
import { FeatureSession } from './feature/FeatureSession';
import { shellTimerShouldSkip, wallClockTicks } from './feature/clockPolicy';
import { composeResultDescription, drawScoreLine } from './feature/resultText';
import { createStartBannerController } from './feature/startBannerController';
import { createResignationController } from './feature/resignationController';
import { createUndoController } from './feature/undoController';
import { AI_REPLY_DELAY_MS, HUMAN_JUMP_ANIM_MS, HUMAN_SLIDE_ANIM_MS } from './feature/pveTiming';
import { getBoardCanvasSize } from './layout/boardVisualProfile';
import { createBoardSettingsPanel } from './layout/boardSettingsPanel';
import { fitCanvasToFrame, installCanvasResizeObserver } from './layout/canvasDisplay';
import {
  isMoveHintAuraToggle,
  readMoveHintAuraToggle,
  resolveMoveHintAuraStyle,
  writeMoveHintAuraToggle,
} from './layout/moveHintAuraThemes';
import { populateBgmSelect, populateBoardSelect } from './layout/selectPopulators';
import { installModalFocus } from './layout/modalFocus';
import {
  BoardAnimState,
  drawCanvasBoard,
  hitTestNode,
  LastMoveHighlight,
  CapturePulse,
} from './render/CanvasBoardRenderer';
import { TEST_HOOKS_ENABLED } from './testHooks';
import type { Intent, RoomView } from '../../../server/protocol';
import type { OnlineClient, OnlineSession } from './online/OnlineClient';
import type { OnlineGame } from './online/onlineLobby';
import { snapshotFromView } from './online/applyOnlineView';
import { saveOnlineSession } from './online/onlineResume';
import { projectIntersectionOnCanvas } from './layout/boardProjection';
import { describeNode, isArrowKey, nextNodeInDirection, ScreenNode } from './render/keyboardNav';
import { updateMatchRing, updatePlayerTimerMmss, updateShotRing } from './render/timerDisplay';
import { soundEffects } from './audio/SoundEffects';

export {
  aiCenterFromSession,
  aiTimerFromSession,
  completeAiTurnIfChainOpen,
  planAiTurnPath,
  runAiTurn,
  shouldContinueAiTurn,
};

export interface PlayShellDeps {
  /** Runs AI searches in a Web Worker so the page never freezes while the AI thinks. Omitted in tests. */
  aiSearchClient?: AiSearchClient;
}

/** What the page shell (main.ts) uses to start a game: a real code path, not a test hook. */
export interface PlayShellLauncher {
  enterFromHub: (
    boardId: ProductBoardId,
    mode: GameFeatureSettings['mode'],
    action: 'play' | 'coach' | 'spectate',
  ) => void;
  launchCoachLesson: () => void;
  enterOnline: (game: OnlineGame) => void;
}

export function bootstrapPlayShell(
  onReady?: (launcher: PlayShellLauncher) => void,
  deps: PlayShellDeps = {},
): void {
  const aiSearchClient = deps.aiSearchClient;
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
  /** Online play (A4): the server holds the real game; this shell mirrors it and sends intents. */
  let online: { client: OnlineClient; session: OnlineSession; view: RoomView | null } | null = null;
  let turnPulse = 0;
  let timerId: ReturnType<typeof setInterval> | null = null;
  let pulseRaf = 0;
  let animRaf = 0;
  let aiRunId = 0;
  let lastGameOverPlayed = false;
  /** User closed congrats/draw overlay — keep final board visible until new game. */
  let resultModalDismissed = false;
  let turnCaptures = 0;
  let lastMove: LastMoveHighlight | null = null;
  const capturePulseStarts: Array<{ nodeId: number; startMs: number }> = [];
  const CAPTURE_PULSE_MS = 420;
  let prevCaptures = { RED: 0, BLUE: 0 };
  /** Session win tally, persists across "New game" / "Play again" rematches; reset on hub return or board switch. Draws don't count toward either side. */
  let sessionScore = { RED: 0, BLUE: 0 };
  let lastBoardStatusText = '';
  /** Alternates who opens each new match (New game / Play again). RED = cream/human in PvE. */
  let nextGameStarter: Player = 'RED';
  let coachVideoPlayer: CoachVideoPlayer | null = null;
  let coachScrubbing = false;
  let coachWasPlayingBeforeScrub = false;
  let coachWinReleaseTimer: number | null = null;

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
  const resignBtn = document.getElementById('resign-btn') as HTMLButtonElement;
  const finishBtn = document.getElementById('finish-btn') as HTMLButtonElement | null;
  const undoBtn = document.getElementById('undo-btn') as HTMLButtonElement;
  const restartBtn = document.getElementById('restart-btn') as HTMLButtonElement;
  const playAgainBtn = document.getElementById('play-again-btn') as HTMLButtonElement;
  const resultViewBoardBtn = document.getElementById('result-view-board-btn') as HTMLButtonElement;
  const sfxMuteBtn = document.getElementById('sfx-mute-btn') as HTMLButtonElement | null;
  const resultModal = document.getElementById('result-modal') as HTMLDivElement;
  const resignOfferModal = document.getElementById('resign-offer-modal') as HTMLDivElement;
  const resignOfferDesc = document.getElementById('resign-offer-desc') as HTMLParagraphElement;
  const resignAgreeBtn = document.getElementById('resign-agree-btn') as HTMLButtonElement;
  const resignDeclineBtn = document.getElementById('resign-decline-btn') as HTMLButtonElement;
  const resultTitle = document.getElementById('result-title') as HTMLHeadingElement;
  const resultDesc = document.getElementById('result-desc') as HTMLParagraphElement;
  const startScreenOverlay = document.getElementById(
    'start-screen-overlay',
  ) as HTMLDivElement | null;
  const startGameBtn = document.getElementById('start-game-btn') as HTMLButtonElement | null;
  const startCoachBtn = document.getElementById('start-coach-btn') as HTMLButtonElement | null;
  const startBoardSelect = document.getElementById(
    'start-board-select',
  ) as HTMLSelectElement | null;
  const hubModeSelect = document.getElementById('hub-mode-select') as HTMLSelectElement | null;
  const celebrationFx = document.getElementById('board-celebration-fx') as HTMLDivElement | null;
  const celebrationParticles = document.getElementById(
    'celebration-particles',
  ) as HTMLDivElement | null;
  const modalCelebrationParticles = document.getElementById(
    'modal-celebration-particles',
  ) as HTMLDivElement | null;
  const startBanner = document.getElementById('start-banner') as HTMLDivElement | null;
  const startBannerTitle = document.getElementById('start-banner-title') as HTMLDivElement | null;
  const startBannerSubtitle = document.getElementById(
    'start-banner-subtitle',
  ) as HTMLDivElement | null;
  const startBannerCtl = createStartBannerController(
    { celebrationFx, celebrationParticles, startBanner, startBannerTitle, startBannerSubtitle },
    {
      isCoachMode: () => isCoachMode(),
      getCoachTimeMs: () => coachVideoPlayer?.getTimeMs(),
      getBoardDisplayName: () => getCatalogEntry(currentBoardId)?.displayName ?? 'SMARTBEADS',
    },
  );
  const {
    emitCelebrationSparkles,
    triggerStartBanner,
    dismissStartBanner,
    triggerCoachSegmentBanner,
  } = startBannerCtl;

  const resignationCtl = createResignationController(
    { resignOfferModal, resignOfferDesc },
    {
      getSession: () => session,
      isAnimating: () => animating,
      isAiThinking: () => aiThinking,
      clearTimerId: () => {
        if (timerId) clearInterval(timerId);
      },
      cancelAiWork: () => cancelAiWork(),
      updateUI: () => updateUI(),
      sideDisplayName: (player: Player) => sideDisplayName(player),
    },
  );
  const { canOfferResignation, beginResignation, finishResignation } = resignationCtl;

  const undoCtl = createUndoController(
    { undoBtn },
    {
      getSession: () => session,
      isAnimating: () => animating,
      isAiThinking: () => aiThinking,
      cancelAiWork: () => cancelAiWork(),
      clearAnim: () => {
        anim = null;
        animating = false;
      },
      resetTurnCaptures: () => {
        turnCaptures = 0;
      },
      clearMoveFeedback: () => clearMoveFeedback(),
      hideResultModal: () => {
        resultModal.style.display = 'none';
      },
      hideResignOfferModal: () => {
        resignOfferModal.style.display = 'none';
      },
      clearPendingResignPlayer: () => resignationCtl.clearPendingResignPlayer(),
      startTimersIfNotGameOver: () => {
        if (!session.isGameOver()) startTimers();
      },
      resumeAutomatedPlay: () => maybeScheduleAutomatedTurn(),
      updateUI: () => updateUI(),
    },
  );

  const boardSelect = document.getElementById('board-select') as HTMLSelectElement;
  const aiLevelSelect = document.getElementById('ai-level-select') as HTMLSelectElement;
  const aiLevelSetting = document.getElementById('ai-level-setting') as HTMLDivElement | null;
  const coachLevelSelect = document.getElementById(
    'coach-level-select',
  ) as HTMLSelectElement | null;
  const coachLevelSetting = document.getElementById('coach-level-setting') as HTMLDivElement | null;
  const timerSelect = document.getElementById('timer-select') as HTMLSelectElement;
  const tournamentTimerSelect = document.getElementById(
    'tournament-timer-select',
  ) as HTMLSelectElement;
  const tournamentTimerSetting = document.getElementById(
    'tournament-timer-setting',
  ) as HTMLDivElement | null;
  const timerHelpBtn = document.getElementById('timer-help-btn') as HTMLButtonElement | null;
  const timerHelpText = document.getElementById('timer-help-text') as HTMLParagraphElement | null;
  const tournamentTimerHelpBtn = document.getElementById(
    'tournament-timer-help-btn',
  ) as HTMLButtonElement | null;
  const tournamentTimerHelpText = document.getElementById(
    'tournament-timer-help-text',
  ) as HTMLParagraphElement | null;
  const shotClockHelpBtn = document.getElementById(
    'shot-clock-help-btn',
  ) as HTMLButtonElement | null;
  const shotClockHelpText = document.getElementById(
    'shot-clock-help-text',
  ) as HTMLParagraphElement | null;
  const centerRuleHelpBtn = document.getElementById(
    'center-rule-help-btn',
  ) as HTMLButtonElement | null;
  const centerRuleHelpText = document.getElementById(
    'center-rule-help-text',
  ) as HTMLParagraphElement | null;
  const shotClockSelect = document.getElementById('shot-clock-select') as HTMLSelectElement;
  const centerRuleSelect = document.getElementById('center-rule-select') as HTMLSelectElement;
  const coachPanel = document.getElementById('coach-panel') as HTMLDivElement | null;
  const coachLessonTitle = document.getElementById('coach-lesson-title') as HTMLElement | null;
  const coachLessonBody = document.getElementById('coach-lesson-body') as HTMLElement | null;
  const coachTimeLabel = document.getElementById('coach-time-label') as HTMLElement | null;
  const coachPlayBtn = document.getElementById('coach-play-btn') as HTMLButtonElement | null;
  const coachPauseBtn = document.getElementById('coach-pause-btn') as HTMLButtonElement | null;
  const coachScrub = document.getElementById('coach-scrub') as HTMLInputElement | null;
  const coachVoiceReplayBtn = document.getElementById(
    'coach-voice-replay',
  ) as HTMLButtonElement | null;
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

  function clearCoachWinReleaseTimer(): void {
    if (coachWinReleaseTimer !== null) {
      clearTimeout(coachWinReleaseTimer);
      coachWinReleaseTimer = null;
    }
  }

  function speakCoachText(text: string, onEnd?: () => void): void {
    coachVoice.speak(text, () => {
      updateCoachVoiceMuteButton();
      onEnd?.();
    });
    updateCoachVoiceMuteButton();
  }

  function scheduleWinSegmentAfterFinishCaptureVoice(): void {
    clearCoachWinReleaseTimer();
    coachWinReleaseTimer = window.setTimeout(() => {
      coachVideoPlayer?.releaseWinSegment();
      coachWinReleaseTimer = null;
    }, COACH_POST_DEMO_PAUSE_MS);
  }

  function stopCoachVideo(): void {
    coachVideoPlayer?.destroy();
    coachVideoPlayer = null;
    clearCoachWinReleaseTimer();
    stopCoachVoice();
    syncCoachVideoCue(null);
  }

  function setCoachModalSnapshot(on: boolean): void {
    resultModal.classList.toggle('coach-snapshot', on);
    resignOfferModal.classList.toggle('coach-snapshot', on);
    playAgainBtn.disabled = on;
    playAgainBtn.toggleAttribute('aria-disabled', on);
    resignAgreeBtn.disabled = on;
    resignAgreeBtn.toggleAttribute('aria-disabled', on);
    resignDeclineBtn.disabled = on;
    resignDeclineBtn.toggleAttribute('aria-disabled', on);
  }

  function syncCoachVideoCue(cue: CoachVideoCue | null): void {
    if (!isCoachMode()) return;
    if (!cue || cue.kind === 'hideModals') {
      resultModal.style.display = 'none';
      resultModal.classList.remove('animate');
      resignOfferModal.style.display = 'none';
      resignOfferModal.classList.remove('coach-resign-offer-glow');
      resignBtn.classList.remove('coach-resign-btn-glow');
      session.clearCoachBoardFocus();
      setCoachModalSnapshot(false);
      updateUI();
      return;
    }
    if (cue.kind === 'boardFocus') {
      resultModal.style.display = 'none';
      resignOfferModal.style.display = 'none';
      resignOfferModal.classList.remove('coach-resign-offer-glow');
      setCoachModalSnapshot(false);
      session.previewScriptedSelection(cue.selectedId);
      updateUI();
      return;
    }
    if (cue.kind === 'closeResignOffer') {
      resignOfferModal.style.display = 'none';
      resignOfferModal.classList.remove('coach-resign-offer-glow');
      resignBtn.classList.remove('coach-resign-btn-glow');
      return;
    }
    if (cue.kind === 'resignOffer') {
      resultModal.style.display = 'none';
      resignOfferModal.style.display = 'none';
      resignOfferModal.classList.remove('coach-resign-offer-glow');
      resignBtn.classList.add('coach-resign-btn-glow');
      setCoachModalSnapshot(false);
      return;
    }
    if (cue.kind === 'showBanner') {
      triggerCoachSegmentBanner(
        { atMs: coachVideoPlayer?.getTimeMs() ?? 0, title: cue.title },
        coachVideoPlayer?.getTimeMs(),
        cue.durationMs,
      );
      return;
    }

    const creamName = creamPlayerLabel();
    const blackName = blackPlayerLabel();
    session.clearCoachBoardFocus();
    const redCaps = cue.captures?.RED ?? session.getEngine().getState().captures.RED;
    const blueCaps = cue.captures?.BLUE ?? session.getEngine().getState().captures.BLUE;
    resignOfferModal.style.display = 'none';
    resignOfferModal.classList.remove('coach-resign-offer-glow');
    resignBtn.classList.remove('coach-resign-btn-glow');
    resultModal.style.display = 'flex';
    resultTitle.className = 'result-title';
    setCoachModalSnapshot(cue.snapshot === true);

    const winner = cue.winner;
    const phase = cue.phase;
    let scoreLine: string;
    if (winner === 'DRAW') {
      if (phase === 'resignAgreedStatement') {
        resultTitle.textContent = 'RESIGNATION AGREED — DRAW';
        scoreLine = `${creamName} bead resigned; ${blackName} bead agreed. The game is a draw.`;
      } else if (phase === 'resignAcceptedDraw') {
        resultTitle.textContent = 'DRAW';
        scoreLine = 'Black bead accepted resign.';
      } else if (phase === 'resignAgreedCongrats') {
        resultTitle.textContent = "WELL PLAYED! IT'S A DRAW";
        scoreLine = 'Draw — resignation agreed by both players.';
      } else {
        resultTitle.textContent = "WELL PLAYED! IT'S A DRAW";
        scoreLine = `Tied in captures (${redCaps} vs ${blueCaps} beads)`;
      }
      resultTitle.classList.add('draw');
    } else if (winner === 'RED') {
      if (phase === 'congrats') {
        resultTitle.textContent = 'CONGRATULATIONS! CREAM BEAD WON!';
        scoreLine = 'Cream bead won by a capture of 2 beads more.';
        resultTitle.classList.add('victory');
      } else {
        resultTitle.textContent = `CONGRATULATIONS! ${creamName.toUpperCase()} WON!`;
        const diff = redCaps - blueCaps;
        scoreLine =
          diff > 0
            ? `Won by ${diff} bead capture${diff === 1 ? '' : 's'} (${redCaps} vs ${blueCaps})`
            : `${creamName} won (${redCaps} vs ${blueCaps} beads)`;
        resultTitle.classList.add('victory');
      }
    } else {
      if (phase === 'resignDeclinedCongrats') {
        resultTitle.textContent = 'CONGRATULATIONS! BLACK BEAD WON!';
        scoreLine = 'Black bead won as cream bead resign got declined.';
        resultTitle.classList.add('victory');
      } else {
        resultTitle.textContent = `CONGRATULATIONS! ${blackName.toUpperCase()} WON!`;
        const diff = blueCaps - redCaps;
        scoreLine =
          diff > 0
            ? `Won by ${diff} bead capture${diff === 1 ? '' : 's'} (${blueCaps} vs ${redCaps})`
            : `${blackName} won (${blueCaps} vs ${redCaps} beads)`;
      }
      resultTitle.classList.add('victory');
    }

    resultDesc.textContent = cue.reason ? `${scoreLine} • ${cue.reason}` : scoreLine;
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

  function updateCoachVideoPanel(timeMs = coachVideoPlayer?.getTimeMs() ?? 0): void {
    coachPanel?.classList.remove('is-hidden');
    if (coachLessonTitle) coachLessonTitle.textContent = COACH_VIDEO.title;
    if (coachLessonBody) {
      coachLessonBody.innerHTML = renderCoachPanelHtml({
        intro: COACH_VIDEO.intro,
        points: COACH_VIDEO.points,
        emphasizedPointIndex: coachPanelPointIndexAtTime(timeMs),
      });
    }
  }

  function syncCoachFinishCaptureDemo(timeMs: number): void {
    if (!isCoachMode()) return;
    updateCoachVideoPanel(timeMs);
    updateUI();
  }

  function initCoachVideoPlayer(autoPlay = false): void {
    stopCoachVideo();
    undoCtl.reset();
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
        syncCoachFinishCaptureDemo(ms);
      },
      onApplyKeyframe: (keyframe) => {
        applyCoachVideoKeyframe(session, keyframe);
        updateUI();
      },
      onApplyHighlight: (highlight) => {
        applyCoachVideoHighlight(session, COACH_VIDEO.keyframes, highlight);
        updateUI();
      },
      onApplyCue: (cue) => {
        syncCoachVideoCue(cue);
      },
      onApplySegmentBanner: (banner) => {
        if (
          banner &&
          (banner.title === 'WIN' || banner.title === 'RESIGN' || banner.title === 'DRAW')
        ) {
          const ms = coachVideoPlayer?.getTimeMs() ?? banner.atMs;
          clearMoveFeedback();
          applyCoachVideoKeyframe(
            session,
            findCoachKeyframeAt(ms, COACH_VIDEO.keyframes, COACH_VIDEO.moves),
          );
          updateUI();
        }
        triggerCoachSegmentBanner(banner);
      },
      onPlayMove: (move, onDone) => {
        playAnimated({ from: move.from, to: move.to }, move.player, () => {
          turnCaptures = 0;
          onDone();
          updateUI();
        });
      },
      onSpeak: (speech) => {
        const isFinishSpeech = speech.text === COACH_FINISH_CAPTURE_SPEECH_TEXT;
        speakCoachText(speech.text, () => {
          if (isFinishSpeech) scheduleWinSegmentAfterFinishCaptureVoice();
        });
      },
      onPlayingChange: (playing) => {
        syncCoachVideoControls(coachVideoPlayer?.getTimeMs() ?? 0, playing);
        if (playing && coachVideoPlayer) {
          triggerCoachSegmentBanner(
            findCoachSegmentBannerAtTime(
              coachVideoPlayer.getTimeMs(),
              COACH_VIDEO.segmentBanners ?? [],
            ),
          );
        } else if (!playing) {
          stopCoachVoice();
        }
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
  if (startBoardSelect) {
    populateBoardSelect(startBoardSelect);
  }

  function isCoachMode(): boolean {
    return session.getSettings().mode === 'coach';
  }

  const boardSettingsPanel = createBoardSettingsPanel(
    {
      centerRuleSelect,
      timerSelect,
      tournamentTimerSelect,
      tournamentTimerSetting,
      shotClockSelect,
      aiLevelSelect,
      coachLevelSelect,
    },
    {
      getCurrentBoardId: () => currentBoardId,
      isCoachMode,
      readGameMode,
    },
  );

  boardSettingsPanel.syncAiLevelOptions();
  boardSettingsPanel.syncCoachLevelOptions();

  function syncCoachShellUi(): void {
    const coach = isCoachMode();
    if (!coach) {
      coachPanel?.classList.add('is-hidden');
      if (coachVideoPlayer !== null) {
        stopCoachVideo();
      }
    }
    boardSelect.disabled = coach;
    if (startBoardSelect) startBoardSelect.disabled = coach;
    centerRuleSelect.disabled = coach;
    timerSelect.disabled = coach;
    if (tournamentTimerSelect) tournamentTimerSelect.disabled = coach;
    shotClockSelect.disabled = coach;
    aiLevelSelect.disabled = coach;
    if (coachLevelSelect) coachLevelSelect.disabled = coach;
    if (hubModeSelect) hubModeSelect.disabled = coach;
    setRestartBtnLabel(coach);
  }

  function setRestartBtnLabel(coach: boolean): void {
    if (coach) {
      restartBtn.textContent = 'Restart video';
    } else {
      restartBtn.innerHTML = '<span class="new-game-new">New</span> game';
    }
  }

  function launchCoachLesson(): void {
    if (timerId) clearInterval(timerId);
    cancelAnimationFrame(pulseRaf);
    cancelAnimationFrame(animRaf);
    cancelAiWork();
    aiThinking = false;

    currentBoardId = COACH_VIDEO_BOARD_ID;
    boardSelect.value = COACH_VIDEO_BOARD_ID;
    if (startBoardSelect) startBoardSelect.value = COACH_VIDEO_BOARD_ID;
    syncBoardTitle();
    boardSettingsPanel.syncBoardPlayOptions();
    boardSettingsPanel.applyBoardDefaults(COACH_VIDEO_BOARD_ID);

    session = createSession(COACH_VIDEO_BOARD_ID, buildCoachLessonSettings());
    session.reset();
    session.resetTurnClock();

    applyCanvasSizeForBoard();
    resultModal.style.display = 'none';
    resultModal.classList.remove('animate');
    resignOfferModal.style.display = 'none';
    resignationCtl.clearPendingResignPlayer();

    if (startScreenOverlay) startScreenOverlay.classList.add('hidden');
    if (hubModeSelect) hubModeSelect.value = 'pve';

    syncCoachShellUi();
    syncModeUi();
    initCoachVideoPlayer(true);
    undoBtn.disabled = true;
    pulseRaf = requestAnimationFrame(loopPulse);

    if (bgmSelect.value && bgmAudio.paused) {
      if (!bgmAudio.src) bgmAudio.src = bgmSelect.value;
      bgmAudio.play().catch(() => {});
    }
    soundEffects.playGameStart();
  }

  function isCoachWatchMode(): boolean {
    return readGameMode() === 'spectate';
  }

  function readRawSettings(): GameFeatureSettings {
    const aiLevel = clampUiAiLevel(parseInt(aiLevelSelect.value, 10));
    return {
      mode: readGameMode(),
      aiLevel,
      timer: timerSelect.value as GameFeatureSettings['timer'],
      tournamentTimer: tournamentTimerSelect.value as GameFeatureSettings['tournamentTimer'],
      shotClock: shotClockSelect.value as GameFeatureSettings['shotClock'],
      centerRule: centerRuleSelect.value as GameFeatureSettings['centerRule'],
    };
  }

  const settingHelpPairs: Array<{
    btn: HTMLButtonElement | null;
    text: HTMLParagraphElement | null;
  }> = [
    { btn: timerHelpBtn, text: timerHelpText },
    { btn: tournamentTimerHelpBtn, text: tournamentTimerHelpText },
    { btn: shotClockHelpBtn, text: shotClockHelpText },
    { btn: centerRuleHelpBtn, text: centerRuleHelpText },
  ];

  function closeAllSettingHelp(except?: HTMLParagraphElement): void {
    for (const { btn, text } of settingHelpPairs) {
      if (!btn || !text || text === except) continue;
      text.hidden = true;
      btn.setAttribute('aria-expanded', 'false');
      btn.classList.remove('is-open');
    }
  }

  function toggleSettingHelp(btn: HTMLButtonElement, text: HTMLParagraphElement): void {
    const willOpen = text.hidden;
    closeAllSettingHelp(willOpen ? text : undefined);
    text.hidden = !willOpen;
    btn.setAttribute('aria-expanded', String(willOpen));
    btn.classList.toggle('is-open', willOpen);
  }

  function readCoachWatchSettings(): GameFeatureSettings {
    const coachLevel = coachLevelSelect ? clampUiAiLevel(parseInt(coachLevelSelect.value, 10)) : 3;
    const aiLevel = clampUiAiLevel(parseInt(aiLevelSelect.value, 10));
    return normalizeTimerSettings(
      buildCoachWatchSettings({
        coachRedLevel: coachLevel,
        coachBlueLevel: aiLevel,
        timer: timerSelect.value as GameFeatureSettings['timer'],
        shotClock: shotClockSelect.value as GameFeatureSettings['shotClock'],
        centerRule: centerRuleSelect.value as GameFeatureSettings['centerRule'],
      }),
    );
  }

  /** Mode from page-1 hub `#hub-mode-select` (not duplicated in Settings). */
  function readGameMode(): GameFeatureSettings['mode'] {
    return (hubModeSelect?.value ?? 'pve') as GameFeatureSettings['mode'];
  }

  function hasPlayHub(): boolean {
    return !!document.getElementById('play-hub');
  }

  function renderSessionScore(): void {
    const hasSessionScore = sessionScore.RED > 0 || sessionScore.BLUE > 0;
    const scoreRowP1 = document.getElementById('session-score-row-p1');
    const scoreRowP2 = document.getElementById('session-score-row-p2');
    if (scoreRowP1) scoreRowP1.hidden = !hasSessionScore;
    if (scoreRowP2) scoreRowP2.hidden = !hasSessionScore;
    const scoreP1 = document.getElementById('p1-session-score');
    const scoreP2 = document.getElementById('p2-session-score');
    if (scoreP1) scoreP1.textContent = `${sessionScore.RED}W`;
    if (scoreP2) scoreP2.textContent = `${sessionScore.BLUE}W`;
  }

  function returnToHub(): void {
    leaveOnline();
    if (timerId) clearInterval(timerId);
    timerId = null;
    cancelAiWork();
    stopCoachVideo();
    sessionScore = { RED: 0, BLUE: 0 };
    document.getElementById('play-shell')?.classList.add('is-hidden');
    document.getElementById('play-hub')?.classList.remove('is-hidden');
  }

  function readSettings(): GameFeatureSettings {
    if (isCoachWatchMode()) {
      return readCoachWatchSettings();
    }
    return normalizeTimerSettings(readRawSettings());
  }

  function syncBoardTitle(): void {
    const entry = getCatalogEntry(currentBoardId);
    if (entry) {
      document.title = `Smart Bead Chess — ${entry.displayName}`;
    }
  }

  function syncStartBoardSelect(): void {
    if (startBoardSelect) startBoardSelect.value = currentBoardId;
  }

  function isAwaitingStart(): boolean {
    return !!startScreenOverlay && !startScreenOverlay.classList.contains('hidden');
  }

  function showStartScreen(): void {
    if (!startScreenOverlay) {
      if (hasPlayHub()) returnToHub();
      return;
    }
    if (timerId) clearInterval(timerId);
    timerId = null;
    cancelAiWork();
    if (hubModeSelect) {
      hubModeSelect.value = session.getSettings().mode;
    }
    syncStartBoardSelect();
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
    undoCtl.reset();
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
    if (online) return online.session.seat === 'RED' ? 'You (Cream)' : 'Friend (Cream)';
    const name = creamNameInput?.value.trim();
    return name || 'Cream side';
  }

  function blackPlayerLabel(): string {
    const settings = session.getSettings();
    if (settings.mode === 'spectate') {
      return `AI · ${formatAiLevelLabel(aiLevelForActingPlayer(settings, 'BLUE'))}`;
    }
    if (settings.mode === 'coach' || settings.mode === 'pve') {
      return `AI · ${formatAiLevelLabel(settings.aiLevel)}`;
    }
    if (online) return online.session.seat === 'BLUE' ? 'You (Black)' : 'Friend (Black)';
    const name = blackNameInput?.value.trim();
    return name || 'Black side';
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
    boardSettingsPanel.syncTimerSettingLocks();
  }

  function interMoveDelayMs(): number {
    return session.getSettings().mode === 'spectate'
      ? spectateInterMoveDelayMs(currentBoardId)
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
    aiSearchClient?.cancel();
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
    // Phone widths use a taller canvas for some boards — re-apply if the width class changed.
    const wanted = getBoardCanvasSize(session.getEngine().getState().board.name);
    if (canvas.width !== wanted.width || canvas.height !== wanted.height) {
      applyCanvasSizeForBoard();
    } else {
      fitCanvasToFrame(canvas);
    }
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

  // Clone-and-hide-the-from-bead only needs to happen once per animation, not
  // once per frame — state.board never changes until the animation ends and
  // applyMove() runs, so every frame of the same anim can reuse one clone
  // (perf, 2026-09-22 audit). Keyed on `anim` object identity: playAnimated()
  // creates a fresh object per move and mutates `.t` in place on it, so a
  // reference match means "same move, later frame".
  let animBoardCache: {
    anim: BoardAnimState;
    board: ReturnType<typeof cloneBoardDefinition>;
  } | null = null;

  function boardForAnim(
    activeAnim: BoardAnimState,
    liveBoard: ReturnType<typeof cloneBoardDefinition>,
  ) {
    if (animBoardCache?.anim !== activeAnim) {
      const cloned = cloneBoardDefinition(liveBoard);
      const fromNode = cloned.intersections[activeAnim.from];
      if (fromNode) {
        fromNode.occupant = undefined;
      }
      animBoardCache = { anim: activeAnim, board: cloned };
    }
    return animBoardCache.board;
  }

  function drawBoard(): void {
    // Skip the drift-repair check while animating — nothing can drift from
    // another tab/HMR in a single move's ~200-300ms animation window, and
    // it's checked again on the very next non-animating draw regardless.
    // Cuts 2 localStorage reads + DOM attr reads per animation frame
    // (perf, 2026-09-22 audit).
    if (!anim) syncPlayLookFromStorageIfDrifted();
    const state = session.getEngine().getState();
    const board = anim ? boardForAnim(anim, state.board) : state.board;
    drawCanvasBoard(canvas, {
      board,
      currentPlayer: state.currentPlayer,
      gameOver: session.isGameOver(),
      selectedId: session.getSelectedId(),
      legalTargets: session.getLegalTargetIds(),
      chainPieceId: session.getEngine().getChainPieceId(),
      anim,
      turnPulse,
      showTurnStartRings: session.shouldShowTurnStartRings(),
      lastMove,
      capturePulses: activeCapturePulses(),
      coachGlowNodeIds: session.getCoachGlowNodeIds(),
      moveHintAura: readMoveHintAuraFromUi(),
      keyboardFocusId: document.activeElement === canvas ? keyboardFocusId : null,
    });
  }

  function readMoveHintAuraFromUi(): ReturnType<typeof resolveMoveHintAuraStyle> {
    const select = document.getElementById('move-hint-aura-select') as HTMLSelectElement | null;
    const toggle =
      select && isMoveHintAuraToggle(select.value) ? select.value : readMoveHintAuraToggle();
    return resolveMoveHintAuraStyle(toggle);
  }

  /** Full label stays in textContent; the " · level" part is a span so phones can hide it. */
  function setPanelName(el: HTMLElement, label: string): void {
    const sep = label.indexOf(' · ');
    if (sep < 0) {
      el.textContent = label;
      return;
    }
    const level = document.createElement('span');
    level.className = 'panel-name-level';
    level.textContent = label.slice(sep);
    el.replaceChildren(label.slice(0, sep), level);
  }

  function updateUI(): void {
    syncPlayLookFromStorageIfDrifted();
    const state = session.getEngine().getState();
    const settings = session.getSettings();
    const redPieces = session.getEngine().countPieces('RED');
    const bluePieces = session.getEngine().countPieces('BLUE');
    const centerScores = session.getCenterDisplayScores();

    setPanelName(document.getElementById('black-panel-name') as HTMLElement, blackPlayerLabel());
    setPanelName(document.getElementById('cream-panel-name') as HTMLElement, creamPlayerLabel());
    (document.getElementById('black-panel-role') as HTMLElement).textContent =
      settings.mode === 'spectate'
        ? '(AI)'
        : settings.mode === 'pve' || settings.mode === 'coach'
          ? '(AI)'
          : '(Human)';
    (document.getElementById('cream-panel-role') as HTMLElement).textContent =
      settings.mode === 'spectate' ? '(AI)' : settings.mode === 'coach' ? '(Lesson)' : '(Human)';

    renderSessionScore();

    (document.getElementById('top-p1-capture') as HTMLElement).textContent = String(
      state.captures.RED,
    );
    (document.getElementById('top-p2-capture') as HTMLElement).textContent = String(
      state.captures.BLUE,
    );
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
    (document.getElementById('turn-count') as HTMLElement).textContent = String(
      session.getMoveCount(),
    );

    // Screen-reader-only live summary — the canvas itself has no accessible
    // state (2026-09-22 audit). Only write when the text actually changes;
    // updateUI() runs far more often than the summary does (e.g. every
    // second on a timer tick), and rewriting an unchanged aria-live region
    // would spam repeat announcements.
    const boardStatusText = session.isGameOver()
      ? `Game over. Cream captures ${state.captures.RED}, Black captures ${state.captures.BLUE}.`
      : `${state.currentPlayer === 'RED' ? 'Cream' : 'Black'}'s turn. ` +
        `Captures: Cream ${state.captures.RED}, Black ${state.captures.BLUE}. ` +
        `Beads left: Cream ${redPieces}, Black ${bluePieces}.`;
    if (boardStatusText !== lastBoardStatusText) {
      lastBoardStatusText = boardStatusText;
      const statusEl = document.getElementById('board-status');
      if (statusEl) statusEl.textContent = boardStatusText;
    }

    undoCtl.syncButtonState();
    resignBtn.disabled = online ? !onlineMyTurn() : !canOfferResignation();
    if (online) undoBtn.disabled = true;
    renderOnlineBar();

    syncModeUi();

    const coachFinishDemo =
      coachVideoPlayer !== null && isCoachFinishCaptureDemoActive(coachVideoPlayer.getTimeMs());
    const chainOpen = session.getEngine().getChainPieceId() !== null;
    const showFinishCapture =
      coachFinishDemo || (chainOpen && session.canHumanAct() && !animating && !aiThinking);
    if (finishBtn) {
      finishBtn.hidden = !showFinishCapture;
      finishBtn.classList.toggle('visible', showFinishCapture);
      finishBtn.classList.toggle('coach-demo', coachFinishDemo);
      finishBtn.disabled = !showFinishCapture || coachFinishDemo;
    }

    const tournamentActive = isTournamentTimerActive(settings);
    const timerLimitSec = parseTimerSeconds(
      tournamentActive ? settings.tournamentTimer : settings.timer,
    );
    const shotLimit = session.getShotLimit();
    const timerP1El = document.getElementById('timer-mmss-p1');
    const timerP2El = document.getElementById('timer-mmss-p2');
    const matchRingP1El = document.getElementById('match-ring-p1');
    const matchRingP2El = document.getElementById('match-ring-p2');
    if (tournamentActive) {
      const p1Clock = session.getP1Clock();
      const p2Clock = session.getP2Clock();
      updatePlayerTimerMmss(timerP1El, p1Clock, timerLimitSec);
      updatePlayerTimerMmss(timerP2El, p2Clock, timerLimitSec);
      updateMatchRing(matchRingP1El, p1Clock, timerLimitSec, p1Clock <= 5 && p1Clock > 0);
      updateMatchRing(matchRingP2El, p2Clock, timerLimitSec, p2Clock <= 5 && p2Clock > 0);
    } else if (timerLimitSec > 0) {
      const sharedRem = session.getGlobalMatchRemaining();
      updatePlayerTimerMmss(timerP1El, sharedRem, timerLimitSec);
      updatePlayerTimerMmss(timerP2El, sharedRem, timerLimitSec);
      updateMatchRing(matchRingP1El, 0, 0, false);
      updateMatchRing(matchRingP2El, 0, 0, false);
    } else {
      updatePlayerTimerMmss(timerP1El, 0, 0);
      updatePlayerTimerMmss(timerP2El, 0, 0);
      updateMatchRing(matchRingP1El, 0, 0, false);
      updateMatchRing(matchRingP2El, 0, 0, false);
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

    if (
      session.isGameOver() &&
      resignationCtl.getPendingResignPlayer() === null &&
      !isCoachMode()
    ) {
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
        scoreLine = drawScoreLine(redCaps, blueCaps);
      } else if (winner === 'RED') {
        const diff = redCaps - blueCaps;
        if (isHumanVsAiMode(settings.mode)) {
          resultTitle.textContent = 'CONGRATULATIONS! YOU WON!';
          scoreLine =
            diff > 0
              ? `You won by ${diff} bead${diff > 1 ? 's' : ''} (${redCaps} vs ${blueCaps})`
              : `You won (${redCaps} vs ${blueCaps} beads)`;
        } else {
          resultTitle.textContent = `CONGRATULATIONS! ${creamName.toUpperCase()} WON!`;
          scoreLine =
            diff > 0
              ? `${creamName} won by ${diff} bead${diff > 1 ? 's' : ''} (${redCaps} vs ${blueCaps})`
              : `${creamName} won (${redCaps} vs ${blueCaps} beads)`;
        }
        resultTitle.classList.add('victory');
      } else if (winner === 'BLUE') {
        const diff = blueCaps - redCaps;
        if (isHumanVsAiMode(settings.mode)) {
          resultTitle.textContent = 'WELL PLAYED! BETTER LUCK NEXT TIME';
          scoreLine =
            diff > 0
              ? `${blackName} won by ${diff} bead${diff > 1 ? 's' : ''} (${blueCaps} vs ${redCaps})`
              : `${blackName} won (${blueCaps} vs ${redCaps} beads)`;
          resultTitle.classList.add('defeat');
        } else {
          resultTitle.textContent = `CONGRATULATIONS! ${blackName.toUpperCase()} WON!`;
          scoreLine =
            diff > 0
              ? `${blackName} won by ${diff} bead${diff > 1 ? 's' : ''} (${blueCaps} vs ${redCaps})`
              : `${blackName} won (${blueCaps} vs ${redCaps} beads)`;
          resultTitle.classList.add('victory');
        }
      }

      const reason = session.getDisplayedReason();
      resultDesc.textContent = composeResultDescription(scoreLine, reason);

      if (!resultModalDismissed) {
        resultModal.style.display = 'flex';
        if (!lastGameOverPlayed) {
          lastGameOverPlayed = true;
          if (winner === 'RED' || winner === 'BLUE') {
            sessionScore[winner] += 1;
            renderSessionScore();
          }
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
      } else {
        resultModal.style.display = 'none';
      }
    } else if (resignationCtl.getPendingResignPlayer() === null) {
      resultModal.style.display = 'none';
      resultModal.classList.remove('animate');
      lastGameOverPlayed = false;
      resultModalDismissed = false;
    }

    syncLookPreviewLock();
    drawBoard();
  }

  let lastClockMs = performance.now();
  let clockCarryMs = 0;

  /** Clocks follow real time: a throttled or hidden tab owes the ticks it missed. */
  function runClockTick(): void {
    const nowMs = performance.now();
    const owed = wallClockTicks(nowMs - lastClockMs, clockCarryMs);
    lastClockMs = nowMs;
    clockCarryMs = owed.carryMs;
    if (online) return; // the server owns the clocks and pushes them every second
    if (
      shellTimerShouldSkip({
        gameOver: session.isGameOver(),
        aiThinking,
        animating,
      })
    )
      return;
    if (owed.ticks === 0) return;
    // Clocks must keep running during AI think and piece animation.
    // Freezing on aiThinking made Ebony immune to shot clock in PvE.
    for (let i = 0; i < owed.ticks && !session.isGameOver(); i++) session.timerTick();
    const shotRem = session.getShotRemaining();
    const timerRem = session.getGlobalMatchRemaining();
    const shotLimit = session.getShotLimit();
    const settingsNow = session.getSettings();
    const timerLimit = parseTimerSeconds(
      isTournamentTimerActive(settingsNow) ? settingsNow.tournamentTimer : settingsNow.timer,
    );
    const tournamentActive = isTournamentTimerActive(settingsNow);
    const currentPlayer = session.getEngine().getState().currentPlayer;
    const lowTimerRem = tournamentActive
      ? currentPlayer === 'RED'
        ? session.getP1Clock()
        : session.getP2Clock()
      : timerRem;
    if (
      (shotLimit > 0 && shotRem <= 3 && shotRem > 0) ||
      (timerLimit > 0 && !tournamentActive && timerRem <= 5 && timerRem > 0) ||
      (timerLimit > 0 && tournamentActive && lowTimerRem <= 5 && lowTimerRem > 0)
    ) {
      soundEffects.playTimerWarning();
    }
    updateUI();
  }

  function startTimers(): void {
    if (timerId) clearInterval(timerId);
    lastClockMs = performance.now();
    clockCarryMs = 0;
    timerId = setInterval(runClockTick, 1000);
  }

  // A returning hidden tab settles the ticks it missed at once, not up to a second later.
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) runClockTick();
  });

  /** The pulsing turn-start rings (match start, nothing picked yet) are the only thing on the board that moves without a game event. */
  function turnStartRingsPulsing(): boolean {
    return (
      session.shouldShowTurnStartRings() &&
      session.getSelectedId() === null &&
      session.getLegalTargetIds().length === 0
    );
  }

  /** Nothing moves while idle, so the board is repainted this often at most (keeps the cross-tab look sync in drawBoard). */
  const IDLE_REPAINT_MS = 1000;
  let lastRepaintMs = 0;
  /** Players who ask for reduced motion get static rings (no pulsing). */
  const reducedMotion =
    typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-reduced-motion: reduce)')
      : null;

  function loopPulse(ts: number): void {
    // Request the next frame first: a draw that throws must not stop the loop for good.
    pulseRaf = requestAnimationFrame(loopPulse);
    const still = reducedMotion?.matches === true;
    turnPulse = still ? 0 : ts / 280;
    const now = performance.now();
    for (let i = capturePulseStarts.length - 1; i >= 0; i -= 1) {
      if (now - capturePulseStarts[i]!.startMs >= CAPTURE_PULSE_MS) {
        capturePulseStarts.splice(i, 1);
      }
    }
    const pulsesActive = capturePulseStarts.length > 0;
    if (animating && !pulsesActive) return;
    if (
      pulsesActive ||
      (!still && turnStartRingsPulsing()) ||
      now - lastRepaintMs >= IDLE_REPAINT_MS
    ) {
      lastRepaintMs = now;
      drawBoard();
    }
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

  /** Shared by __SB_TEST__.snapshot and browser gates (human ply before AI). */
  function buildLiveSnap() {
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
      keyboardFocusId,
      screenNodes: screenNodes(),
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
      turnStartRingsPending: session.shouldShowTurnStartRings(),
    };
  }

  function captureHumanPlySnapForGate(player: Player): void {
    if (player !== 'RED') return;
    const api = (
      window as unknown as {
        __SB_TEST__?: { lastHumanPlySnap?: ReturnType<typeof buildLiveSnap> | null };
      }
    ).__SB_TEST__;
    if (api) api.lastHumanPlySnap = buildLiveSnap();
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
    const capturedPlayer =
      captured !== undefined ? state.board.intersections[captured]!.occupant : undefined;

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
          captureHumanPlySnapForGate(player);
        } catch {
          completeAiTurnIfChainOpen(session);
          if (
            player === 'BLUE' &&
            !session.isGameOver() &&
            session.getEngine().getState().currentPlayer === 'BLUE'
          ) {
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

    const planFor = settings.mode === 'spectate' ? actingPlayer : undefined;
    if (!aiSearchClient) {
      continueAutomatedTurn(runId, actingPlayer, planAiTurnPath(session, planFor));
      return;
    }
    // Browser: search runs in a Web Worker so the page stays responsive while the AI thinks.
    let req: ReturnType<typeof buildAiPlanRequest>;
    try {
      req = buildAiPlanRequest(session, planFor);
    } catch (err) {
      continueAutomatedTurn(runId, actingPlayer, emergencyLegalPath(session, err));
      return;
    }
    aiSearchClient.plan(req).then(
      (planned) => {
        if (runId !== aiRunId) return;
        continueAutomatedTurn(
          runId,
          actingPlayer,
          planned?.length ? planned : emergencyLegalPath(session, 'worker returned an empty path'),
        );
      },
      (err: unknown) => {
        if (err instanceof AiSearchCancelled || runId !== aiRunId) return;
        // Worker unavailable/crashed: same full-strength search on the main thread (page may pause).
        console.error(
          '[AI] worker search failed; retrying at full strength on the main thread.',
          err,
        );
        continueAutomatedTurn(runId, actingPlayer, planAiTurnPath(session, planFor));
      },
    );
  }

  function continueAutomatedTurn(runId: number, actingPlayer: Player, path: Move[] | null): void {
    if (runId !== aiRunId) return;
    const settings = session.getSettings();
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

    undoCtl.pushSnapshot();

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

      const move = path![i]!;
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
        session.previewScriptedSelection(move.from);
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

  // ---- Online play (A4) ----
  const onlineBar = document.getElementById('online-bar') as HTMLDivElement | null;
  const onlineBarText = document.getElementById('online-bar-text');
  const onlineCopyBtn = document.getElementById('online-copy-btn') as HTMLButtonElement | null;
  let onlineNotice = '';

  function onlineSettings(): GameFeatureSettings {
    const base = getPlayConfig(currentBoardId).defaultSettings;
    return { ...base, mode: 'pvp', ...online!.session.settings };
  }

  function onlineMyTurn(): boolean {
    const v = online?.view;
    return (
      !!online &&
      !!v &&
      v.started &&
      !v.gameOver &&
      v.pendingResign === null &&
      v.currentPlayer === online.session.seat
    );
  }

  function renderOnlineBar(): void {
    if (!onlineBar || !onlineBarText) return;
    onlineBar.hidden = online === null;
    if (!online) return;
    const v = online.view;
    const you = online.session.seat === 'RED' ? 'Cream' : 'Black';
    const code = online.session.code;
    let text: string;
    if (!v || !v.started) text = `Room ${code} · you are ${you} · waiting for your friend to join`;
    else if (v.gameOver) text = `Room ${code} · game over`;
    else if (v.pendingResign) text = `Room ${code} · resignation offer waiting for an answer`;
    else
      text = `Room ${code} · you are ${you} · ${onlineMyTurn() ? 'your turn' : 'friend is thinking'}`;
    if (online.client.getStatus() === 'polling') text += ' · slow connection';
    if (onlineNotice) text += ` · ${onlineNotice}`;
    if (onlineBarText.textContent !== text) onlineBarText.textContent = text;
  }

  async function sendOnline(intent: Intent): Promise<void> {
    if (!online) return;
    const r = await online.client.sendIntent(intent);
    if ('error' in r) {
      onlineNotice = r.error;
      renderOnlineBar();
    }
  }

  function applyOnlineView(view: RoomView): void {
    if (!online) return;
    const prev = online.view;
    online.view = view;
    onlineNotice = '';
    session.loadSnapshot(snapshotFromView(session.exportSnapshot(), view));
    if (prev && view.moveCount !== prev.moveCount && view.chainPieceId === null) {
      session.clearArmedSelection();
    }
    if (view.pendingResign && view.pendingResign !== online.session.seat && !view.gameOver) {
      resignOfferDesc.textContent = `${sideDisplayName(view.pendingResign)} offers resignation. Agree to a draw?`;
      resignOfferModal.style.display = 'flex';
    } else if (resignOfferModal.style.display !== 'none') {
      resignOfferModal.style.display = 'none';
    }
    if (view.started && !prev?.started) {
      triggerStartBanner();
      soundEffects.playGameStart();
    }
    updateUI();
  }

  function leaveOnline(): void {
    if (!online) return;
    online.client.close();
    online = null;
    saveOnlineSession(null);
    resignOfferModal.style.display = 'none';
    renderOnlineBar();
  }

  /** New game / Play again online: there is no local restart, so go back to the start page (asks first mid-game). */
  function leaveOnlineGame(): void {
    if (online && !online.view?.gameOver && !window.confirm('Leave this online game?')) return;
    returnToHub();
  }

  function enterOnline(game: OnlineGame): void {
    leaveOnline();
    syncPlayShellThemeFromStorage();
    online = { client: game.client, session: game.session, view: null };
    saveOnlineSession(game.session);
    currentBoardId = game.session.boardId;
    boardSelect.value = currentBoardId;
    syncBoardTitle();
    if (hubModeSelect) hubModeSelect.value = 'pvp';
    stopCoachVideo();
    startScreenOverlay?.classList.add('hidden');
    resetGame();
    game.client.onView = applyOnlineView;
    game.client.onError = (message) => {
      onlineNotice = message;
      renderOnlineBar();
    };
    game.client.onStatus = () => renderOnlineBar();
    game.client.connect();
    renderOnlineBar();
  }

  onlineCopyBtn?.addEventListener('click', () => {
    if (!online) return;
    const code = online.session.code;
    void navigator.clipboard?.writeText(code).then(
      () => {
        onlineNotice = 'code copied';
        renderOnlineBar();
      },
      () => {},
    );
  });

  function handleCanvasClick(ev: MouseEvent): void {
    if (isAwaitingStart()) return;
    dismissStartBanner();
    if (session.isGameOver() || aiThinking || animating) return;
    if (!session.canHumanAct()) return;
    if (online && !onlineMyTurn()) return;

    const nodeId = hitTestNode(
      canvas,
      session.getEngine().getState().board,
      ev.clientX,
      ev.clientY,
    );
    if (nodeId < 0) return;
    activateNode(nodeId);
  }

  /** Pick or place on a node: the one path shared by mouse / touch and the keyboard. */
  function activateNode(nodeId: number): void {
    const state = session.getEngine().getState();

    const click = session.interpretClick(nodeId);
    if (click.kind === 'select') {
      soundEffects.playSelect();
      session.selectNode(click.nodeId);
      updateUI();
      return;
    }
    if (click.kind === 'move') {
      if (online) {
        void sendOnline({ type: 'move', from: click.move.from, to: click.move.to });
        session.clearArmedSelection();
        updateUI();
        return;
      }
      undoCtl.pushSnapshot();
      executeMoveAnimated(click.move, state.currentPlayer);
    }
  }

  // Keyboard play (W3): Tab to the board, arrows move the focus ring, Enter / Space pick and place.
  let keyboardFocusId: number | null = null;

  function screenNodes(): ScreenNode[] {
    const board = session.getEngine().getState().board;
    const out: ScreenNode[] = [];
    for (const n of board.intersections) {
      if (n.x === undefined || n.y === undefined) continue;
      const p = projectIntersectionOnCanvas(n, canvas.width, canvas.height, board);
      out.push({ id: n.id, x: p.x, y: p.y });
    }
    return out;
  }

  function announceKeyboardFocus(): void {
    const el = document.getElementById('board-focus-status');
    if (!el || keyboardFocusId === null) return;
    const node = session.getEngine().getState().board.intersections[keyboardFocusId];
    if (!node) return;
    el.textContent = describeNode({
      label: node.label ?? String(node.id),
      occupant: node.occupant,
      selected: session.getSelectedId() === node.id,
      legalTarget: session.getLegalTargetIds().includes(node.id),
    });
  }

  /** First focus: the picked bead, else the first bead that can move, else the first node. */
  function startingKeyboardNode(): number {
    const selected = session.getSelectedId();
    if (selected !== null) return selected;
    const first = session.getEngine().getLegalMoves()[0];
    return first ? first.from : 0;
  }

  function handleCanvasKeydown(ev: KeyboardEvent): void {
    if (ev.altKey || ev.ctrlKey || ev.metaKey) return;
    if (isArrowKey(ev.key)) {
      ev.preventDefault();
      if (keyboardFocusId === null) keyboardFocusId = startingKeyboardNode();
      else {
        const next = nextNodeInDirection(screenNodes(), keyboardFocusId, ev.key);
        if (next !== null) keyboardFocusId = next;
      }
      announceKeyboardFocus();
      drawBoard();
      return;
    }
    if (ev.key === 'Enter' || ev.key === ' ') {
      ev.preventDefault();
      if (keyboardFocusId === null) keyboardFocusId = startingKeyboardNode();
      if (isAwaitingStart()) return;
      dismissStartBanner();
      if (session.isGameOver() || aiThinking || animating || !session.canHumanAct()) return;
      if (online && !onlineMyTurn()) return;
      activateNode(keyboardFocusId);
      announceKeyboardFocus();
    }
  }

  canvas.addEventListener('keydown', handleCanvasKeydown);
  canvas.addEventListener('focus', () => {
    if (keyboardFocusId === null) keyboardFocusId = startingKeyboardNode();
    announceKeyboardFocus();
    drawBoard();
  });
  canvas.addEventListener('blur', () => drawBoard());

  function resetGame(): void {
    if (timerId) clearInterval(timerId);
    cancelAnimationFrame(pulseRaf);
    cancelAnimationFrame(animRaf);
    cancelAiWork();
    undoCtl.reset();
    anim = null;
    animating = false;
    aiThinking = false;
    turnCaptures = 0;
    clearMoveFeedback();
    prevCaptures = { RED: 0, BLUE: 0 };
    const testApi = (window as unknown as { __SB_TEST__?: { lastHumanPlySnap?: null } })
      .__SB_TEST__;
    if (testApi) testApi.lastHumanPlySnap = null;

    const wasCoach = session.getSettings().mode === 'coach';
    if (wasCoach) {
      session = createSession(COACH_VIDEO_BOARD_ID, buildCoachLessonSettings());
      session.reset();
      initCoachVideoPlayer(false);
    } else {
      const settings = online ? onlineSettings() : readSettings();
      session = createSession(currentBoardId, settings);
      session.reset();
    }
    if (online) {
      ensureHumanOpensStartScreen();
    } else if (isAwaitingStart()) {
      ensureHumanOpensStartScreen();
    } else if (wasCoach) {
      ensureHumanOpensStartScreen();
    } else {
      applyGameStarter();
    }
    applyCanvasSizeForBoard();
    resultModal.style.display = 'none';
    resultModal.classList.remove('animate');
    resultModalDismissed = false;
    resignOfferModal.style.display = 'none';
    resignationCtl.clearPendingResignPlayer();
    session.resetTurnClock();
    updateUI();
    undoBtn.disabled = true;
    pulseRaf = requestAnimationFrame(loopPulse);
    if (!isAwaitingStart() && !online) {
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

  startCoachBtn?.addEventListener('click', () => {
    launchCoachLesson();
  });

  startBoardSelect?.addEventListener('change', () => {
    switchBoard(startBoardSelect.value as ProductBoardId);
  });

  resignBtn.addEventListener('click', () => {
    if (online) {
      if (
        onlineMyTurn() &&
        window.confirm('Offer resignation? Your friend can accept a draw or claim the win.')
      )
        void sendOnline({ type: 'resign' });
      return;
    }
    beginResignation();
  });
  resignAgreeBtn.addEventListener('click', () => {
    if (online) {
      resignOfferModal.style.display = 'none';
      void sendOnline({ type: 'resignRespond', acceptDraw: true });
      return;
    }
    const resigning = resignationCtl.getPendingResignPlayer();
    if (resigning === null) return;
    finishResignation(resigning, true);
  });
  resignDeclineBtn.addEventListener('click', () => {
    if (online) {
      resignOfferModal.style.display = 'none';
      void sendOnline({ type: 'resignRespond', acceptDraw: false });
      return;
    }
    const resigning = resignationCtl.getPendingResignPlayer();
    if (resigning === null) return;
    finishResignation(resigning, false);
  });

  function prepareBoardSwitch(boardId: ProductBoardId): void {
    if (timerId) clearInterval(timerId);
    cancelAnimationFrame(pulseRaf);
    cancelAnimationFrame(animRaf);
    cancelAiWork();
    undoCtl.reset();
    anim = null;
    animating = false;
    aiThinking = false;
    turnCaptures = 0;
    clearMoveFeedback();
    prevCaptures = { RED: 0, BLUE: 0 };
    sessionScore = { RED: 0, BLUE: 0 };

    currentBoardId = boardId;
    boardSelect.value = boardId;
    syncStartBoardSelect();
    syncBoardTitle();
    boardSettingsPanel.syncBoardPlayOptions();
    boardSettingsPanel.applyBoardDefaults(boardId);
    session = createSession(boardId, readSettings());
    session.reset();
    stopCoachVideo();
    ensureHumanOpensStartScreen();
    applyCanvasSizeForBoard();
    resultModal.style.display = 'none';
    resultModal.classList.remove('animate');
    resignOfferModal.style.display = 'none';
    resignationCtl.clearPendingResignPlayer();
    session.resetTurnClock();
    updateUI();
    undoBtn.disabled = true;
    pulseRaf = requestAnimationFrame(loopPulse);
  }

  function switchBoard(boardId: ProductBoardId): void {
    prepareBoardSwitch(boardId);
    showStartScreen();
  }

  function enterFromHub(
    boardId: ProductBoardId,
    mode: GameFeatureSettings['mode'],
    action: 'play' | 'coach' | 'spectate',
  ): void {
    syncPlayShellThemeFromStorage();
    if (hubModeSelect) hubModeSelect.value = mode;
    prepareBoardSwitch(boardId);
    if (action === 'spectate') {
      boardSettingsPanel.applySpectateDefaultsToUi(boardId);
      session = createSession(boardId, readSettings());
      session.reset();
    }
    applyStartOverlayModeToSession();
    if (action === 'coach') {
      launchCoachLesson();
    } else if (action === 'spectate') {
      beginCoachWatch();
    } else {
      beginPlayAfterStart();
    }
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

  const settingsToggleBtn = document.getElementById(
    'settings-toggle-btn',
  ) as HTMLButtonElement | null;
  const settingsCloseBtn = document.getElementById(
    'settings-close-btn',
  ) as HTMLButtonElement | null;
  function setSettingsOpen(open: boolean): void {
    document.getElementById('play-shell')?.classList.toggle('is-settings-open', open);
    settingsToggleBtn?.setAttribute('aria-expanded', String(open));
  }
  settingsToggleBtn?.addEventListener('click', () => setSettingsOpen(true));
  settingsCloseBtn?.addEventListener('click', () => setSettingsOpen(false));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') setSettingsOpen(false);
  });

  coachPlayBtn?.addEventListener('click', () => {
    soundEffects.playButtonTap();
    if (isCoachMode()) coachVideoPlayer?.play();
  });

  coachPauseBtn?.addEventListener('click', () => {
    soundEffects.playButtonTap();
    if (isCoachMode()) coachVideoPlayer?.pause();
  });

  function finishCoachScrub(): void {
    coachScrubbing = false;
    if (coachWasPlayingBeforeScrub) {
      coachVideoPlayer?.play();
    }
    coachWasPlayingBeforeScrub = false;
  }

  coachScrub?.addEventListener('pointerdown', () => {
    coachScrubbing = true;
    coachWasPlayingBeforeScrub = coachVideoPlayer?.isPlaying() ?? false;
    coachVideoPlayer?.pause();
  });

  coachScrub?.addEventListener('input', () => {
    if (!isCoachMode() || !coachScrub) return;
    coachVideoPlayer?.seek(parseInt(coachScrub.value, 10) || 0);
  });

  coachScrub?.addEventListener('pointerup', finishCoachScrub);
  coachScrub?.addEventListener('pointercancel', finishCoachScrub);

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

  function finishCaptureChain(): void {
    if (isAwaitingStart() || animating || aiThinking || session.isGameOver()) return;
    if (isCoachMode()) return;
    if (session.getEngine().getChainPieceId() === null || !session.canHumanAct()) return;
    if (online) {
      if (onlineMyTurn()) void sendOnline({ type: 'finishChain' });
      return;
    }
    undoCtl.pushSnapshot();
    soundEffects.playButtonTap();
    session.finishChain();
    turnCaptures = 0;
    afterHumanOrAiTurn();
  }

  restartBtn.addEventListener('click', () => {
    soundEffects.playButtonTap();
    if (online) {
      leaveOnlineGame();
      return;
    }
    resetGame();
  });
  document.getElementById('home-btn')?.addEventListener('click', () => {
    if (matchInProgress() && !window.confirm('Leave this game and go back to the start page?'))
      return;
    soundEffects.playButtonTap();
    returnToHub();
  });
  function dismissResultModal(): void {
    if (!session.isGameOver() || resignationCtl.getPendingResignPlayer() !== null || isCoachMode())
      return;
    resultModalDismissed = true;
    resultModal.style.display = 'none';
    resultModal.classList.remove('animate');
  }

  playAgainBtn.addEventListener('click', () => {
    if (online) {
      leaveOnlineGame();
      return;
    }
    resetGame();
  });
  installModalFocus(resultModal, { onEscape: dismissResultModal });
  installModalFocus(resignOfferModal);
  resultViewBoardBtn.addEventListener('click', () => {
    soundEffects.playButtonTap();
    dismissResultModal();
  });
  resultModal.addEventListener('click', (event) => {
    if (event.target === resultModal) dismissResultModal();
  });
  undoBtn.addEventListener('click', () => {
    soundEffects.playButtonTap();
    undoCtl.undo();
  });
  finishBtn?.addEventListener('click', () => {
    finishCaptureChain();
  });
  boardSelect.addEventListener('change', () => {
    switchBoard(boardSelect.value as ProductBoardId);
  });
  /** A match is under way: a setting change would throw it away. */
  function matchInProgress(): boolean {
    return (
      !isAwaitingStart() && !isCoachMode() && !session.isGameOver() && session.getMoveCount() > 0
    );
  }

  /** Put every setting dropdown back to what the running match uses. */
  function restoreSettingSelects(): void {
    const s = session.getSettings();
    timerSelect.value = s.timer;
    tournamentTimerSelect.value = s.tournamentTimer;
    shotClockSelect.value = s.shotClock;
    centerRuleSelect.value = s.centerRule;
    if (s.mode === 'spectate') {
      aiLevelSelect.value = String(s.coachBlueLevel ?? s.aiLevel);
      if (coachLevelSelect) coachLevelSelect.value = String(s.coachRedLevel ?? 3);
    } else {
      aiLevelSelect.value = String(s.aiLevel);
    }
    boardSettingsPanel.syncTimerSettingLocks();
  }

  /**
   * Every setting change starts a new match. With a match under way, ask first;
   * Cancel puts the dropdown back and the match carries on untouched.
   */
  function changeSettingAndRestart(apply?: () => void): void {
    if (matchInProgress()) {
      const ok = window.confirm('Changing this setting starts a new game. Continue?');
      if (!ok) {
        restoreSettingSelects();
        return;
      }
    }
    apply?.();
    boardSettingsPanel.syncTimerSettingLocks();
    resetGame();
  }

  centerRuleSelect.addEventListener('change', () => changeSettingAndRestart());
  timerSelect.addEventListener('change', () =>
    changeSettingAndRestart(() => {
      if (timerSelect.value !== 'off') {
        tournamentTimerSelect.value = 'off';
      }
    }),
  );
  tournamentTimerSelect.addEventListener('change', () =>
    changeSettingAndRestart(() => {
      if (tournamentTimerSelect.value !== 'off') {
        timerSelect.value = 'off';
        centerRuleSelect.value = 'off';
      }
    }),
  );
  for (const { btn, text } of settingHelpPairs) {
    if (!btn || !text) continue;
    btn.addEventListener('click', (event) => {
      event.stopPropagation();
      toggleSettingHelp(btn, text);
    });
  }
  shotClockSelect.addEventListener('change', () => changeSettingAndRestart());
  aiLevelSelect.addEventListener('change', () => changeSettingAndRestart());
  coachLevelSelect?.addEventListener('change', () => changeSettingAndRestart());
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

  function syncPlayShellThemeFromStorage(): void {
    if (!playShell) return;
    applyPlayLookState(readStoredBoardLookId(), readStoredSideLookId());
    drawBoard();
  }

  /** Lock look preview once the match has moves — not on page load (index.html has no start overlay). */
  function isLookPreviewLocked(): boolean {
    if (session.isGameOver()) return false;
    if (isAwaitingStart()) return false;
    return session.getMoveCount() > 0;
  }

  function syncLookPreviewLock(): void {
    const setting = document.getElementById('play-theme-setting');
    if (!setting) return;
    const locked = isLookPreviewLocked();
    setting.classList.toggle('play-theme-setting--locked', locked);
    for (const btn of setting.querySelectorAll<HTMLButtonElement>('.play-theme-swatch')) {
      btn.disabled = locked;
      btn.setAttribute('aria-disabled', String(locked));
    }
  }

  function applyPlayShellTheme(swatchId: PlayShellThemeId): void {
    if (!playShell || isLookPreviewLocked()) return;
    applyPlayLookFromSwatch(swatchId);
    drawBoard();
    updateUI();
  }

  function initMoveHintAuraSetting(): void {
    const select = document.getElementById('move-hint-aura-select') as HTMLSelectElement | null;
    if (!select) return;
    select.value = readMoveHintAuraToggle();
    select.addEventListener('change', () => {
      if (!isMoveHintAuraToggle(select.value)) return;
      writeMoveHintAuraToggle(select.value);
      drawBoard();
    });
  }

  function initPlayShellTheme(): void {
    if (!playShell) return;
    wirePlayLookPreviewSetting(document.getElementById('play-theme-setting'), {
      isLocked: isLookPreviewLocked,
      onApplied: () => {
        drawBoard();
        updateUI();
      },
    });
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get('playTheme');
    if (isLookSwatchId(fromUrl)) {
      applyPlayShellTheme(fromUrl);
      return;
    }
    applyPlayLookState(readStoredBoardLookId(), readStoredSideLookId());
    syncLookPreviewLock();
    drawBoard();
  }

  function applyPremiumShell(isPremium: boolean): void {
    if (!playShell) return;
    playShell.classList.toggle('shell--ads-on', !isPremium);
    playShell.classList.toggle('shell--no-ads', isPremium);
    if (!TEST_HOOKS_ENABLED) return; // production: premium comes from the account server, never from localStorage
    try {
      localStorage.setItem('sb-premium', isPremium ? '1' : '0');
    } catch {
      /* storage unavailable */
    }
  }

  if (playShell) {
    let savedPremium: boolean;
    try {
      savedPremium = TEST_HOOKS_ENABLED && localStorage.getItem('sb-premium') === '1';
    } catch {
      savedPremium = false;
    }
    applyPremiumShell(savedPremium);
    initPlayShellTheme();
    initMoveHintAuraSetting();
  }

  syncBoardTitle();
  boardSettingsPanel.syncBoardPlayOptions();
  updateSfxButton();
  resetGame();

  if (TEST_HOOKS_ENABLED)
    (window as unknown as { __SB_TEST__?: unknown }).__SB_TEST__ = {
      // switchBoard/resetGame rebind `session`; a captured value would hand browser
      // gates a dead session while snapshot() reported the live one.
      get session() {
        return session;
      },
      updateUI,
      afterHumanOrAiTurn,
      snapshot: () => buildLiveSnap(),
      lastHumanPlySnap: null as ReturnType<typeof buildLiveSnap> | null,
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
      enterFromHub,
      launchCoachLesson,
    };

  onReady?.({ enterFromHub, launchCoachLesson, enterOnline });
}
