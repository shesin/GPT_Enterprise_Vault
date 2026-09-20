import { applyHubLookId, HUB_LOOK_STORAGE_KEY, isHubLookId, readStoredHubLookId } from '../hubLookThemes';

function mockLocalStorage(seed: Record<string, string> = {}): Map<string, string> {
  const store = new Map<string, string>(Object.entries(seed));
  Object.defineProperty(globalThis, 'localStorage', {
    value: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
    },
    configurable: true,
  });
  return store;
}

describe('hubLookThemes', () => {
  afterEach(() => {
    Reflect.deleteProperty(globalThis, 'localStorage');
  });

  it('isHubLookId only accepts the three known ids', () => {
    expect(isHubLookId('default')).toBe(true);
    expect(isHubLookId('seaglass')).toBe(true);
    expect(isHubLookId('jade')).toBe(true);
    expect(isHubLookId('other')).toBe(false);
    expect(isHubLookId(null)).toBe(false);
    expect(isHubLookId(undefined)).toBe(false);
  });

  it('readStoredHubLookId defaults to "default" when nothing stored or storage is unreadable', () => {
    mockLocalStorage();
    expect(readStoredHubLookId()).toBe('default');
  });

  it('readStoredHubLookId returns the stored id when valid', () => {
    mockLocalStorage({ [HUB_LOOK_STORAGE_KEY]: 'seaglass' });
    expect(readStoredHubLookId()).toBe('seaglass');
  });

  it('readStoredHubLookId falls back to "default" for a garbage stored value', () => {
    mockLocalStorage({ [HUB_LOOK_STORAGE_KEY]: 'not-a-real-id' });
    expect(readStoredHubLookId()).toBe('default');
  });

  it('applyHubLookId("seaglass") sets the data attribute and persists it', () => {
    const store = mockLocalStorage();
    const target = { setAttribute: jest.fn(), removeAttribute: jest.fn() } as unknown as HTMLElement;
    applyHubLookId('seaglass', target);
    expect(target.setAttribute).toHaveBeenCalledWith('data-hub-look', 'seaglass');
    expect(target.removeAttribute).not.toHaveBeenCalled();
    expect(store.get(HUB_LOOK_STORAGE_KEY)).toBe('seaglass');
  });

  it('applyHubLookId("default") removes the data attribute and persists it', () => {
    const store = mockLocalStorage();
    const target = { setAttribute: jest.fn(), removeAttribute: jest.fn() } as unknown as HTMLElement;
    applyHubLookId('default', target);
    expect(target.removeAttribute).toHaveBeenCalledWith('data-hub-look');
    expect(target.setAttribute).not.toHaveBeenCalled();
    expect(store.get(HUB_LOOK_STORAGE_KEY)).toBe('default');
  });

  it('applyHubLookId("jade") sets the data attribute to "jade" and persists it', () => {
    const store = mockLocalStorage();
    const target = { setAttribute: jest.fn(), removeAttribute: jest.fn() } as unknown as HTMLElement;
    applyHubLookId('jade', target);
    expect(target.setAttribute).toHaveBeenCalledWith('data-hub-look', 'jade');
    expect(target.removeAttribute).not.toHaveBeenCalled();
    expect(store.get(HUB_LOOK_STORAGE_KEY)).toBe('jade');
  });
});
