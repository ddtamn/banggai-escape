/**
 * Finding and rewriting media references inside content.
 *
 * A media field is stored as a `media_assets` id and rendered as a URL, so three callers
 * on opposite sides of the workspace need the same answer to "which fields are media":
 *
 * - the one-shot import, which swaps authored CDN values for ids;
 * - the admin's deletion guard, which refuses to remove an asset anything still points at;
 * - **the public site, which swaps ids back for URLs before it renders.**
 *
 * It lives in the shared package rather than in `apps/admin` because that last caller
 * cannot import from the admin app — and a second copy of this walker is how one side
 * silently stops resolving a field the other side still writes.
 */
import { type ContentKind, mediaFieldsByKind } from './content';
import { isMediaSettingKey, mediaSettingFieldNames } from './settings';

/** Which field names carry media, for a payload of this kind. */
export function mediaFieldsFor(kind: ContentKind): readonly string[] {
	return mediaFieldsByKind[kind];
}

/** Which field names carry media inside a `site_settings.value`. */
export function mediaFieldsForSetting(): readonly string[] {
	return mediaSettingFieldNames;
}

/**
 * Every media id a payload references, in walk order and with duplicates kept — the
 * caller can decide whether it wants a set or a count.
 */
export function collectMediaIds(kind: ContentKind, payload: unknown): string[] {
	const ids: string[] = [];

	walk(payload, mediaFieldsFor(kind), (ref) => {
		ids.push(ref);

		return ref;
	});

	return ids;
}

/**
 * The same, for one `site_settings` value, which needs its key: `ctaBackground`'s value
 * is the reference itself, so there is no field name to match.
 */
export function collectSettingMediaIds(key: string, value: unknown): string[] {
	if (isMediaSettingKey(key)) return typeof value === 'string' ? [value] : [];

	const ids: string[] = [];

	walk(value, mediaFieldsForSetting(), (ref) => {
		ids.push(ref);

		return ref;
	});

	return ids;
}

/**
 * Rewrites every media field in a payload.
 *
 * Returns the new payload plus the refs `resolve` could not handle: the caller wants to
 * refuse a partial import rather than write a payload with a hole in it.
 */
export function rewriteMediaRefs(
	kind: ContentKind,
	payload: unknown,
	resolve: (ref: string) => string | undefined,
): { payload: unknown; unresolved: string[] } {
	const unresolved: string[] = [];

	const rewritten = walk(payload, mediaFieldsFor(kind), (ref) => {
		const replacement = resolve(ref);

		if (replacement === undefined) {
			unresolved.push(ref);

			return ref;
		}

		return replacement;
	});

	return { payload: rewritten, unresolved };
}

/** The same, for one `site_settings` value. */
export function rewriteSettingMediaRefs(
	key: string,
	value: unknown,
	resolve: (ref: string) => string | undefined,
): { value: unknown; unresolved: string[] } {
	if (isMediaSettingKey(key)) {
		if (typeof value !== 'string') return { value, unresolved: [] };

		const replacement = resolve(value);

		return replacement === undefined
			? { value, unresolved: [value] }
			: { value: replacement, unresolved: [] };
	}

	const unresolved: string[] = [];

	const rewritten = walk(value, mediaFieldsForSetting(), (ref) => {
		const replacement = resolve(ref);

		if (replacement === undefined) {
			unresolved.push(ref);

			return ref;
		}

		return replacement;
	});

	return { value: rewritten, unresolved };
}

/**
 * The single traversal. A media field's value is a leaf — a string, or an array of them
 * for something like `gallery` — and is handed to `visit`; anything else is recursed.
 */
function walk(value: unknown, fields: readonly string[], visit: (ref: string) => string): unknown {
	if (Array.isArray(value)) {
		return value.map((item) => walk(item, fields, visit));
	}

	if (!value || typeof value !== 'object') return value;

	const out: Record<string, unknown> = {};

	for (const [key, child] of Object.entries(value)) {
		out[key] = fields.includes(key) ? mapStrings(child, visit) : walk(child, fields, visit);
	}

	return out;
}

function mapStrings(value: unknown, visit: (ref: string) => string): unknown {
	if (typeof value === 'string') return visit(value);
	if (Array.isArray(value)) return value.map((item) => mapStrings(item, visit));

	return value;
}
