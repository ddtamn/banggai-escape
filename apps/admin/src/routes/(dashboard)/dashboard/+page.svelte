<script lang="ts">
import { resolve } from '$app/paths';
import type { PageData } from './$types';

let { data }: { data: PageData } = $props();
</script>

<h1 class="font-heading text-xl font-semibold text-foreground">Overview</h1>
<p class="mt-1 text-sm text-muted-foreground">Signed in as {data.user.email}.</p>

<section class="mt-8 rounded-lg border border-border bg-card p-6">
	<h2 class="text-sm font-semibold text-foreground">Built so far</h2>
	<ul class="mt-2 grid gap-1 text-sm text-muted-foreground">
		<li>
			<a href={resolve('/media')} class="font-medium text-foreground underline">Media</a> — the
			image library: uploads, alt text, and reference-aware deletion.
		</li>
	</ul>
	<p class="mt-3 text-sm text-muted-foreground">
		Packages, destinations, articles, site information, and analytics land in later phases,
		each behind this same guard.
	</p>
</section>
