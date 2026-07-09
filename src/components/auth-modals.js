import { Modal } from 'bootstrap';

const AUTH_MODAL_IDS = {
  login: 'loginModal',
  register: 'registerModal',
};

function getModalElement(name) {
  return document.getElementById(AUTH_MODAL_IDS[name]);
}

function getModalInstance(name) {
  const element = getModalElement(name);

  if (!element) {
    return null;
  }

  return Modal.getOrCreateInstance(element);
}

function showModal(name) {
  const instance = getModalInstance(name);

  if (!instance) {
    return;
  }

  instance.show();
}

function hideCurrentModalAndShow(nextName) {
  const openModalElement = document.querySelector('.modal.show');

  if (!openModalElement) {
    showModal(nextName);
    return;
  }

  const currentInstance = Modal.getOrCreateInstance(openModalElement);

  if (!currentInstance) {
    showModal(nextName);
    return;
  }

  openModalElement.addEventListener(
    'hidden.bs.modal',
    () => {
      showModal(nextName);
    },
    { once: true },
  );

  currentInstance.hide();
}

function setFeedback(form, message, variant = 'info') {
  const feedback = form.closest('.modal-body')?.querySelector('[data-auth-feedback]');

  if (!feedback) {
    return;
  }

  feedback.className = `alert alert-${variant} mt-3 mb-0`;
  feedback.textContent = message;
  feedback.hidden = false;
}

function clearFeedback(form) {
  const feedback = form.closest('.modal-body')?.querySelector('[data-auth-feedback]');

  if (!feedback) {
    return;
  }

  feedback.className = 'alert mt-3 mb-0 d-none';
  feedback.textContent = '';
  feedback.hidden = true;
}

function updatePasswordMatchState(form) {
  const passwordField = form.querySelector('[name="registerPassword"]');
  const confirmPasswordField = form.querySelector('[name="confirmPassword"]');

  if (!passwordField || !confirmPasswordField) {
    return;
  }

  if (confirmPasswordField.value && passwordField.value !== confirmPasswordField.value) {
    confirmPasswordField.setCustomValidity('Паролите не съвпадат.');
  } else {
    confirmPasswordField.setCustomValidity('');
  }
}

function initLoginForm(form) {
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    event.stopPropagation();

    clearFeedback(form);
    form.classList.add('was-validated');

    if (!form.checkValidity()) {
      return;
    }

    setFeedback(form, 'Този входен формуляр все още не е свързан със Supabase Auth.', 'success');
  });
}

function initRegisterForm(form) {
  const passwordField = form.querySelector('[name="registerPassword"]');
  const confirmPasswordField = form.querySelector('[name="confirmPassword"]');

  if (passwordField && confirmPasswordField) {
    const syncValidation = () => {
      updatePasswordMatchState(form);
      if (confirmPasswordField.value) {
        confirmPasswordField.reportValidity();
      }
    };

    passwordField.addEventListener('input', syncValidation);
    confirmPasswordField.addEventListener('input', syncValidation);
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    event.stopPropagation();

    clearFeedback(form);
    updatePasswordMatchState(form);
    form.classList.add('was-validated');

    if (!form.checkValidity()) {
      return;
    }

    setFeedback(form, 'Регистрацията все още е само визуална структура без реална автентикация.', 'success');
  });
}

function initModalSwitches(scope) {
  scope.querySelectorAll('[data-auth-modal-open]').forEach((trigger) => {
    trigger.addEventListener('click', () => {
      showModal(trigger.dataset.authModalOpen);
    });
  });

  scope.querySelectorAll('[data-auth-modal-switch]').forEach((trigger) => {
    trigger.addEventListener('click', () => {
      hideCurrentModalAndShow(trigger.dataset.authModalSwitch);
    });
  });
}

function initForms(scope) {
  const loginForm = scope.querySelector('[data-auth-form="login"]');
  const registerForm = scope.querySelector('[data-auth-form="register"]');

  if (loginForm) {
    initLoginForm(loginForm);
  }

  if (registerForm) {
    initRegisterForm(registerForm);
  }
}

