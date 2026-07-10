import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import '../styles/app.css';
import { getCurrentProfile, upsertCurrentProfile } from '../services/profilesService.js';
import { initLogoutHandlers, requireAuth } from '../utils/authGuards.js';

function setMessage(container, message, variant) {
	container.className = `alert alert-${variant}`;
	container.textContent = message;
	container.classList.remove('d-none');
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
