import { supabase } from './supabaseClient.js';

const REVIEWS_TABLE = 'reviews';

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

export async function getCampsiteReviews(campsiteId) {
	const { data, error } = await supabase
		.from(REVIEWS_TABLE)
		.select('*')
		.eq('campsite_id', campsiteId)
		.order('created_at', { ascending: false });

	if (error) {
		throwSupabaseError(error, 'Failed to load campsite reviews');
	}

	return data;
}

export async function createReview(campsiteId, rating, comment) {
	const userId = await getCurrentUserId();

	if (!userId) {
		throw new Error('You must be signed in to create a review');
	}

	const { data, error } = await supabase
		.from(REVIEWS_TABLE)
		.insert({
			campsite_id: campsiteId,
			user_id: userId,
			rating,
			comment,
		})
		.select('*')
		.single();

	if (error) {
		throwSupabaseError(error, 'Failed to create review');
	}

	return data;
}

export async function updateReview(reviewId, rating, comment) {
	const { data, error } = await supabase
		.from(REVIEWS_TABLE)
		.update({ rating, comment })
		.eq('id', reviewId)
		.select('*')
		.single();

	if (error) {
		throwSupabaseError(error, 'Failed to update review');
	}

	return data;
}

export async function deleteReview(reviewId) {
	const { data, error } = await supabase
		.from(REVIEWS_TABLE)
		.delete()
		.eq('id', reviewId)
		.select('*')
		.single();

	if (error) {
		throwSupabaseError(error, 'Failed to delete review');
	}

	return data;
}
