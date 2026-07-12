import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import '../styles/app.css';
import { getPublishedCampsites } from '../services/campsitesService.js';
import { getCampsitePhotos } from '../services/photosService.js';
import { getLoggedInUser, initLogoutHandlers } from '../utils/authGuards.js';

const amenityConfig = [
	{ key: 'has_water', label: 'Вода', icon: 'bi-droplet' },
	{ key: 'has_electricity', label: 'Ток', icon: 'bi-lightning-charge' },
	{ key: 'has_toilet', label: 'Тоалетна', icon: 'bi-badge-wc' },
	{ key: 'has_shower', label: 'Душ', icon: 'bi-droplet-half' },
	{ key: 'has_wifi', label: 'Wi-Fi', icon: 'bi-wifi' },
	{ key: 'pets_allowed', label: 'Домашни любимци', icon: 'bi-heart' },
];

function getDescriptionPreview(description, maxLength = 140) {
	const safeDescription = String(description || '').trim();

	if (!safeDescription) {
		return 'Няма добавено описание за този къмпинг.';
	}

	if (safeDescription.length <= maxLength) {
		return safeDescription;
	}

	return `${safeDescription.slice(0, maxLength).trim()}...`;
}

function formatPrice(pricePerNight) {
	if (pricePerNight === null || pricePerNight === undefined || Number.isNaN(Number(pricePerNight))) {
		return null;
	}

	return new Intl.NumberFormat('bg-BG', {
		style: 'currency',
		currency: 'BGN',
		minimumFractionDigits: 2,
	}).format(Number(pricePerNight));
}

async function getFirstPhotoUrl(campsiteId) {
	try {
		const photos = await getCampsitePhotos(campsiteId);

		if (!Array.isArray(photos) || photos.length === 0) {
			return null;
		}

		return photos[0].public_url || null;
	} catch {
		return null;
	}
}

function renderAmenityBadges(campsite) {
	const wrapper = document.createElement('div');
	wrapper.className = 'd-flex flex-wrap gap-2';

	amenityConfig.forEach((amenity) => {
		if (!campsite[amenity.key]) {
			return;
		}

		const badge = document.createElement('span');
		badge.className = 'amenity-badge';

		const icon = document.createElement('i');
		icon.className = `bi ${amenity.icon} me-1`;
		badge.appendChild(icon);
		badge.append(amenity.label);

		wrapper.appendChild(badge);
	});

	if (!wrapper.children.length) {
		const fallbackBadge = document.createElement('span');
		fallbackBadge.className = 'amenity-badge text-bg-secondary border-0';
		fallbackBadge.textContent = 'Без отбелязани удобства';
		wrapper.appendChild(fallbackBadge);
	}

	return wrapper;
}

function createCampsiteImage(campsite, photoUrl) {
	if (photoUrl) {
		const image = document.createElement('img');
		image.className = 'campsite-card-image';
		image.src = photoUrl;
		image.alt = `Снимка на ${campsite.title || 'къмпинг'}`;
		image.loading = 'lazy';
		return image;
	}

	const placeholder = document.createElement('div');
	placeholder.className = 'campsite-card-image-placeholder';

	const icon = document.createElement('i');
	icon.className = 'bi bi-tree-fill';
	placeholder.appendChild(icon);

	const label = document.createElement('span');
	label.textContent = 'Няма налична снимка';
	placeholder.appendChild(label);

	return placeholder;
}

function createCampsiteCard(campsite, photoUrl) {
	const col = document.createElement('article');
	col.className = 'col-12 col-md-6 col-xl-4';

	const card = document.createElement('div');
	card.className = 'campsite-card h-100 app-card-hover';

	card.appendChild(createCampsiteImage(campsite, photoUrl));

	const cardBody = document.createElement('div');
	cardBody.className = 'campsite-card-body d-flex flex-column';

	const title = document.createElement('h2');
	title.className = 'h5 mb-1';
	title.textContent = campsite.title || 'Къмпинг без име';
	cardBody.appendChild(title);

	const meta = document.createElement('p');
	meta.className = 'campsite-card-meta mb-3';

	const locationIcon = document.createElement('i');
	locationIcon.className = 'bi bi-geo-alt-fill';
	meta.appendChild(locationIcon);

	const locationText = document.createElement('span');
	locationText.textContent = campsite.location_name || 'Няма посочена локация';
	meta.appendChild(locationText);
	cardBody.appendChild(meta);

	const formattedPrice = formatPrice(campsite.price_per_night);
	const price = document.createElement('p');
	price.className = 'fw-semibold mb-3';
	price.textContent = formattedPrice
		? `${formattedPrice} / нощувка`
		: 'Цена: не е посочена';
	cardBody.appendChild(price);

	const description = document.createElement('p');
	description.className = 'mb-3 app-muted';
	description.textContent = getDescriptionPreview(campsite.description);
	cardBody.appendChild(description);

	cardBody.appendChild(renderAmenityBadges(campsite));

	const actions = document.createElement('div');
	actions.className = 'mt-auto pt-3';
	const detailsLink = document.createElement('a');
	detailsLink.className = 'btn btn-outline-success';
	detailsLink.href = `/campsite-details.html?id=${encodeURIComponent(campsite.id)}`;
	detailsLink.textContent = 'Виж детайли';
	actions.appendChild(detailsLink);
	cardBody.appendChild(actions);

	card.appendChild(cardBody);
	col.appendChild(card);

	return col;
}

function renderCampsites(campsites, gridElement) {
	const fragment = document.createDocumentFragment();

	campsites.forEach((entry) => {
		fragment.appendChild(createCampsiteCard(entry.campsite, entry.photoUrl));
	});

	gridElement.replaceChildren(fragment);
}

async function initCampsitesPage() {
	initLogoutHandlers();

	const loadingElement = document.getElementById('campsitesLoading');
	const errorElement = document.getElementById('campsitesError');
	const emptyElement = document.getElementById('campsitesEmpty');
	const gridElement = document.getElementById('campsitesGrid');
	const createLink = document.getElementById('createCampsiteLink');
	const guestActions = document.getElementById('guestAuthActions');

	if (!loadingElement || !errorElement || !emptyElement || !gridElement || !createLink || !guestActions) {
		return;
	}

	try {
		const loggedInUser = await getLoggedInUser();

		if (loggedInUser) {
			createLink.classList.remove('d-none');
			guestActions.classList.add('d-none');
		} else {
			createLink.classList.add('d-none');
			guestActions.classList.remove('d-none');
		}

		const campsites = await getPublishedCampsites();

		if (!Array.isArray(campsites) || campsites.length === 0) {
			emptyElement.classList.remove('d-none');
			gridElement.classList.add('d-none');
			return;
		}

		// Load first image for each campsite before rendering cards.
		const campsitesWithPhotos = await Promise.all(
			campsites.map(async (campsite) => ({
				campsite,
				photoUrl: await getFirstPhotoUrl(campsite.id),
			})),
		);

		renderCampsites(campsitesWithPhotos, gridElement);
		gridElement.classList.remove('d-none');
	} catch {
		errorElement.textContent = 'Възникна проблем при зареждане на къмпингите. Моля, опитайте отново.';
		errorElement.classList.remove('d-none');
		gridElement.classList.add('d-none');
	} finally {
		loadingElement.classList.add('d-none');
	}
}

initCampsitesPage();
