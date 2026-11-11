<p align="center">
  <img src="brand/nexo-logo.svg" alt="NEXO" width="200">
</p>

<p align="center"><strong>Organize your life. Control your priorities.</strong></p>

NEXO is a personal life manager that connects money, tasks and calendar in one place. A task such as "Pay the car insurance" can carry a planned payment; when you complete it, NEXO offers to record the expense and shows its impact on your monthly budget.

> Work in progress. The design phase is complete; development follows the backlog in [`docs/`](docs/README.md).

## Stack

| Area         | Choice                                                                             |
| ------------ | ---------------------------------------------------------------------------------- |
| Frontend     | Angular (standalone, zoneless, signals), TypeScript strict, own SCSS design system |
| Architecture | Hexagonal per feature: domain, application, infrastructure, presentation           |
| Backend      | Supabase: Auth, PostgreSQL with Row Level Security, Edge Functions                 |
| i18n         | Spanish and English (Transloco)                                                    |
| Testing      | Vitest, Playwright, pgTAP                                                          |
| Deploy       | Vercel                                                                             |

## Demo mode

Anyone can try NEXO without signing up. Demo mode runs entirely in the browser with in-memory adapters that implement the same ports as the Supabase adapters, seeded with fictional data relative to today's date.

## Development

Requirements: Node 24 and pnpm 12.

```bash
pnpm install
pnpm start
```

The app runs at http://localhost:4200.

| Script         | What it does                                     |
| -------------- | ------------------------------------------------ |
| `pnpm start`   | Development server                               |
| `pnpm test`    | Unit tests in watch mode (Vitest)                |
| `pnpm test:ci` | Unit tests once                                  |
| `pnpm test:db` | Database tests (pgTAP) on an in-memory Postgres  |
| `pnpm lint`    | ESLint, including the architecture import rules  |
| `pnpm format`  | Prettier                                         |
| `pnpm build`   | Production build                                 |
| `pnpm check`   | Format check, lint, tests and build, like the CI |

### Project structure

```
src/app/
├── core/        global services, i18n and layout (never imports features)
├── shared/      reusable UI with no business logic
└── features/    auth, dashboard, finances, organization, settings
    └── <feature>/
        ├── domain/          pure TypeScript: models and business rules
        ├── application/     use cases, ports and signal stores
        ├── infrastructure/  Supabase and demo adapters
        └── presentation/    routes, pages and components
```

ESLint enforces the dependency direction between layers.

## Backend

The database lives in `supabase/`: migrations, pgTAP tests and the `delete-account` Edge Function.

- `pnpm test:db` runs the pgTAP tests on [PGlite](https://pglite.dev) (Postgres compiled to WebAssembly) with a small shim for the Supabase roles and `auth.uid()`, so row level security is tested in CI without Docker. The same files run unchanged with `supabase test db`.
- Without Supabase credentials the app still works in demo mode; sign in shows that accounts are not enabled.

To connect a Supabase project:

1. Fill `supabaseUrl` and `supabasePublishableKey` in `src/environments/environment.ts`.
2. Apply the schema: `supabase link --project-ref <ref>` and `supabase db push`.
3. Deploy the function: `supabase functions deploy delete-account`.
4. In Authentication → URL configuration, set the site URL and add `<site>/auth/callback` as a redirect URL.

## Documentation

Design documents (in Spanish): sitemap, wireframes, components, user flows, data model and visual identity in [`docs/`](docs/README.md).
