import {
	completeOtpTransaction,
	getOtpTransactions,
	getSignatureStatus,
	insertOtpTransaction,
	verifySignature
} from '$lib/server/db';
import { error, type RequestHandler } from '@sveltejs/kit';
import { strict } from 'assert';
import { randomInt } from 'crypto';

// Get all OTP transactions for a user
export const GET: RequestHandler = async ({ locals }) => {
	strict(typeof locals.ctx != 'undefined');
	const { db, logger } = locals.ctx;

	strict(locals.user != null);
	const start = performance.now();
	const results = await getOtpTransactions(db, locals.user.signatoryId);
	const otpGetTime = performance.now() - start;

	logger.info({ results, otpGetTime }, 'retrieved otp transactions');

	return new Response(JSON.stringify({ results }));
};

// Create a new OTP transaction
export const POST: RequestHandler = async ({ locals: { ctx }, request }) => {
	strict(typeof ctx != 'undefined');
	const { db, logger } = ctx;

	const { signatureId } = await request.json();
	strict(signatureId != null && typeof signatureId == 'string');

	logger.info({ sessionId: signatureId }, 'session status check attempt');

	try {
		const start = performance.now();

		// check session status
		const [sessionStatus, ...rest] = await getSignatureStatus(db, signatureId);
		strict(rest.length == 0);

		// 	does it actually exist?
		strict(sessionStatus);
		strict(sessionStatus.id);

		// 	is it already verified?
		if (sessionStatus.isVerified || sessionStatus.txnId) {
			logger.warn({ sessionStatus }, 'session transaction already issued');
			return new Response(
				JSON.stringify({
					txnId: sessionStatus.txnId,
					isVerified: sessionStatus.isVerified
				})
			);
		}

		const statusCheckTime = performance.now() - start;
		logger.info({ statusCheckTime });
	} catch (error1) {
		logger.error({ error1 }, 'an error occurred while trying to check session status');
		return error(500, 'an internal error occurred');
	}

	logger.info({ sessionId: signatureId }, 'session transaction creation attempt');

	try {
		const start = performance.now();

		// issue the transaction
		// TODO: stub issuing the otp transaction
		const transactionId = randomInt(123456789);

		// 	save the transaction id to the database
		insertOtpTransaction(db, transactionId, signatureId);
		const otpInsertTime = performance.now() - start;

		logger.info({ otpInsertTime }, 'successful transaction insertion');

		// return the txn id
		return new Response(
			JSON.stringify({
				txnId: transactionId,
				isVerified: false
			})
		);
	} catch (error2) {
		logger.error({ error2 }, 'an error occurred while trying to issue the transaction');
		return error(500, 'an internal error occurred');
	}
};

// Update the OTP transaction by verifying a candidate OTP code
export const PATCH: RequestHandler = async ({ locals: { ctx }, request }) => {
	strict(typeof ctx != 'undefined');
	const { db, logger } = ctx;

	const { txnId, otp } = await request.json();

	const start = performance.now();

	// TODO: validate OTP via a MOSIP SDK call
	if (otp == '111111') {
		logger.info({ txnId, otp }, 'correct otp, attempting to complete txn');
		db.transaction(async (tx) => {
			const [result, ...rest] = await completeOtpTransaction(tx, Number(txnId));
			strict(rest.length == 0);
			strict(result.sessionId);

			const { sessionId } = result;
			const [session, ...others] = await verifySignature(tx, sessionId);
			strict(others.length == 0);
			strict(session);

			const otpVerificationTime = performance.now() - start;
			logger.info({ otpVerificationTime }, 'successful transaction verification');
		});

		return new Response(
			JSON.stringify({
				txnId,
				isCorrect: true
			})
		);
	}

	const otpUpdateTime = performance.now() - start;
	logger.info({ otpUpdateTime }, 'successful transaction update');

	return new Response(
		JSON.stringify({
			txnId,
			isCorrect: false
		})
	);
};

// Delete the OTP transaction if it is true
