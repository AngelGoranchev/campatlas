import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import '../styles/app.css';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getCampsiteById, updateCampsite, deleteCampsite } from '../services/campsitesService.js';
import { getCampsitePhotos, uploadCampsitePhoto, deleteCampsitePhoto } from '../services/photosService.js';
import { requireAuth, initLogoutHandlers } from '../utils/authGuards.js';

let currentCampsiteId = null;
let currentCampsite = null;

const BULGARIA_CENTER = [42.7339, 25.4858];
const BULGARIA_ZOOM = 7;
const SELECTED_LOCATION_ZOOM = 11;

function createMapPinIcon() {
	return L.divIcon({
		className: 'campatlas-map-pin-wrap',
		html: '<span class="campatlas-map-pin-dot"></span><span class="campatlas-map-pin-tail"></span>',
		iconSize: [24, 36],
		iconAnchor: [12, 34],
	});
}

function setLocationMarker(map, marker, latitude, longitude, pinIcon) {
	const target = [latitude, longitude];

	if (marker) {
		marker.setLatLng(target);
		return marker;
	}

	return L.marker(target, { icon: pinIcon }).addTo(map);
}

function initLocationPickerMap(mapElement, latitudeInput, longitudeInput) {
	if (!mapElement || !latitudeInput || !longitudeInput) {
		return null;
	}

	const map = L.map(mapElement).setView(BULGARIA_CENTER, BULGARIA_ZOOM);
	const pinIcon = createMapPinIcon();
	let marker = null;

	L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
		attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> участници',
	}).addTo(map);

	const parseLatitude = () => Number.parseFloat(String(latitudeInput.value ?? '').trim());
	const parseLongitude = () => Number.parseFloat(String(longitudeInput.value ?? '').trim());
	const hasValidCoordinates = (latitude, longitude) => {
		return Number.isFinite(latitude)
			&& Number.isFinite(longitude)
			&& latitude >= -90
			&& latitude <= 90
			&& longitude >= -180
			&& longitude <= 180;
	};

	const syncMarkerFromInputs = () => {
		const latitude = parseLatitude();
		const longitude = parseLongitude();

		if (!hasValidCoordinates(latitude, longitude)) {
			return;
		}

		marker = setLocationMarker(map, marker, latitude, longitude, pinIcon);
		map.setView([latitude, longitude], Math.max(map.getZoom(), SELECTED_LOCATION_ZOOM));
	};

	map.on('click', (event) => {
		const { lat, lng } = event.latlng;
		latitudeInput.value = lat.toFixed(7);
		longitudeInput.value = lng.toFixed(7);
		marker = setLocationMarker(map, marker, lat, lng, pinIcon);
	});

	latitudeInput.addEventListener('change', syncMarkerFromInputs);
	longitudeInput.addEventListener('change', syncMarkerFromInputs);
	latitudeInput.addEventListener('blur', syncMarkerFromInputs);
	longitudeInput.addEventListener('blur', syncMarkerFromInputs);

	syncMarkerFromInputs();

	return {
		refreshSize() {
			window.setTimeout(() => {
				map.invalidateSize();
			}, 0);
		},
	};
}

function toOptionalNumber(value) {
	const rawValue = String(value ?? '').trim();

	if (!rawValue) {
		return null;
	}

	const parsed = Number.parseFloat(rawValue);

	if (Number.isNaN(parsed)) {
		return null;
	}

	return parsed;
}

export function getCampsiteIdFromUrl() {
	const params = new URLSearchParams(window.location.search);
	const id = params.get('id');

	if (!id || !id.trim()) {
		return null;
	}

	return id.trim();
}

export function setMessage(container, message, variant = 'info') {
	if (!container) {
		return;
	}

	container.className = `alert alert-${variant}`;
	container.textContent = message;
	container.classList.remove('d-none');
}

function setMessageWithLink(container, message, linkHref, linkText, variant = 'danger') {
	if (!container) {
		return;
	}

	container.className = `alert alert-${variant}`;
	container.replaceChildren();
	container.append(message);
	container.append(' ');

	const link = document.createElement('a');
	link.href = linkHref;
	link.className = 'alert-link';
	link.textContent = linkText;
	container.appendChild(link);

	container.classList.remove('d-none');
}

export function setLoadingState(isLoading) {
	const loadingElement = document.getElementById('editCampsiteLoading');

	if (!loadingElement) {
		return;
	}

	loadingElement.classList.toggle('d-none', !isLoading);
}

