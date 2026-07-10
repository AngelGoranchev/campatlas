import { supabase } from './supabaseClient.js';

const CAMPSITES_TABLE = 'campsites';
const ALLOWED_REVIEW_STATUSES = ['pending', 'published', 'rejected'];

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

function sanitizeCampsiteData(campsiteData) {
	const {
		id,
		owner_id,
		review_status,
		created_at,
		updated_at,
		...rest
	} = campsiteData ?? {};

	return rest;
}

export async function getPublishedCampsites() {
	const { data, error } = await supabase
		.from(CAMPSITES_TABLE)
		.select('*')
		.eq('review_status', 'published')
		.order('created_at', { ascending: false });

	if (error) {
		throwSupabaseError(error, 'Failed to load published campsites');
	}

	return data;
}

export async function getCampsiteById(id) {
	const { data, error } = await supabase
		.from(CAMPSITES_TABLE)
		.select('*')
		.eq('id', id)
		.maybeSingle();

	if (error) {
		throwSupabaseError(error, 'Failed to load campsite');
	}

	return data;
}

export async function getMyCampsites() {
	const userId = await getCurrentUserId();

	if (!userId) {
		return [];
	}

	const { data, error } = await supabase
		.from(CAMPSITES_TABLE)
		.select('*')
		.eq('owner_id', userId)
		.order('created_at', { ascending: false });

	if (error) {
		throwSupabaseError(error, 'Failed to load your campsites');
	}

	return data;
}

export async function createCampsite(campsiteData) {
	const userId = await getCurrentUserId();

	if (!userId) {
		throw new Error('You must be signed in to create a campsite');
	}

	const payload = {
		...sanitizeCampsiteData(campsiteData),
		owner_id: userId,
		review_status: 'pending',
	};

	const { data, error } = await supabase
		.from(CAMPSITES_TABLE)
		.insert(payload)
		.select('*')
		.single();

	if (error) {
		throwSupabaseError(error, 'Failed to create campsite');
	}

	return data;
}

export async function updateCampsite(id, campsiteData) {
	const payload = sanitizeCampsiteData(campsiteData);

	const { data, error } = await supabase
		.from(CAMPSITES_TABLE)
		.update(payload)
		.eq('id', id)
		.select('*')
		.single();

	if (error) {
		throwSupabaseError(error, 'Failed to update campsite');
	}

	return data;
}

export async function deleteCampsite(id) {
	const { data, error } = await supabase
		.from(CAMPSITES_TABLE)
		.delete()
		.eq('id', id)
		.select('*')
		.single();

	if (error) {
		throwSupabaseError(error, 'Failed to delete campsite');
	}

	return data;
}

export async function getPendingCampsites() {
	const { data, error } = await supabase
		.from(CAMPSITES_TABLE)
		.select('*')
		.eq('review_status', 'pending')
		.order('created_at', { ascending: false });

	if (error) {
		throwSupabaseError(error, 'Failed to load pending campsites');
	}

	return data;
}

export async function updateCampsiteStatus(id, reviewStatus) {
	if (!ALLOWED_REVIEW_STATUSES.includes(reviewStatus)) {
		throw new Error(`Invalid review status: ${reviewStatus}`);
	}

	const { data, error } = await supabase
		.from(CAMPSITES_TABLE)
		.update({ review_status: reviewStatus })
		.eq('id', id)
		.select('*')
		.single();

	if (error) {
		throwSupabaseError(error, 'Failed to update campsite status');
	}

	return data;
}
