# 1. Sitemap definitivo

## Rutas

```
/                                   → redirige a /app/dashboard (con sesión) o /auth/login
├── demo                            sin UI: activa el modo demo y abre /app/dashboard
│
├── auth/                           [guestGuard: con sesión → /app/dashboard]
│   ├── login                       ?returnUrl=
│   ├── register
│   ├── verify-email                «Revisa tu correo» + reenviar enlace
│   ├── forgot-password
│   ├── reset-password              destino del enlace de recuperación (sesión de recovery)
│   └── callback                    sin UI: canjea el código de Supabase y redirige
│
├── app/                            [authGuard: sin sesión → /auth/login?returnUrl=…]  AppShell
│   ├── dashboard                   ?month=2026-11
│   │
│   ├── finances/                   → overview
│   │   ├── overview                estadísticas            ?month=
│   │   ├── transactions            listado                 ?from&to&type&category&page
│   │   ├── transactions/new        alta                    ?type=expense|income&task=<id>
│   │   ├── transactions/:id/edit   edición
│   │   ├── budgets                 presupuestos del mes    ?month=   (alta/edición en diálogo)
│   │   └── categories              categorías              (alta/edición en diálogo)
│   │
│   ├── organization/               → tasks
│   │   ├── tasks                   listado                 ?status&priority&sort
│   │   ├── tasks/new               alta
│   │   ├── tasks/:id/edit          edición
│   │   ├── calendar                vista mensual           ?month&day
│   │   ├── calendar/events/new     alta de evento          ?date=
│   │   └── calendar/events/:id/edit
│   │
│   └── settings/                   → profile
│       ├── profile                 nombre, email, contraseña, eliminar cuenta
│       └── preferences             idioma, inicio de semana
│
└── **                              404
```

Fases posteriores: `app/documents`, `app/goals`.

## Carga diferida

| Ruta | Carga |
|------|-------|
| `auth` | `loadChildren` → `features/auth/auth.routes.ts` |
| `app` | `loadComponent` del `AppShell` + `loadChildren` por feature |
| `app/finances` | `features/finances/presentation/finances.routes.ts` |
| `app/organization` | `features/organization/presentation/organization.routes.ts` |
| `app/settings` | `features/settings/presentation/settings.routes.ts` |
| Gráficos | `@defer (on viewport)` dentro de cada página |

Guards adicionales: `unsavedChangesGuard` (`canDeactivate`) en formularios con cambios sin guardar.

## Navegación

### Escritorio (≥ 1024 px)

- **Sidebar fija** (248 px): logo · Inicio · Finanzas (Resumen, Movimientos, Presupuestos, Categorías) · Organización (Tareas, Calendario) · al pie: Ajustes y tarjeta de usuario.
- **Header**: título de página · selector de mes (solo en Dashboard y Finanzas) · botón «Nuevo» (menú: Gasto, Ingreso, Tarea, Evento) · avatar (Perfil, Preferencias, Idioma, Cerrar sesión).

### Tablet (768–1023 px)

- Sidebar colapsada a raíl de iconos (72 px) con tooltips; se expande con el botón de menú.

### Móvil (360–767 px)

- **Barra superior**: título, selector de mes cuando aplica, avatar.
- **Barra inferior** con 5 posiciones: Inicio · Finanzas · **＋** · Organización · Ajustes.
- El «＋» abre una hoja inferior con Gasto, Ingreso, Tarea y Evento.
- Las subsecciones (Movimientos/Presupuestos/Categorías, Tareas/Calendario) se muestran como pestañas bajo la barra superior.

## Títulos de página (i18n)

| Ruta | ES | EN |
|------|----|----|
| dashboard | Inicio | Home |
| finances/overview | Resumen | Overview |
| finances/transactions | Movimientos | Transactions |
| finances/budgets | Presupuestos | Budgets |
| finances/categories | Categorías | Categories |
| organization/tasks | Tareas | Tasks |
| organization/calendar | Calendario | Calendar |
| settings/profile | Perfil | Profile |
| settings/preferences | Preferencias | Preferences |
