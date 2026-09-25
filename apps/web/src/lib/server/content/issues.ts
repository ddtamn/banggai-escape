/**
 * Rendering Zod issues as readable lines for an error message.
 *
 * Shared by the entry and settings readers, which both have to report *what* is wrong with
 * stored data rather than merely that something is. The shapes are the same ones the admin's
 * forms and the one-shot export print — `field: message`, with `(root)` for a problem with
 * the value as a whole — so a failure in any of the three reads the same way.
 */
export function describeIssues(
	issues: readonly { path: readonly PropertyKey[]; message: string }[],
): string[] {
	return issues.map((issue) => {
		const field = issue.path.length > 0 ? issue.path.join('.') : '(root)';

		return `${field}: ${issue.message}`;
	});
}
