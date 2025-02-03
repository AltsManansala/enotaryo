export const actions = {
	default: async ({ request, fetch }) => {
		const formData = await request.formData();
		const qrData = { sigId: formData.get('uid') };

		const response = await fetch('/api/signatorySession', {
			method: 'post',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(qrData)
		});

		return { qrData: JSON.stringify(await response.text()) };
	}
};
