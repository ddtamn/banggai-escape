/**
 * The publish path's atomicity.
 *
 * `publish` writes three things — the revision, the entry's published pointer, and a
 * redirect when the slug moved — and they are only correct **together**. A revision without
 * the pointer move is history nobody serves; a pointer move without the revision points at
 * nothing, and the public site's inner join drops the page. The neon-http driver has no
 * interactive transactions (`db.transaction()` throws), so `db.batch()` is the only thing
 * standing between a publish and that state, and it is invisible to a test that only checks
 * the happy path.
 *
 * So these tests are about one question: **when a statement fails, did the ones before it
 * land?** The fake below answers it by modelling the driver's actual behaviour — a batch
 * commits all of its statements or none, and a write awaited on its own commits at once.
 * Rewriting the three writes as three ordinary awaits — the obvious "simplification" — makes
 * these fail, which is the point of having them.
 *
 * Reads are scripted rather than interpreted. Nothing here emulates Postgres or parses SQL;
 * a test that needs a row queues one for the table it is selected from.
 */
import { getTableName } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { contentEntries, contentRevisions, slugRedirects } from '$lib/server/db/schema';
import { countStatuses, NotPublishableError, publishWith } from './service';

/**
 * A `media_assets.id`, as a stored payload carries it rather than a CDN value.
 *
 * @see ./validate.spec.ts — the same fixture, and the same reason for it.
 */
const MEDIA_ID = '11111111-1111-4111-8111-111111111111';

const ENTRY_ID = '33333333-3333-4333-8333-333333333333';
const PUBLISHED_ID = '44444444-4444-4444-8444-444444444444';

/** A valid package payload, which is the precondition for publishing at all. */
const draft = {
	slug: 'untouched-banggai-discovery',
	title: 'Untouched Banggai Discovery',
	subtitle: 'Seven days between karst lakes and empty reefs',
	region: 'Banggai Kepulauan',
	days: 7,
	nights: 6,
	tripType: 'Private Trip',
	price: 2850000,
	image: MEDIA_ID,
	groupSize: '2–8 travelers',
	accommodation: 'Beachfront bungalows',
	overview: 'A week on the quieter side of the archipelago.',
	highlights: [{ title: 'Paisu Pok', text: 'Swim in the karst lake.' }],
	included: ['Local guide'],
	itinerary: [{ label: 'Day 1', title: 'Arrival', text: 'Meet at Luwuk.' }],
	featured: true,
};

const author = {
	kind: 'package' as const,
	slug: 'untouched-banggai-discovery',
	authorId: '55555555-5555-4555-8555-555555555555',
	authorEmail: 'admin@banggaiescape.com',
};

/**
 * The row `getEntry` reads, already published under an older slug.
 *
 * `publishedSlug` differing from `slug` is what makes `publish` record a redirect, so this
 * is the three-statement case. A same-slug publish is the two-statement one.
 */
function entryRow(overrides: Record<string, unknown> = {}) {
	return {
		id: ENTRY_ID,
		slug: draft.slug,
		sortOrder: 0,
		featured: true,
		archivedAt: null,
		draftPayload: draft,
		publishedRevisionId: PUBLISHED_ID,
		revisionNumber: 2,
		publishedAt: new Date('2026-03-01T00:00:00Z'),
		publishedSlug: 'banggai-discovery',
		publishedPayload: { ...draft, slug: 'banggai-discovery' },
		...overrides,
	};
}

/** The `max(revision_number)` read that numbers the new revision. */
const revisions = [{ number: 2 }];

describe('countStatuses', () => {
	it('tallies the four states, and every entry', () => {
		expect(
			countStatuses([
				{ status: 'published' },
				{ status: 'published' },
				{ status: 'changed' },
				{ status: 'draft' },
				{ status: 'archived' },
			]),
		).toEqual({ all: 5, published: 2, changed: 1, draft: 1, archived: 1 });
	});

	it('counts nothing for an empty list rather than missing a key', () => {
		// The overview renders a state row per kind, so a key that is absent would read as
		// blank rather than as zero.
		expect(countStatuses([])).toEqual({
			all: 0,
			published: 0,
			changed: 0,
			draft: 0,
			archived: 0,
		});
	});
});

