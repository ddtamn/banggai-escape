<script lang="ts">
/**
 * An entry's publish state, as a badge.
 *
 * The mapping lives here rather than in each page so the list and the detail view cannot
 * disagree about what "changed" looks like. It deliberately uses `Badge`'s own variants
 * instead of hand-mixed colours: those are the semantic tokens both themes are built from,
 * so the states stay legible in light *and* dark without a single `dark:` override.
 */
import { Badge } from '$lib/components/ui/badge/index.js';

/**
 * The four states the database can imply. Spelled out rather than imported from the content
 * service, because that module is server-only and this component renders in the browser —
 * a type-only import would still drag `$lib/server` into the client graph. The page call
 * sites pass `ContentStatus` into this, so drift is caught by `svelte-check`, not silently.
 */
type Status = 'draft' | 'published' | 'changed' | 'archived';

let { status, label }: { status: Status; label: string } = $props();

/**
 * `default` is the strongest signal, so it is reserved for "published" — the only state where
 * the public site is actually serving this entry. Drafts and unpublished changes are the
 * quiet default case, and archived steps back to an outline.
 */
const variant = $derived(
	status === 'published' ? 'default' : status === 'archived' ? 'outline' : 'secondary',
);
</script>

<Badge {variant}>{label}</Badge>