export function renderAuthModals(container) {
  container.innerHTML = `
    <div class="modal fade auth-modal" id="${AUTH_MODAL_IDS.login}" tabindex="-1" aria-labelledby="loginModalLabel" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content border-0 shadow-lg">
          <div class="modal-header border-0 pb-0">
            <div>
              <p class="text-uppercase text-success fw-semibold small mb-1">Вход</p>
              <h2 class="modal-title h5 mb-0" id="loginModalLabel">Влез в профила си</h2>
            </div>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Затвори"></button>
          </div>
          <div class="modal-body pt-3">
            <p class="text-muted mb-3">Използвай имейла и паролата си, за да продължиш.</p>
            <div class="alert alert-info d-none" data-auth-feedback="login" hidden role="alert"></div>
            <form class="needs-validation" novalidate data-auth-form="login">
              <div class="mb-3">
                <label for="loginEmail" class="form-label">Имейл</label>
                <div class="input-group">
                  <span class="input-group-text"><i class="bi bi-envelope"></i></span>
                  <input id="loginEmail" name="email" type="email" class="form-control" placeholder="name@example.com" autocomplete="email" required />
                  <div class="invalid-feedback">Моля, въведи валиден имейл.</div>
                </div>
              </div>
              <div class="mb-3">
                <label for="loginPassword" class="form-label">Парола</label>
                <div class="input-group">
                  <span class="input-group-text"><i class="bi bi-lock"></i></span>
                  <input id="loginPassword" name="password" type="password" class="form-control" placeholder="••••••••" autocomplete="current-password" minlength="6" required />
                  <div class="invalid-feedback">Паролата трябва да е поне 6 символа.</div>
                </div>
              </div>
              <button type="submit" class="btn btn-success w-100">
                <i class="bi bi-box-arrow-in-right me-2"></i>Вход
              </button>
            </form>
            <div class="text-center mt-3">
              <button type="button" class="btn btn-link auth-switch-link p-0" data-auth-modal-switch="register">Нямаш профил? Регистрирай се</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="modal fade auth-modal" id="${AUTH_MODAL_IDS.register}" tabindex="-1" aria-labelledby="registerModalLabel" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content border-0 shadow-lg">
          <div class="modal-header border-0 pb-0">
            <div>
              <p class="text-uppercase text-success fw-semibold small mb-1">Регистрация</p>
              <h2 class="modal-title h5 mb-0" id="registerModalLabel">Създай нов профил</h2>
            </div>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Затвори"></button>
          </div>
          <div class="modal-body pt-3">
            <p class="text-muted mb-3">Добави данните си, за да подготвиш профила си за CampAtlas.</p>
            <div class="alert alert-info d-none" data-auth-feedback="register" hidden role="alert"></div>
            <form class="needs-validation" novalidate data-auth-form="register">
              <div class="mb-3">
                <label for="registerDisplayName" class="form-label">Показвано име</label>
                <div class="input-group">
                  <span class="input-group-text"><i class="bi bi-person"></i></span>
                  <input id="registerDisplayName" name="displayName" type="text" class="form-control" placeholder="Твоето име" autocomplete="name" minlength="2" required />
                  <div class="invalid-feedback">Моля, въведи показвано име.</div>
                </div>
              </div>
              <div class="mb-3">
                <label for="registerEmail" class="form-label">Имейл</label>
                <div class="input-group">
                  <span class="input-group-text"><i class="bi bi-envelope"></i></span>
                  <input id="registerEmail" name="email" type="email" class="form-control" placeholder="name@example.com" autocomplete="email" required />
                  <div class="invalid-feedback">Моля, въведи валиден имейл.</div>
                </div>
              </div>
              <div class="mb-3">
                <label for="registerPassword" class="form-label">Парола</label>
                <div class="input-group">
                  <span class="input-group-text"><i class="bi bi-lock"></i></span>
                  <input id="registerPassword" name="registerPassword" type="password" class="form-control" placeholder="••••••••" autocomplete="new-password" minlength="6" required />
                  <div class="invalid-feedback">Паролата трябва да е поне 6 символа.</div>
                </div>
              </div>
              <div class="mb-3">
                <label for="confirmPassword" class="form-label">Потвърди парола</label>
                <div class="input-group">
                  <span class="input-group-text"><i class="bi bi-shield-lock"></i></span>
                  <input id="confirmPassword" name="confirmPassword" type="password" class="form-control" placeholder="••••••••" autocomplete="new-password" minlength="6" required />
                  <div class="invalid-feedback">Паролите трябва да съвпадат.</div>
                </div>
              </div>
              <button type="submit" class="btn btn-success w-100">
                <i class="bi bi-person-plus me-2"></i>Регистрация
              </button>
            </form>
            <div class="text-center mt-3">
              <button type="button" class="btn btn-link auth-switch-link p-0" data-auth-modal-switch="login">Имаш профил? Влез тук</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function initAuthModals() {
  const container = document.getElementById('auth-modals-root');

  if (!container) {
    return;
  }

  renderAuthModals(container);
  initModalSwitches(container);
  initForms(container);
}