describe('publish', () => {
	it('commits the revision, the pointer move, and the redirect as one batch', async () => {
		const db = fake({ selects: { content_entries: [entryRow()], content_revisions: revisions } });

		const result = await publishWith(author, asDatabase(db));

		expect(result).toEqual({ revisionNumber: 3, redirectFrom: 'banggai-discovery' });

		// One batch of three, and nothing written outside it. A publish split into separate
		// awaits would show up here as three standalone writes and no batch.
		expect(db.batches).toEqual([3]);
		expect(db.standalone).toEqual([]);

		expect(db.committed.map((effect) => [effect.table, effect.operation])).toEqual([
			['content_revisions', 'insert'],
			['content_entries', 'update'],
			['slug_redirects', 'insert'],
		]);
	});

	it('points the entry at the revision it just wrote, not at a new id', async () => {
		const db = fake({ selects: { content_entries: [entryRow()], content_revisions: revisions } });

		await publishWith(author, asDatabase(db));

		const [revision, pointer, redirect] = db.committed;

		// The one link that makes the two writes a publish rather than a revision nobody
		// serves: the pointer names the revision this same batch inserted.
		expect(pointer.values.publishedRevisionId).toBe(revision.values.id);
		// The redirect records the slug visitors are actually linked to today.
		expect(redirect.values).toMatchObject({
			kind: 'package',
			fromSlug: 'banggai-discovery',
			toSlug: 'untouched-banggai-discovery',
		});
	});

	it('writes nothing when a statement in the middle of the batch fails', async () => {
		// Statement two is the pointer move: the revision has been staged, and then this.
		const db = fake({
			selects: { content_entries: [entryRow()], content_revisions: revisions },
			failAt: 1,
		});

		expect(await attempt(author, db)).toEqual({
			rejected: 'statement 2 of the batch failed',
			// The revision that was already staged, and nothing else.
			committed: [],
		});

		// The batch was entered and all three statements offered to it — the failure is
		// inside it, not before it, which is what makes this a test of atomicity rather
		// than of a guard that happened to run first.
		expect(db.batches).toEqual([3]);
	});

	it('writes nothing when the last statement in the batch fails', async () => {
		const db = fake({
			selects: { content_entries: [entryRow()], content_revisions: revisions },
			failAt: 2,
		});

		// Both earlier statements are discarded along with the third. A revision and a moved
		// pointer that outlive a failed redirect is a publish that half-happened.
		expect(await attempt(author, db)).toEqual({
			rejected: 'statement 3 of the batch failed',
			committed: [],
		});
	});

	it('batches two statements when the slug did not change', async () => {
		const db = fake({
			selects: {
				content_entries: [entryRow({ publishedSlug: draft.slug, publishedPayload: draft })],
				content_revisions: revisions,
			},
		});

		const result = await publishWith(author, asDatabase(db));

		expect(result.redirectFrom).toBeNull();
		expect(db.batches).toEqual([2]);
		expect(db.committed.map((effect) => effect.table)).toEqual([
			'content_revisions',
			'content_entries',
		]);
	});

	it('refuses a draft that breaks the contract without writing anything', async () => {
		const db = fake({
			selects: {
				// Price is a non-negative integer of IDR; a draft with a typo must not publish.
				content_entries: [entryRow({ draftPayload: { ...draft, price: -1 } })],
				content_revisions: revisions,
			},
		});

		const error = await publishWith(author, asDatabase(db)).catch((thrown: unknown) => thrown);

		expect(error).toBeInstanceOf(NotPublishableError);
		// The gate is before the database, not in it: nothing was even attempted.
		expect(db.batches).toEqual([]);
		expect(db.standalone).toEqual([]);
		expect(db.committed).toEqual([]);
	});

	it('refuses an archived entry and leaves the last published revision alone', async () => {
		const db = fake({
			selects: {
				content_entries: [entryRow({ archivedAt: new Date() })],
				content_revisions: revisions,
			},
		});

		const error = await publishWith(author, asDatabase(db)).catch((thrown: unknown) => thrown);

		expect(error).toBeInstanceOf(NotPublishableError);
		expect((error as NotPublishableError).issues).toEqual([
			'This content is archived. Restore it first.',
		]);
		expect(db.committed).toEqual([]);
	});

	it('numbers the new revision after the highest one that exists', async () => {
		const db = fake({
			selects: { content_entries: [entryRow()], content_revisions: [{ number: 41 }] },
		});

		const result = await publishWith(author, asDatabase(db));

		expect(result.revisionNumber).toBe(42);
		expect(db.committed[0].values).toMatchObject({ revisionNumber: 42, slug: draft.slug });
	});
});

