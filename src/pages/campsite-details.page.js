import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import '../styles/app.css';
import { getCampsiteById } from '../services/campsitesService.js';
import { getCampsitePhotos } from '../services/photosService.js';
import { addFavorite, removeFavorite, isFavorite } from '../services/favoritesService.js';
import { getCampsiteReviews, createReview } from '../services/reviewsService.js';
import { getLoggedInUser, initLogoutHandlers } from '../utils/authGuards.js';

const amenityConfig = [
	{ key: 'has_water', label: 'Вода', icon: 'bi-droplet' },
	{ key: 'has_electricity', label: 'Ток', icon: 'bi-lightning-charge' },
	{ key: 'has_toilet', label: 'Тоалетна', icon: 'bi-badge-wc' },
	{ key: 'has_shower', label: 'Душ', icon: 'bi-droplet-half' },
	{ key: 'has_wifi', label: 'Wi-Fi', icon: 'bi-wifi' },
	{ key: 'pets_allowed', label: 'Домашни любимци', icon: 'bi-heart' },
];

function formatPrice(pricePerNight) {
	if (pricePerNight === null || pricePerNight === undefined || Number.isNaN(Number(pricePerNight))) {
		return 'Цена: не е посочена';
	}

	const formatted = new Intl.NumberFormat('bg-BG', {
		style: 'currency',
		currency: 'BGN',
		minimumFractionDigits: 2,
	}).format(Number(pricePerNight));

	return `${formatted} / нощувка`;
}

function formatReviewDate(value) {
	if (!value) {
		return 'Без дата';
	}

	const date = new Date(value);

	if (Number.isNaN(date.getTime())) {
		return 'Без дата';
	}

	return new Intl.DateTimeFormat('bg-BG', {
		day: '2-digit',
		month: '2-digit',
		year: 'numeric',
	}).format(date);
}

function showErrorMessage(errorElement, message, includeBackLink = true) {
	errorElement.replaceChildren();

	const textNode = document.createTextNode(message);
	errorElement.appendChild(textNode);

	if (includeBackLink) {
		errorElement.appendChild(document.createTextNode(' '));
		const link = document.createElement('a');
		link.href = '/campsites.html';
		link.className = 'alert-link';
		link.textContent = 'Върнете се към списъка с къмпинги.';
		errorElement.appendChild(link);
	}

	errorElement.classList.remove('d-none');
}

function setFavoriteButtonState(button, isMarkedFavorite) {
	button.replaceChildren();

	const icon = document.createElement('i');
	icon.className = `bi ${isMarkedFavorite ? 'bi-heart-fill' : 'bi-heart'} me-1`;
	button.appendChild(icon);
	button.append(isMarkedFavorite ? 'Премахни от любими' : 'Добави в любими');

	button.classList.toggle('btn-danger', isMarkedFavorite);
	button.classList.toggle('btn-outline-danger', !isMarkedFavorite);
}

export function getCampsiteIdFromUrl() {
	const params = new URLSearchParams(window.location.search);
	const id = params.get('id');

	if (!id || !id.trim()) {
		return null;
	}

	return id.trim();
}

export function renderAmenityBadges(campsite) {
	const container = document.getElementById('campsiteAmenities');

	if (!container) {
		return;
	}

	container.replaceChildren();

	amenityConfig.forEach((amenity) => {
		if (!campsite?.[amenity.key]) {
			return;
		}

		const badge = document.createElement('span');
		badge.className = 'badge text-bg-light border';

		const icon = document.createElement('i');
		icon.className = `bi ${amenity.icon} me-1`;
		badge.appendChild(icon);
		badge.append(amenity.label);

		container.appendChild(badge);
	});

	if (!container.children.length) {
		const fallbackBadge = document.createElement('span');
		fallbackBadge.className = 'badge text-bg-secondary';
		fallbackBadge.textContent = 'Без отбелязани удобства';
		container.appendChild(fallbackBadge);
	}
}

export function renderGallery(photos) {
	const galleryElement = document.getElementById('campsiteGallery');

	if (!galleryElement) {
		return;
	}

	galleryElement.replaceChildren();

	if (!Array.isArray(photos) || photos.length === 0) {
		const col = document.createElement('div');
		col.className = 'col-12';

		const placeholder = document.createElement('div');
		placeholder.className = 'alert alert-secondary mb-0';
		placeholder.textContent = 'Все още няма качени снимки за този къмпинг.';
		col.appendChild(placeholder);

		galleryElement.appendChild(col);
		return;
	}

	const fragment = document.createDocumentFragment();

	photos.forEach((photo, index) => {
		const col = document.createElement('div');
		col.className = 'col-12 col-sm-6 col-lg-4';

		const image = document.createElement('img');
		image.className = 'img-fluid rounded border w-100';
		image.style.height = '220px';
		image.style.objectFit = 'cover';
		image.loading = 'lazy';
		image.src = photo.public_url || '';
		image.alt = `Снимка ${index + 1} на къмпинга`;

		if (!photo.public_url) {
			image.alt = 'Липсваща снимка';
		}

		col.appendChild(image);
		fragment.appendChild(col);
	});

	galleryElement.appendChild(fragment);
}

