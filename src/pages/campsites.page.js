import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import '../styles/app.css';
import { getPublishedCampsites } from '../services/campsitesService.js';
import { getCampsitePhotos } from '../services/photosService.js';
import { getLoggedInUser, initLogoutHandlers } from '../utils/authGuards.js';

const PHOTO_PLACEHOLDER_URL = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
	'<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540"><defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1"><stop stop-color="#198754" offset="0"/><stop stop-color="#0dcaf0" offset="1"/></linearGradient></defs><rect fill="url(#g)" width="960" height="540"/><g fill="rgba(255,255,255,.85)"><path d="M120 420l170-180 120 130 90-95 150 145z"/><circle cx="650" cy="170" r="45"/></g><text x="50%" y="86%" text-anchor="middle" font-family="Arial, sans-serif" font-size="36" fill="white">CampAtlas</text></svg>',
)}`;

const amenityConfig = [
	{ key: 'has_water', label: 'Вода', icon: 'bi-droplet' },
	{ key: 'has_electricity', label: 'Ток', icon: 'bi-lightning-charge' },
	{ key: 'has_toilet', label: 'Тоалетна', icon: 'bi-badge-wc' },
	{ key: 'has_shower', label: 'Душ', icon: 'bi-droplet-half' },
	{ key: 'has_wifi', label: 'Wi-Fi', icon: 'bi-wifi' },
	{ key: 'pets_allowed', label: 'Домашни любимци', icon: 'bi-heart' },
];

function getDescriptionExcerpt(description, maxLength = 130) {
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
			return PHOTO_PLACEHOLDER_URL;
		}

		return photos[0].public_url || PHOTO_PLACEHOLDER_URL;
	} catch {
		return PHOTO_PLACEHOLDER_URL;
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
		badge.className = 'badge text-bg-light border';

		const icon = document.createElement('i');
		icon.className = `bi ${amenity.icon} me-1`;
		badge.appendChild(icon);
		badge.append(amenity.label);

		wrapper.appendChild(badge);
	});

	if (!wrapper.children.length) {
		const fallbackBadge = document.createElement('span');
		fallbackBadge.className = 'badge text-bg-secondary';
		fallbackBadge.textContent = 'Без отбелязани удобства';
		wrapper.appendChild(fallbackBadge);
	}

	return wrapper;
}

function renderCampsiteCard(campsite, photoUrl) {
	const col = document.createElement('article');
	col.className = 'col-12 col-md-6 col-xl-4';

	const card = document.createElement('div');
	card.className = 'card h-100 shadow-sm border-0';

	const image = document.createElement('img');
	image.className = 'card-img-top';
	image.src = photoUrl;
	image.alt = `Снимка на ${campsite.title || 'къмпинг'}`;
	image.loading = 'lazy';
	image.style.height = '220px';
	image.style.objectFit = 'cover';
	card.appendChild(image);

	const cardBody = document.createElement('div');
	cardBody.className = 'card-body d-flex flex-column';

	const title = document.createElement('h2');
	title.className = 'h5 card-title mb-2';
	title.textContent = campsite.title || 'Къмпинг без име';
	cardBody.appendChild(title);

	const location = document.createElement('p');
	location.className = 'text-muted small mb-2';
	location.textContent = campsite.location_name || 'Няма посочена локация';
	cardBody.appendChild(location);

	const description = document.createElement('p');
	description.className = 'mb-3';
	description.textContent = getDescriptionExcerpt(campsite.description);
	cardBody.appendChild(description);

	const formattedPrice = formatPrice(campsite.price_per_night);
	const price = document.createElement('p');
	price.className = 'fw-semibold mb-3';
	price.textContent = formattedPrice
		? `${formattedPrice} / нощувка`
		: 'Цена: не е посочена';
	cardBody.appendChild(price);

	cardBody.appendChild(renderAmenityBadges(campsite));

	const actions = document.createElement('div');
	actions.className = 'mt-4';
	const detailsLink = document.createElement('a');
	detailsLink.className = 'btn btn-outline-success btn-sm';
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
		fragment.appendChild(renderCampsiteCard(entry.campsite, entry.photoUrl));
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
