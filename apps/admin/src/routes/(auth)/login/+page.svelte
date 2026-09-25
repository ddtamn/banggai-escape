<script lang="ts">
/** The login-01 block's page, wrapped around the real sign-in action. */
import LoginForm from '$lib/components/login-form.svelte';
import type { ActionData, PageData } from './$types';

let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<main class="flex min-h-svh items-center justify-center bg-background px-6 py-12">
	<LoginForm redirectTo={data.redirectTo} message={form?.message} email={form?.email ?? ''} />
</main>
