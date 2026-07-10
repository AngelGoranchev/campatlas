import { supabase } from './supabaseClient.js';

const BUCKET_NAME = 'campsite-images';
const PHOTOS_TABLE = 'campsite_photos';

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

function buildStoragePath(userId, campsiteId, fileName) {
	const sanitizedFileName = fileName
		.toLowerCase()
		.trim()
		.replace(/\s+/g, '-')
		.replace(/[^a-z0-9._-]/g, '')
		.replace(/-+/g, '-');

	const safeFileName = sanitizedFileName || 'file';
	const timestamp = Date.now();
	return `${userId}/${campsiteId}/${timestamp}-${safeFileName}`;
}

export async function uploadCampsitePhoto(file, campsiteId) {
	const userId = await getCurrentUserId();

	if (!userId) {
		throw new Error('You must be signed in to upload a campsite photo');
	}

	const filePath = buildStoragePath(userId, campsiteId, file.name);

	const { error: uploadError } = await supabase.storage
		.from(BUCKET_NAME)
		.upload(filePath, file, {
			cacheControl: '3600',
			upsert: false,
			contentType: file.type,
		});

	if (uploadError) {
		throwSupabaseError(uploadError, 'Failed to upload campsite photo');
	}

	const { data: publicUrlData } = supabase.storage
		.from(BUCKET_NAME)
		.getPublicUrl(filePath);

	const publicUrl = publicUrlData.publicUrl;
	const record = await createCampsitePhotoRecord(campsiteId, filePath, publicUrl);

	return {
		filePath,
		publicUrl,
		record,
	};
}

export async function createCampsitePhotoRecord(campsiteId, filePath, publicUrl) {
	const userId = await getCurrentUserId();

	if (!userId) {
		throw new Error('You must be signed in to save a campsite photo');
	}

	const { data, error } = await supabase
		.from(PHOTOS_TABLE)
		.insert({
			campsite_id: campsiteId,
			owner_id: userId,
			file_path: filePath,
			public_url: publicUrl,
		})
		.select('*')
		.single();

	if (error) {
		throwSupabaseError(error, 'Failed to save campsite photo');
	}

	return data;
}

export async function getCampsitePhotos(campsiteId) {
	const { data, error } = await supabase
		.from(PHOTOS_TABLE)
		.select('*')
		.eq('campsite_id', campsiteId)
		.order('created_at', { ascending: false });

	if (error) {
		throwSupabaseError(error, 'Failed to load campsite photos');
	}

	return data;
}

export async function deleteCampsitePhoto(photoId, filePath) {
	const results = await Promise.allSettled([
		supabase.storage.from(BUCKET_NAME).remove([filePath]),
		supabase.from(PHOTOS_TABLE).delete().eq('id', photoId).select('*').single(),
	]);

	const storageResult = results[0];
	const databaseResult = results[1];

	const storageError = storageResult.status === 'rejected' ? storageResult.reason : storageResult.value.error;
	const databaseError = databaseResult.status === 'rejected' ? databaseResult.reason : databaseResult.value.error;

	if (storageError || databaseError) {
		const errorMessage = [storageError?.message, databaseError?.message].filter(Boolean).join(' | ');
		throw new Error(`Failed to delete campsite photo: ${errorMessage}`);
	}

	return databaseResult.value.data;
}