// ---------------------------------------------------------------------------
// The fake
// ---------------------------------------------------------------------------

type Row = Record<string, unknown>;

/** One write, whether it landed or was rolled back. */
type Effect = {
	table: string;
	operation: 'insert' | 'update';
	values: Row;
};

/**
 * A statement built but not run: what `publish` hands to `batch()`.
 *
 * Drizzle's builders are lazy — nothing is sent until they are awaited or batched — and
 * `effect()` is the moment the work would actually happen.
 */
type Statement = { effect(): Effect };

/**
 * A stand-in for the neon-http driver, built for one question: did these writes land
 * together or separately?
 *
 * It models that and nothing else. `batch()` stages its statements and commits them only
 * once every one has succeeded, which is what a transaction is; a write awaited on its own
 * commits the moment it runs and cannot be taken back. The difference between those two is
 * exactly what `publish` relies on, and it is why a version of `publish` written as three
 * ordinary awaits fails these tests while passing a happy-path one.
 */
class FakeDatabase {
	/** Effects that actually landed. A batch contributes all of its statements or none. */
	readonly committed: Effect[] = [];

	/** How many statements each `batch()` call was handed, in order. */
	readonly batches: number[] = [];

	/** Writes that were awaited directly rather than batched — and so are not atomic. */
	readonly standalone: Effect[] = [];

	/** Rows a `select()` from a given table resolves to. */
	private readonly selects: Record<string, Row[]>;

	/** Which statement of a batch throws, by index. */
	private readonly failAt: number | undefined;

	constructor(options: { selects?: Record<string, Row[]>; failAt?: number } = {}) {
		this.selects = options.selects ?? {};
		this.failAt = options.failAt;
	}

	select(): SelectQuery {
		return new SelectQuery(this);
	}

	insert(table: unknown): WriteQuery {
		return new WriteQuery(this, getTableName(table as never), 'insert');
	}

	update(table: unknown): WriteQuery {
		return new WriteQuery(this, getTableName(table as never), 'update');
	}

	async batch(statements: readonly Statement[]): Promise<unknown[]> {
		this.batches.push(statements.length);

		const staged: Effect[] = [];

		for (const [index, statement] of statements.entries()) {
			if (index === this.failAt) throw new Error(`statement ${index + 1} of the batch failed`);

			staged.push(statement.effect());
		}

		// Reached only when every statement succeeded. This line *is* the commit.
		this.committed.push(...staged);

		return [];
	}

	/** What a standalone write — one awaited outside a batch — does. It cannot be undone. */
	commitStandalone(effect: Effect): void {
		this.standalone.push(effect);
		this.committed.push(effect);
	}

	rowsFor(table: string): Row[] {
		return this.selects[table] ?? [];
	}
}

/** The select chain, resolving to whatever rows the test queued for the table. */
class SelectQuery implements PromiseLike<Row[]> {
	private table: string | null = null;

