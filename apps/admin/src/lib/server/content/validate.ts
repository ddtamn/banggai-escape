/**
 * The write-path validation helpers for CMS content.
 *
 * `@banggai/content-model` owns the contracts; this module turns their failures into
 * something a log line or a form action can show, and gives the publish path a single
 * place to refuse an invalid payload.
 *
 * The database columns are JSONB, so nothing but this module stops a malformed payload
 * from being stored. Validate before every write.
 */
import {
	type ContentKind,
	parsePayload,
	parseSiteSetting,
	type SiteSettingKey,
} from '@banggai/content-model';

/** One Zod issue, as `zod` reports it. */
type Issue = { path: readonly PropertyKey[]; message: string };

/**
 * Renders issues as `scope → field: message`.
 *
 * The field path matters more than the message here: a contract failure is usually a
 * renamed or newly-required field, and the path is what tells you which one.
 */
export function formatIssues(scope: string, issues: readonly Issue[]): string[] {
	return issues.map((issue) => {
		const field = issue.path.length > 0 ? issue.path.join('.') : '(root)';

		return `${scope} → ${field}: ${issue.message}`;
	});
}

/** Throws with every problem listed, rather than stopping at the first. */
export function assertValidPayload(kind: ContentKind, value: unknown): void {
	const result = parsePayload(kind, value);

	if (!result.success) {
		throw new ContentValidationError(formatIssues(kind, result.error.issues), result.error.issues);
	}
}

/** Throws with every problem listed, rather than stopping at the first. */
export function assertValidSiteSetting(key: SiteSettingKey, value: unknown): void {
	const result = parseSiteSetting(key, value);

	if (!result.success) {
		throw new ContentValidationError(
			formatIssues(`site_settings.${key}`, result.error.issues),
			result.error.issues,
		);
	}
}

/** A payload or setting that does not match its contract. */
export class ContentValidationError extends Error {
	/** Human-readable lines, one per problem. */
	readonly issues: string[];

	constructor(issues: string[], cause?: unknown) {
		super(`Content validation failed:\n  ${issues.join('\n  ')}`, { cause });
		this.name = 'ContentValidationError';
		this.issues = issues;
	}
}
