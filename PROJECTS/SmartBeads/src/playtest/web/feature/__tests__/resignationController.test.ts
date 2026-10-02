import { createResignationController } from '../resignationController';
import type { FeatureSession } from '../FeatureSession';

type Mode = 'pvp' | 'pve' | 'spectate' | 'coach';

function fakeSession(opts: { mode: Mode; current?: 'RED' | 'BLUE'; over?: boolean }) {
  const resolve = jest.fn();
  const session = {
    getSettings: () => ({ mode: opts.mode }),
    isGameOver: () => opts.over ?? false,
    getEngine: () => ({
      getState: () => ({ currentPlayer: opts.current ?? 'RED' }),
      exportSnapshot: () => ({}),
    }),
    getBoardVariant: () => '6x4',
    getAiPlayer: () => 'BLUE',
    resolveResignation: resolve,
  } as unknown as FeatureSession;
  return { session, resolve };
}

function setup(
  opts: { mode: Mode; current?: 'RED' | 'BLUE'; over?: boolean; animating?: boolean; ai?: boolean },
  confirmAnswer = true,
) {
  const { session, resolve } = fakeSession(opts);
  const modal = { style: { display: 'none' } } as unknown as HTMLDivElement;
  const desc = { textContent: '' } as unknown as HTMLParagraphElement;
  const deps = {
    getSession: () => session,
    isAnimating: () => opts.animating ?? false,
    isAiThinking: () => opts.ai ?? false,
    clearTimerId: jest.fn(),
    cancelAiWork: jest.fn(),
    updateUI: jest.fn(),
    sideDisplayName: (p: 'RED' | 'BLUE') => (p === 'RED' ? 'Cream' : 'Black'),
  };
  (globalThis as unknown as { window: unknown }).window = { confirm: () => confirmAnswer };
  const ctl = createResignationController({ resignOfferModal: modal, resignOfferDesc: desc }, deps);
  return { ctl, modal, desc, deps, resolve };
}

describe('resignationController (W8)', () => {
  it('cannot be offered while spectating, in the coach, after game over, mid-animation or while the AI thinks', () => {
    expect(setup({ mode: 'spectate' }).ctl.canOfferResignation()).toBe(false);
    expect(setup({ mode: 'coach' }).ctl.canOfferResignation()).toBe(false);
    expect(setup({ mode: 'pvp', over: true }).ctl.canOfferResignation()).toBe(false);
    expect(setup({ mode: 'pvp', animating: true }).ctl.canOfferResignation()).toBe(false);
    expect(setup({ mode: 'pve', ai: true }).ctl.canOfferResignation()).toBe(false);
  });

  it('against the AI only the human (cream) on the cream turn can resign', () => {
    expect(setup({ mode: 'pve', current: 'RED' }).ctl.canOfferResignation()).toBe(true);
    expect(setup({ mode: 'pve', current: 'BLUE' }).ctl.canOfferResignation()).toBe(false);
  });

  it('pvp: the side to move offers, the modal opens, and no result is decided yet', () => {
    const { ctl, modal, desc, resolve } = setup({ mode: 'pvp', current: 'BLUE' });
    ctl.beginResignation();
    expect(ctl.getPendingResignPlayer()).toBe('BLUE');
    expect(modal.style.display).toBe('flex');
    expect(desc.textContent).toContain('Black offers resignation');
    expect(resolve).not.toHaveBeenCalled();
    expect(ctl.canOfferResignation()).toBe(false); // an offer is already pending
  });

  it('cancelling the confirm dialog does nothing', () => {
    const { ctl, modal, resolve } = setup({ mode: 'pvp' }, false);
    ctl.beginResignation();
    expect(ctl.getPendingResignPlayer()).toBeNull();
    expect(modal.style.display).toBe('none');
    expect(resolve).not.toHaveBeenCalled();
  });

  it('finishResignation closes the modal, stops clocks and AI, resolves and redraws', () => {
    const { ctl, modal, deps, resolve } = setup({ mode: 'pvp' });
    ctl.beginResignation();
    ctl.finishResignation('RED', true);
    expect(modal.style.display).toBe('none');
    expect(ctl.getPendingResignPlayer()).toBeNull();
    expect(deps.clearTimerId).toHaveBeenCalled();
    expect(deps.cancelAiWork).toHaveBeenCalled();
    expect(resolve).toHaveBeenCalledWith('RED', true);
    expect(deps.updateUI).toHaveBeenCalled();
  });

  it('clearPendingResignPlayer drops an open offer', () => {
    const { ctl } = setup({ mode: 'pvp' });
    ctl.beginResignation();
    ctl.clearPendingResignPlayer();
    expect(ctl.getPendingResignPlayer()).toBeNull();
    expect(ctl.canOfferResignation()).toBe(true);
  });
});
