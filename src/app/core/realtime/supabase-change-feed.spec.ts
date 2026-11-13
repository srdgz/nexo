import type { SupabaseClient } from '@supabase/supabase-js';
import type { RealtimeTopic } from './realtime';
import { SupabaseChangeFeed } from './supabase-change-feed';

interface Binding {
  readonly filter: { event: string; table: string; filter?: string };
  readonly callback: () => void;
}

function fakeClient(userId: string | null) {
  const bindings: Binding[] = [];
  let status: ((value: string) => void) | null = null;
  const channel = {
    on(_type: string, filter: Binding['filter'], callback: () => void) {
      bindings.push({ filter, callback });
      return channel;
    },
    subscribe(callback: (value: string) => void) {
      status = callback;
      return channel;
    },
  };
  const client = {
    auth: {
      getSession: () =>
        Promise.resolve({ data: { session: userId ? { user: { id: userId } } : null } }),
    },
    channel: vi.fn(() => channel),
    removeChannel: vi.fn(() => Promise.resolve('ok')),
  };
  return {
    client: client as unknown as SupabaseClient,
    raw: client,
    bindings,
    status: (value: string) => status?.(value),
  };
}

describe('SupabaseChangeFeed', () => {
  it('listens to the user’s own inserts and updates and to every delete', async () => {
    const fake = fakeClient('u1');
    const topics: RealtimeTopic[] = [];

    await new SupabaseChangeFeed(fake.client).subscribe({
      change: (topic) => topics.push(topic),
      reconnect: () => undefined,
    });

    expect(fake.raw.channel).toHaveBeenCalledWith('nexo-changes-u1');
    const transactions = fake.bindings.filter((binding) => binding.filter.table === 'transactions');
    expect(transactions.map((binding) => [binding.filter.event, binding.filter.filter])).toEqual([
      ['INSERT', 'user_id=eq.u1'],
      ['UPDATE', 'user_id=eq.u1'],
      ['DELETE', undefined],
    ]);
    transactions[0]!.callback();
    fake.bindings.find((binding) => binding.filter.table === 'events')!.callback();
    expect(topics).toEqual(['finances', 'organization', 'organization']);
  });

  it('asks for a full refresh when the connection comes back', async () => {
    const fake = fakeClient('u1');
    const reconnect = vi.fn();
    const stop = await new SupabaseChangeFeed(fake.client).subscribe({
      change: () => undefined,
      reconnect,
    });

    fake.status('SUBSCRIBED');
    expect(reconnect).not.toHaveBeenCalled();
    fake.status('CHANNEL_ERROR');
    fake.status('SUBSCRIBED');
    expect(reconnect).toHaveBeenCalledTimes(1);

    stop();
    expect(fake.raw.removeChannel).toHaveBeenCalledTimes(1);
  });

  it('does nothing without a session', async () => {
    const fake = fakeClient(null);

    await new SupabaseChangeFeed(fake.client).subscribe({
      change: () => undefined,
      reconnect: () => undefined,
    });

    expect(fake.raw.channel).not.toHaveBeenCalled();
  });
});
