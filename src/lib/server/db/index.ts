import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '$env/dynamic/private';
import * as schema from './schema';
import { and, eq } from 'drizzle-orm';

if (!env.DATABASE_URL) throw new Error('DATABASE_URL is not set');
const client = postgres(env.DATABASE_URL);
export const db = drizzle(client, { schema });

export type Database = typeof db;
export type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
export type Interface = Database | Transaction;

export async function insertDocument(db: Interface, title: string, file: string) {
	return await db.insert(schema.document).values({ title, file });
}

export async function insertSignatory(db: Interface, id: string) {
	return await db.insert(schema.signatory).values({ id });
}

export async function insertSignature(db: Interface, sigId: string) {
	return await db
		.insert(schema.signature)
		.values({ signatoryId: sigId })
		.returning({ id: schema.signature.id });
}

export async function verifySignature(db: Interface, sessionId: string) {
	return await db
		.update(schema.signature)
		.set({ isVerified: true })
		.where(and(eq(schema.signature.id, sessionId)))
		.returning({ sessionId: schema.signature.id });
}

export async function getDocumentSignatory(db: Interface, sessionId: string) {
	return await db
		.select({ identifier: schema.signature.id })
		.from(schema.signature)
		.where(eq(schema.signature.id, sessionId));
}

export async function getSignatureStatus(db: Interface, sessionId: string) {
	return await db
		.select({
			id: schema.signature.id,
			txnId: schema.otpTransaction.id,
			isVerified: schema.signature.isVerified
		})
		.from(schema.signature)
		.where(eq(schema.signature.id, sessionId))
		.leftJoin(schema.otpTransaction, eq(schema.otpTransaction.signatureId, sessionId));
}

export async function getOtpTransactions(db: Interface, sigId: string) {
	return await db
		.select({
			id: schema.otpTransaction.id,
			isVerified: schema.signature.isVerified,
			sessionId: schema.otpTransaction.signatureId
		})
		.from(schema.signature)
		.where(eq(schema.signature.signatoryId, sigId))
		.rightJoin(schema.otpTransaction, eq(schema.signature.id, schema.otpTransaction.signatureId));
}

export async function insertOtpTransaction(db: Interface, txnId: number, signatureId: string) {
	return await db
		.insert(schema.otpTransaction)
		.values({ id: txnId, signatureId: signatureId })
		.returning({ id: schema.otpTransaction.id });
}

export async function completeOtpTransaction(db: Interface, txnId: number) {
	return await db
		.update(schema.otpTransaction)
		.set({ isCompleted: true })
		.where(eq(schema.otpTransaction.id, txnId))
		.returning({ sessionId: schema.otpTransaction.signatureId });
}

export async function getUserBySignatory(db: Interface, sigId: string) {
	return await db.select().from(schema.user).where(eq(schema.user.signatoryId, sigId));
}

export async function insertUser(
	db: Interface,
	userId: string,
	sigId: string,
	passwordHash: string
) {
	return await db.insert(schema.user).values({ id: userId, signatoryId: sigId, passwordHash });
}

export async function upsertPushSubscription(
	db: Interface,
	userId: string,
	pushSubscription: PushSubscriptionJSON
) {
	return await db
		.insert(schema.pushSubscriptions)
		.values({ userId, pushSubscription })
		.returning({ pushSubscription: schema.pushSubscriptions.pushSubscription })
		.onConflictDoUpdate({
			target: schema.pushSubscriptions.userId,
			set: { pushSubscription }
		});
}

export async function getPushSubscriptionByUserId(db: Interface, userId: string) {
	return await db
		.select({ pushSubscription: schema.pushSubscriptions.pushSubscription })
		.from(schema.pushSubscriptions)
		.where(eq(schema.pushSubscriptions.userId, userId));
}

export async function getPushSubscriptionBySignatoryId(db: Interface, sigId: string) {
	return await db
		.select({ pushSubscription: schema.pushSubscriptions.pushSubscription })
		.from(schema.user)
		.where(eq(schema.user.signatoryId, sigId))
		.leftJoin(schema.pushSubscriptions, eq(schema.user.id, schema.pushSubscriptions.userId));
}
