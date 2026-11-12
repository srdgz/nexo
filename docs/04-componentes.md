# 4. Componentes reutilizables y variantes

Los componentes de `shared/ui` no conocen Supabase ni entidades de negocio: reciben datos por `input()` y emiten por `output()`. Todos usan `ChangeDetectionStrategy.OnPush`, signals y los tokens de [identidad visual](07-identidad-visual.md). Prefijo de selector: `nx-`.

Vista previa de cada variante en [`design/nexo-diseno.html`](design/nexo-diseno.html) → sección «Componentes».

## Base (`shared/ui`)

| Componente                            | Variantes                                                                                                           | Estados                                              | Notas de accesibilidad                                     |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- | ---------------------------------------------------------- |
| `nx-button`                           | `primary` (navy), `secondary` (borde), `ghost`, `danger`; tamaños `sm` 32 · `md` 40 · `lg` 48; `icon-only`; `block` | default, hover, focus, active, disabled, loading     | `aria-busy` en loading; icon-only exige `ariaLabel`        |
| `nx-icon-button`                      | `ghost`, `filled`, `outline`; `sm` / `md`                                                                           | igual que botón                                      | `aria-label` obligatorio                                   |
| `nx-field`                            | envoltorio de label + control + ayuda + error                                                                       | default, focus, error, disabled                      | `for`/`id` automáticos, `aria-describedby`, `aria-invalid` |
| `nx-input`                            | `text`, `email`, `password` (mostrar/ocultar), `search`                                                             | ↑                                                    |                                                            |
| `nx-money-input`                      | `€` como sufijo, formato según idioma                                                                               | ↑                                                    | `inputmode="decimal"`, valor en céntimos                   |
| `nx-textarea`                         | con contador opcional                                                                                               | ↑                                                    |                                                            |
| `nx-select`                           | nativo estilizado; con icono de categoría                                                                           | ↑                                                    | `<select>` nativo para teclado y móvil                     |
| `nx-date-input` / `nx-datetime-input` | nativos                                                                                                             | ↑                                                    |                                                            |
| `nx-checkbox`                         | normal, redondo (tarea)                                                                                             | unchecked, checked, indeterminate, disabled, loading |                                                            |
| `nx-segmented`                        | 2–4 opciones; `sm` / `md`                                                                                           |                                                      | `role="radiogroup"`                                        |
| `nx-switch`                           |                                                                                                                     | on, off, disabled                                    | `role="switch"`                                            |
| `nx-badge`                            | tonos `neutral`, `success`, `warning`, `danger`, `info`, `navy`; estilos `soft` / `solid` / `dot`                   |                                                      | nunca solo color: siempre texto                            |
| `nx-priority-badge`                   | `low`, `medium`, `high`                                                                                             |                                                      | icono + texto                                              |
| `nx-status-badge`                     | `pending`, `in_progress`, `completed`, `overdue`                                                                    |                                                      |                                                            |
| `nx-chip`                             | filtro seleccionable, con contador, eliminable                                                                      | selected, unselected                                 | `aria-pressed`                                             |
| `nx-card`                             | `default`, `muted`, `highlight` (navy), `interactive` (enlace)                                                      | hover/focus en interactive                           |                                                            |
| `nx-stat-card`                        | `default`, `highlight`; con tendencia `up`/`down`/`flat`; con enlace                                                | loading (skeleton), empty («—»)                      | tendencia con texto («+12 % vs. octubre»)                  |
| `nx-progress`                         | `ok` (sage), `warning` (≥80 %), `over` (>100 %) ; `sm` / `md`                                                       |                                                      | `role="progressbar"` + texto «320 de 400 €»                |
| `nx-avatar`                           | imagen / iniciales; `sm` 28 · `md` 36 · `lg` 56                                                                     |                                                      |                                                            |
| `nx-dialog`                           | `default`, `confirm`, `danger`; en móvil se muestra como hoja inferior                                              | open, submitting, error                              | `<dialog>` nativo, foco atrapado, Escape cierra            |
| `nx-sheet`                            | hoja inferior móvil                                                                                                 |                                                      |                                                            |
| `nx-menu`                             | lista de acciones, separadores, acción destructiva                                                                  |                                                      | navegación con flechas                                     |
| `nx-tabs`                             | `underline` (subsecciones), `pill`                                                                                  |                                                      | `role="tablist"`                                           |
| `nx-toast`                            | `success`, `error`, `info`; con acción («Deshacer» fuera del MVP)                                                   |                                                      | `role="status"` / `alert`                                  |
| `nx-empty-state`                      | `page`, `card` (compacto); icono + título + texto + acción                                                          |                                                      |                                                            |
| `nx-skeleton`                         | `line`, `card`, `list-row`, `table-row`, `chart`                                                                    |                                                      | `aria-hidden`, contenedor con `aria-busy`                  |
| `nx-error-state`                      | `page`, `card`; con «Reintentar»                                                                                    |                                                      |                                                            |
| `nx-data-table`                       | ordenable, paginada; en móvil se convierte en lista de filas                                                        | loading, empty, error                                | `<table>` real en escritorio                               |
| `nx-pagination`                       | anterior/siguiente + «1–20 de 134»                                                                                  |                                                      |                                                            |
| `nx-month-picker`                     | ‹ Noviembre 2026 › + menú de meses                                                                                  |                                                      |                                                            |
| `nx-logo`                             | `full`, `mark`, `mono`, `inverse`                                                                                   |                                                      | `aria-label="NEXO"`                                        |

