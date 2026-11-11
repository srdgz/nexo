# 5. Flujos de usuario

Cada flujo indica qué pasa en escritorio y en móvil cuando difieren. Todas las escrituras siguen la regla de la especificación: **nunca se muestra éxito si el backend no lo ha confirmado** (sin actualizaciones optimistas en finanzas).

## F-01 · Registro y verificación (US-001)

```mermaid
flowchart TD
  A[auth/register] --> B{Formulario válido?}
  B -- No --> B1[Errores bajo cada campo] --> A
  B -- Sí --> C[signUp con nombre, email, contraseña, locale]
  C -- Email ya registrado --> C1[Error: «Ya existe una cuenta con este email» + enlace a login] --> A
  C -- Error de red --> C2[Toast de error, el formulario conserva los datos] --> A
  C -- OK --> D[auth/verify-email]
  D --> E[Usuario abre el enlace del correo]
  E --> F[auth/callback canjea el código]
  F -- Enlace caducado --> F1[Pantalla de error + «Reenviar enlace»] --> D
  F -- OK --> G[Trigger crea profile + 12 categorías]
  G --> H[app/dashboard con estado vacío guiado]
```

## F-02 · Inicio de sesión (US-002)

```mermaid
flowchart TD
  A[auth/login] --> B[signInWithPassword]
  B -- Credenciales incorrectas --> B1[«Email o contraseña incorrectos» sin revelar cuál] --> A
  B -- Email sin verificar --> B2[Aviso + «Reenviar enlace»] --> A
  B -- OK --> C{returnUrl?}
  C -- Sí --> D[Ruta solicitada]
  C -- No --> E[app/dashboard]
```

## F-03 · Recuperar contraseña (US-004)

```mermaid
flowchart TD
  A[auth/forgot-password] --> B[resetPasswordForEmail]
  B --> C[Mensaje neutro: «Si existe una cuenta, recibirás un correo»]
  C --> D[Usuario abre el enlace]
  D --> E[auth/reset-password con sesión de recovery]
  E --> F[Nueva contraseña + confirmación]
  F -- OK --> G[Toast «Contraseña actualizada» → /app/dashboard]
  E -- Sin sesión de recovery --> H[«El enlace ha caducado» + volver a solicitarlo]
```

## F-04 · Acceso protegido y sesión expirada (US-002/003)

```mermaid
flowchart TD
  A[Usuario abre /app/finances/budgets] --> B{authGuard: sesión válida?}
  B -- Sí --> C[Página]
  B -- No --> D[auth/login?returnUrl=/app/finances/budgets]
  C --> E[Supabase devuelve 401 / refresh falla]
  E --> F[AuthService limpia el estado] --> G[Toast «Tu sesión ha caducado»] --> D
```

## F-05 · Cerrar sesión (US-003)

Avatar → «Cerrar sesión» → `signOut()` → se limpian todos los stores de feature → `/auth/login`. En móvil, desde Ajustes → Perfil.

## F-06 · Registrar un gasto (US-021)

```mermaid
flowchart TD
  A[«Nuevo» → Gasto · móvil: ＋ → Gasto] --> B[app/finances/transactions/new?type=expense]
  B --> C[Importe · Categoría · Fecha hoy · Descripción · Tarea opcional]
  C --> D{Válido?}
  D -- No --> C
  D -- Sí --> E[Botón «Guardar» en estado loading]
  E -- Error --> E1[Toast de error, datos conservados] --> C
  E -- OK --> F[Store recarga el periodo afectado]
  F --> G[Toast «Gasto registrado» + vuelta a la ruta de origen]
  G --> H{Supera el 80% / 100% del presupuesto?}
  H -- Sí --> I[El toast añade «Has usado el 92% de Alimentación»]
```

Editar (US-022) usa el mismo formulario en `/:id/edit`. Eliminar (US-023) sigue F-12.

## F-07 · Crear presupuesto (US-026)

`/app/finances/budgets` → «Nuevo presupuesto» → diálogo (móvil: hoja inferior) con categoría de gasto (solo las que aún no tienen presupuesto ese mes) e importe → Guardar → la tarjeta aparece con el gasto ya acumulado. Si la combinación categoría + mes ya existe (`23505`), error en el campo: «Ya tienes un presupuesto para esta categoría en noviembre». Acción «Copiar del mes anterior» cuando el mes está vacío.

