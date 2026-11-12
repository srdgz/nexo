import type { Budget } from '../../domain/budget';
import type { Category, CategoryColor, EntryType } from '../../domain/category';
import { addMonths, isoDate, monthDate, monthOf } from '../../domain/month';
import type { Transaction } from '../../domain/transaction';

export interface FinanceData {
  categories: Category[];
  transactions: Transaction[];
  budgets: Budget[];
}

type Language = 'es' | 'en';
type Text = Readonly<Record<Language, string>>;

interface CategorySeed {
  readonly key: string;
  readonly name: Text;
  readonly type: EntryType;
  readonly icon: string;
  readonly color: CategoryColor;
}

const CATEGORIES: readonly CategorySeed[] = [
  {
    key: 'salary',
    name: { es: 'Nómina', en: 'Salary' },
    type: 'income',
    icon: 'briefcase',
    color: 'sage',
  },
  {
    key: 'extras',
    name: { es: 'Extras', en: 'Side income' },
    type: 'income',
    icon: 'sparkles',
    color: 'mint',
  },
  {
    key: 'housing',
    name: { es: 'Vivienda', en: 'Housing' },
    type: 'expense',
    icon: 'house',
    color: 'sand',
  },
  {
    key: 'groceries',
    name: { es: 'Alimentación', en: 'Groceries' },
    type: 'expense',
    icon: 'shopping-cart',
    color: 'butter',
  },
  {
    key: 'transport',
    name: { es: 'Transporte', en: 'Transport' },
    type: 'expense',
    icon: 'car',
    color: 'mist',
  },
  {
    key: 'utilities',
    name: { es: 'Suministros', en: 'Utilities' },
    type: 'expense',
    icon: 'zap',
    color: 'peach',
  },
  {
    key: 'health',
    name: { es: 'Salud', en: 'Health' },
    type: 'expense',
    icon: 'heart-pulse',
    color: 'blush',
  },
  {
    key: 'leisure',
    name: { es: 'Ocio', en: 'Leisure' },
    type: 'expense',
    icon: 'ticket',
    color: 'lavender',
  },
  {
    key: 'eating',
    name: { es: 'Restaurantes', en: 'Eating out' },
    type: 'expense',
    icon: 'utensils',
    color: 'peach',
  },
  {
    key: 'subscriptions',
    name: { es: 'Suscripciones', en: 'Subscriptions' },
    type: 'expense',
    icon: 'repeat',
    color: 'mist',
  },
  {
    key: 'insurance',
    name: { es: 'Seguros', en: 'Insurance' },
    type: 'expense',
    icon: 'shield-check',
    color: 'sage',
  },
  {
    key: 'other',
    name: { es: 'Otros', en: 'Other' },
    type: 'expense',
    icon: 'ellipsis',
    color: 'sand',
  },
];

interface Entry {
  readonly category: string;
  readonly day: number;
  readonly amount: number;
  readonly text: Text;
}

