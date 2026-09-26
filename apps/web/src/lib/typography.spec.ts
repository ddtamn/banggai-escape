/**
 * The type floor, enforced.
 *
 * ## Why a test
 *
 * 83 of the site's text sizes were `text-xs` at Tailwind's 12px default, which is why body
 * copy read as 12px, and another 25 were arbitrary `text-[10px]` and `text-[11px]` values.
 * Redefining `--text-xs` to 14px fixed the first group in one place, and that is exactly
 * the kind of fix that erodes: the next person who needs a smaller label reaches for
 * `text-[11px]`, and the floor quietly drops back.
 *
 * ## The rule
 *
 * Three named steps, and nothing else:
 *
 * | Step | Size | For |
 * | --- | --- | --- |
 * | `text-label` | 12px | micro-labels, metadata, suffixes |
 * | `text-xs` | 14px | the floor for anything a visitor must read in order to act |
 * | `text-base` | 16px | the floor for anything they read to enjoy |
 *
 * **Icons are exempt, and only icons.** An icon is sized, not read, so `text-[10px]` on an
 * `<i>` is correct. That is the whole exception — there is deliberately no "unless it is a
 * label" escape hatch, because a rule that wide would pass while the site stayed unreadable.
 *
 * `DESIGN.md` originally sanctioned 10-11px uppercase micro-labels as the system's
 * signature. The treatment is preserved; the size moved to 12px, because a signature is not
 * worth a visitor squinting on a high-DPI phone. The design system doc records the change.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/** 12px — the smallest a glyph is set at anywhere on this site. */
const LABEL_FLOOR_PX = 12;

function sourceFiles(dir: string): string[] {
	const found: string[] = [];

	for (const entry of readdirSync(dir)) {
		const path = join(dir, entry);

		if (statSync(path).isDirectory()) found.push(...sourceFiles(path));
		else if (/\.(svelte|css)$/.test(entry)) found.push(path);
	}

	return found;
}

type Offence = { file: string; line: number; snippet: string; px: number };

/**
 * Arbitrary font sizes below the label floor.
 *
 * There is no exemption clause any more, and that is the improvement: icons used to be a
 * font glyph, so their size came from a `text-[10px]` class and had to be excepted by name.
 * They are inline SVG now, sized by a `size` prop, so they are not text at all and the rule
 * can be absolute.
 */
function subFloorText(): Offence[] {
	const offences: Offence[] = [];

	for (const file of sourceFiles(join(process.cwd(), 'src'))) {
		readFileSync(file, 'utf8')
			.split('\n')
			.forEach((line, index) => {
				for (const match of line.matchAll(/text-\[(\d{1,2})px\]/g)) {
					const px = Number(match[1]);
					if (px >= LABEL_FLOOR_PX) continue;

					offences.push({
						file: file.replace(`${process.cwd()}/`, ''),
						line: index + 1,
						snippet: line.trim().slice(0, 90),
						px,
					});
				}
			});
	}

	return offences;
}

describe('the type floor', () => {
	it('still sets icons below the floor, because an icon is sized rather than read', () => {
		// Proves the rule below is not covering icons by accident, and that `size` is
		// genuinely in use at icon scale.
		const small = sourceFiles(join(process.cwd(), 'src')).flatMap((file) =>
			readFileSync(file, 'utf8')
				.split('\n')
				.filter((line) => /<Icon/.test(line) && /size=\{(?:[0-9]|1[01])\}/.test(line)),
		);

		expect(small.length).toBeGreaterThan(0);
	});

	it('sets no text below the label floor', () => {
		const offences = subFloorText();

		expect(
			offences,
			offences.length === 0
				? ''
				: `\n${offences.map((o) => `  ${o.file}:${o.line}  ${o.px}px  ${o.snippet}`).join('\n')}\n\n` +
						`Only icons may be set below ${LABEL_FLOOR_PX}px. For a micro-label use ` +
						'`text-label`; for anything a visitor reads, use `text-xs` or larger.',
		).toEqual([]);
	});

	it('defines the scale as tokens rather than repeating the numbers', () => {
		const css = readFileSync(join(process.cwd(), 'src/routes/layout.css'), 'utf8');

		// `--text-xs` was the most-used size in the codebase, so redefining it is what makes
		// the floor real rather than merely conventional.
		expect(css).toMatch(/--text-label:\s*0\.75rem/);
		expect(css).toMatch(/--text-xs:\s*0\.875rem/);
	});

	it('keeps the two floors distinct', () => {
		const css = readFileSync(join(process.cwd(), 'src/routes/layout.css'), 'utf8');

		// 12px and 14px collapsing into one another would quietly undo the whole change.
		expect(css).not.toMatch(/--text-label:\s*0\.875rem/);
	});
});