### Estado tras la Fase 1

- Implementados en `shared/ui`: `nx-logo`, `nx-icon`, `nx-button`, `nx-icon-button`, `nx-field` + directiva `nxInput` (texto, email, búsqueda, select, fecha, textarea), `nx-password-input`, `nx-money-input`, `nxCheckbox`, `nxSwitch`, `nx-segmented`, `nx-badge`, `nx-chip`, `nx-card`, `nx-stat-card`, `nx-progress`, `nx-avatar`, `nx-skeleton`, `nx-empty-state`, `nx-error-state`, `nx-dialog`, `nx-menu`, `nx-tab-nav` y `nx-toast`.
- Los controles propios implementan `FormValueControl` de Signal Forms; `nx-field` muestra los errores traducidos (`ui.errors.*`) cuando el control se ha tocado.
- `nx-sheet` no es un componente aparte: es `nx-dialog` con `presentation="sheet"`. Con `presentation="auto"` el diálogo se muestra como hoja inferior por debajo de 768 px.
- `nx-menu` usa la Popover API nativa (cierre al pulsar fuera y con Escape) y navegación con flechas, Inicio y Fin.
- Se crean en la fase que los usa: `nx-priority-badge` y `nx-status-badge` (Fase 4) y `nx-lollipop-chart` y `nx-spark` (Fase 5).

### Estado tras la Fase 3

- Añadidos en `shared`: `nx-month-picker`, `nx-pagination`, `nx-alert`, y los gráficos `nx-bar-chart` y `nx-donut-chart` (SVG propio, con tabla equivalente oculta para lectores de pantalla).
- `nx-data-table` no es un componente genérico: la tabla de movimientos es propia de la página (tabla real en escritorio, lista agrupada por día en móvil). Se extraerá si otra pantalla la necesita.
- En finanzas: `nx-category-tile`, `nx-category-dialog`, `nx-icon-picker`, `nx-color-picker` y `nx-budget-dialog`.
- La galería `/app/ui` muestra todos los componentes; solo existe en desarrollo.

## Gráficos (`shared/charts`, SVG propio)

| Componente          | Uso                                                        | Accesibilidad                        |
| ------------------- | ---------------------------------------------------------- | ------------------------------------ |
| `nx-bar-chart`      | ingresos vs. gastos por mes (2 series)                     | tabla equivalente oculta + `<title>` |
| `nx-lollipop-chart` | gasto diario/semanal del mes (referencia «Income Tracker») | ↑                                    |
| `nx-donut-chart`    | reparto de gastos por categoría                            | leyenda con nombre, icono e importe  |
| `nx-spark`          | mini tendencia en stat cards                               | decorativo (`aria-hidden`)           |

## Layout (`core/layout`)

| Componente       | Variantes                                                       |
| ---------------- | --------------------------------------------------------------- |
| `nx-app-shell`   | escritorio (sidebar), tablet (raíl), móvil (barra inferior)     |
| `nx-sidebar`     | expandida, colapsada                                            |
| `nx-header`      | con / sin selector de mes                                       |
| `nx-bottom-nav`  | 5 posiciones con «＋» central                                   |
| `nx-quick-add`   | menú (escritorio) / hoja (móvil): Gasto, Ingreso, Tarea, Evento |
| `nx-page-header` | título, subtítulo, acciones, pestañas                           |
| `nx-demo-banner` | escritorio (una línea con acciones), móvil (compacta con menú)  |

## Feature (`features/*/presentation/components`)

| Feature      | Componentes                                                                                                                                                                             |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Finanzas     | `transaction-list`, `transaction-row`, `transaction-form`, `transaction-filters`, `category-badge`, `category-form`, `budget-card`, `budget-form`, `category-breakdown`, `balance-hero` |
| Organización | `task-list`, `task-row`, `task-form`, `task-filters`, `planned-payment-fields`, `calendar-month`, `calendar-day-agenda`, `event-row`, `event-form`                                      |
| Dashboard    | `greeting`, `upcoming-payments`, `pending-tasks-card`, `upcoming-events-card`, `budgets-card`                                                                                           |
| Ajustes      | `profile-form`, `password-form`, `preferences-form`                                                                                                                                     |

## Estados de pantalla

Cada página de datos expone un `state` explícito:

```ts
type ViewState<T> =
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'empty' }
  | { status: 'error'; error: AppError };
```

Y la plantilla usa `@switch (state().status)` con `nx-skeleton`, contenido, `nx-empty-state` y `nx-error-state`.
