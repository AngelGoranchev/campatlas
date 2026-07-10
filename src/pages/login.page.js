import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import '../styles/app.css';
import { supabase } from '../services/supabaseClient.js';
import { initLogoutHandlers, redirectIfAuthenticated } from '../utils/authGuards.js';

function setMessage(container, message, variant) {
	container.className = `alert alert-${variant}`;
	container.textContent = message;
	container.classList.remove('d-none');
}

function mapLoginErrorMessage(error) {
	const message = (error?.message || '').toLowerCase();

	if (message.includes('invalid login credentials')) {
		return 'Невалиден имейл или парола.';
	}

	if (message.includes('email not confirmed')) {
		return 'Имейлът не е потвърден. Моля, проверете входящата си поща.';
	}

	if (message.includes('too many requests')) {
		return 'Има твърде много опити за вход. Моля, опитайте след малко.';
	}

	return 'Възникна проблем при входа. Моля, опитайте отново.';
}

async function initLoginPage() {
	initLogoutHandlers();

	const alreadyAuthenticated = await redirectIfAuthenticated('/campsites.html');

	if (alreadyAuthenticated) {
		return;
	}

	const form = document.getElementById('loginForm');
	const messageContainer = document.getElementById('loginMessage');

	if (!form || !messageContainer) {
		return;
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
		const email = String(formData.get('email') || '').trim();
		const password = String(formData.get('password') || '');

		if (submitButton) {
			submitButton.disabled = true;
		}

		try {
			const { error } = await supabase.auth.signInWithPassword({ email, password });

			if (error) {
				throw error;
			}

			setMessage(messageContainer, 'Успешен вход. Пренасочване...', 'success');
			window.setTimeout(() => {
				window.location.replace('/campsites.html');
			}, 400);
		} catch (error) {
			setMessage(messageContainer, mapLoginErrorMessage(error), 'danger');
		} finally {
			if (submitButton) {
				submitButton.disabled = false;
			}
		}
	});
}

initLoginPage();
