import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import '../styles/app.css';
import { supabase } from '../services/supabaseClient.js';

function setAuthMessage(container, message, state = 'info') {
	if (!container) {
		return;
	}

	const stateClassMap = {
		error: 'text-danger',
		success: 'text-success',
		info: 'text-muted',
	};

	container.classList.remove('text-danger', 'text-success', 'text-muted');
	container.classList.add(stateClassMap[state] ?? stateClassMap.info);
	container.textContent = message;
}

function setButtonLoading(button, isLoading, loadingLabel, defaultLabel) {
	if (!button) {
		return;
	}

	button.disabled = isLoading;
	button.textContent = isLoading ? loadingLabel : defaultLabel;
}

function initHomeLoginModal() {
	const form = document.getElementById('homeLoginForm');
	if (!form) {
		return;
	}

	const messageBox = document.getElementById('homeLoginMessage');
	const submitButton = form.querySelector('button[type="submit"]');

	form.addEventListener('submit', async (event) => {
		event.preventDefault();
		setAuthMessage(messageBox, '');

		if (!form.checkValidity()) {
			form.reportValidity();
			setAuthMessage(messageBox, 'Моля, попълнете валидно имейл и парола.', 'error');
			return;
		}

		const formData = new FormData(form);
		const email = String(formData.get('email') ?? '').trim();
		const password = String(formData.get('password') ?? '');

		if (!email || !password) {
			setAuthMessage(messageBox, 'Имейлът и паролата са задължителни.', 'error');
			return;
		}

		setButtonLoading(submitButton, true, 'Влизане...', 'Вход');

		try {
			const { error } = await supabase.auth.signInWithPassword({ email, password });

			if (error) {
				setAuthMessage(messageBox, 'Неуспешен вход. Проверете данните и опитайте отново.', 'error');
				return;
			}

			setAuthMessage(messageBox, 'Успешен вход. Пренасочваме ви към профила...', 'success');
			window.location.assign('/profile.html');
		} catch {
			setAuthMessage(messageBox, 'Възникна грешка при вход. Моля, опитайте по-късно.', 'error');
		} finally {
			setButtonLoading(submitButton, false, 'Влизане...', 'Вход');
		}
	});
}

function initHomeRegisterModal() {
	const form = document.getElementById('homeRegisterForm');
	if (!form) {
		return;
	}

	const messageBox = document.getElementById('homeRegisterMessage');
	const submitButton = form.querySelector('button[type="submit"]');

	form.addEventListener('submit', async (event) => {
		event.preventDefault();
		setAuthMessage(messageBox, '');

		if (!form.checkValidity()) {
			form.reportValidity();
			setAuthMessage(messageBox, 'Моля, попълнете всички полета коректно.', 'error');
			return;
		}

		const formData = new FormData(form);
		const fullName = String(formData.get('full_name') ?? '').trim();
		const email = String(formData.get('email') ?? '').trim();
		const password = String(formData.get('password') ?? '');
		const passwordConfirm = String(formData.get('password_confirm') ?? '');

		if (!fullName || !email || !password || !passwordConfirm) {
			setAuthMessage(messageBox, 'Всички полета са задължителни.', 'error');
			return;
		}

		if (password !== passwordConfirm) {
			setAuthMessage(messageBox, 'Паролите не съвпадат.', 'error');
			return;
		}

		setButtonLoading(submitButton, true, 'Регистриране...', 'Регистрация');

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
				setAuthMessage(messageBox, 'Неуспешна регистрация. Моля, опитайте отново.', 'error');
				return;
			}

			const confirmationMessage =
				'Регистрацията е създадена успешно. Моля, проверете e-mail адреса си и потвърдете акаунта от получения линк.';

			if (data.session) {
				setAuthMessage(
					messageBox,
					`${confirmationMessage} Вече сте влезли в профила си и можете да продължите в платформата.`,
					'success',
				);
				return;
			}

			form.reset();
			setAuthMessage(messageBox, confirmationMessage, 'success');
		} catch {
			setAuthMessage(messageBox, 'Възникна грешка при регистрация. Моля, опитайте по-късно.', 'error');
		} finally {
			setButtonLoading(submitButton, false, 'Регистриране...', 'Регистрация');
		}
	});
}

initHomeLoginModal();
initHomeRegisterModal();