export function renderReviews(reviews) {
	const reviewsListElement = document.getElementById('reviewsList');
	const emptyElement = document.getElementById('reviewsEmpty');

	if (!reviewsListElement || !emptyElement) {
		return;
	}

	reviewsListElement.replaceChildren();

	if (!Array.isArray(reviews) || reviews.length === 0) {
		emptyElement.textContent = 'Все още няма отзиви за този къмпинг.';
		emptyElement.classList.remove('d-none');
		return;
	}

	emptyElement.classList.add('d-none');

	const fragment = document.createDocumentFragment();

	reviews.forEach((review) => {
		const card = document.createElement('article');
		card.className = 'border rounded p-3 bg-light';

		const topRow = document.createElement('div');
		topRow.className = 'd-flex flex-wrap justify-content-between align-items-center gap-2 mb-2';

		const ratingBadge = document.createElement('span');
		ratingBadge.className = 'badge text-bg-success';
		ratingBadge.textContent = `Оценка: ${review.rating}/5`;
		topRow.appendChild(ratingBadge);

		const dateText = document.createElement('small');
		dateText.className = 'text-muted';
		dateText.textContent = formatReviewDate(review.created_at);
		topRow.appendChild(dateText);

		card.appendChild(topRow);

		const comment = document.createElement('p');
		comment.className = 'mb-0';
		comment.textContent = review.comment?.trim() ? review.comment : 'Без допълнителен коментар.';
		card.appendChild(comment);

		fragment.appendChild(card);
	});

	reviewsListElement.appendChild(fragment);
}

export function renderCampsiteDetails(campsite, photos) {
	const titleElement = document.getElementById('campsiteTitle');
	const locationElement = document.getElementById('campsiteLocation');
	const descriptionElement = document.getElementById('campsiteDescription');
	const priceElement = document.getElementById('campsitePrice');
	const positiveSection = document.getElementById('positiveNotesSection');
	const positiveNotesElement = document.getElementById('campsitePositiveNotes');
	const negativeSection = document.getElementById('negativeNotesSection');
	const negativeNotesElement = document.getElementById('campsiteNegativeNotes');

	if (
		!titleElement
		|| !locationElement
		|| !descriptionElement
		|| !priceElement
		|| !positiveSection
		|| !positiveNotesElement
		|| !negativeSection
		|| !negativeNotesElement
	) {
		return;
	}

	titleElement.textContent = campsite.title || 'Къмпинг без име';
	locationElement.textContent = campsite.location_name || 'Няма посочена локация';
	descriptionElement.textContent = campsite.description || 'Няма добавено описание за този къмпинг.';
	priceElement.textContent = formatPrice(campsite.price_per_night);

	renderAmenityBadges(campsite);

	const hasPositiveNotes = Boolean(campsite.positive_notes?.trim());
	positiveSection.classList.toggle('d-none', !hasPositiveNotes);
	positiveNotesElement.textContent = hasPositiveNotes ? campsite.positive_notes : '';

	const hasNegativeNotes = Boolean(campsite.negative_notes?.trim());
	negativeSection.classList.toggle('d-none', !hasNegativeNotes);
	negativeNotesElement.textContent = hasNegativeNotes ? campsite.negative_notes : '';

	renderGallery(photos);
}

export async function initFavoriteButton(campsiteId, loggedInUser) {
	const favoriteButton = document.getElementById('favoriteButton');

	if (!favoriteButton) {
		return;
	}

	if (!loggedInUser) {
		favoriteButton.classList.add('d-none');
		return;
	}

	favoriteButton.classList.remove('d-none');

	let currentlyFavorite = false;

	try {
		currentlyFavorite = await isFavorite(campsiteId);
		setFavoriteButtonState(favoriteButton, currentlyFavorite);
	} catch {
		setFavoriteButtonState(favoriteButton, false);
	}

	favoriteButton.addEventListener('click', async () => {
		favoriteButton.disabled = true;

		try {
			if (currentlyFavorite) {
				await removeFavorite(campsiteId);
				currentlyFavorite = false;
			} else {
				await addFavorite(campsiteId);
				currentlyFavorite = true;
			}

			setFavoriteButtonState(favoriteButton, currentlyFavorite);
		} catch (error) {
			window.alert(error.message || 'Възникна проблем при запазване на предпочитанията.');
		} finally {
			favoriteButton.disabled = false;
		}
	});
}