## F-08 · Tarea con compromiso financiero (US-030, US-032, US-037) — el «nexo»

```mermaid
flowchart TD
  A[Nueva tarea «Pagar seguro del coche»] --> B[Fecha límite 20/11 · prioridad alta]
  B --> C[Sección opcional «Pago previsto»: 350,00 € · Transporte]
  C --> D[Guardar → aparece en Tareas y en «Próximos pagos» del dashboard]
  D --> E[Usuario marca la tarea como completada]
  E --> F{Tiene pago previsto y aún no tiene movimiento?}
  F -- No --> G[Toast «Tarea completada»]
  F -- Sí --> H[Diálogo «¿Registrar el pago de 350,00 €?»]
  H -- Ahora no --> G
  H -- Registrar --> I[Formulario de gasto prerrellenado y enlazado a la tarea]
  I --> J[Guardar → balance y presupuesto de Transporte actualizados]
```

## F-09 · Completar y filtrar tareas (US-032, US-034)

- Checkbox en la fila → `status = completed`, `completed_at = now()`. La fila muestra spinner hasta la confirmación; si falla, vuelve a su estado y aparece un toast.
- Filtros: estado (Pendientes, En curso, Completadas, Todas) y prioridad (chips). Orden: vencimiento (por defecto), prioridad, creación. Los filtros viven en la URL.
- Móvil: los filtros se abren en una hoja inferior; el botón muestra el número de filtros activos.

## F-10 · Crear evento desde el calendario (US-035, US-036)

Calendario → clic en un día (móvil: tocar día → agenda del día → «＋ Evento») → `/calendar/events/new?date=2026-11-20` con inicio 09:00 y fin 10:00 por defecto → validación «el fin debe ser posterior al inicio» → Guardar → vuelve al calendario con el día seleccionado.

## F-11 · Dashboard y cambio de periodo (US-010 a US-014)

Selector de mes → actualiza `?month=` → el `DashboardService` recarga en paralelo resumen financiero, presupuestos, tareas y eventos → cada tarjeta gestiona su propio estado (loading / empty / error con «Reintentar»), así un fallo en eventos no oculta las finanzas. Cada tarjeta enlaza a su módulo con el filtro aplicado (US-014).

## F-12 · Eliminar (cualquier entidad)

```mermaid
flowchart TD
  A[Menú de fila → Eliminar] --> B[ConfirmDialog con el nombre y el importe del elemento]
  B -- Cancelar --> Z[Sin cambios]
  B -- Eliminar --> C[Botón en loading, diálogo bloqueado]
  C -- Error --> D[Mensaje dentro del diálogo, el elemento sigue en la lista]
  C -- OK --> E[Se quita de la lista + toast «Movimiento eliminado»]
```

Casos especiales: una categoría con movimientos no se puede eliminar (FK `restrict`), se ofrece **archivarla**. Eliminar una tarea deja sus movimientos sin enlace (`task_id → null`).

## F-13 · Perfil y preferencias (US-005)

- Perfil: nombre (guardar), email (cambio con verificación en el nuevo correo), contraseña (actual + nueva), eliminar cuenta (confirmación escribiendo «ELIMINAR» → Edge Function `delete-account` → cierre de sesión → `/auth/login` con toast «Tu cuenta se ha eliminado»).
- Preferencias: idioma ES/EN (aplica al instante y se guarda en `profiles.locale`), primer día de la semana (lunes/domingo).

## F-14 · Explorar la demo

```mermaid
flowchart TD
  A[Login, registro o enlace /demo] --> B[Explorar la demo]
  B --> C[Modo demo en sessionStorage + recarga]
  C --> D[Arranque con adaptadores en memoria y semilla relativa a hoy]
  D --> E[Dashboard con banda Estás viendo una demo]
  E --> F[Usa toda la app: crear, editar, completar, eliminar]
  F --> G{Qué hace después?}
  G -- Restablecer datos --> D
  G -- Crear cuenta --> H[Sale de la demo y abre auth/register]
  G -- Salir de la demo --> I[Borra modo y datos → auth/login]
  G -- Cierra la pestaña --> J[Los datos desaparecen]
```
