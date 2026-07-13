import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import '../styles/app.css';
import { getMyCampsites } from '../services/campsitesService.js';
import { getCurrentProfile, upsertCurrentProfile } from '../services/profilesService.js';
import { initLogoutHandlers, requireAuth } from '../utils/authGuards.js';

function setMessage(container, message, variant) {
	container.className = `alert alert-${variant}`;
	container.textContent = message;
	container.classList.remove('d-none');
}

function getStatusLabel(reviewStatus) {
	if (reviewStatus === 'pending') {
		return 'Чака одобрение';
	}

	if (reviewStatus === 'published') {
		return 'Публикуван';
	}

	if (reviewStatus === 'rejected') {
		return 'Отказан';
	}

	return 'Неизвестен статус';
}

function getStatusBadgeClass(reviewStatus) {
	if (reviewStatus === 'pending') {
		return 'status-badge-pending';
	}

	if (reviewStatus === 'published') {
		return 'status-badge-published';
	}

	if (reviewStatus === 'rejected') {
		return 'status-badge-rejected';
	}

	return 'text-bg-secondary';
}

function formatDate(value) {
	if (!value) {
		return 'Без дата';
	}

	const parsedDate = new Date(value);

	if (Number.isNaN(parsedDate.getTime())) {
		return 'Без дата';
	}

	return new Intl.DateTimeFormat('bg-BG', {
		day: '2-digit',
		month: '2-digit',
		year: 'numeric',
	}).format(parsedDate);
}

function formatPrice(value) {
	if (value === null || value === undefined || Number.isNaN(Number(value))) {
		return 'Не е посочена';
	}

	return new Intl.NumberFormat('bg-BG', {
		style: 'currency',
		currency: 'BGN',
		minimumFractionDigits: 2,
	}).format(Number(value));
}

function renderMyCampsiteCard(campsite) {
	const card = document.createElement('article');
	card.className = 'profile-campsite-card';

	const header = document.createElement('div');
	header.className = 'd-flex flex-wrap justify-content-between align-items-start gap-2 mb-2';

	const title = document.createElement('h3');
	title.className = 'h6 mb-0';
	title.textContent = campsite.title || 'Къмпинг без име';
	header.appendChild(title);

	const statusBadge = document.createElement('span');
	statusBadge.className = `status-badge ${getStatusBadgeClass(campsite.review_status)}`;
	statusBadge.textContent = getStatusLabel(campsite.review_status);
	header.appendChild(statusBadge);

	card.appendChild(header);

	const location = document.createElement('p');
	location.className = 'mb-1 text-muted';
	location.textContent = `Локация: ${campsite.location_name || 'Няма посочена локация'}`;
	card.appendChild(location);

	const createdAt = document.createElement('p');
	createdAt.className = 'mb-1 small text-muted';
	createdAt.textContent = `Създаден на: ${formatDate(campsite.created_at)}`;
	card.appendChild(createdAt);

	const price = document.createElement('p');
	price.className = 'mb-3 small fw-semibold';
	price.textContent = `Цена: ${formatPrice(campsite.price_per_night)}`;
	card.appendChild(price);

	const actions = document.createElement('div');
	actions.className = 'd-flex flex-wrap gap-2 align-items-center';

	const detailsLink = document.createElement('a');
	detailsLink.href = `/campsite-details.html?id=${encodeURIComponent(campsite.id)}`;
	detailsLink.className = 'btn btn-outline-secondary btn-sm';
	detailsLink.textContent = 'Виж детайли';
	actions.appendChild(detailsLink);

	if (campsite.review_status === 'pending' || campsite.review_status === 'rejected') {
		const editLink = document.createElement('a');
		editLink.href = `/edit-campsite.html?id=${encodeURIComponent(campsite.id)}`;
		editLink.className = 'btn btn-success btn-sm';
		editLink.textContent = 'Редактирай';
		actions.appendChild(editLink);
	} else if (campsite.review_status === 'published') {
		const publishedNotice = document.createElement('span');
		publishedNotice.className = 'small text-muted';
		publishedNotice.textContent = 'Публикуваните къмпинги не могат да се редактират директно.';
		actions.appendChild(publishedNotice);
	}

	card.appendChild(actions);

	return card;
}