export function initReviewForm(campsiteId, loggedInUser, onReviewCreated) {
	const reviewForm = document.getElementById('reviewForm');
	const authMessageElement = document.getElementById('reviewsAuthMessage');
	const feedbackElement = document.getElementById('reviewFeedback');
	const ratingField = document.getElementById('reviewRating');
	const commentField = document.getElementById('reviewComment');
	const submitButton = document.getElementById('reviewSubmitButton');

	if (!reviewForm || !authMessageElement || !feedbackElement || !ratingField || !commentField || !submitButton) {
		return;
	}

	feedbackElement.classList.add('d-none');
	feedbackElement.textContent = '';

	if (!loggedInUser) {
		reviewForm.classList.add('d-none');
		authMessageElement.classList.remove('d-none');
		authMessageElement.replaceChildren();

		authMessageElement.append('За да оставите отзив, моля ');

		const loginLink = document.createElement('a');
		loginLink.href = '/login.html';
		loginLink.className = 'alert-link';
		loginLink.textContent = 'влезте';
		authMessageElement.appendChild(loginLink);

		authMessageElement.append(' или ');

		const registerLink = document.createElement('a');
		registerLink.href = '/register.html';
		registerLink.className = 'alert-link';
		registerLink.textContent = 'се регистрирайте';
		authMessageElement.appendChild(registerLink);

		authMessageElement.append('.');
		return;
	}

	authMessageElement.classList.add('d-none');
	reviewForm.classList.remove('d-none');

	reviewForm.addEventListener('submit', async (event) => {
		event.preventDefault();

		const rating = Number.parseInt(String(ratingField.value), 10);
		const comment = String(commentField.value || '').trim();

		if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
			feedbackElement.className = 'alert alert-danger mb-3';
			feedbackElement.textContent = 'Моля, изберете валидна оценка от 1 до 5.';
			return;
		}

		submitButton.disabled = true;

		try {
			await createReview(campsiteId, rating, comment || null);

			ratingField.value = '';
			commentField.value = '';

			feedbackElement.className = 'alert alert-success mb-3';
			feedbackElement.textContent = 'Отзивът беше добавен успешно.';

			if (typeof onReviewCreated === 'function') {
				await onReviewCreated();
			}
		} catch (error) {
			feedbackElement.className = 'alert alert-danger mb-3';

			if (error.message?.toLowerCase().includes('duplicate')) {
				feedbackElement.textContent = 'Вече сте оставили отзив за този къмпинг.';
			} else {
				feedbackElement.textContent = error.message || 'Възникна проблем при изпращане на отзива.';
			}
		} finally {
			submitButton.disabled = false;
		}
	});
}

export async function initCampsiteDetailsPage() {
	initLogoutHandlers();

	const loadingElement = document.getElementById('campsiteDetailsLoading');
	const errorElement = document.getElementById('campsiteDetailsError');
	const contentElement = document.getElementById('campsiteDetailsContent');

	if (!loadingElement || !errorElement || !contentElement) {
		return;
	}

	errorElement.classList.add('d-none');
	contentElement.classList.add('d-none');

	const campsiteId = getCampsiteIdFromUrl();

	if (!campsiteId) {
		loadingElement.classList.add('d-none');
		showErrorMessage(errorElement, 'Липсва идентификатор на къмпинг в адреса.');
		return;
	}

	try {
		const loggedInUser = await getLoggedInUser();

		const [campsite, photos, reviews] = await Promise.all([
			getCampsiteById(campsiteId),
			getCampsitePhotos(campsiteId),
			getCampsiteReviews(campsiteId),
		]);

		if (!campsite) {
			showErrorMessage(errorElement, 'Къмпингът не е намерен или нямате достъп до него.');
			return;
		}

		renderCampsiteDetails(campsite, photos);
		renderReviews(reviews);

		await initFavoriteButton(campsiteId, loggedInUser);

		initReviewForm(campsiteId, loggedInUser, async () => {
			const refreshedReviews = await getCampsiteReviews(campsiteId);
			renderReviews(refreshedReviews);
		});

		contentElement.classList.remove('d-none');
	} catch {
		showErrorMessage(errorElement, 'Възникна проблем при зареждане на детайлите за къмпинга.');
	} finally {
		loadingElement.classList.add('d-none');
	}
}

initCampsiteDetailsPage();
