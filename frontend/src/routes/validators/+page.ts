import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export const load: PageLoad = ({ url }) => {
	// If no sort parameters are present, set default sort to name ascending
	if (!url.searchParams.has('sortBy') && !url.searchParams.has('sortDir')) {
		const params = new URLSearchParams(url.searchParams);
		params.set('sortBy', 'name');
		params.set('sortDir', 'asc');
		throw redirect(302, `${url.pathname}?${params.toString()}`);
	}

	return {};
};
