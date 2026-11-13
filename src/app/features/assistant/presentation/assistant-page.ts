import {
  ChangeDetectionStrategy,
  Component,
  type ElementRef,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { Check, RotateCcw, Send, Sparkles, X } from 'lucide';
import { APP_MODE } from '@core/app-mode/app-mode';
import {
  type AssistantMode,
  type AssistantTurn,
  toAssistantError,
} from '@core/assistant/assistant';
import { AssistantService, type PendingAction } from '@core/assistant/assistant.service';
import { NxAlert } from '@shared/ui/alert/alert';
import { NxButton } from '@shared/ui/button/button';
import { NxCard } from '@shared/ui/card/card';
import { NxIcon } from '@shared/ui/icon/icon';
import { NxIconButton } from '@shared/ui/icon-button/icon-button';
import { NxSegmented, type SegmentedOption } from '@shared/ui/segmented/segmented';
import { injectActiveLanguage } from '@shared/util/active-language';

type ChatItem =
  | { readonly kind: 'user'; readonly text: string }
  | { readonly kind: 'assistant'; readonly text: string }
  | { readonly kind: 'action'; readonly text: string; readonly status: 'done' | 'cancelled' };

const EXAMPLES: Readonly<Record<AssistantMode, readonly string[]>> = {
  capture: ['assistant.examples.expense', 'assistant.examples.task', 'assistant.examples.event'],
  chat: ['assistant.examples.summary', 'assistant.examples.tasks', 'assistant.examples.budgets'],
};

@Component({
  selector: 'nx-assistant-page',
  imports: [NxAlert, NxButton, NxCard, NxIcon, NxIconButton, NxSegmented, TranslocoPipe],
  templateUrl: './assistant-page.html',
  styleUrl: './assistant-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssistantPage {
  readonly mode = input<string>();

  private readonly assistant = inject(AssistantService);
  private readonly transloco = inject(TranslocoService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly language = injectActiveLanguage();
  private readonly log = viewChild<ElementRef<HTMLElement>>('log');
  private readonly field = viewChild<ElementRef<HTMLTextAreaElement>>('field');

  protected readonly demo = inject(APP_MODE) === 'demo';
  protected readonly icons = {
    send: Send,
    spark: Sparkles,
    check: Check,
    cancel: X,
    reset: RotateCcw,
  };
  protected readonly current = computed<AssistantMode>(() =>
    this.mode() === 'capture' ? 'capture' : 'chat',
  );
  protected readonly modeOptions = computed<readonly SegmentedOption<AssistantMode>[]>(() => {
    this.language();
    return [
      { value: 'capture', label: this.transloco.translate('assistant.modes.capture') },
      { value: 'chat', label: this.transloco.translate('assistant.modes.chat') },
    ];
  });
  protected readonly examples = computed(() => {
    this.language();
    return EXAMPLES[this.current()].map((key) => this.transloco.translate(key));
  });

  protected readonly draft = signal('');
  protected readonly turns = signal<readonly AssistantTurn[]>([]);
  protected readonly busy = signal(false);
  protected readonly errorKey = signal<string | null>(null);
  protected readonly pending = signal<PendingAction | null>(null);
  private readonly outcomes = signal<ReadonlyMap<string, ChatItem>>(new Map());
  private resolve: ((accepted: boolean) => void) | null = null;

  protected readonly items = computed<ChatItem[]>(() => {
    const outcomes = this.outcomes();
    return this.turns().flatMap((turn): ChatItem[] => {
      if (turn.role === 'user') {
        return [{ kind: 'user', text: turn.text }];
      }
      if (turn.role === 'model') {
        return turn.text ? [{ kind: 'assistant', text: turn.text }] : [];
      }
      return turn.results.flatMap((result) => {
        const outcome = outcomes.get(result.id);
        return outcome ? [outcome] : [];
      });
    });
  });

  constructor() {
    effect(() => {
      this.current();
      untracked(() => this.reset());
    });
    effect(() => {
      this.items();
      this.pending();
      this.busy();
      const element = this.log()?.nativeElement;
      if (element) {
        queueMicrotask(() => (element.scrollTop = element.scrollHeight));
      }
    });
  }

  protected setMode(mode: AssistantMode): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { mode: mode === 'capture' ? 'capture' : null },
      replaceUrl: true,
    });
  }

  protected useExample(text: string): void {
    this.draft.set(text);
    void this.send();
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
      event.preventDefault();
      void this.send();
    }
  }

  protected async send(event?: Event): Promise<void> {
    event?.preventDefault();
    const text = this.draft().trim().slice(0, 2000);
    if (!text || this.busy()) {
      return;
    }
    const mode = this.current();
    const history = mode === 'capture' ? [] : this.turns();
    if (mode === 'capture') {
      this.outcomes.set(new Map());
    }
    this.clearDraft();
    this.errorKey.set(null);
    this.busy.set(true);
    const start: AssistantTurn[] = [...history, { role: 'user', text }];
    this.turns.set(start);
    try {
      const turns = await this.assistant.run(start, {
        mode,
        confirm: (action) => this.ask(action),
        onTurns: (value) => this.turns.set(value),
      });
      this.turns.set(turns);
    } catch (error) {
      this.errorKey.set(`assistant.errors.${toAssistantError(error).code}`);
    } finally {
      this.busy.set(false);
      this.pending.set(null);
      this.resolve = null;
      queueMicrotask(() => this.field()?.nativeElement.focus());
    }
  }

  protected answer(accepted: boolean): void {
    const action = this.pending();
    if (!action) {
      return;
    }
    this.outcomes.update((map) =>
      new Map(map).set(action.id, {
        kind: 'action',
        text: action.summary,
        status: accepted ? 'done' : 'cancelled',
      }),
    );
    this.pending.set(null);
    this.resolve?.(accepted);
    this.resolve = null;
  }

  protected reset(): void {
    this.answer(false);
    this.turns.set([]);
    this.outcomes.set(new Map());
    this.errorKey.set(null);
    this.clearDraft();
  }

  private clearDraft(): void {
    this.draft.set('');
    const field = this.field()?.nativeElement;
    if (field) {
      field.value = '';
    }
  }

  private ask(action: PendingAction): Promise<boolean> {
    this.pending.set(action);
    return new Promise((resolve) => {
      this.resolve = resolve;
    });
  }
}
