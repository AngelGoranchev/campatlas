import { supabase } from '../services/supabaseClient.js';

function isMissingAuthSessionError(error) {
  const message = String(error?.message || '').toLowerCase();
  const name = String(error?.name || '').toLowerCase();

  return (
    name.includes('authsessionmissing')
    || message.includes('auth session missing')
    || message.includes('session missing')
    || message.includes('missing session')
  );
}

export async function getLoggedInUser() {
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    if (isMissingAuthSessionError(error)) {
      return null;
    }

    throw new Error(error.message || 'Неуспешно зареждане на текущия потребител.');
  }

  return data.user ?? null;
}

export async function requireAuth(redirectTo = '/login.html') {
  const user = await getLoggedInUser();

  if (!user) {
    window.location.replace(redirectTo);
    return null;
  }

  return user;
}

export async function redirectIfAuthenticated(redirectTo = '/campsites.html') {
  const user = await getLoggedInUser();

  if (user) {
    window.location.replace(redirectTo);
    return true;
  }

  return false;
}

export function initLogoutHandlers(selector = '[data-auth-logout]') {
  const triggers = document.querySelectorAll(selector);

  triggers.forEach((trigger) => {
    trigger.addEventListener('click', async (event) => {
      event.preventDefault();

      const button = event.currentTarget;
      const originalDisabledState = button.disabled;

      button.disabled = true;

      try {
        const { error } = await supabase.auth.signOut();

        if (error) {
          throw error;
        }

        window.location.replace('/index.html');
      } catch (error) {
        window.alert(error.message || 'Неуспешен изход от профила. Моля, опитайте отново.');
      } finally {
        button.disabled = originalDisabledState;
      }
    });
  });
}
