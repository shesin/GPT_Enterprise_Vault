/**
 * @jest-environment jsdom
 */
import { createBoardSettingsPanel } from '../boardSettingsPanel';
import { getPlayConfig, ProductBoardId } from '../../../../config/BoardCatalog';

function select(initial = ''): HTMLSelectElement {
  const el = document.createElement('select');
  if (initial) {
    const opt = document.createElement('option');
    opt.value = initial;
    el.appendChild(opt);
    el.value = initial;
  }
  return el;
}

function setup(
  boardId: ProductBoardId = '6x4',
  mode: 'pvp' | 'pve' | 'spectate' | 'coach' = 'pvp',
) {
  const els = {
    centerRuleSelect: select('off'),
    timerSelect: select('off'),
    tournamentTimerSelect: select('off'),
    tournamentTimerSetting: document.createElement('div'),
    shotClockSelect: select('off'),
    aiLevelSelect: select('2'),
    coachLevelSelect: select('3'),
  };
  const state = { boardId, mode, coach: false };
  const panel = createBoardSettingsPanel(els, {
    getCurrentBoardId: () => state.boardId,
    isCoachMode: () => state.coach,
    readGameMode: () => state.mode,
  });
  return { els, panel, state };
}

const values = (s: HTMLSelectElement) => Array.from(s.options).map((o) => o.value);

describe('boardSettingsPanel (W8, jsdom)', () => {
  it('fills every select from the board catalog', () => {
    const { els, panel } = setup('6x4');
    panel.syncBoardPlayOptions();
    const play = getPlayConfig('6x4');
    expect(values(els.timerSelect)).toEqual([...play.timerOptions]);
    expect(values(els.shotClockSelect)).toEqual([...play.shotClockOptions]);
    expect(values(els.centerRuleSelect)).toEqual([...play.centerRuleOptions]);
    expect(els.aiLevelSelect.options.length).toBeGreaterThan(0);
  });

  it('switching board keeps a value the new board also offers, otherwise falls back to its default', () => {
    const { els, panel, state } = setup('6x4');
    panel.syncBoardPlayOptions();
    const play6 = getPlayConfig('6x4');
    const keep = play6.timerOptions.find(
      (v) => v !== 'off' && getPlayConfig('16').timerOptions.includes(v),
    );
    if (keep) {
      els.timerSelect.value = keep;
      state.boardId = '16';
      panel.syncTimerOptions();
      expect(els.timerSelect.value).toBe(keep);
    }
    els.timerSelect.appendChild(Object.assign(document.createElement('option'), { value: 'nope' }));
    els.timerSelect.value = 'nope';
    panel.syncTimerOptions();
    expect(els.timerSelect.value).toBe(getPlayConfig(state.boardId).defaultSettings.timer);
  });

  it('a tournament timer disables the shared timer and the centre rule', () => {
    const { els, panel } = setup('6x4', 'pvp');
    panel.syncBoardPlayOptions();
    const t = values(els.tournamentTimerSelect).find((v) => v !== 'off');
    expect(t).toBeDefined();
    els.tournamentTimerSelect.value = t!;
    panel.syncTimerSettingLocks();
    expect(els.timerSelect.disabled).toBe(true);
    expect(els.centerRuleSelect.disabled).toBe(true);
    expect(els.tournamentTimerSelect.disabled).toBe(false);
  });

  it('a shared timer disables the tournament timer; centre rule needs the shared timer', () => {
    const { els, panel } = setup('6x4', 'pvp');
    panel.syncBoardPlayOptions();
    panel.syncTimerSettingLocks();
    expect(els.centerRuleSelect.disabled).toBe(true); // timer off -> no centre rule
    const t = values(els.timerSelect).find((v) => v !== 'off');
    expect(t).toBeDefined();
    els.timerSelect.value = t!;
    panel.syncTimerSettingLocks();
    expect(els.tournamentTimerSelect.disabled).toBe(true);
    expect(els.centerRuleSelect.disabled).toBe(false);
  });

  it('turning the shared timer off resets the centre rule to off', () => {
    const { els, panel } = setup('6x4', 'pvp');
    panel.syncBoardPlayOptions();
    const rule = values(els.centerRuleSelect).find((v) => v !== 'off');
    if (!rule) return;
    els.centerRuleSelect.value = rule;
    els.timerSelect.value = 'off';
    panel.syncTimerSettingLocks();
    expect(els.centerRuleSelect.value).toBe('off');
  });

  it('the tournament timer exists only in human-vs-human; other modes force it off and hide it', () => {
    const { els, panel, state } = setup('6x4', 'pvp');
    panel.syncBoardPlayOptions();
    const t = values(els.tournamentTimerSelect).find((v) => v !== 'off')!;
    els.tournamentTimerSelect.value = t;
    state.mode = 'pve';
    panel.syncTimerSettingLocks();
    expect(els.tournamentTimerSelect.value).toBe('off');
    expect(els.tournamentTimerSetting!.style.display).toBe('none');
    state.mode = 'pvp';
    panel.syncTimerSettingLocks();
    expect(els.tournamentTimerSetting!.style.display).toBe('');
  });

  it('coach mode leaves the locks alone', () => {
    const { els, panel, state } = setup('6x4', 'pvp');
    panel.syncBoardPlayOptions();
    state.coach = true;
    els.timerSelect.disabled = false;
    els.tournamentTimerSelect.value = values(els.tournamentTimerSelect).find((v) => v !== 'off')!;
    panel.syncTimerSettingLocks();
    expect(els.timerSelect.disabled).toBe(false);
  });

  it('applyBoardDefaults writes the board default settings', () => {
    const { els, panel } = setup('6x4');
    panel.syncBoardPlayOptions();
    panel.applyBoardDefaults('6x4');
    const d = getPlayConfig('6x4').defaultSettings;
    expect(els.timerSelect.value).toBe(d.timer);
    expect(els.shotClockSelect.value).toBe(d.shotClock);
  });
});
