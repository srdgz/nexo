import { createClient } from 'npm:@supabase/supabase-js@2.119.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, DELETE, OPTIONS',
};

const UPLOAD_PARAMS = {
  allowed_formats: 'jpg,png,webp',
  invalidate: 'true',
  overwrite: 'true',
  transformation: 'c_limit,h_1024,w_1024',
};

function json(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function sign(params: Record<string, string>, secret: string): Promise<string> {
  const payload = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&');
  const digest = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(payload + secret));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (request.method !== 'POST' && request.method !== 'DELETE') {
    return json({ error: 'method_not_allowed' }, 405);
  }

  const authorization = request.headers.get('Authorization') ?? '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  if (!token) {
    return json({ error: 'unauthorized' }, 401);
  }

  const url = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const cloudName = Deno.env.get('CLOUDINARY_CLOUD_NAME');
  const apiKey = Deno.env.get('CLOUDINARY_API_KEY');
  const apiSecret = Deno.env.get('CLOUDINARY_API_SECRET');
  if (!url || !serviceRoleKey || !cloudName || !apiKey || !apiSecret) {
    return json({ error: 'not_configured' }, 500);
  }

  const admin = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) {
    return json({ error: 'unauthorized' }, 401);
  }

  const publicId = `nexo/avatars/${data.user.id}`;
  const timestamp = String(Math.floor(Date.now() / 1000));

  if (request.method === 'POST') {
    const params = { ...UPLOAD_PARAMS, public_id: publicId, timestamp };
    return json(
      {
        cloudName,
        apiKey,
        params,
        signature: await sign(params, apiSecret),
      },
      200,
    );
  }

  const params = { invalidate: 'true', public_id: publicId, timestamp };
  const body = new FormData();
  for (const [key, value] of Object.entries(params)) {
    body.set(key, value);
  }
  body.set('api_key', apiKey);
  body.set('signature', await sign(params, apiSecret));
  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`, {
    method: 'POST',
    body,
  });
  if (!response.ok) {
    return json({ error: 'destroy_failed' }, 502);
  }
  return json({ removed: true }, 200);
});
