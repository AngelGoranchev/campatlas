import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import '../styles/app.css';
import { getPendingCampsites, updateCampsiteStatus } from '../services/campsitesService.js';
import { isCurrentUserAdmin } from '../services/profilesService.js';
import { requireAuth, initLogoutHandlers } from '../utils/authGuards.js';

function formatDate(value) {
	if (!value) {
		return 'Без дата';
	}

	const parsed = new Date(value);

	if (Number.isNaN(parsed.getTime())) {
		return 'Без дата';
	}

	return new Intl.DateTimeFormat('bg-BG', {
		day: '2-digit',
		month: '2-digit',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	}).format(parsed);
}

function formatPrice(value) {
	if (value === null || value === undefined || Number.isNaN(Number(value))) {
		return 'Не е посочена';
	}

	return new Intl.NumberFormat('bg-BG', {
		style: 'currency',
		currency: 'EUR',
		minimumFractionDigits: 2,
	}).format(Number(value));
}

function setErrorMessage(container, message) {
	if (!container) {
		return;
	}

	container.textContent = message;
	container.classList.remove('d-none');
}

function setLoadingState(isLoading) {
	const loadingElement = document.getElementById('adminLoading');

	if (!loadingElement) {
		return;
	}

	loadingElement.classList.toggle('d-none', !isLoading);
}

function getRowActionButtons(rowElement) {
	return rowElement.querySelectorAll('button[data-status-action]');
}

async function handleStatusUpdate(campsiteId, reviewStatus, rowElement) {
	const errorElement = document.getElementById('adminError');
	const buttons = getRowActionButtons(rowElement);

	if (errorElement) {
		errorElement.classList.add('d-none');
		errorElement.textContent = '';
	}

	buttons.forEach((button) => {
		button.disabled = true;
	});

	try {
		await updateCampsiteStatus(campsiteId, reviewStatus);
		await loadPendingCampsites();
	} catch (error) {
		setErrorMessage(
			errorElement,
			error.message || 'Възникна проблем при обновяване на статуса на къмпинга.',
		);
		buttons.forEach((button) => {
			button.disabled = false;
		});
	}
}

function renderPendingCampsiteRow(campsite) {
	const row = document.createElement('tr');

	const titleCell = document.createElement('td');
	titleCell.className = 'fw-semibold';
	titleCell.textContent = campsite.title || 'Къмпинг без име';
	row.appendChild(titleCell);

	const locationCell = document.createElement('td');
	locationCell.textContent = campsite.location_name || 'Няма локация';
	row.appendChild(locationCell);

	const createdAtCell = document.createElement('td');
	createdAtCell.textContent = formatDate(campsite.created_at);
	row.appendChild(createdAtCell);

	const priceCell = document.createElement('td');
	priceCell.textContent = formatPrice(campsite.price_per_night);
	row.appendChild(priceCell);

	const actionsCell = document.createElement('td');
	actionsCell.className = 'text-end';

	const actionsWrap = document.createElement('div');
	actionsWrap.className = 'admin-action-group';

	const detailsLink = document.createElement('a');
	detailsLink.className = 'btn btn-outline-secondary btn-sm';
	detailsLink.href = `/campsite-details.html?id=${encodeURIComponent(campsite.id)}`;
	detailsLink.textContent = 'Преглед';
	actionsWrap.appendChild(detailsLink);

	const approveButton = document.createElement('button');
	approveButton.type = 'button';
	approveButton.className = 'btn btn-success btn-sm';
	approveButton.textContent = 'Одобри';
	approveButton.dataset.statusAction = 'published';
	approveButton.addEventListener('click', () => handleStatusUpdate(campsite.id, 'published', row));
	actionsWrap.appendChild(approveButton);

	const rejectButton = document.createElement('button');
	rejectButton.type = 'button';
	rejectButton.className = 'btn btn-outline-danger btn-sm';
	rejectButton.textContent = 'Откажи';
	rejectButton.dataset.statusAction = 'rejected';
	rejectButton.addEventListener('click', () => handleStatusUpdate(campsite.id, 'rejected', row));
	actionsWrap.appendChild(rejectButton);

	actionsCell.appendChild(actionsWrap);
	row.appendChild(actionsCell);

	return row;
}

function renderPendingCampsites(campsites) {
	const contentElement = document.getElementById('adminContent');
	const emptyElement = document.getElementById('pendingCampsitesEmpty');
	const bodyElement = document.getElementById('pendingCampsitesTableBody');

	if (!contentElement || !emptyElement || !bodyElement) {
		return;
	}

	bodyElement.replaceChildren();

	if (!Array.isArray(campsites) || campsites.length === 0) {
		emptyElement.textContent = 'В момента няма чакащи къмпинги за преглед.';
		emptyElement.classList.remove('d-none');
		contentElement.classList.add('d-none');
		return;
	}

	emptyElement.classList.add('d-none');
	contentElement.classList.remove('d-none');

	const fragment = document.createDocumentFragment();

	campsites.forEach((campsite) => {
		fragment.appendChild(renderPendingCampsiteRow(campsite));
	});

	bodyElement.appendChild(fragment);
}

async function loadPendingCampsites() {
	const contentElement = document.getElementById('adminContent');
	const emptyElement = document.getElementById('pendingCampsitesEmpty');
	const errorElement = document.getElementById('adminError');

	if (!contentElement || !emptyElement || !errorElement) {
		return;
	}

	setLoadingState(true);
	errorElement.classList.add('d-none');
	emptyElement.classList.add('d-none');
	contentElement.classList.add('d-none');

	try {
		const pendingCampsites = await getPendingCampsites();
		renderPendingCampsites(pendingCampsites);
	} catch (error) {
		setErrorMessage(
			errorElement,
			error.message || 'Възникна проблем при зареждане на чакащите къмпинги.',
		);
		contentElement.classList.add('d-none');
	} finally {
		setLoadingState(false);
	}
}

export async function initAdminPage() {
	initLogoutHandlers();

	const accessDeniedElement = document.getElementById('adminAccessDenied');
	const errorElement = document.getElementById('adminError');
	const emptyElement = document.getElementById('pendingCampsitesEmpty');
	const contentElement = document.getElementById('adminContent');

	if (!accessDeniedElement || !errorElement || !emptyElement || !contentElement) {
		return;
	}

	accessDeniedElement.classList.add('d-none');
	errorElement.classList.add('d-none');
	emptyElement.classList.add('d-none');
	contentElement.classList.add('d-none');
	setLoadingState(true);

	const user = await requireAuth('/login.html');

	if (!user) {
		setLoadingState(false);
		return;
	}

	try {
		const admin = await isCurrentUserAdmin();

		if (!admin) {
			accessDeniedElement.textContent = 'Нямате права за достъп до административния панел.';
			accessDeniedElement.classList.remove('d-none');
			contentElement.classList.add('d-none');
			return;
		}

		await loadPendingCampsites();
	} catch (error) {
		setErrorMessage(
			errorElement,
			error.message || 'Възникна проблем при зареждане на административния панел.',
		);
		contentElement.classList.add('d-none');
	} finally {
		setLoadingState(false);
	}
}

initAdminPage();