export function setSubmitState(button, isLoading) {
	if (!button) {
		return;
	}

	button.disabled = isLoading;
	button.textContent = isLoading ? 'Запазване...' : 'Запази промените';
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

export function populateForm(campsite) {
	const form = document.getElementById('editCampsiteForm');

	if (!(form instanceof HTMLFormElement)) {
		return;
	}

	const setValue = (name, value) => {
		const field = form.elements.namedItem(name);

		if (field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement) {
			field.value = value;
		}
	};

	const setChecked = (name, value) => {
		const field = form.elements.namedItem(name);

		if (field instanceof HTMLInputElement) {
			field.checked = Boolean(value);
		}
	};

	setValue('title', campsite.title || '');
	setValue('description', campsite.description || '');
	setValue('location_name', campsite.location_name || '');
	setValue('latitude', campsite.latitude ?? '');
	setValue('longitude', campsite.longitude ?? '');
	setValue('price_per_night', campsite.price_per_night ?? '');
	setValue('positive_notes', campsite.positive_notes || '');
	setValue('negative_notes', campsite.negative_notes || '');

	setChecked('has_water', campsite.has_water);
	setChecked('has_electricity', campsite.has_electricity);
	setChecked('has_toilet', campsite.has_toilet);
	setChecked('has_shower', campsite.has_shower);
	setChecked('has_wifi', campsite.has_wifi);
	setChecked('pets_allowed', campsite.pets_allowed);
}

export function renderPhotos(photos) {
	const gallery = document.getElementById('currentPhotosGallery');

	if (!gallery) {
		return;
	}

	gallery.replaceChildren();

	if (!Array.isArray(photos) || photos.length === 0) {
		const col = document.createElement('div');
		col.className = 'col-12';

		const empty = document.createElement('div');
		empty.className = 'alert alert-secondary mb-0';
		empty.textContent = 'Все още няма качени снимки за този къмпинг.';
		col.appendChild(empty);

		gallery.appendChild(col);
		return;
	}

	const fragment = document.createDocumentFragment();

	photos.forEach((photo, index) => {
		const col = document.createElement('div');
		col.className = 'col-12 col-sm-6 col-lg-4';

		const card = document.createElement('div');
		card.className = 'border rounded p-2 h-100 d-flex flex-column';

		const image = document.createElement('img');
		image.src = photo.public_url || '';
		image.alt = `Снимка ${index + 1}`;
		image.className = 'img-fluid rounded mb-2';
		image.style.height = '180px';
		image.style.objectFit = 'cover';
		card.appendChild(image);

		const deleteButton = document.createElement('button');
		deleteButton.type = 'button';
		deleteButton.className = 'btn btn-outline-danger btn-sm mt-auto';
		deleteButton.textContent = 'Изтрий снимката';
		deleteButton.addEventListener('click', () => {
			handlePhotoDelete(photo, deleteButton);
		});
		card.appendChild(deleteButton);

		col.appendChild(card);
		fragment.appendChild(col);
	});

	gallery.appendChild(fragment);
}

export async function handlePhotoDelete(photo, triggerButton) {
	const messageContainer = document.getElementById('editCampsiteMessage');

	if (!window.confirm('Сигурни ли сте, че искате да изтриете тази снимка?')) {
		return;
	}

	if (triggerButton) {
		triggerButton.disabled = true;
	}

	try {
		await deleteCampsitePhoto(photo.id, photo.file_path);
		const refreshedPhotos = await getCampsitePhotos(currentCampsiteId);
		renderPhotos(refreshedPhotos);
		setMessage(messageContainer, 'Снимката беше изтрита успешно.', 'success');
	} catch (error) {
		setMessage(messageContainer, error.message || 'Възникна проблем при изтриване на снимката.', 'danger');
		if (triggerButton) {
			triggerButton.disabled = false;
		}
	}
}

export async function handleCampsiteDelete(campsiteId) {
	const messageContainer = document.getElementById('editCampsiteMessage');
	const deleteButton = document.getElementById('deleteCampsiteButton');

	if (!window.confirm('Сигурни ли сте, че искате да изтриете този къмпинг? Това действие е необратимо.')) {
		return;
	}

	if (deleteButton instanceof HTMLButtonElement) {
		deleteButton.disabled = true;
	}

	try {
		await deleteCampsite(campsiteId);
		setMessage(messageContainer, 'Къмпингът беше изтрит успешно.', 'success');
		window.setTimeout(() => {
			window.location.assign('/profile.html');
		}, 700);
	} catch (error) {
		setMessage(messageContainer, error.message || 'Възникна проблем при изтриване на къмпинга.', 'danger');
		if (deleteButton instanceof HTMLButtonElement) {
			deleteButton.disabled = false;
		}
	}
}

export async function loadEditableCampsite(campsiteId, userId) {
	const accessDeniedElement = document.getElementById('editCampsiteAccessDenied');
	const publishedNoticeElement = document.getElementById('editCampsitePublishedNotice');
	const contentElement = document.getElementById('editCampsiteContent');
	const messageContainer = document.getElementById('editCampsiteMessage');

	if (!accessDeniedElement || !publishedNoticeElement || !contentElement || !messageContainer) {
		return null;
	}

	const campsite = await getCampsiteById(campsiteId);

	if (!campsite) {
		setMessageWithLink(
			messageContainer,
			'Къмпингът не е намерен.',
			'/profile.html',
			'Върнете се към профила.',
		);
		contentElement.classList.add('d-none');
		return null;
	}

	if (campsite.owner_id !== userId) {
		accessDeniedElement.textContent = 'Нямате права да редактирате този къмпинг.';
		accessDeniedElement.classList.remove('d-none');
		contentElement.classList.add('d-none');
		return null;
	}

	if (campsite.review_status === 'published') {
		publishedNoticeElement.textContent = 'Публикуваните къмпинги не могат да се редактират директно.';
		publishedNoticeElement.classList.remove('d-none');
		contentElement.classList.add('d-none');
		return null;
	}

	if (!['pending', 'rejected'].includes(campsite.review_status)) {
		setMessage(messageContainer, 'Този къмпинг не може да бъде редактиран в момента.', 'warning');
		contentElement.classList.add('d-none');
		return null;
	}

	return campsite;
}

export async function initEditCampsitePage() {
	initLogoutHandlers();

	const contentElement = document.getElementById('editCampsiteContent');
	const messageContainer = document.getElementById('editCampsiteMessage');
	const accessDeniedElement = document.getElementById('editCampsiteAccessDenied');
	const publishedNoticeElement = document.getElementById('editCampsitePublishedNotice');
	const form = document.getElementById('editCampsiteForm');
	const saveButton = document.getElementById('saveCampsiteButton');
	const deleteButton = document.getElementById('deleteCampsiteButton');
	const latitudeInput = document.getElementById('latitude');
	const longitudeInput = document.getElementById('longitude');
	const mapElement = document.getElementById('editCampsiteMap');

	if (
		!contentElement
		|| !messageContainer
		|| !accessDeniedElement
		|| !publishedNoticeElement
		|| !(form instanceof HTMLFormElement)
		|| !(saveButton instanceof HTMLButtonElement)
		|| !(deleteButton instanceof HTMLButtonElement)
	) {
		return;
	}

	contentElement.classList.add('d-none');
	messageContainer.classList.add('d-none');
	accessDeniedElement.classList.add('d-none');
	publishedNoticeElement.classList.add('d-none');
	setLoadingState(true);

	const campsiteId = getCampsiteIdFromUrl();

	if (!campsiteId) {
		setMessageWithLink(
			messageContainer,
			'Липсва идентификатор на къмпинг в адреса.',
			'/profile.html',
			'Върнете се към профила.',
		);
		setLoadingState(false);
		return;
	}

	const user = await requireAuth('/login.html');

	if (!user) {
		setLoadingState(false);
		return;
	}

	try {
		currentCampsiteId = campsiteId;
		const campsite = await loadEditableCampsite(campsiteId, user.id);

		if (!campsite) {
			return;
		}

		currentCampsite = campsite;
		populateForm(campsite);
		const mapController = initLocationPickerMap(mapElement, latitudeInput, longitudeInput);

		const photos = await getCampsitePhotos(campsiteId);
		renderPhotos(photos);

		contentElement.classList.remove('d-none');
		mapController?.refreshSize();

		form.addEventListener('submit', async (event) => {
			event.preventDefault();
			messageContainer.classList.add('d-none');

			if (!currentCampsite || !['pending', 'rejected'].includes(currentCampsite.review_status)) {
				setMessage(messageContainer, 'Този къмпинг не може да бъде редактиран в момента.', 'warning');
				return;
			}

			const campsiteData = collectCampsiteFormData(form);
			const selectedPhotos = getSelectedPhotos(form);

			const validationError = validateCampsiteData(campsiteData);

			if (validationError) {
				setMessage(messageContainer, validationError, 'danger');
				return;
			}

			setSubmitState(saveButton, true);

			try {
				const updated = await updateCampsite(campsiteId, campsiteData);

				for (const file of selectedPhotos) {
					await uploadCampsitePhoto(file, campsiteId);
				}

				setMessage(messageContainer, 'Къмпингът е обновен успешно.', 'success');
				window.setTimeout(() => {
					window.location.assign(`/campsite-details.html?id=${encodeURIComponent(updated.id)}`);
				}, 900);
			} catch (error) {
				setMessage(messageContainer, error.message || 'Възникна проблем при запазване на промените.', 'danger');
			} finally {
				setSubmitState(saveButton, false);
			}
		});

		deleteButton.addEventListener('click', async () => {
			await handleCampsiteDelete(campsiteId);
		});
	} catch (error) {
		setMessage(messageContainer, error.message || 'Възникна проблем при зареждане на къмпинга.', 'danger');
	} finally {
		setLoadingState(false);
	}
}

initEditCampsitePage();
