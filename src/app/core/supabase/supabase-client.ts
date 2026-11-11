import { Injectable } from '@angular/core';
import { environment } from '@env/environment';
import type { SupabaseClient } from '@supabase/supabase-js';

export function isSupabaseConfigured(): boolean {
  return Boolean(environment.supabaseUrl && environment.supabasePublishableKey);
}

@Injectable({ providedIn: 'root' })
export class SupabaseClientProvider {
  private client: Promise<SupabaseClient> | null = null;

  get(): Promise<SupabaseClient> {
    this.client ??= import('@supabase/supabase-js').then(({ createClient }) =>
      createClient(environment.supabaseUrl, environment.supabasePublishableKey, {
        auth: {
          flowType: 'pkce',
          detectSessionInUrl: false,
          persistSession: true,
          autoRefreshToken: true,
        },
      }),
    );
    return this.client;
  }
}
