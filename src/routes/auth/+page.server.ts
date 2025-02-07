import { hash, verify } from '@node-rs/argon2';
import { encodeBase32LowerCase } from '@oslojs/encoding';
import { fail, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import * as auth from '$lib/server/auth';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type { Actions, PageServerLoad } from './$types';
import { strict } from 'assert';

export const load: PageServerLoad = async (event) => {
	if (event.locals.user) {
		return redirect(302, '/');
	}
	return {};
};

export const actions: Actions = {
	login: async (event) => {
		const formData = await event.request.formData();
		const signatoryId = formData.get('id');
		const password = formData.get('password');

		if (!validateId(signatoryId)) {
			return fail(400, {
				message: 'Invalid signatory id (length of 19 characters, PhilSys ID format)'
			});
		}
		if (!validatePassword(password)) {
			return fail(400, { message: 'Invalid password (min 6, max 255 characters)' });
		}

		const results = await db.select().from(table.user).where(eq(table.user.signatoryId, table.signatory));

		const existingUser = results.at(0);
		if (!existingUser) {
			return fail(400, { message: 'Incorrect signatory id or password' });
		}

		const validPassword = await verify(existingUser.passwordHash, password, {
			memoryCost: 19456,
			timeCost: 2,
			outputLen: 32,
			parallelism: 1
		});
		if (!validPassword) {
			return fail(400, { message: 'Incorrect signatory id or password' });
		}

		const sessionToken = auth.generateSessionToken();
		const session = await auth.createSession(sessionToken, existingUser.id);
		auth.setSessionTokenCookie(event, sessionToken, session.expiresAt);

		return redirect(302, '/');
	},
	register: async (event) => {
		const formData = await event.request.formData();
		const signatoryId = formData.get('id');
		const password = formData.get('password');

		if (!validateId(signatoryId)) {
			return fail(400, { message: 'Invalid signatory id' });
		}
		if (!validatePassword(password)) {
			return fail(400, { message: 'Invalid password' });
		}

        // validate if a signatory ID exists
        // issue an OTP flow to accept the signatory as a user

		const userId = generateUserId();
		const passwordHash = await hash(password, {
			// recommended minimum parameters
			memoryCost: 19456,
			timeCost: 2,
			outputLen: 32,
			parallelism: 1
		});

		try {
			await db.insert(table.user).values({ id: userId, signatoryId, passwordHash });

			const sessionToken = auth.generateSessionToken();
			const session = await auth.createSession(sessionToken, userId);
			auth.setSessionTokenCookie(event, sessionToken, session.expiresAt);
		} catch (e) {
            strict(typeof event.locals.ctx != 'undefined');
			event.locals.ctx.logger.error({ e });
			return fail(500, { message: 'An error has occurred' });
		}
		return redirect(302, '/');
	}
};

function generateUserId() {
	// ID with 120 bits of entropy, or about the same as UUID v4.
	const bytes = crypto.getRandomValues(new Uint8Array(15));
	const id = encodeBase32LowerCase(bytes);
	return id;
}

function validateId(id: unknown): id is string {
	return (
		typeof id === 'string' &&
		id.length == 19 &&
		/[a-zA-Z0-9]{4}-[a-zA-Z0-9]{4}-[a-zA-Z0-9]{4}-[a-zA-Z0-9]{4}/.test(id)
	);
}

function validatePassword(password: unknown): password is string {
	return typeof password === 'string' && password.length >= 6 && password.length <= 255;
}
