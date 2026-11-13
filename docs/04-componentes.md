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
- Se crean en la fase que los usa: `nx-lollipop-chart` y `nx-spark` (Fase 5).

### Estado tras la Fase 3

- Añadidos en `shared`: `nx-month-picker`, `nx-pagination`, `nx-alert`, y los gráficos `nx-bar-chart` y `nx-donut-chart` (SVG propio, con tabla equivalente oculta para lectores de pantalla).
- `nx-data-table` no es un componente genérico: la tabla de movimientos es propia de la página (tabla real en escritorio, lista agrupada por día en móvil). Se extraerá si otra pantalla la necesita.
- En finanzas: `nx-category-tile`, `nx-category-dialog`, `nx-icon-picker`, `nx-color-picker` y `nx-budget-dialog`.
- La galería `/app/ui` muestra todos los componentes; solo existe en desarrollo.

### Estado tras la Fase 4

- `nx-priority-badge` y `nx-status-badge` viven en `features/organization/presentation` porque traducen valores del dominio de tareas.
- `nx-task-check` (casilla redonda con estado de carga) y `nx-task-payment-prompt` (diálogo «¿Registrar el pago?»): la lógica está en el servicio `TaskCompletion`, así que la lista de tareas, el calendario y el dashboard comparten el mismo flujo.
- Finanzas no depende de Organización: declara el puerto `TaskLookup` (tareas para el selector «Tarea relacionada») y Organización lo implementa.

### Estado tras la Fase 5

- `nx-lollipop-chart` en `shared/charts`: dibuja a la anchura real del contenedor (`ResizeObserver`), así las etiquetas se leen igual en móvil que en escritorio. Los días futuros se marcan con un punto, el día de hoy se resalta con una etiqueta flotante y la tabla oculta solo lista los días pasados.
- `PageHeading` en `core/layout`: servicio con el que una página sustituye el título y el subtítulo de la cabecera mientras está activa. El dashboard lo usa para el saludo («Buenas tardes, Laura») y el resumen del día; el título de la pestaña sigue siendo «Inicio · NEXO».
- El dashboard no tiene componentes propios: sus tarjetas son `nx-card` y reutilizan `nx-task-check`, `nx-task-payment-prompt`, `nx-category-tile` y `nx-donut-chart`. Se extraerán si otra pantalla las necesita.
- `nx-card-header` deja que el título ocupe su ancho natural y pasa las acciones a la línea siguiente cuando no caben.

### Estado tras Ajustes

- Ajustes no tiene capa propia de datos: perfil y preferencias son parte de `AuthRepository` (`updateProfile`, `changeEmail`, `changePassword`, `deleteAccount`). Supabase guarda el nombre, el idioma y el primer día de la semana en `profiles` y también en los metadatos del usuario, para tenerlos en la sesión sin otra consulta.
- El puerto `Session` de `core` expone `weekStartsOn` y `updatePreferences`; el calendario y el inicio lo leen de ahí. El selector de idioma del avatar también guarda el idioma en el perfil.
- Al iniciar sesión se aplica el idioma guardado en el perfil, si lo hay. En la demo el usuario no tiene idioma guardado, así que se respeta el del navegador.
- `nx-delete-account-dialog` pide escribir «ELIMINAR» (o «DELETE» en inglés). En la demo se pueden cambiar el nombre y las preferencias, pero no el email, la contraseña ni eliminar la cuenta.
- Las cuentas que solo entran con Google no tienen contraseña: la tarjeta lo explica en lugar de mostrar el formulario.
- Ajustes muestra sus pestañas Perfil / Preferencias también en escritorio (`tabsOnDesktop`), porque no tiene submenú en la barra lateral.

### Estado tras la Fase 6 (tema y accesibilidad)

- Los componentes solo usan tokens semánticos (D-26). La paleta se define una vez en `_tokens.scss` y el tema oscuro redefine los tokens semánticos en un `@mixin dark`, que se aplica con `[data-theme='dark']` o con `prefers-color-scheme: dark` cuando la preferencia es «Sistema».
- `ThemeService` en `core/theme`: guarda la preferencia en `localStorage` (`nexo.theme`), marca `<html data-theme>`, sigue los cambios del sistema y actualiza `<meta name="theme-color">`. Un script mínimo en `index.html` aplica el tema antes de que arranque Angular, sin parpadeo.
- El tema se guarda también en `profiles.theme` y en los metadatos del usuario, y se aplica al iniciar sesión, igual que el idioma.
- `nx-logo` pinta el azulejo y el trazo con tokens, así se adapta a los dos temas.
- Accesibilidad: los controles de formulario usan `--nx-control-border` (3:1 sobre la superficie), el aviso y el peligro sólido cumplen 4,5:1 en los dos temas, `nx-task-check` mide 24 px y los puntos del carrusel de acceso dejan 24 px entre centros (WCAG 2.5.8). Los bordes de tarjeta (`--nx-border`, `--nx-border-strong`) son decorativos y las series de los gráficos siempre van acompañadas de su valor en texto, por eso no necesitan 3:1.