	constructor(private readonly db: FakeDatabase) {}

	from(table: unknown): this {
		this.table = getTableName(table as never);

		return this;
	}

	/** A left join changes the shape of a real result; here the primary table still answers. */
	leftJoin(): this {
		return this;
	}

	where(): this {
		return this;
	}

	orderBy(): this {
		return this;
	}

	groupBy(): this {
		return this;
	}

	limit(): this {
		return this;
	}

	// A thenable on purpose: the service does `await db.select().from(…).limit(1)`, so the
	// chain has to be awaitable at the end of itself. That is the whole contract here.
	// biome-ignore lint/suspicious/noThenProperty: a query builder the service awaits
	then<R1 = Row[], R2 = never>(
		onfulfilled?: ((value: Row[]) => R1 | PromiseLike<R1>) | null,
		onrejected?: ((reason: unknown) => R2 | PromiseLike<R2>) | null,
	): PromiseLike<R1 | R2> {
		return Promise.resolve(this.table === null ? [] : this.db.rowsFor(this.table)).then(
			onfulfilled,
			onrejected,
		);
	}
}

/** An insert or an update, awaiting into a standalone write or batchable into a `batch()`. */
class WriteQuery implements PromiseLike<unknown>, Statement {
	/** The row this write carries. Named `row` because `values` is a method below. */
	private row: Row = {};

	constructor(
		private readonly db: FakeDatabase,
		private readonly table: string,
		private readonly operation: 'insert' | 'update',
	) {}

	values(next: Row): this {
		this.row = next;

		return this;
	}

	set(next: Row): this {
		this.row = next;

		return this;
	}

	where(): this {
		return this;
	}

	onConflictDoUpdate(): this {
		return this;
	}

	returning(): this {
		return this;
	}

	effect(): Effect {
		return { table: this.table, operation: this.operation, values: this.row };
	}

	// Also a thenable on purpose, and with a second reason: awaiting a write on its own is
	// exactly the non-atomic path this fake exists to make visible.
	// biome-ignore lint/suspicious/noThenProperty: a write the service awaits, unbatched
	then<R1 = unknown, R2 = never>(
		onfulfilled?: ((value: unknown) => R1 | PromiseLike<R1>) | null,
		onrejected?: ((reason: unknown) => R2 | PromiseLike<R2>) | null,
	): PromiseLike<R1 | R2> {
		this.db.commitStandalone(this.effect());

		return Promise.resolve(undefined).then(onfulfilled, onrejected);
	}
}

function fake(options: { selects?: Record<string, Row[]>; failAt?: number } = {}): FakeDatabase {
	return new FakeDatabase(options);
}

/**
 * Runs a publish and reports how it ended, together with what it left behind.
 *
 * The rejection and the committed writes are captured in one object so that a single
 * assertion reports both. A version of `publish` that stopped batching does not throw at
 * all here — the fake's failure only exists inside a batch — and the interesting half of
 * that regression is the *pair* of statements it wrote anyway, which a `.rejects` assertion
 * on its own would stop the test before revealing.
 */
async function attempt(
	input: Parameters<typeof publishWith>[0],
	db: FakeDatabase,
): Promise<{ rejected: string; committed: Effect[] }> {
	return publishWith(input, asDatabase(db)).then(
		() => ({ rejected: 'nothing — the publish succeeded', committed: db.committed }),
		(error: Error) => ({ rejected: error.message, committed: db.committed }),
	);
}

/**
 * The fake stands in for the driver, and the service is typed against the real one.
 *
 * Nothing else about the two is compatible — this is a driver, not a database — and the
 * assertion is confined to this file so that the service keeps its honest parameter type.
 */
function asDatabase(db: FakeDatabase): Parameters<typeof publishWith>[1] {
	return db as unknown as Parameters<typeof publishWith>[1];
}

/** Referenced so the schema import is the one the service itself writes to. */
void [contentEntries, contentRevisions, slugRedirects];
