import { NewDocument } from '$lib/models/document';
import { insertDocument } from '$lib/server/db';
import { error, type RequestHandler } from '@sveltejs/kit';
import { strict } from 'assert';
import { safeParse } from 'valibot';

export const POST: RequestHandler = async ({ locals: { ctx }, request }) => {
	const { title, file } = await request.json();
	console.log(title);
	console.log(file);

	strict(typeof ctx != 'undefined');

	if (!newDocumentResult.success) {
		ctx.logger.error({ requestJson }, 'malformed new document request');
		return error(400, { message: 'malformed new document request' });
	}

	const { title } = newDocumentResult.output as NewDocument;

	ctx.logger.info({ title, file });

	const start = performance.now();
	insertDocument(ctx.db, title, file);

	const documentHandlingTime = performance.now() - start;

	ctx.logger.info({ documentHandlingTime });

	return new Response();
};