function random(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function monthEntries(index: number): Entry[] {
  const next = random(2026 + index * 7919);
  const between = (min: number, max: number) => Math.round(min + next() * (max - min));
  const pick = (texts: readonly Text[]) => texts[Math.floor(next() * texts.length)] as Text;

  const entries: Entry[] = [
    { category: 'salary', day: 1, amount: 320000, text: { es: 'Nómina', en: 'Salary' } },
    { category: 'housing', day: 1, amount: 85000, text: { es: 'Alquiler', en: 'Rent' } },
    {
      category: 'transport',
      day: 3,
      amount: 2000,
      text: { es: 'Abono de transporte', en: 'Transit pass' },
    },
    {
      category: 'utilities',
      day: 5,
      amount: between(8800, 12500),
      text: { es: 'Factura de la luz', en: 'Electricity bill' },
    },
    {
      category: 'utilities',
      day: 8,
      amount: 4200,
      text: { es: 'Fibra y móvil', en: 'Internet and phone' },
    },
    {
      category: 'subscriptions',
      day: 10,
      amount: 1299,
      text: { es: 'Plataforma de series', en: 'Streaming service' },
    },
    {
      category: 'utilities',
      day: 12,
      amount: between(2400, 3400),
      text: { es: 'Factura del agua', en: 'Water bill' },
    },
    {
      category: 'subscriptions',
      day: 14,
      amount: 1099,
      text: { es: 'Música en streaming', en: 'Music streaming' },
    },
  ];

  const groceries: readonly Text[] = [
    { es: 'Supermercado', en: 'Supermarket' },
    { es: 'Frutería', en: 'Greengrocer' },
    { es: 'Mercado del barrio', en: 'Local market' },
    { es: 'Panadería', en: 'Bakery' },
  ];
  for (const day of [2, 6, 11, 16, 21, 26]) {
    entries.push({
      category: 'groceries',
      day,
      amount: between(3600, 7600),
      text: pick(groceries),
    });
  }
  for (const day of [7, 17, 25]) {
    entries.push({
      category: 'transport',
      day,
      amount: between(4200, 5600),
      text: { es: 'Gasolinera', en: 'Petrol station' },
    });
  }
  const eating: readonly Text[] = [
    { es: 'Cena con amigos', en: 'Dinner with friends' },
    { es: 'Menú del día', en: 'Lunch menu' },
    { es: 'Cafetería', en: 'Café' },
  ];
  for (const day of [9, 19, 24]) {
    entries.push({ category: 'eating', day, amount: between(2400, 3900), text: pick(eating) });
  }
  const leisure: readonly Text[] = [
    { es: 'Cine', en: 'Cinema' },
    { es: 'Entradas de concierto', en: 'Concert tickets' },
    { es: 'Libros', en: 'Books' },
  ];
  for (const day of [13, 22]) {
    entries.push({ category: 'leisure', day, amount: between(1200, 3200), text: pick(leisure) });
  }
  if (index % 2 === 0) {
    entries.push({
      category: 'health',
      day: 15,
      amount: between(1500, 5400),
      text: { es: 'Farmacia', en: 'Pharmacy' },
    });
  } else {
    entries.push({
      category: 'extras',
      day: 18,
      amount: between(9000, 24000),
      text: { es: 'Venta de segunda mano', en: 'Second-hand sale' },
    });
  }
  if (index === 2) {
    entries.push({
      category: 'insurance',
      day: 20,
      amount: 18000,
      text: { es: 'Seguro del hogar', en: 'Home insurance' },
    });
  }
  return entries;
}

const BUDGETS: readonly [string, number][] = [
  ['groceries', 40000],
  ['transport', 18000],
  ['eating', 8000],
  ['leisure', 12000],
];

export function createFinanceSeed(today: Date, language: Language): FinanceData {
  const categoryId = (key: string) => `demo-category-${key}`;
  const typeOf = new Map(CATEGORIES.map((category) => [category.key, category.type]));
  const categories: Category[] = CATEGORIES.map((category) => ({
    id: categoryId(category.key),
    name: category.name[language],
    type: category.type,
    icon: category.icon,
    color: category.color,
    archived: false,
  }));

  const current = monthOf(today);
  const transactions: Transaction[] = [];
  const budgets: Budget[] = [];

  for (let offset = 5; offset >= 0; offset -= 1) {
    const month = addMonths(current, -offset);
    const start = monthDate(month);
    const elapsed = offset === 0 ? today.getDate() : 28;
    monthEntries(offset).forEach((entry, position) => {
      const day = offset === 0 ? Math.max(1, Math.ceil((entry.day * elapsed) / 28)) : entry.day;
      transactions.push({
        id: `demo-transaction-${month}-${position}`,
        type: typeOf.get(entry.category) ?? 'expense',
        categoryId: categoryId(entry.category),
        taskId: null,
        amount: entry.amount,
        date: isoDate(new Date(start.getFullYear(), start.getMonth(), day)),
        description: entry.text[language],
      });
    });
    if (offset <= 1) {
      for (const [key, amount] of BUDGETS) {
        budgets.push({
          id: `demo-budget-${month}-${key}`,
          categoryId: categoryId(key),
          amount,
          month,
        });
      }
    }
  }

  return { categories, transactions, budgets };
}
