import {normalizeLanguage, t} from './i18n.mjs';

const preferenceKey = 'debtfreelately-language';
const url = new URL(location.href);
const isolatedPublicPage = document.body.hasAttribute('data-public-language');
let preference = url.searchParams.get('lang');
if (!isolatedPublicPage) {
  try {
    if (['en', 'vi', 'ko'].includes(preference)) localStorage.setItem(preferenceKey, preference);
    else preference = localStorage.getItem(preferenceKey);
  } catch {
    // The URL still allows changing the current page when storage is unavailable.
  }
}

const locale = normalizeLanguage(preference);
document.documentElement.lang = locale;

if (locale !== 'en') {
  const prefix = 'data-i18n-' + locale;
  for (const element of document.querySelectorAll('*')) {
    for (const name of element.getAttributeNames()) {
      if (name === prefix) element.textContent = element.getAttribute(name);
      if (name.startsWith(prefix + '-')) {
        element.setAttribute(name.slice(prefix.length + 1), element.getAttribute(name));
      }
    }
  }
}

if (isolatedPublicPage) {
  const publicPaths = new Set(['/', '/index.html', '/public.html', '/about.html', '/privacy.html', '/community-safety.html', '/transparency.html']);
  for (const link of document.querySelectorAll('a[href]')) {
    if (link.origin !== location.origin || link.pathname === location.pathname || !publicPaths.has(link.pathname)) continue;
    const target = new URL(link.href);
    target.searchParams.set('lang', locale);
    link.href = target;
  }
}

if (window.top === window.self) {
  const select = document.createElement('select');
  select.className = 'app-language-picker';
  select.setAttribute('aria-label', t('Language', 'Ngôn ngữ', '언어'));
  for (const [value, label] of [['en', 'English'], ['vi', 'Tiếng Việt'], ['ko', '한국어']]) {
    const option = new Option(label, value, false, value === locale);
    option.lang = value;
    select.add(option);
  }
  select.addEventListener('change', () => {
    url.searchParams.set('lang', select.value);
    if (!isolatedPublicPage) {
      try {
        localStorage.setItem(preferenceKey, select.value);
        url.searchParams.delete('lang');
      } catch {
        // Keep the selection in the URL.
      }
    }
    if (url.href === location.href) location.reload();
    else location.assign(url);
  });
  document.body.prepend(select);
}
