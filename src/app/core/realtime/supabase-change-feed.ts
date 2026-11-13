import type { SupabaseClient } from '@supabase/supabase-js';
import { type ChangeFeed, type ChangeHandlers, TABLE_TOPICS } from './realtime';

export class SupabaseChangeFeed implements ChangeFeed {
  constructor(private readonly client: SupabaseClient) {}

  async subscribe(handlers: ChangeHandlers): Promise<() => void> {
    const { data } = await this.client.auth.getSession();
    const userId = data.session?.user.id;
    if (!userId) {
      return () => undefined;
    }
    let connected = false;
    const channel = this.client.channel(`nexo-changes-${userId}`);
    for (const [table, topics] of Object.entries(TABLE_TOPICS)) {
      const notify = () => topics.forEach((topic) => handlers.change(topic));
      channel
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table, filter: `user_id=eq.${userId}` },
          notify,
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table, filter: `user_id=eq.${userId}` },
          notify,
        )
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table }, notify);
    }
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        if (connected) {
          handlers.reconnect();
        }
        connected = true;
      }
    });
    return () => {
      void this.client.removeChannel(channel);
    };
  }
}
