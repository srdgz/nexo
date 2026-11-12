export type EntryType = 'income' | 'expense';

export const CATEGORY_COLORS = [
  'sage',
  'sand',
  'mist',
  'blush',
  'butter',
  'lavender',
  'peach',
  'mint',
] as const;
export type CategoryColor = (typeof CATEGORY_COLORS)[number];

export const CATEGORY_ICONS = [
  'briefcase',
  'sparkles',
  'coins',
  'landmark',
  'piggy-bank',
  'gift',
  'house',
  'shopping-cart',
  'car',
  'bus',
  'zap',
  'heart-pulse',
  'ticket',
  'utensils',
  'coffee',
  'repeat',
  'shield-check',
  'smartphone',
  'shirt',
  'graduation-cap',
  'plane',
  'dumbbell',
  'paw-print',
  'baby',
  'ellipsis',
] as const;
export type CategoryIcon = (typeof CATEGORY_ICONS)[number];

export const CATEGORY_NAME_MAX = 40;

export interface Category {
  readonly id: string;
  readonly name: string;
  readonly type: EntryType;
  readonly icon: string;
  readonly color: CategoryColor;
  readonly archived: boolean;
}

export interface CategoryDraft {
  readonly name: string;
  readonly type: EntryType;
  readonly icon: string;
  readonly color: CategoryColor;
}

export function isCategoryColor(value: unknown): value is CategoryColor {
  return CATEGORY_COLORS.includes(value as CategoryColor);
}

export function normalizeCategoryName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

export function sameCategoryName(a: string, b: string): boolean {
  return (
    normalizeCategoryName(a).toLocaleLowerCase() === normalizeCategoryName(b).toLocaleLowerCase()
  );
}

export function sortCategories(categories: readonly Category[]): Category[] {
  return [...categories].sort((a, b) => a.name.localeCompare(b.name));
}
