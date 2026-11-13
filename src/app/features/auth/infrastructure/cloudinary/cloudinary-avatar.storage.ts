import type { SupabaseClient } from '@supabase/supabase-js';
import type { AvatarStorage } from '../../application/avatar-storage';
import { AuthError } from '../../domain/auth-error';

export interface UploadTicket {
  readonly cloudName: string;
  readonly apiKey: string;
  readonly params: Readonly<Record<string, string>>;
  readonly signature: string;
}

export interface UploadResult {
  readonly public_id: string;
  readonly version: number;
}

const DELIVERY = 'c_fill,g_face,h_256,w_256/f_auto/q_auto';

export function avatarDeliveryUrl(cloudName: string, result: UploadResult): string {
  return `https://res.cloudinary.com/${cloudName}/image/upload/${DELIVERY}/v${result.version}/${result.public_id}`;
}

export function uploadForm(image: Blob, ticket: UploadTicket): FormData {
  const form = new FormData();
  form.set('file', image);
  form.set('api_key', ticket.apiKey);
  form.set('signature', ticket.signature);
  for (const [key, value] of Object.entries(ticket.params)) {
    form.set(key, value);
  }
  return form;
}

export class CloudinaryAvatarStorage implements AvatarStorage {
  constructor(
    private readonly client: SupabaseClient,
    private readonly http: typeof fetch = (input, init) => globalThis.fetch(input, init),
  ) {}

  async upload(image: Blob): Promise<string> {
    const { data, error } = await this.client.functions.invoke<UploadTicket>('avatar', {
      method: 'POST',
    });
    if (error || !data) {
      throw new AuthError('avatar_upload');
    }
    let response: Response;
    try {
      response = await this.http(`https://api.cloudinary.com/v1_1/${data.cloudName}/image/upload`, {
        method: 'POST',
        body: uploadForm(image, data),
      });
    } catch {
      throw new AuthError('network');
    }
    if (!response.ok) {
      throw new AuthError('avatar_upload');
    }
    return avatarDeliveryUrl(data.cloudName, (await response.json()) as UploadResult);
  }

  async remove(): Promise<void> {
    const { error } = await this.client.functions.invoke('avatar', { method: 'DELETE' });
    if (error) {
      throw new AuthError('avatar_upload');
    }
  }
}