function renderMyCampsites(campsites) {
	const loadingElement = document.getElementById('myCampsitesLoading');
	const errorElement = document.getElementById('myCampsitesError');
	const emptyElement = document.getElementById('myCampsitesEmpty');
	const listElement = document.getElementById('myCampsitesList');

	if (!loadingElement || !errorElement || !emptyElement || !listElement) {
		return;
	}

	loadingElement.classList.add('d-none');
	errorElement.classList.add('d-none');
	listElement.replaceChildren();

	if (!Array.isArray(campsites) || campsites.length === 0) {
		emptyElement.classList.remove('d-none');
		listElement.classList.add('d-none');
		return;
	}

	emptyElement.classList.add('d-none');

	const fragment = document.createDocumentFragment();

	campsites.forEach((campsite) => {
		fragment.appendChild(renderMyCampsiteCard(campsite));
	});

	listElement.appendChild(fragment);
	listElement.classList.remove('d-none');
}

async function loadMyCampsites() {
	const loadingElement = document.getElementById('myCampsitesLoading');
	const errorElement = document.getElementById('myCampsitesError');
	const emptyElement = document.getElementById('myCampsitesEmpty');
	const listElement = document.getElementById('myCampsitesList');

	if (!loadingElement || !errorElement || !emptyElement || !listElement) {
		return;
	}

	loadingElement.classList.remove('d-none');
	errorElement.classList.add('d-none');
	emptyElement.classList.add('d-none');
	listElement.classList.add('d-none');

	try {
		const campsites = await getMyCampsites();
		renderMyCampsites(campsites);
	} catch {
		loadingElement.classList.add('d-none');
		emptyElement.classList.add('d-none');
		listElement.classList.add('d-none');
		errorElement.textContent = 'Неуспешно зареждане на вашите къмпинги. Моля, опитайте отново.';
		errorElement.classList.remove('d-none');
	}
}

async function initProfilePage() {
	initLogoutHandlers();

	const user = await requireAuth('/login.html');

	if (!user) {
		return;
	}

	const emailElement = document.getElementById('profileEmail');
	const form = document.getElementById('profileForm');
	const messageContainer = document.getElementById('profileMessage');
	const fullNameInput = document.getElementById('profileFullName');

	if (!emailElement || !form || !messageContainer || !fullNameInput) {
		return;
	}

	emailElement.textContent = user.email || 'Няма наличен имейл';

	try {
		const profile = await getCurrentProfile();
		fullNameInput.value = profile?.full_name || '';
	} catch (error) {
		setMessage(messageContainer, 'Неуспешно зареждане на профила. Моля, опитайте отново.', 'danger');
	}

	await loadMyCampsites();

	form.addEventListener('submit', async (event) => {
		event.preventDefault();
		event.stopPropagation();

		messageContainer.classList.add('d-none');
		form.classList.add('was-validated');

		if (!form.checkValidity()) {
			return;
		}

		const submitButton = form.querySelector('button[type="submit"]');
		const formData = new FormData(form);
		const fullName = String(formData.get('full_name') || '').trim();

		if (submitButton) {
			submitButton.disabled = true;
		}

		try {
			const updatedProfile = await upsertCurrentProfile({ full_name: fullName });
			fullNameInput.value = updatedProfile?.full_name || fullName;
			setMessage(messageContainer, 'Профилът беше обновен успешно.', 'success');
		} catch (error) {
			setMessage(messageContainer, 'Неуспешно запазване на профила. Моля, опитайте отново.', 'danger');
		} finally {
			if (submitButton) {
				submitButton.disabled = false;
			}
		}
	});
}

initProfilePage();
