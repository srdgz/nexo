import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import {
  Baby,
  Briefcase,
  Bus,
  Car,
  Circle,
  Coffee,
  Coins,
  Dumbbell,
  Ellipsis,
  Gift,
  GraduationCap,
  HeartPulse,
  House,
  type IconNode,
  Landmark,
  PawPrint,
  PiggyBank,
  Plane,
  Repeat,
  ShieldCheck,
  Shirt,
  ShoppingCart,
  Smartphone,
  Sparkles,
  Ticket,
  Utensils,
  Zap,
} from 'lucide';
import { NxIcon } from '@shared/ui/icon/icon';
import type { CategoryColor } from '../../domain/category';

export const CATEGORY_ICON_NODES: Readonly<Record<string, IconNode>> = {
  briefcase: Briefcase,
  sparkles: Sparkles,
  coins: Coins,
  landmark: Landmark,
  'piggy-bank': PiggyBank,
  gift: Gift,
  house: House,
  'shopping-cart': ShoppingCart,
  car: Car,
  bus: Bus,
  zap: Zap,
  'heart-pulse': HeartPulse,
  ticket: Ticket,
  utensils: Utensils,
  coffee: Coffee,
  repeat: Repeat,
  'shield-check': ShieldCheck,
  smartphone: Smartphone,
  shirt: Shirt,
  'graduation-cap': GraduationCap,
  plane: Plane,
  dumbbell: Dumbbell,
  'paw-print': PawPrint,
  baby: Baby,
  ellipsis: Ellipsis,
};

export function categoryIcon(name: string | null | undefined): IconNode {
  return (name && CATEGORY_ICON_NODES[name]) || Circle;
}

@Component({
  selector: 'nx-category-tile',
  imports: [NxIcon],
  template: `<svg nx-icon [icon]="node()" [size]="size() === 'sm' ? 16 : 18"></svg>`,
  styles: `
    :host {
      display: grid;
      place-items: center;
      flex: none;
      width: 36px;
      height: 36px;
      border-radius: 12px;
      background: var(--tile, var(--nx-cat-sand));
      color: var(--nx-navy-900);
    }
    :host(.sm) {
      width: 30px;
      height: 30px;
      border-radius: 10px;
    }
  `,
  host: {
    'aria-hidden': 'true',
    '[class]': 'size()',
    '[style.--tile]': '"var(--nx-cat-" + color() + ")"',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NxCategoryTile {
  readonly icon = input<string | null | undefined>('circle');
  readonly color = input<CategoryColor>('sand');
  readonly size = input<'sm' | 'md'>('md');

  protected readonly node = computed(() => categoryIcon(this.icon()));
}
