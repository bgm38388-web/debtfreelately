import {t} from './i18n.mjs';
let link;
let check = 0;

export async function refreshAdminNavigation() {
  if (!link) {
    const footer = document.querySelector('.welcome-footer');
    if (!footer) return;
    link = document.createElement('a');
    link.href = '/admin';
    link.textContent = t("Admin","Quản trị","관리자");
    link.hidden = true;
    footer.insertBefore(link, footer.lastElementChild);
  }
  const currentCheck = ++check;
  link.hidden = true;

  try {
    const response = await fetch('/api/auth/me', {
      credentials: 'same-origin',
      cache: 'no-store',
    });
    if (!response.ok) return;

    const { user } = await response.json();
    if (currentCheck === check && user?.isAdmin === true) link.hidden = false;
  } catch {
    // Keep the link hidden when the session cannot be verified.
  }
}

window.addEventListener('pageshow', refreshAdminNavigation);
window.addEventListener('focus', refreshAdminNavigation);
void refreshAdminNavigation();
