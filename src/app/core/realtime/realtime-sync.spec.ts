import { TestBed } from '@angular/core/testing';
import { REALTIME_DEBOUNCE_MS, RealtimeSync } from './realtime-sync';
import {
  CHANGE_FEED_LOADER,
  type ChangeFeed,
  type ChangeHandlers,
  REALTIME_LISTENERS,
} from './realtime';

describe('RealtimeSync', () => {
  let handlers: ChangeHandlers | null;
  let unsubscribed: number;
  let refreshed: string[];

  function setup(): RealtimeSync {
    handlers = null;
    unsubscribed = 0;
    refreshed = [];
    const feed: ChangeFeed = {
      subscribe: (value) => {
        handlers = value;
        return Promise.resolve(() => {
          unsubscribed += 1;
        });
      },
    };
    TestBed.configureTestingModule({
      providers: [
        { provide: CHANGE_FEED_LOADER, useValue: () => Promise.resolve(feed) },
        {
          provide: REALTIME_LISTENERS,
          multi: true,
          useValue: { topic: 'finances', refresh: () => refreshed.push('finances') },
        },
        {
          provide: REALTIME_LISTENERS,
          multi: true,
          useValue: { topic: 'organization', refresh: () => refreshed.push('organization') },
        },
      ],
    });
    return TestBed.inject(RealtimeSync);
  }

  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('refreshes each affected feature once per burst of changes', async () => {
    const sync = setup();
    await sync.start();

    handlers!.change('finances');
    handlers!.change('finances');
    vi.advanceTimersByTime(REALTIME_DEBOUNCE_MS - 1);
    handlers!.change('finances');

    expect(refreshed).toEqual([]);
    vi.advanceTimersByTime(REALTIME_DEBOUNCE_MS);
    expect(refreshed).toEqual(['finances']);
  });

  it('refreshes everything after reconnecting', async () => {
    const sync = setup();
    await sync.start();

    handlers!.reconnect();
    vi.advanceTimersByTime(REALTIME_DEBOUNCE_MS);

    expect(refreshed).toEqual(['finances', 'organization']);
  });

  it('subscribes once and drops pending changes when it stops', async () => {
    const sync = setup();
    await sync.start();
    await sync.start();

    handlers!.change('organization');
    sync.stop();
    vi.advanceTimersByTime(REALTIME_DEBOUNCE_MS);

    expect(refreshed).toEqual([]);
    expect(unsubscribed).toBe(1);
  });

  it('closes a subscription that finishes after stopping', async () => {
    const sync = setup();
    const starting = sync.start();
    sync.stop();
    await starting;

    expect(unsubscribed).toBe(1);
  });
});
