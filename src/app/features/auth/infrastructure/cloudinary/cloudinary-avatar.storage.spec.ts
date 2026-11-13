import type { SupabaseClient } from '@supabase/supabase-js';
import { AuthError } from '../../domain/auth-error';
import {
  CloudinaryAvatarStorage,
  type UploadTicket,
  avatarDeliveryUrl,
  uploadForm,
} from './cloudinary-avatar.storage';

const TICKET: UploadTicket = {
  cloudName: 'nexo-cloud',
  apiKey: '123',
  params: { public_id: 'nexo/avatars/u1', timestamp: '1700000000', overwrite: 'true' },
  signature: 'abc',
};

function clientReturning(result: { data: unknown; error: unknown }) {
  const invoke = vi.fn().mockResolvedValue(result);
  return { client: { functions: { invoke } } as unknown as SupabaseClient, invoke };
}

describe('Cloudinary avatar storage', () => {
  it('builds a square, face-centred delivery url that changes with each version', () => {
    expect(avatarDeliveryUrl('nexo-cloud', { public_id: 'nexo/avatars/u1', version: 42 })).toBe(
      'https://res.cloudinary.com/nexo-cloud/image/upload/c_fill,g_face,h_256,w_256/f_auto/q_auto/v42/nexo/avatars/u1',
    );
  });

  it('sends the file with the signed parameters and never the secret', () => {
    const form = uploadForm(new Blob(['x'], { type: 'image/png' }), TICKET);

    expect(form.get('api_key')).toBe('123');
    expect(form.get('signature')).toBe('abc');
    expect(form.get('public_id')).toBe('nexo/avatars/u1');
    expect(form.get('overwrite')).toBe('true');
    expect(form.has('api_secret')).toBe(false);
  });

  it('asks the edge function for a signature and uploads to Cloudinary', async () => {
    const { client, invoke } = clientReturning({ data: TICKET, error: null });
    const http = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ public_id: 'nexo/avatars/u1', version: 7 })),
      );
    const storage = new CloudinaryAvatarStorage(client, http);

    const url = await storage.upload(new Blob(['x'], { type: 'image/png' }));

    expect(invoke).toHaveBeenCalledWith('avatar', { method: 'POST' });
    expect(http.mock.calls[0]![0]).toBe('https://api.cloudinary.com/v1_1/nexo-cloud/image/upload');
    expect(url).toContain('/v7/nexo/avatars/u1');
  });

  it('reports a rejected upload', async () => {
    const { client } = clientReturning({ data: TICKET, error: null });
    const http = vi.fn().mockResolvedValue(new Response('{}', { status: 400 }));

    await expect(new CloudinaryAvatarStorage(client, http).upload(new Blob(['x']))).rejects.toEqual(
      new AuthError('avatar_upload'),
    );
  });

  it('removes the photo through the edge function', async () => {
    const { client, invoke } = clientReturning({ data: { removed: true }, error: null });

    await new CloudinaryAvatarStorage(client).remove();

    expect(invoke).toHaveBeenCalledWith('avatar', { method: 'DELETE' });
  });
});
