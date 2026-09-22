import { getPlayConfig, ProductBoardId } from '../../../config/BoardCatalog';
import {
  CenterRule,
  clampUiAiLevel,
  COACH_MAX_AI_LEVEL,
  formatCenterRuleLabel,
  formatShotClockOptionLabel,
  formatTimerOptionLabel,
  GameFeatureSettings,
  HUMAN_PVE_MAX_AI_LEVEL,
  populateAiLevelSelect,
  ShotClockSeconds,
  SPECTATE_WATCH_DEFAULTS,
  TimerMinutes,
} from '../feature/GameFeatureSettings';

export interface BoardSettingsPanelElements {
  centerRuleSelect: HTMLSelectElement;
  timerSelect: HTMLSelectElement;
  tournamentTimerSelect: HTMLSelectElement;
  tournamentTimerSetting: HTMLDivElement | null;
  shotClockSelect: HTMLSelectElement;
  aiLevelSelect: HTMLSelectElement;
  coachLevelSelect: HTMLSelectElement | null;
}

export interface BoardSettingsPanelDeps {
  getCurrentBoardId: () => ProductBoardId;
  isCoachMode: () => boolean;
  readGameMode: () => GameFeatureSettings['mode'];
}

export interface BoardSettingsPanel {
  syncCenterRuleOptions: () => void;
  syncTimerOptions: () => void;
  syncTournamentTimerOptions: () => void;
  syncShotClockOptions: () => void;
  syncAiLevelOptions: () => void;
  syncCoachLevelOptions: () => void;
  syncTimerSettingLocks: () => void;
  syncBoardPlayOptions: () => void;
  applyBoardDefaults: (boardId: ProductBoardId) => void;
  applySpectateDefaultsToUi: (boardId: ProductBoardId) => void;
}

/** Board-dependent <select> option syncing for the play-shell settings panel. */
export function createBoardSettingsPanel(
  elements: BoardSettingsPanelElements,
  deps: BoardSettingsPanelDeps,
): BoardSettingsPanel {
  const {
    centerRuleSelect,
    timerSelect,
    tournamentTimerSelect,
    tournamentTimerSetting,
    shotClockSelect,
    aiLevelSelect,
    coachLevelSelect,
  } = elements;

  function syncAiLevelOptions(): void {
    const current = clampUiAiLevel(parseInt(aiLevelSelect.value, 10) || 2);
    populateAiLevelSelect(aiLevelSelect, HUMAN_PVE_MAX_AI_LEVEL, current);
  }

  function syncCoachLevelOptions(): void {
    if (!coachLevelSelect) return;
    const current = clampUiAiLevel(parseInt(coachLevelSelect.value, 10) || 3);
    populateAiLevelSelect(coachLevelSelect, COACH_MAX_AI_LEVEL, current);
  }

  function syncTimerSettingLocks(): void {
    const mode = deps.readGameMode();
    const tournamentOn = tournamentTimerSelect.value !== 'off';
    const timerOn = timerSelect.value !== 'off';
    if (tournamentTimerSetting) {
      tournamentTimerSetting.style.display = mode === 'pvp' ? '' : 'none';
    }
    if (mode !== 'pvp' && tournamentTimerSelect.value !== 'off') {
      tournamentTimerSelect.value = 'off';
    }
    if (deps.isCoachMode()) return;
    tournamentTimerSelect.disabled = timerOn;
    timerSelect.disabled = tournamentOn;
    centerRuleSelect.disabled = tournamentOn;
  }

  function syncCenterRuleOptions(): void {
    const options = getPlayConfig(deps.getCurrentBoardId()).centerRuleOptions;
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
      centerRuleSelect.value = getPlayConfig(deps.getCurrentBoardId()).defaultSettings.centerRule;
    }
  }

  function syncTimerOptions(): void {
    const play = getPlayConfig(deps.getCurrentBoardId());
    const options = play.timerOptions;
    const current = timerSelect.value as TimerMinutes;
    timerSelect.innerHTML = '';
    for (const value of options) {
      const opt = document.createElement('option');
      opt.value = value;
      opt.textContent = formatTimerOptionLabel(value, play.timerBest);
      timerSelect.appendChild(opt);
    }
    if (options.includes(current)) {
      timerSelect.value = current;
    } else {
      timerSelect.value = getPlayConfig(deps.getCurrentBoardId()).defaultSettings.timer;
    }
  }

  function syncTournamentTimerOptions(): void {
    const play = getPlayConfig(deps.getCurrentBoardId());
    const options = play.tournamentTimerOptions ?? play.timerOptions;
    const current = tournamentTimerSelect.value as TimerMinutes;
    tournamentTimerSelect.innerHTML = '';
    for (const value of options) {
      const opt = document.createElement('option');
      opt.value = value;
      opt.textContent = formatTimerOptionLabel(value, play.timerBest);
      tournamentTimerSelect.appendChild(opt);
    }
    if (options.includes(current)) {
      tournamentTimerSelect.value = current;
    } else {
      tournamentTimerSelect.value = getPlayConfig(
        deps.getCurrentBoardId(),
      ).defaultSettings.tournamentTimer;
    }
  }

  function syncShotClockOptions(): void {
    const play = getPlayConfig(deps.getCurrentBoardId());
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
      shotClockSelect.value = getPlayConfig(deps.getCurrentBoardId()).defaultSettings.shotClock;
    }
  }

  function syncBoardPlayOptions(): void {
    syncCenterRuleOptions();
    syncTimerOptions();
    syncTournamentTimerOptions();
    syncShotClockOptions();
    syncAiLevelOptions();
    syncCoachLevelOptions();
    syncTimerSettingLocks();
  }

  function applyBoardDefaults(boardId: ProductBoardId): void {
    const defaults = getPlayConfig(boardId).defaultSettings;
    centerRuleSelect.value = defaults.centerRule;
    timerSelect.value = defaults.timer;
    tournamentTimerSelect.value = defaults.tournamentTimer;
    shotClockSelect.value = defaults.shotClock;
    syncTimerSettingLocks();
  }

  function applySpectateDefaultsToUi(boardId: ProductBoardId): void {
    const play = getPlayConfig(boardId);
    const centerRule = play.centerRuleOptions.includes(SPECTATE_WATCH_DEFAULTS.centerRule)
      ? SPECTATE_WATCH_DEFAULTS.centerRule
      : play.defaultSettings.centerRule;
    centerRuleSelect.value = centerRule;
    timerSelect.value = play.timerOptions.includes(SPECTATE_WATCH_DEFAULTS.timer)
      ? SPECTATE_WATCH_DEFAULTS.timer
      : play.defaultSettings.timer;
    tournamentTimerSelect.value = 'off';
    populateAiLevelSelect(
      aiLevelSelect,
      HUMAN_PVE_MAX_AI_LEVEL,
      SPECTATE_WATCH_DEFAULTS.coachBlueLevel,
    );
    if (coachLevelSelect) {
      populateAiLevelSelect(
        coachLevelSelect,
        COACH_MAX_AI_LEVEL,
        SPECTATE_WATCH_DEFAULTS.coachRedLevel,
      );
    }
    syncTimerSettingLocks();
  }

  return {
    syncCenterRuleOptions,
    syncTimerOptions,
    syncTournamentTimerOptions,
    syncShotClockOptions,
    syncAiLevelOptions,
    syncCoachLevelOptions,
    syncTimerSettingLocks,
    syncBoardPlayOptions,
    applyBoardDefaults,
    applySpectateDefaultsToUi,
  };
}
