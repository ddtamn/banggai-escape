<script lang="ts">
/**
 * The sign-in form, from the login-01 block.
 *
 * What the block shipped and what changed:
 *
 * - "Login with Google" and "Forgot your password?" / "Sign up" links are **gone**. There
 *   is no OAuth provider, no password reset, and no public sign-up in this app
 *   (`disableSignUp: true`); links that lead nowhere are worse than absent ones.
 * - It is a **real form post** to the route's action, not a bare `<form>`, so it works
 *   with JavaScript still loading — which matters most on the one screen nobody can
 *   reach any other way.
 * - The failure is an `Alert`, and the invalid field carries `data-invalid` /
 *   `aria-invalid` so the error is announced rather than only coloured.
 */
import * as Alert from '$lib/components/ui/alert/index.js';
import { Button } from '$lib/components/ui/button/index.js';
import * as Card from '$lib/components/ui/card/index.js';
import * as Field from '$lib/components/ui/field/index.js';
import { Input } from '$lib/components/ui/input/index.js';

let {
	redirectTo,
	message,
	email = '',
}: { redirectTo: string; message?: string; email?: string } = $props();

/** Unique per instance, so the labels and inputs stay associated. */
const id = $props.id();
</script>

<Card.Root class="mx-auto w-full max-w-sm">
	<Card.Header>
		<Card.Title class="text-2xl">Banggai Escape admin</Card.Title>
		<Card.Description>Sign in to manage site content.</Card.Description>
	</Card.Header>

	<Card.Content>
		<form method="post" class="flex flex-col gap-6">
			<input type="hidden" name="redirectTo" value={redirectTo} />

			{#if message}
				<Alert.Root variant="destructive">
					<Alert.Title>Sign-in failed</Alert.Title>
					<Alert.Description>{message}</Alert.Description>
				</Alert.Root>
			{/if}

			<Field.Group>
				<Field.Field data-invalid={message ? true : undefined}>
					<Field.Label for="email-{id}">Email</Field.Label>
					<Input
						id="email-{id}"
						name="email"
						type="email"
						autocomplete="username"
						placeholder="you@example.com"
						required
						value={email}
						aria-invalid={message ? true : undefined}
					/>
				</Field.Field>

				<Field.Field>
					<Field.Label for="password-{id}">Password</Field.Label>
					<Input
						id="password-{id}"
						name="password"
						type="password"
						autocomplete="current-password"
						required
					/>
				</Field.Field>

				<Field.Field>
					<Button type="submit" class="w-full">Sign in</Button>
					<Field.Description class="text-center">
						Access is limited to administrators. There is no public sign-up.
					</Field.Description>
				</Field.Field>
			</Field.Group>
		</form>
	</Card.Content>
</Card.Root>
