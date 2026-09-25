# Banggai Escape — Admin (placeholder)

Reserved workspace for the future **admin / back-office** app: tour package and
destination management, booking enquiries from the contact form, blog authoring
and media uploads.

Nothing is scaffolded here yet — intentionally. There is no `package.json`, so
`pnpm install` and the workspace filter skip this directory until the app is
initialised.

## When you are ready to build it

```sh
pnpm create svelte@latest apps/admin   # pick SvelteKit, TypeScript, no demo app
pnpm install
```

Conventions to follow once it exists:

- Name the package `@banggai/admin` so `pnpm --filter @banggai/admin <script>` works.
- Reuse the design system in [`../../DESIGN.md`](../../DESIGN.md): the same forest /
  gold / warm-sand `@theme` tokens, Plus Jakarta Sans, and the pill-and-hairline
  component language. Copy `apps/web/src/routes/layout.css` as the token source
  rather than re-deriving colours.
- Keep shared, app-agnostic types (packages, destinations, posts) in a future
  `packages/*` workspace rather than importing across apps.
