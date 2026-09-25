/**
 * Shared content contracts for Banggai Escape.
 *
 * This package exists because both apps need the same definition of what a package,
 * destination, or article contains, and `apps/web` must never import from
 * `apps/admin`. It holds **only** framework-agnostic schemas and their inferred
 * types — no SvelteKit, no database, no Tailwind.
 *
 * `apps/web` imports types from here (`import type { … }`), which is erased at build
 * time. The admin validates payloads with `parsePayload()` / `parseSiteSetting()`
 * before every write.
 *
 * Shapes and rationale: docs/15-admin-dashboard-plan.md.
 */
export * from './content';
export * from './settings';
