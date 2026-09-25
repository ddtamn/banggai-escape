import { relations, sql } from 'drizzle-orm';
import {
	bigint,
	boolean,
	check,
	index,
	integer,
	jsonb,
	pgEnum,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from 'drizzle-orm/pg-core';
import { user } from './auth.schema';

/**
 * Domain schema. This file is the single entry point `drizzle-kit` reads
 * (`drizzle.config.ts` → `./src/lib/server/db/schema.ts`), so it re-exports the
 * generated auth tables and declares the content model on top.
 *
 * Shapes and rationale: docs/15-admin-dashboard-plan.md. `draft_payload` and
 * `value`/`payload` JSONB columns are validated per kind in server code before they
 * are written; the database only guarantees they are JSON objects.
 */

export const contentKind = pgEnum('content_kind', ['package', 'destination', 'article']);

/** A JSON object, as opposed to a JSON scalar or array. */
type JsonObject = Record<string, unknown>;

/**
 * One content item, in whatever state its draft is in.
 *
 * Editing state and publication are deliberately **separate facts**: the draft payload
 * holds the working copy, while `published_revision_id` points at the immutable
 * revision the public site serves. A published page therefore stays live while its next
 * edit is still a draft, and the list labels (Draft, Published, Published with
 * unpublished changes, Archived) are derived from these columns rather than stored —
 * a stored status would have to be rewritten on every save.
 */
export const contentEntries = pgTable(
	'content_entries',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		kind: contentKind('kind').notNull(),
		/** Working slug. A published slug change also writes a `slug_redirects` row. */
		slug: text('slug').notNull(),
		/** Position within its kind, for manual ordering. Lower comes first. */
		sortOrder: integer('sort_order').notNull().default(0),
		featured: boolean('featured').notNull().default(false),
		archivedAt: timestamp('archived_at', { withTimezone: true }),
		draftPayload: jsonb('draft_payload').$type<JsonObject>().notNull(),
		draftUpdatedAt: timestamp('draft_updated_at', { withTimezone: true }).defaultNow().notNull(),
		/** The revision the public site serves. Null until the first publish. */
		publishedRevisionId: uuid('published_revision_id'),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp('updated_at', { withTimezone: true })
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [
		uniqueIndex('content_entries_kind_slug_idx').on(table.kind, table.slug),
		index('content_entries_kind_order_idx').on(table.kind, table.sortOrder),
	],
);

/**
 * An immutable published snapshot. Nothing ever updates these rows: publishing inserts
 * one and moves `content_entries.published_revision_id` to it, which is what makes
 * history and rollback possible.
 *
 * `kind`, `slug` and `author_email` are denormalised on purpose. The public read path
 * looks a page up by `(kind, slug)` without joining the entry table, and the byline
 * has to survive the author's account being deleted.
 */
export const contentRevisions = pgTable(
	'content_revisions',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		entryId: uuid('entry_id')
			.notNull()
			.references(() => contentEntries.id, { onDelete: 'cascade' }),
		kind: contentKind('kind').notNull(),
		/** 1-based, scoped to the entry. */
		revisionNumber: integer('revision_number').notNull(),
		slug: text('slug').notNull(),
		payload: jsonb('payload').$type<JsonObject>().notNull(),
		authorId: text('author_id').references(() => user.id, { onDelete: 'set null' }),
		authorEmail: text('author_email').notNull(),
		publishedAt: timestamp('published_at', { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => [
		uniqueIndex('content_revisions_entry_number_idx').on(table.entryId, table.revisionNumber),
		index('content_revisions_kind_slug_idx').on(table.kind, table.slug),
	],
);

/**
 * The site's own settings: brand/contact, navigation and footer, social links, and the
 * shared editorial blocks (features, testimonials, FAQs, stats, categories).
 *
 * `key` is a primary key rather than a row per field so a known set of keys can be
 * validated in server code. This is deliberately **not** a general key/value editor.
 */
export const siteSettings = pgTable('site_settings', {
	key: text('key').primaryKey(),
	/**
	 * Deliberately `unknown`: a settings row is a JSON value of whatever shape its key
	 * declares — an object for `site`, an array for `faqs`, a string for
	 * `ctaBackground` — so the type is resolved per key by `parseSiteSetting()` rather
	 * than by this column.
	 */
	value: jsonb('value').$type<unknown>().notNull(),
	updatedAt: timestamp('updated_at', { withTimezone: true })
		.defaultNow()
		.$onUpdate(() => new Date())
		.notNull(),
	updatedBy: text('updated_by').references(() => user.id, { onDelete: 'set null' }),
});

/**
 * The media library. New uploads live in R2 (`objectKey`); artwork still served from the
 * legacy AIDA/CDN host is recorded as an external reference (`externalUrl`). A `check`
 * keeps exactly one of the two populated, so a later media-domain change never requires
 * rewriting content records — content refers to an asset id either way.
 */
export const mediaAssets = pgTable(
	'media_assets',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		objectKey: text('object_key'),
		externalUrl: text('external_url'),
		originalName: text('original_name').notNull(),
		/**
		 * Null for artwork still referenced on a legacy host: its real MIME type was never
		 * recorded anywhere, and inventing one would be a lie. Uploads always declare it,
		 * which `media_assets_upload_check` enforces.
		 */
		mimeType: text('mime_type'),
		byteSize: bigint('byte_size', { mode: 'number' }),
		width: integer('width'),
		height: integer('height'),
		/** Required before an image can be used as meaningful content. */
		altText: text('alt_text'),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
		uploadedBy: text('uploaded_by').references(() => user.id, { onDelete: 'set null' }),
		/**
		 * Soft delete. Hiding an asset from the library is reversible and keeps every
		 * reference to it intact; removing the R2 object is a separate, confirmed action
		 * that is refused while any content still points at the row.
		 */
		archivedAt: timestamp('archived_at', { withTimezone: true }),
	},
	(table) => [
		check(
			'media_assets_source_check',
			sql`(${table.objectKey} is not null) <> (${table.externalUrl} is not null)`,
		),
		check(
			'media_assets_upload_check',
			sql`${table.objectKey} is null or ${table.mimeType} is not null`,
		),
		// Not partial, deliberately. Postgres treats NULLs as distinct in a unique index, so
		// many external-only rows can coexist without a `where` clause — and a partial index
		// cannot be an `ON CONFLICT` target (42P10), which is what makes seeding the
		// library from the content import idempotent.
		uniqueIndex('media_assets_object_key_idx').on(table.objectKey),
		uniqueIndex('media_assets_external_url_idx').on(table.externalUrl),
		index('media_assets_created_at_idx').on(table.createdAt),
	],
);

/** Permanent redirects for published slug changes, so old public URLs keep working. */
export const slugRedirects = pgTable(
	'slug_redirects',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		kind: contentKind('kind').notNull(),
		fromSlug: text('from_slug').notNull(),
		toSlug: text('to_slug').notNull(),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => [uniqueIndex('slug_redirects_kind_from_idx').on(table.kind, table.fromSlug)],
);

/**
 * Who may use the admin. Phase 0 answered this with the `ADMIN_EMAILS` variable; this
 * table replaces it, tied to the provisioned better-auth user.
 */
export const administrators = pgTable('administrators', {
	userId: text('user_id')
		.primaryKey()
		.references(() => user.id, { onDelete: 'cascade' }),
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
	createdBy: text('created_by').references(() => user.id, { onDelete: 'set null' }),
});

// `content_entries.published_revision_id` intentionally has no foreign key: the two
// tables reference each other, and a real constraint would need a second ALTER that
// drizzle-kit does not emit from a single module. Only the publish path writes that
// column, and revisions are never deleted while their entry exists (deleting an entry
// cascades to them), so the pointer cannot dangle in practice. These relations give
// `db.query.*` the same shape without a database constraint.
export const contentEntriesRelations = relations(contentEntries, ({ many, one }) => ({
	revisions: many(contentRevisions),
	publishedRevision: one(contentRevisions, {
		fields: [contentEntries.publishedRevisionId],
		references: [contentRevisions.id],
	}),
}));

export const contentRevisionsRelations = relations(contentRevisions, ({ one }) => ({
	entry: one(contentEntries, {
		fields: [contentRevisions.entryId],
		references: [contentEntries.id],
	}),
}));

export const mediaAssetsRelations = relations(mediaAssets, ({ one }) => ({
	uploader: one(user, { fields: [mediaAssets.uploadedBy], references: [user.id] }),
}));

export const administratorsRelations = relations(administrators, ({ one }) => ({
	user: one(user, { fields: [administrators.userId], references: [user.id] }),
}));

export * from './auth.schema';