### Estado tras la Fase 7 (foto de perfil)

- Puerto `AvatarStorage` (`upload`, `remove`) en `features/auth/application`, cargado según el modo como el repositorio de auth: `CloudinaryAvatarStorage` (pide la firma a la Edge Function `avatar` y sube el archivo a Cloudinary), `DemoAvatarStorage` (recorta a 256 px en un `canvas` y devuelve un `data:` URL) y `OfflineAvatarStorage`.
- `AuthStore.changeAvatar` valida formato (JPG, PNG, WebP) y tamaño (5 MB) antes de subir y guarda la URL con `updateProfile({ avatarUrl })`. La URL ya lleva la transformación de entrega (`c_fill,g_face,h_256,w_256/f_auto/q_auto`) y la versión, así que cada foto nueva invalida la caché.
- La foto se guarda en `profiles.avatar_url` y en los metadatos como `photo_url`; sin `photo_url` se usa la foto de Google si la hay, y `photo_url: null` significa que el usuario la quitó.
- `nx-avatar` gana el tamaño `xl` (80 px) para la tarjeta de identidad del perfil, que en móvil se centra en columna. Las fotos se piden con `referrerpolicy="no-referrer"` (Google rechaza algunas peticiones con referrer) y, si una no carga, se muestran las iniciales.

### Estado tras la Fase 8 (exportar e importar)

- `shared/util/csv.ts`: `toCsv` escribe UTF-8 con BOM, `;` y CRLF, entrecomilla solo cuando hace falta y neutraliza las celdas que empiezan por `=`, `+`, `-` o `@` (inyección de fórmulas) salvo los números negativos. `parseCsv` detecta `;`, `,` o tabulador por la cabecera y admite comillas y saltos de línea dentro de una celda. `shared/util/download.ts` descarga un texto como archivo.
- Movimientos (`domain/transaction-csv.ts`): columnas Fecha, Tipo, Categoría, Descripción e Importe con las cabeceras y el separador decimal del idioma activo. La importación reconoce las cabeceras en español o inglés y en cualquier orden, fechas `aaaa-mm-dd` o `dd/mm/aaaa`, importes con o sin miles y con signo (si no hay columna Tipo, el signo decide), y busca la categoría por nombre y tipo. Cada fila guarda sus problemas (`date`, `type`, `category`, `amount`) y solo se importan las válidas. Límites: 1000 filas y 2 MB.
- Calendario (`domain/ics.ts`): `eventsToIcs` genera RFC 5545 (UID estable `<id>@nexo`, horas en UTC, eventos de todo el día con `VALUE=DATE`, texto escapado y líneas plegadas a 75 bytes). `parseIcs` despliega las líneas, convierte `TZID` con `Intl`, calcula el fin con `DURATION` o una hora por defecto, ignora alarmas, cancelados y excepciones (`RECURRENCE-ID`) e importa solo la primera fecha de los eventos con `RRULE`.
- Puertos: `TransactionRepository` gana `listAll(filter)` y `createMany`; `EventRepository` gana `all()` y `createMany`. `OrganizationService.newEvents` descarta los eventos que ya existen (mismo título, inicio y fin) para que reimportar no duplique.
- UI: un botón con menú junto a «Nuevo movimiento» y «Nuevo» en el calendario. Exportar descarga lo que se ve (mes y filtros) en movimientos y todo el calendario en eventos; importar abre un diálogo con vista previa, filas con errores y el número exacto que se va a crear.

### Estado tras la Fase 9 (tiempo real)

- `core/realtime`: el puerto `ChangeFeed` avisa de qué parte cambió (`finances` u `organization`) y de cuándo se recupera la conexión. Lo carga `CHANGE_FEED_LOADER` según el modo: `SupabaseChangeFeed`, `DemoChannel` o ninguno sin backend.
- `RealtimeSync` se arranca desde `nx-app-shell` cuando hay usuario y se para al salir. Agrupa los avisos de 250 ms y llama a `refresh()` de `FinanceService` u `OrganizationService`, que sube su `version`; las vistas con `resource()` se recargan solas, sin código nuevo. Al reconectar se refresca todo, por si se perdió algún cambio. Cada feature se registra con el token múltiple `REALTIME_LISTENERS`, así `core` no depende de `features`.
- Supabase: un canal `nexo-changes-<id>` con `postgres_changes` para las cinco tablas. Altas y cambios se filtran por `user_id`; los borrados no admiten filtro en Supabase Realtime, así que llegan todos (solo la clave primaria) y como mucho provocan una recarga de más. Movimientos y tareas avisan a las dos partes porque se enlazan entre sí.
- Demo: `DemoChannel` usa `BroadcastChannel`. Cada base de datos de la demo publica su estado completo cuando cambia y aplica el que llega de otra pestaña; una pestaña nueva pide los datos al entrar (`hello`) y adopta la primera respuesta. «Restablecer datos» reinicia todas las pestañas.
- Los cambios propios también vuelven por el canal: es una recarga extra que se absorbe en la agrupación, a cambio de no tener que distinguir el origen.

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
