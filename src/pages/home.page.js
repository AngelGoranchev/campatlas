import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import '../styles/app.css';
import { initAuthModals } from '../components/auth-modals.js';

initAuthModals();


function cleanupModalBackdrops() {
  const hasOpenModal = document.querySelector('.modal.show');

  if (hasOpenModal) {
    return;
  }

  document.querySelectorAll('.modal-backdrop').forEach((backdrop) => {
    backdrop.remove();
  });

  document.body.classList.remove('modal-open');
  document.body.style.removeProperty('overflow');
  document.body.style.removeProperty('padding-right');
}

document.addEventListener('hidden.bs.modal', () => {
  window.setTimeout(cleanupModalBackdrops, 200);
});
