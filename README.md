<p align="center">
  <img src="brand/nexo-logo.svg" alt="NEXO" width="200">
</p>

<p align="center"><strong>Organize your life. Control your priorities.</strong></p>

NEXO is a personal life manager that connects money, tasks and calendar in one place. A task such as "Pay the car insurance" can carry a planned payment; when you complete it, NEXO offers to record the expense and shows its impact on your monthly budget.

> Work in progress. The design phase is complete; development follows the backlog in [`docs/`](docs/README.md).

## Stack

| Area | Choice |
|------|--------|
| Frontend | Angular (standalone, zoneless, signals), TypeScript strict, own SCSS design system |
| Architecture | Hexagonal per feature: domain, application, infrastructure, presentation |
| Backend | Supabase: Auth, PostgreSQL with Row Level Security, Edge Functions |
| i18n | Spanish and English (Transloco) |
| Testing | Vitest, Playwright, pgTAP |
| Deploy | Vercel |

## Demo mode

Anyone can try NEXO without signing up. Demo mode runs entirely in the browser with in-memory adapters that implement the same ports as the Supabase adapters, seeded with fictional data relative to today's date.

## Documentation

Design documents (in Spanish): sitemap, wireframes, components, user flows, data model and visual identity in [`docs/`](docs/README.md).
