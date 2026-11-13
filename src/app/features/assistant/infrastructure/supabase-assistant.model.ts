import {
  FunctionsFetchError,
  FunctionsHttpError,
  type SupabaseClient,
} from '@supabase/supabase-js';
import {
  AssistantError,
  type AssistantErrorCode,
  type AssistantModel,
  type ModelReply,
  type ModelRequest,
} from '@core/assistant/assistant';

const STATUS_CODES: Readonly<Record<number, AssistantErrorCode>> = {
  422: 'blocked',
  429: 'rate_limited',
  503: 'unavailable',
};

export function mapAssistantError(error: unknown): AssistantError {
  if (error instanceof FunctionsHttpError) {
    const status = (error.context as Response | undefined)?.status ?? 0;
    return new AssistantError(STATUS_CODES[status] ?? 'unknown');
  }
  if (error instanceof FunctionsFetchError) {
    return new AssistantError('network');
  }
  return new AssistantError('unknown');
}

function isReply(value: unknown): value is ModelReply {
  const reply = value as Partial<ModelReply> | null;
  return typeof reply?.text === 'string' && Array.isArray(reply.calls);
}

export class SupabaseAssistantModel implements AssistantModel {
  constructor(private readonly client: SupabaseClient) {}

  async reply(request: ModelRequest): Promise<ModelReply> {
    const { data, error } = await this.client.functions.invoke<unknown>('assistant', {
      body: request,
    });
    if (error) {
      throw mapAssistantError(error);
    }
    if (!isReply(data)) {
      throw new AssistantError('unknown');
    }
    return data;
  }
}
