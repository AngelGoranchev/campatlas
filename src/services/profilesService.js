import { supabase } from './supabaseClient.js';

const PROFILES_TABLE = 'profiles';
const USER_ROLES_TABLE = 'user_roles';

function throwSupabaseError(error, message) {
	throw new Error(`${message}: ${error.message}`);
}

export async function getCurrentUser() {
	const { data, error } = await supabase.auth.getUser();

	if (error) {
		throwSupabaseError(error, 'Failed to get current user');
	}

	return data.user ?? null;
}

export async function getCurrentProfile() {
	const user = await getCurrentUser();

	if (!user) {
		return null;
	}

	const { data, error } = await supabase
		.from(PROFILES_TABLE)
		.select('*')
		.eq('id', user.id)
		.maybeSingle();

	if (error) {
		throwSupabaseError(error, 'Failed to load current profile');
	}

	return data;
}

export async function upsertCurrentProfile(profileData) {
	const user = await getCurrentUser();

	if (!user) {
		throw new Error('You must be signed in to update your profile');
	}

	const { id, created_at, updated_at, ...rest } = profileData ?? {};

	const { data, error } = await supabase
		.from(PROFILES_TABLE)
		.upsert({
			id: user.id,
			...rest,
		})
		.select('*')
		.single();

	if (error) {
		throwSupabaseError(error, 'Failed to save profile');
	}

	return data;
}

export async function getCurrentUserRoles() {
	const user = await getCurrentUser();

	if (!user) {
		return [];
	}

	const { data, error } = await supabase
		.from(USER_ROLES_TABLE)
		.select('role')
		.eq('user_id', user.id)
		.order('role', { ascending: true });

	if (error) {
		throwSupabaseError(error, 'Failed to load user roles');
	}

	return data;
}

export async function isCurrentUserAdmin() {
	const roles = await getCurrentUserRoles();
	return roles.some((roleRecord) => roleRecord.role === 'admin');
}
