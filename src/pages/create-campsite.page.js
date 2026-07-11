import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import '../styles/app.css';
import { createCampsite } from '../services/campsitesService.js';
import { uploadCampsitePhoto } from '../services/photosService.js';
import { requireAuth, initLogoutHandlers } from '../utils/authGuards.js';

function toOptionalNumber(value) {
	const rawValue = String(value ?? '').trim();

	if (!rawValue) {
		return null;
	}

	const parsedNumber = Number.parseFloat(rawValue);

	if (Number.isNaN(parsedNumber)) {
		return null;
	}

	return parsedNumber;
}

export function setMessage(container, message, variant = 'info') {
	if (!container) {
		return;
	}

	container.className = `alert alert-${variant}`;
	container.textContent = message;
	container.classList.remove('d-none');
}

export function setSubmitState(button, isLoading) {
	if (!button) {
		return;
	}

	button.disabled = isLoading;
	button.textContent = isLoading ? 'Запазване...' : 'Създай къмпинг';
}

export function collectCampsiteFormData(form) {
	const formData = new FormData(form);

	return {
		title: String(formData.get('title') || '').trim(),
		description: String(formData.get('description') || '').trim(),
		location_name: String(formData.get('location_name') || '').trim(),
		latitude: toOptionalNumber(formData.get('latitude')),
		longitude: toOptionalNumber(formData.get('longitude')),
		price_per_night: toOptionalNumber(formData.get('price_per_night')),
		has_water: formData.get('has_water') === 'on',
		has_electricity: formData.get('has_electricity') === 'on',
		has_toilet: formData.get('has_toilet') === 'on',
		has_shower: formData.get('has_shower') === 'on',
		has_wifi: formData.get('has_wifi') === 'on',
		pets_allowed: formData.get('pets_allowed') === 'on',
		positive_notes: String(formData.get('positive_notes') || '').trim() || null,
		negative_notes: String(formData.get('negative_notes') || '').trim() || null,
	};
}

export function getSelectedPhotos(form) {
	const photosInput = form.elements.namedItem('photos');

	if (!(photosInput instanceof HTMLInputElement) || !photosInput.files) {
		return [];
	}

	return Array.from(photosInput.files).filter((file) => file instanceof File);
}

function validateCampsiteData(campsiteData) {
	if (!campsiteData.title || !campsiteData.description || !campsiteData.location_name) {
		return 'Моля, попълнете заглавие, описание и локация.';
	}

	if (campsiteData.latitude !== null && (campsiteData.latitude < -90 || campsiteData.latitude > 90)) {
		return 'Географската ширина трябва да бъде между -90 и 90.';
	}

	if (campsiteData.longitude !== null && (campsiteData.longitude < -180 || campsiteData.longitude > 180)) {
		return 'Географската дължина трябва да бъде между -180 и 180.';
	}

	if (campsiteData.price_per_night !== null && campsiteData.price_per_night < 0) {
		return 'Цената на нощувка не може да бъде отрицателна.';
	}

	return null;
}

async function uploadPhotosForCampsite(photos, campsiteId) {
	for (const photo of photos) {
		await uploadCampsitePhoto(photo, campsiteId);
	}
}

export async function initCreateCampsitePage() {
	initLogoutHandlers();

	const loggedInUser = await requireAuth('/login.html');

	if (!loggedInUser) {
		return;
	}

	const form = document.getElementById('createCampsiteForm');
	const messageContainer = document.getElementById('createCampsiteMessage');
	const submitButton = document.getElementById('createCampsiteSubmit');

	if (!form || !messageContainer || !submitButton) {
		return;
	}

	form.addEventListener('submit', async (event) => {
		event.preventDefault();
		messageContainer.classList.add('d-none');

		const campsiteData = collectCampsiteFormData(form);
		const photos = getSelectedPhotos(form);

		const validationError = validateCampsiteData(campsiteData);

		if (validationError) {
			setMessage(messageContainer, validationError, 'danger');
			return;
		}

		setSubmitState(submitButton, true);

		try {
			const campsite = await createCampsite(campsiteData);

			if (photos.length > 0) {
				await uploadPhotosForCampsite(photos, campsite.id);
			}

			setMessage(
				messageContainer,
				'Къмпингът е създаден успешно. Новите къмпинги се публикуват след одобрение от администратор.',
				'success',
			);

			window.setTimeout(() => {
				window.location.assign(`/campsite-details.html?id=${encodeURIComponent(campsite.id)}`);
			}, 900);
		} catch (error) {
			setMessage(
				messageContainer,
				error.message || 'Възникна проблем при създаване на къмпинга. Моля, опитайте отново.',
				'danger',
			);
		} finally {
			setSubmitState(submitButton, false);
		}
	});
}

initCreateCampsitePage();
