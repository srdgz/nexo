import { Injectable, inject } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { Session } from '../session/session';
import {
  ASSISTANT_MODEL_LOADER,
  ASSISTANT_TOOLS,
  type AssistantMode,
  type AssistantModel,
  type AssistantTool,
  type AssistantTurn,
  type ToolCall,
  ToolInputError,
  type ToolResult,
} from './assistant';

export const MAX_MODEL_ROUNDS = 6;

export interface PendingAction {
  readonly id: string;
  readonly tool: string;
  readonly summary: string;
}

export interface RunOptions {
  readonly mode: AssistantMode;
  confirm(action: PendingAction): Promise<boolean>;
  onTurns?(turns: readonly AssistantTurn[]): void;
}

function localDay(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

@Injectable({ providedIn: 'root' })
export class AssistantService {
  private readonly loader = inject(ASSISTANT_MODEL_LOADER);
  private readonly session = inject(Session);
  private readonly transloco = inject(TranslocoService);
  private readonly tools: readonly AssistantTool[] = (
    inject(ASSISTANT_TOOLS, { optional: true }) ?? []
  ).flat();
  private model: Promise<AssistantModel> | null = null;

  declarations() {
    return this.tools.map(({ name, description, parameters }) => ({
      name,
      description,
      parameters,
    }));
  }

  async run(history: readonly AssistantTurn[], options: RunOptions): Promise<AssistantTurn[]> {
    const model = await this.load();
    let turns = [...history];
    const publish = () => options.onTurns?.(turns);

    for (let round = 0; round < MAX_MODEL_ROUNDS; round += 1) {
      const reply = await model.reply({
        mode: options.mode,
        turns,
        tools: this.declarations(),
        context: {
          today: localDay(new Date()),
          language: this.transloco.getActiveLang(),
          weekStartsOn: this.session.user()?.weekStartsOn ?? 1,
        },
      });
      turns = [...turns, { role: 'model', ...reply }];
      publish();
      if (reply.calls.length === 0) {
        return turns;
      }
      const results: ToolResult[] = [];
      for (const call of reply.calls) {
        results.push(await this.execute(call, options));
      }
      turns = [...turns, { role: 'tool', results }];
      publish();
    }
    return turns;
  }

  private async execute(call: ToolCall, options: RunOptions): Promise<ToolResult> {
    const tool = this.tools.find((candidate) => candidate.name === call.name);
    const result = (output: Record<string, unknown>): ToolResult => ({
      id: call.id,
      name: call.name,
      output,
    });
    if (!tool) {
      return result({ error: `Unknown tool ${call.name}.` });
    }
    try {
      if (tool.writes) {
        const summary = (await tool.describe?.(call.args)) ?? tool.name;
        const accepted = await options.confirm({ id: call.id, tool: tool.name, summary });
        if (!accepted) {
          return result({ declined: true, message: 'The user cancelled this action.' });
        }
      }
      return result({ result: (await tool.run(call.args)) ?? null });
    } catch (error) {
      return result({
        error: error instanceof ToolInputError ? error.message : 'The action failed.',
      });
    }
  }

  private load(): Promise<AssistantModel> {
    this.model ??= this.loader().catch((error: unknown) => {
      this.model = null;
      throw error;
    });
    return this.model;
  }
}
