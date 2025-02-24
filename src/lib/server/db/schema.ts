import { integer, text, uuid, pgSchema, boolean, char, timestamp, bigint, json } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const app = pgSchema('app');

export const document = app.table('document', {
	id: uuid('id').notNull().primaryKey().defaultRandom(),
	title: text('title'),
	file: text('file'),
});

export const docSignatories = relations(document, ({ many }) => ({
	signatory: many(signatory),
}))

export const signatory = app.table('signatory', {
	id: char('id', { length: 19 }).notNull().primaryKey()
});

export const signature = app.table('signature', {
	id: uuid('id').notNull().primaryKey().defaultRandom(),
	signatoryId: text('signatory_id')
		.notNull()
		.references(() => signatory.id),
	documentId: uuid('document_id').references(() => document.id),
	isVerified: boolean('is_verified').notNull().default(false)
});

export const otpTransaction = app.table('otp_transaction', {
	id: bigint('id', { mode: 'number' }).notNull().primaryKey(),
	signatureId: uuid('signature_id').references(() => signature.id),
	isCompleted: boolean('is_completed').default(false)
});

export const user = app.table('user', {
	id: text('id').primaryKey(),
	signatoryId: char('signatory_id', { length: 19 })
		.notNull()
		.unique()
		.references(() => signatory.id),
	passwordHash: text('password_hash').notNull()
});

export const session = app.table('session', {
	id: text('id').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => user.id),
	expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull()
});

export const pushSubscriptions = app.table('push_subscription', {
	userId: text('user_id')
		.primaryKey()
		.references(() => user.id),
	pushSubscription: json('push_subscription')
});

export type Session = typeof session.$inferSelect;

export type User = typeof user.$inferSelect;
