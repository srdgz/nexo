import { addDays, combine, localDay } from '../../domain/calendar';
import type { CalendarEvent } from '../../domain/calendar';
import type { Task } from '../../domain/task';

export interface OrganizationData {
  tasks: Task[];
  events: CalendarEvent[];
}

type Language = 'es' | 'en';
type Text = Readonly<Record<Language, string>>;

const category = (key: string) => `demo-category-${key}`;

interface TaskSeed {
  readonly key: string;
  readonly title: Text;
  readonly description?: Text;
  readonly offset: number | null;
  readonly priority: Task['priority'];
  readonly status?: Task['status'];
  readonly planned?: { readonly amount: number; readonly category: string };
}

const TASKS: readonly TaskSeed[] = [
  {
    key: 'mechanic',
    title: { es: 'Llevar el coche al taller', en: 'Take the car to the garage' },
    offset: -2,
    priority: 'high',
  },
  {
    key: 'plumber',
    title: { es: 'Llamar al fontanero', en: 'Call the plumber' },
    description: { es: 'Fuga en el baño', en: 'Leak in the bathroom' },
    offset: 0,
    priority: 'high',
  },
  {
    key: 'id-card',
    title: { es: 'Renovar el DNI', en: 'Renew the ID card' },
    description: { es: 'Cita a las 12:30', en: 'Appointment at 12:30' },
    offset: 0,
    priority: 'medium',
  },
  {
    key: 'bill',
    title: { es: 'Revisar la factura de la luz', en: 'Check the electricity bill' },
    offset: 1,
    priority: 'medium',
    status: 'in_progress',
  },
  {
    key: 'insurance',
    title: { es: 'Pagar el seguro del coche', en: 'Pay the car insurance' },
    description: { es: 'Póliza 4471-B', en: 'Policy 4471-B' },
    offset: 8,
    priority: 'high',
    planned: { amount: 44990, category: 'insurance' },
  },
  {
    key: 'gift',
    title: { es: 'Comprar el regalo de Marta', en: 'Buy Marta’s present' },
    offset: 12,
    priority: 'low',
    planned: { amount: 6000, category: 'leisure' },
  },
  {
    key: 'gym',
    title: { es: 'Pagar la cuota del gimnasio', en: 'Pay the gym membership' },
    offset: 19,
    priority: 'low',
    planned: { amount: 3990, category: 'other' },
  },
  {
    key: 'dentist',
    title: { es: 'Pedir cita en el dentista', en: 'Book a dentist appointment' },
    offset: null,
    priority: 'low',
  },
  {
    key: 'tax',
    title: { es: 'Presentar el modelo de la renta', en: 'File the tax return' },
    offset: -6,
    priority: 'medium',
    status: 'completed',
  },
];

interface EventSeed {
  readonly key: string;
  readonly title: Text;
  readonly location?: Text;
  readonly offset: number;
  readonly start: string;
  readonly end: string;
  readonly allDay?: boolean;
  readonly task?: string;
}

const EVENTS: readonly EventSeed[] = [
  {
    key: 'neighbours',
    title: { es: 'Reunión de vecinos', en: 'Residents’ meeting' },
    offset: -3,
    start: '19:00',
    end: '20:00',
  },
  {
    key: 'dentist',
    title: { es: 'Dentista', en: 'Dentist' },
    location: { es: 'Clínica Sonrisa', en: 'Smile Clinic' },
    offset: 1,
    start: '10:00',
    end: '10:45',
  },
  {
    key: 'mot',
    title: { es: 'Revisión ITV', en: 'Car inspection' },
    location: { es: 'Estación ITV Norte', en: 'North inspection centre' },
    offset: 2,
    start: '09:30',
    end: '10:30',
    task: 'mechanic',
  },
  {
    key: 'dinner',
    title: { es: 'Cena con Marta', en: 'Dinner with Marta' },
    offset: 3,
    start: '21:00',
    end: '23:00',
  },
  {
    key: 'birthday',
    title: { es: 'Cumpleaños de Andrés', en: 'Andrés’s birthday' },
    offset: 6,
    start: '00:00',
    end: '00:00',
    allDay: true,
  },
  {
    key: 'call',
    title: { es: 'Videollamada con el banco', en: 'Video call with the bank' },
    offset: 9,
    start: '16:00',
    end: '16:30',
  },
  {
    key: 'concert',
    title: { es: 'Concierto', en: 'Concert' },
    location: { es: 'Sala Riviera', en: 'Riviera Hall' },
    offset: 15,
    start: '21:00',
    end: '23:30',
  },
];

export function createOrganizationSeed(today: Date, language: Language): OrganizationData {
  const day = localDay(today);
  const created = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString();

  const tasks: Task[] = TASKS.map((seed, index) => ({
    id: `demo-task-${seed.key}`,
    title: seed.title[language],
    description: seed.description?.[language] ?? null,
    status: seed.status ?? 'pending',
    priority: seed.priority,
    dueDate: seed.offset === null ? null : addDays(day, seed.offset),
    completedAt:
      seed.status === 'completed'
        ? combine(addDays(day, seed.offset ?? 0), '18:00').toISOString()
        : null,
    createdAt: new Date(new Date(created).getTime() + index * 60_000).toISOString(),
    planned: seed.planned
      ? { amount: seed.planned.amount, categoryId: category(seed.planned.category) }
      : null,
  }));

  const events: CalendarEvent[] = EVENTS.map((seed) => {
    const date = addDays(day, seed.offset);
    return {
      id: `demo-event-${seed.key}`,
      title: seed.title[language],
      description: null,
      location: seed.location?.[language] ?? null,
      startsAt: combine(date, seed.allDay ? '00:00' : seed.start).toISOString(),
      endsAt: (seed.allDay
        ? combine(addDays(date, 1), '00:00')
        : combine(date, seed.end)
      ).toISOString(),
      allDay: seed.allDay ?? false,
      taskId: seed.task ? `demo-task-${seed.task}` : null,
    };
  });

  return { tasks, events };
}
