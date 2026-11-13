import { InjectionToken } from '@angular/core';

export type JsonSchema = Readonly<Record<string, unknown>>;
export type ToolInput = Readonly<Record<string, unknown>>;

export interface AssistantTool {
  readonly name: string;
  readonly description: string;
  readonly parameters: JsonSchema;
  readonly writes: boolean;
  run(input: ToolInput): Promise<unknown>;
  describe?(input: ToolInput): Promise<string>;
}

export const ASSISTANT_TOOLS = new InjectionToken<readonly (readonly AssistantTool[])[]>(
  'ASSISTANT_TOOLS',
);

export interface ToolDeclaration {
  readonly name: string;
  readonly description: string;
  readonly parameters: JsonSchema;
}

export interface ToolCall {
  readonly id: string;
  readonly name: string;
  readonly args: ToolInput;
}

export interface ToolResult {
  readonly id: string;
  readonly name: string;
  readonly output: Readonly<Record<string, unknown>>;
}

export type AssistantTurn =
  | { readonly role: 'user'; readonly text: string }
  | {
      readonly role: 'model';
      readonly text: string;
      readonly calls: readonly ToolCall[];
      readonly raw?: unknown;
    }
  | { readonly role: 'tool'; readonly results: readonly ToolResult[] };

export type AssistantMode = 'capture' | 'chat';

export interface AssistantContext {
  readonly today: string;
  readonly language: string;
  readonly weekStartsOn: 0 | 1;
}

export interface ModelRequest {
  readonly mode: AssistantMode;
  readonly turns: readonly AssistantTurn[];
  readonly tools: readonly ToolDeclaration[];
  readonly context: AssistantContext;
}

export interface ModelReply {
  readonly text: string;
  readonly calls: readonly ToolCall[];
  readonly raw?: unknown;
}

export interface AssistantModel {
  reply(request: ModelRequest): Promise<ModelReply>;
}

export type AssistantErrorCode = 'unavailable' | 'rate_limited' | 'blocked' | 'network' | 'unknown';

export class AssistantError extends Error {
  constructor(readonly code: AssistantErrorCode) {
    super(code);
    this.name = 'AssistantError';
  }
}

export function toAssistantError(error: unknown): AssistantError {
  return error instanceof AssistantError ? error : new AssistantError('unknown');
}

export class ToolInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ToolInputError';
  }
}

export const ASSISTANT_MODEL_LOADER = new InjectionToken<() => Promise<AssistantModel>>(
  'ASSISTANT_MODEL_LOADER',
  {
    providedIn: 'root',
    factory: () => () =>
      Promise.resolve({ reply: () => Promise.reject(new AssistantError('unavailable')) }),
  },
);

export function text(input: ToolInput, key: string): string | null {
  const value = input[key];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export function number(input: ToolInput, key: string): number | null {
  const value = input[key];
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return null;
}

export function bool(input: ToolInput, key: string): boolean | null {
  const value = input[key];
  return typeof value === 'boolean' ? value : null;
}
