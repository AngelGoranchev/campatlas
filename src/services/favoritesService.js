import { supabase } from './supabaseClient.js';

const FAVORITES_TABLE = 'favorites';

function throwSupabaseError(error, message) {
	throw new Error(`${message}: ${error.message}`);
}

async function getCurrentUserId() {
	const { data, error } = await supabase.auth.getUser();

	if (error) {
		throwSupabaseError(error, 'Failed to get current user');
	}

	return data.user?.id ?? null;
}

export async function getMyFavorites() {
	const userId = await getCurrentUserId();

	if (!userId) {
		return [];
	}

	const { data, error } = await supabase
		.from(FAVORITES_TABLE)
		.select('*, campsites(*)')
		.eq('user_id', userId)
		.order('created_at', { ascending: false });

	if (error) {
		throwSupabaseError(error, 'Failed to load favorites');
	}

	return data;
}

export async function addFavorite(campsiteId) {
	const userId = await getCurrentUserId();

	if (!userId) {
		throw new Error('You must be signed in to add a favorite');
	}

	const { data, error } = await supabase
		.from(FAVORITES_TABLE)
		.upsert({
			user_id: userId,
			campsite_id: campsiteId,
		})
		.select('*')
		.single();

	if (error) {
		throwSupabaseError(error, 'Failed to add favorite');
	}

	return data;
}

export async function removeFavorite(campsiteId) {
	const userId = await getCurrentUserId();

	if (!userId) {
		throw new Error('You must be signed in to remove a favorite');
	}

	const { data, error } = await supabase
		.from(FAVORITES_TABLE)
		.delete()
		.eq('user_id', userId)
		.eq('campsite_id', campsiteId)
		.select('*')
		.single();

	if (error) {
		throwSupabaseError(error, 'Failed to remove favorite');
	}

	return data;
}

export async function isFavorite(campsiteId) {
	const userId = await getCurrentUserId();

	if (!userId) {
		return false;
	}

	const { data, error } = await supabase
		.from(FAVORITES_TABLE)
		.select('campsite_id')
		.eq('user_id', userId)
		.eq('campsite_id', campsiteId)
		.maybeSingle();

	if (error) {
		throwSupabaseError(error, 'Failed to check favorite');
	}

	return Boolean(data);
}
