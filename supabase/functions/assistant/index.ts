import { createClient } from 'npm:@supabase/supabase-js@2.119.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const DEFAULT_MODEL = 'gemini-3.6-flash';
const MAX_TURNS = 40;
const MAX_TEXT = 2000;
const MAX_TOOLS = 20;
const MAX_BODY = 200_000;
const TOOL_NAME = /^[a-z][a-z0-9_]{1,40}$/;
const LOCAL_ID = 'local-';
const DAY = /^\d{4}-\d{2}-\d{2}$/;

type Json = Record<string, unknown>;

interface ToolCall {
  id: string;
  name: string;
  args: Json;
}

type Turn =
  | { role: 'user'; text: string }
  | { role: 'model'; text: string; calls: ToolCall[]; raw?: unknown }
  | { role: 'tool'; results: { id: string; name: string; output: Json }[] };

interface Part {
  text?: string;
  thought?: boolean;
  functionCall?: { id?: string; name: string; args?: Json };
  functionResponse?: { id?: string; name: string; response: Json };
}

interface Content {
  role: 'user' | 'model';
  parts: Part[];
}

function json(body: Json, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function isObject(value: unknown): value is Json {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isContent(value: unknown): value is Content {
  return isObject(value) && value['role'] === 'model' && Array.isArray(value['parts']);
}

function validTurn(turn: unknown): turn is Turn {
  if (!isObject(turn)) {
    return false;
  }
  if (turn['role'] === 'user') {
    return typeof turn['text'] === 'string' && turn['text'].length <= MAX_TEXT;
  }
  if (turn['role'] === 'model') {
    return typeof turn['text'] === 'string' && Array.isArray(turn['calls']);
  }
  return turn['role'] === 'tool' && Array.isArray(turn['results']);
}

function toContent(turn: Turn): Content {
  if (turn.role === 'user') {
    return { role: 'user', parts: [{ text: turn.text }] };
  }
  if (turn.role === 'model') {
    if (isContent(turn.raw)) {
      return turn.raw;
    }
    const parts: Part[] = turn.text ? [{ text: turn.text }] : [];
    for (const call of turn.calls) {
      parts.push({ functionCall: { id: call.id, name: call.name, args: call.args } });
    }
    return { role: 'model', parts: parts.length ? parts : [{ text: '' }] };
  }
  return {
    role: 'user',
    parts: turn.results.map((result) => ({
      functionResponse: {
        ...(result.id.startsWith(LOCAL_ID) ? {} : { id: result.id }),
        name: result.name,
        response: result.output,
      },
    })),
  };
}

function instructions(mode: string, context: Json): string {
  const today =
    typeof context['today'] === 'string' && DAY.test(context['today'])
      ? context['today']
      : new Date().toISOString().slice(0, 10);
  const language = context['language'] === 'en' ? 'English' : 'Spanish';
  const weekStart = context['weekStartsOn'] === 0 ? 'Sunday' : 'Monday';
  const weekday = new Date(`${today}T12:00:00Z`).toLocaleDateString('en-GB', {
    weekday: 'long',
    timeZone: 'UTC',
  });
  const lines = [
    'You are the assistant inside NEXO, a personal app for money, tasks and calendar.',
    `Today is ${weekday} ${today}. Weeks start on ${weekStart}. Amounts are in euros.`,
    `Always answer in ${language}, in a short and friendly way, as plain text without Markdown tables or headings.`,
    'Use the tools to read or change the user’s data and never invent figures, tasks or events.',
    'Resolve relative dates such as "tomorrow" or "next Friday" from today and send them as YYYY-MM-DD.',
    'Tools that change data are confirmed by the user in the app: call them directly and do not ask for confirmation in text.',
    'If a tool result says the user declined, acknowledge it briefly and do not retry.',
    'If a tool returns an error, fix the arguments when you can, or explain the problem in one sentence.',
    'If something essential is missing or ambiguous, such as the amount, the date or which item, ask one short question.',
    'Only help with the user’s money, tasks and calendar in NEXO; politely decline anything else.',
  ];
  if (mode === 'capture') {
    lines.push(
      'The user is quickly adding a single item. Call the one tool that creates it, looking up category names first when needed.',
      'After it is saved, confirm it in one short sentence.',
    );
  }
  return lines.join('\n');
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (request.method !== 'POST') {
    return json({ error: 'method_not_allowed' }, 405);
  }

  const authorization = request.headers.get('Authorization') ?? '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  const url = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const apiKey = Deno.env.get('GEMINI_API_KEY');
  const model = Deno.env.get('GEMINI_MODEL') || DEFAULT_MODEL;
  if (!url || !serviceRoleKey || !apiKey) {
    return json({ error: 'not_configured' }, 503);
  }
  if (!token) {
    return json({ error: 'unauthorized' }, 401);
  }
  const admin = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: user, error: userError } = await admin.auth.getUser(token);
  if (userError || !user.user) {
    return json({ error: 'unauthorized' }, 401);
  }

  const raw = await request.text();
  if (raw.length > MAX_BODY) {
    return json({ error: 'too_large' }, 413);
  }
  let body: Json;
  try {
    body = JSON.parse(raw) as Json;
  } catch {
    return json({ error: 'invalid_body' }, 400);
  }
  const turns = Array.isArray(body['turns']) ? body['turns'].slice(-MAX_TURNS) : [];
  const tools = Array.isArray(body['tools']) ? body['tools'] : [];
  if (
    turns.length === 0 ||
    !turns.every(validTurn) ||
    tools.length > MAX_TOOLS ||
    !tools.every(
      (tool) =>
        isObject(tool) &&
        typeof tool['name'] === 'string' &&
        TOOL_NAME.test(tool['name']) &&
        typeof tool['description'] === 'string' &&
        isObject(tool['parameters']),
    )
  ) {
    return json({ error: 'invalid_body' }, 400);
  }
  while (turns.length && (turns[0] as Turn).role !== 'user') {
    turns.shift();
  }

  const mode = body['mode'] === 'capture' ? 'capture' : 'chat';
  const context = isObject(body['context']) ? body['context'] : {};
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: instructions(mode, context) }] },
        contents: (turns as Turn[]).map(toContent),
        tools: tools.length
          ? [
              {
                functionDeclarations: tools.map((tool) => ({
                  name: tool['name'],
                  description: tool['description'],
                  parametersJsonSchema: tool['parameters'],
                })),
              },
            ]
          : undefined,
      }),
    },
  ).catch(() => null);

  if (!response) {
    return json({ error: 'model_unreachable' }, 502);
  }
  if (response.status === 429) {
    return json({ error: 'rate_limited' }, 429);
  }
  if (!response.ok) {
    console.error('gemini', response.status, (await response.text()).slice(0, 500));
    return json({ error: 'model_error' }, 502);
  }

  const result = (await response.json()) as Json;
  const candidate = Array.isArray(result['candidates']) ? result['candidates'][0] : null;
  const content = isObject(candidate) ? candidate['content'] : null;
  if (!isContent(content)) {
    return json({ error: 'blocked' }, 422);
  }
  const parts = content.parts;
  const text = parts
    .filter((part) => typeof part.text === 'string' && !part.thought)
    .map((part) => part.text)
    .join('')
    .trim();
  const calls: ToolCall[] = parts
    .filter((part) => part.functionCall)
    .map((part, index) => ({
      id: part.functionCall?.id ?? `${LOCAL_ID}${turns.length}-${index}`,
      name: part.functionCall?.name ?? '',
      args: part.functionCall?.args ?? {},
    }));
  if (!text && calls.length === 0) {
    return json({ error: 'blocked' }, 422);
  }
  return json({ text, calls, raw: content }, 200);
});
