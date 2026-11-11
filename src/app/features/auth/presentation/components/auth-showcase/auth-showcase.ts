import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import {
  ArrowDown,
  Car,
  Check,
  PiggyBank,
  ShieldCheck,
  ShoppingCart,
  Stethoscope,
  Ticket,
  TrendingUp,
  Utensils,
} from 'lucide';
import { NxIcon } from '@shared/ui/icon/icon';
import { injectActiveLanguage, localeFor } from '@shared/util/active-language';
import { formatMoney } from '@shared/util/money';

export const SCENE_DURATION_MS = 6000;

const SCENES = ['balance', 'budgets', 'task', 'agenda'] as const;
type Scene = (typeof SCENES)[number];

const DAY_MS = 24 * 60 * 60 * 1000;

@Component({
  selector: 'nx-auth-showcase',
  imports: [NxIcon, TranslocoPipe],
  templateUrl: './auth-showcase.html',
  styleUrls: ['./auth-showcase.scss', './auth-showcase-scenes.scss'],
  host: {
    '[style.--scene-duration]': '`${duration}ms`',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NxAuthShowcase {
  private readonly language = injectActiveLanguage();

  protected readonly duration = SCENE_DURATION_MS;
  protected readonly scenes = SCENES;
  protected readonly current = signal(0);
  protected readonly cycle = signal(0);
  protected readonly scene = computed<Scene>(() => SCENES[this.current()] ?? 'balance');

  protected readonly icons = {
    arrow: ArrowDown,
    check: Check,
    savings: PiggyBank,
    trend: TrendingUp,
  };

  protected readonly bars = [
    [62, 48],
    [70, 55],
    [58, 60],
    [76, 52],
    [68, 47],
    [84, 50],
  ];

  protected readonly budgets = [
    { key: 'groceries', icon: ShoppingCart, tone: 'butter', spent: 18000, limit: 40000 },
    { key: 'leisure', icon: Ticket, tone: 'lavender', spent: 33000, limit: 40000 },
    { key: 'transport', icon: Car, tone: 'mist', spent: 41500, limit: 40000 },
  ].map((budget) => ({
    ...budget,
    percent: Math.min(100, Math.round((budget.spent / budget.limit) * 100)),
    status:
      budget.spent > budget.limit ? 'over' : budget.spent / budget.limit >= 0.8 ? 'warning' : 'ok',
  }));

  protected readonly insuranceIcon = ShieldCheck;

  protected readonly month = computed(() =>
    new Intl.DateTimeFormat(localeFor(this.language()), { month: 'long' }).format(new Date()),
  );

  protected readonly week = computed(() => {
    const locale = localeFor(this.language());
    const today = new Date();
    const monday = new Date(today.getTime() - ((today.getDay() + 6) % 7) * DAY_MS);
    const weekday = new Intl.DateTimeFormat(locale, { weekday: 'narrow' });
    return Array.from({ length: 7 }, (_, index) => {
      const day = new Date(monday.getTime() + index * DAY_MS);
      return {
        label: weekday.format(day),
        day: day.getDate(),
        today: day.toDateString() === today.toDateString(),
        busy: index === 1 || index === 3 || index === 4,
      };
    });
  });

  protected readonly agenda = computed(() => {
    const locale = localeFor(this.language());
    const short = new Intl.DateTimeFormat(locale, { weekday: 'short' });
    const at = (offset: number) => {
      const date = new Date(Date.now() + offset * DAY_MS);
      return { day: date.getDate(), weekday: short.format(date).replace('.', '') };
    };
    return [
      { key: 'dentist', icon: Stethoscope, time: '10:00', ...at(1), payment: false },
      { key: 'insurance', icon: ShieldCheck, time: '', ...at(2), payment: true },
      { key: 'dinner', icon: Utensils, time: '21:00', ...at(3), payment: false },
    ];
  });

  constructor() {
    let timer: ReturnType<typeof setTimeout> | undefined;
    effect(() => {
      this.cycle();
      clearTimeout(timer);
      timer = setTimeout(() => this.show(this.current() + 1), SCENE_DURATION_MS);
    });
    inject(DestroyRef).onDestroy(() => clearTimeout(timer));
  }

  protected money(cents: number): string {
    return formatMoney(cents, this.language());
  }

  protected show(index: number): void {
    this.current.set((index + SCENES.length) % SCENES.length);
    this.cycle.update((cycle) => cycle + 1);
  }
}
