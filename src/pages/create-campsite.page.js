import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import '../styles/app.css';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { createCampsite } from '../services/campsitesService.js';
import { uploadCampsitePhoto } from '../services/photosService.js';
import { requireAuth, initLogoutHandlers } from '../utils/authGuards.js';

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

function setMapLocationMessage(messageElement, message, variant = 'success') {
	if (!messageElement) {
		return;
	}

	messageElement.className = `map-location-message ${variant}`;
	messageElement.textContent = message;
	messageElement.classList.remove('d-none');
}

async function searchCoordinatesByQuery(query) {
	const response = await fetch(
		`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(query)}`,
		{
			headers: {
				Accept: 'application/json',
			},
		},
	);

	if (!response.ok) {
		throw new Error('Неуспешно търсене на локация.');
	}

	const results = await response.json();

	if (!Array.isArray(results) || results.length === 0) {
		return null;
	}

	const firstResult = results[0];
	const latitude = Number.parseFloat(firstResult.lat);
	const longitude = Number.parseFloat(firstResult.lon);

	if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
		return null;
	}

	return { latitude, longitude };
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

	const setCoordinates = (latitude, longitude, zoom = null) => {
		if (!hasValidCoordinates(latitude, longitude)) {
			return false;
		}

		latitudeInput.value = latitude.toFixed(7);
		longitudeInput.value = longitude.toFixed(7);
		marker = setLocationMarker(map, marker, latitude, longitude, pinIcon);
		map.setView([latitude, longitude], zoom ?? Math.max(map.getZoom(), SELECTED_LOCATION_ZOOM));
		return true;
	};

	const syncMarkerFromInputs = () => {
		const latitude = parseLatitude();
		const longitude = parseLongitude();

		if (!hasValidCoordinates(latitude, longitude)) {
			return;
		}

		setCoordinates(latitude, longitude);
	};

	map.on('click', (event) => {
		const { lat, lng } = event.latlng;
		setCoordinates(lat, lng);
	});

	latitudeInput.addEventListener('change', syncMarkerFromInputs);
	longitudeInput.addEventListener('change', syncMarkerFromInputs);
	latitudeInput.addEventListener('blur', syncMarkerFromInputs);
	longitudeInput.addEventListener('blur', syncMarkerFromInputs);

	syncMarkerFromInputs();
	window.requestAnimationFrame(() => {
		map.invalidateSize();
	});

	return {
		refreshSize() {
			window.setTimeout(() => {
				map.invalidateSize();
			}, 0);
		},
		setCoordinates,
	};
}

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
	const latitudeInput = document.getElementById('latitude');
	const longitudeInput = document.getElementById('longitude');
	const mapElement = document.getElementById('createCampsiteMap');
	const mapSearchInput = document.getElementById('createMapSearchInput');
	const mapSearchButton = document.getElementById('createMapSearchButton');
	const useMyLocationButton = document.getElementById('createUseMyLocationButton');
	const mapLocationMessage = document.getElementById('createMapLocationMessage');

	if (!form || !messageContainer || !submitButton) {
		return;
	}

	const mapController = initLocationPickerMap(mapElement, latitudeInput, longitudeInput);
	mapController?.refreshSize();

	if (mapController && mapSearchInput instanceof HTMLInputElement && mapSearchButton instanceof HTMLButtonElement) {
		const triggerMapSearch = async () => {
			const query = mapSearchInput.value.trim();

			if (!query) {
				setMapLocationMessage(mapLocationMessage, 'Въведете място или адрес за търсене.', 'error');
				return;
			}

			mapSearchButton.disabled = true;

			try {
				const coordinates = await searchCoordinatesByQuery(query);

				if (!coordinates || !mapController.setCoordinates(coordinates.latitude, coordinates.longitude, SELECTED_LOCATION_ZOOM)) {
					setMapLocationMessage(mapLocationMessage, 'Не беше открита подходяща локация.', 'error');
					return;
				}

				setMapLocationMessage(mapLocationMessage, 'Локацията е избрана от търсачката.', 'success');
			} catch {
				setMapLocationMessage(mapLocationMessage, 'Неуспешно търсене. Опитайте отново след малко.', 'error');
			} finally {
				mapSearchButton.disabled = false;
			}
		};

		mapSearchButton.addEventListener('click', triggerMapSearch);
		mapSearchInput.addEventListener('keydown', (event) => {
			if (event.key !== 'Enter') {
				return;
			}

			event.preventDefault();
			void triggerMapSearch();
		});
	}

	if (mapController && useMyLocationButton instanceof HTMLButtonElement) {
		useMyLocationButton.addEventListener('click', () => {
			if (!navigator.geolocation) {
				setMapLocationMessage(
					mapLocationMessage,
					'Браузърът не поддържа автоматично определяне на локация.',
					'error',
				);
				return;
			}

			useMyLocationButton.disabled = true;

			navigator.geolocation.getCurrentPosition(
				(position) => {
					const latitude = position.coords.latitude;
					const longitude = position.coords.longitude;

					mapController.setCoordinates(latitude, longitude, SELECTED_LOCATION_ZOOM);
					setMapLocationMessage(mapLocationMessage, 'Локацията е обновена успешно.', 'success');
					useMyLocationButton.disabled = false;
				},
				(error) => {
					if (error.code === error.PERMISSION_DENIED) {
						setMapLocationMessage(
							mapLocationMessage,
							'Нямате разрешение за достъп до локацията. Разрешете достъпа и опитайте отново.',
							'error',
						);
					} else {
						setMapLocationMessage(
							mapLocationMessage,
							'Не успяхме да определим текущата локация. Моля, опитайте отново.',
							'error',
						);
					}

					useMyLocationButton.disabled = false;
				},
				{
					enableHighAccuracy: true,
					timeout: 10000,
					maximumAge: 0,
				},
			);
		});
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
