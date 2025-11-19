import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export const load: PageLoad = ({ url }) => {
	// If no sort parameter is present, set default sort to name ascending
	if (!url.searchParams.has('sort')) {
		const params = new URLSearchParams(url.searchParams);
		params.set('sort', 'name:asc');
		throw redirect(302, `${url.pathname}?${params.toString()}`);
	}

	return {};
};
