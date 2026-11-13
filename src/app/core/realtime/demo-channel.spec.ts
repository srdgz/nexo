import { TestBed } from '@angular/core/testing';
import { RELOAD } from '../app-mode/app-mode';
import { DEMO_CHANNEL_NAME, DemoChannel } from './demo-channel';

class FakeBroadcastChannel {
  static readonly open: FakeBroadcastChannel[] = [];
  onmessage: ((event: MessageEvent) => void) | null = null;

  constructor(readonly name: string) {
    FakeBroadcastChannel.open.push(this);
  }

  postMessage(data: unknown): void {
    for (const other of FakeBroadcastChannel.open) {
      if (other !== this && other.name === this.name) {
        other.onmessage?.({ data } as MessageEvent);
      }
    }
  }
}

describe('DemoChannel', () => {
  let peer: FakeBroadcastChannel;
  let received: unknown[];
  let reload: ReturnType<typeof vi.fn>;
  let original: typeof BroadcastChannel | undefined;

  beforeEach(() => {
    original = window.BroadcastChannel;
    FakeBroadcastChannel.open.length = 0;
    (window as { BroadcastChannel?: unknown }).BroadcastChannel = FakeBroadcastChannel;
    sessionStorage.clear();
    peer = new FakeBroadcastChannel(DEMO_CHANNEL_NAME);
    received = [];
    peer.onmessage = (event) => received.push(event.data);
    reload = vi.fn();
    TestBed.configureTestingModule({ providers: [{ provide: RELOAD, useValue: reload }] });
  });

  afterEach(() => {
    (window as { BroadcastChannel?: unknown }).BroadcastChannel = original;
    sessionStorage.clear();
  });

  function helloId(): string {
    return (received[0] as { from: string }).from;
  }

  it('adopts the data another tab sends when it joins', async () => {
    const channel = TestBed.inject(DemoChannel);
    const applied: unknown[] = [];
    const topics: string[] = [];
    channel.listen('nexo.demo.finances', (data) => applied.push(data));
    await channel.subscribe({ change: (topic) => topics.push(topic), reconnect: () => undefined });

    peer.postMessage({ type: 'snapshot', key: 'nexo.demo.finances', data: { a: 1 }, to: 'other' });
    peer.postMessage({
      type: 'snapshot',
      key: 'nexo.demo.finances',
      data: { a: 2 },
      to: helloId(),
    });
    peer.postMessage({
      type: 'snapshot',
      key: 'nexo.demo.finances',
      data: { a: 3 },
      to: helloId(),
    });

    expect(received[0]).toEqual({ type: 'hello', from: expect.any(String) });
    expect(applied).toEqual([{ a: 2 }]);
    expect(sessionStorage.getItem('nexo.demo.finances')).toBe('{"a":2}');
    expect(topics).toEqual(['finances']);
  });

  it('applies changes from other tabs and shares its own', async () => {
    const channel = TestBed.inject(DemoChannel);
    const topics: string[] = [];
    await channel.subscribe({ change: (topic) => topics.push(topic), reconnect: () => undefined });

    peer.postMessage({ type: 'snapshot', key: 'nexo.demo.organization', data: { b: 1 } });
    peer.postMessage({ type: 'snapshot', key: 'nexo.demo.profile', data: { c: 1 } });
    channel.publish('nexo.demo.finances', { d: 1 });

    expect(topics).toEqual(['organization']);
    expect(sessionStorage.getItem('nexo.demo.profile')).toBeNull();
    expect(received.at(-1)).toEqual({
      type: 'snapshot',
      key: 'nexo.demo.finances',
      data: { d: 1 },
    });
  });

  it('answers a new tab with the data it has', () => {
    sessionStorage.setItem('nexo.demo.finances', '{"e":1}');
    TestBed.inject(DemoChannel).connect();

    peer.postMessage({ type: 'hello', from: 'newcomer' });

    expect(received.at(-1)).toEqual({
      type: 'snapshot',
      key: 'nexo.demo.finances',
      data: { e: 1 },
      to: 'newcomer',
    });
  });

  it('restarts the demo in every tab when one resets it', () => {
    sessionStorage.setItem('nexo.demo.finances', '{"e":1}');
    sessionStorage.setItem('nexo.mode', 'demo');
    TestBed.inject(DemoChannel).connect();

    peer.postMessage({ type: 'reset' });
    peer.postMessage({ type: 'hello', from: 'newcomer' });

    expect(sessionStorage.getItem('nexo.demo.finances')).toBeNull();
    expect(sessionStorage.getItem('nexo.mode')).toBe('demo');
    expect(reload).toHaveBeenCalledTimes(1);
    expect(received.filter((message) => (message as { type: string }).type === 'snapshot')).toEqual(
      [],
    );
  });
});
