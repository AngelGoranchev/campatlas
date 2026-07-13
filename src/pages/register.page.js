import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import '../styles/app.css';
import { supabase } from '../services/supabaseClient.js';
import { upsertCurrentProfile } from '../services/profilesService.js';
import { initLogoutHandlers, redirectIfAuthenticated } from '../utils/authGuards.js';

function setMessage(container, message, variant) {
	container.className = `alert alert-${variant}`;
	container.textContent = message;
	container.classList.remove('d-none');
}

function mapRegisterErrorMessage(error) {
	const message = (error?.message || '').toLowerCase();

	if (message.includes('user already registered')) {
		return 'Потребител с този имейл вече съществува.';
	}

	if (message.includes('password')) {
		return 'Паролата не отговаря на изискванията за сигурност.';
	}

	if (message.includes('invalid email')) {
		return 'Имейл адресът е невалиден.';
	}

	if (message.includes('signup is disabled')) {
		return 'Регистрацията е временно изключена.';
	}

	return 'Възникна проблем при регистрацията. Моля, опитайте отново.';
}

function setupPasswordConfirmation(form) {
	const passwordInput = form.querySelector('[name="password"]');
	const confirmPasswordInput = form.querySelector('[name="password_confirm"]');

	if (!passwordInput || !confirmPasswordInput) {
		return;
	}

	const validatePasswordMatch = () => {
		if (!confirmPasswordInput.value) {
			confirmPasswordInput.setCustomValidity('');
			return;
		}

		if (passwordInput.value !== confirmPasswordInput.value) {
			confirmPasswordInput.setCustomValidity('Паролите трябва да съвпадат.');
			return;
		}

		confirmPasswordInput.setCustomValidity('');
	};

	passwordInput.addEventListener('input', validatePasswordMatch);
	confirmPasswordInput.addEventListener('input', validatePasswordMatch);
}

async function initRegisterPage() {
	initLogoutHandlers();

	const alreadyAuthenticated = await redirectIfAuthenticated('/profile.html');

	if (alreadyAuthenticated) {
		return;
	}

	const form = document.getElementById('registerForm');
	const messageContainer = document.getElementById('registerMessage');

	if (!form || !messageContainer) {
		return;
	}

	setupPasswordConfirmation(form);

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
		const email = String(formData.get('email') || '').trim();
		const password = String(formData.get('password') || '');

		if (submitButton) {
			submitButton.disabled = true;
		}

		try {
			const { data, error } = await supabase.auth.signUp({
				email,
				password,
				options: {
					emailRedirectTo: `${window.location.origin}/profile.html`,
					data: {
						full_name: fullName,
					},
				},
			});

			if (error) {
				throw error;
			}

			// Profile upsert requires an authenticated user session.
			if (data.session) {
				await upsertCurrentProfile({ full_name: fullName });
			}

			const confirmationMessage =
				'Регистрацията е създадена успешно. Моля, проверете e-mail адреса си и потвърдете акаунта от получения линк.';

			if (data.session) {
				setMessage(
					messageContainer,
					`${confirmationMessage} Вече сте влезли в профила си и можете да продължите към страниците на CampAtlas.`,
					'success',
				);
				return;
			}

			setMessage(messageContainer, confirmationMessage, 'success');
			form.reset();
		} catch (error) {
			setMessage(messageContainer, mapRegisterErrorMessage(error), 'danger');
		} finally {
			if (submitButton) {
				submitButton.disabled = false;
			}
		}
	});
}

initRegisterPage();
