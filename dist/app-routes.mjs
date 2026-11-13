export const appPaths = {
  home: '/',
  guide: '/how-it-works',
  demo: '/demo-card-preview',
  login: '/login',
  broke: '/sign-up-broke',
  bros: '/sign-up-bros',
  brosEmail: '/sign-up-bros-email',
  brosNickname: '/sign-up-bros-nickname',
  brosLogin: '/login-bros',
  discover: '/discover',
  saved: '/saved',
  pledges: '/pledges',
  mine: '/my-posts',
  profile: '/profile',
  debts: '/my-debts',
  messages: '/messages',
  wizard: '/create-card',
};

const legacyHashes = {'#how-it-works': 'guide', '#demo-card-preview': 'demo'};

export function currentAppRoute(url) {
  return legacyHashes[url.hash] || Object.keys(appPaths).find(route => appPaths[route] === url.pathname);
}

export function initAppRouter({getScreen, showScreen, restoreHome}) {
  let applying = false;
  let pendingLocation = false;
  const account = document.querySelector('.welcome-account');

  function writeRoute(route, replace = false) {
    if (location.pathname === appPaths[route] && !location.hash) return;
    const url = appPaths[route] + location.search;
    if (replace) history.replaceState(history.state, '', url);
    else history.pushState(null, '', url);
  }

  function syncFromScreen() {
    if (!applying) writeRoute(getScreen());
  }

  async function syncFromLocation(initial = false) {
    if (applying) {
      pendingLocation = true;
      return;
    }
    applying = true;
    try {
      const route = currentAppRoute(location) || 'home';
      if (initial && route === 'home') await restoreHome();
      else await showScreen(route);
      if (!pendingLocation) writeRoute(getScreen(), true);
    } finally {
      applying = false;
      if (pendingLocation) {
        pendingLocation = false;
        void syncFromLocation();
      }
    }
  }

  const observer = new MutationObserver(syncFromScreen);
  observer.observe(document.body, {attributes: true, attributeFilter: ['class', 'data-ad-view', 'data-registration-role', 'data-bros-screen', 'data-guide-open']});
  observer.observe(account, {attributes: true, attributeFilter: ['open']});
  window.addEventListener('popstate', () => void syncFromLocation());
  window.addEventListener('hashchange', () => {
    if (currentAppRoute(location) !== getScreen()) void syncFromLocation();
  });
  document.addEventListener('click', event => {
    const link = event.target.closest('a[href]');
    if (!link || link.target || link.hasAttribute('download') || event.defaultPrevented ||
      event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const target = new URL(link.href);
    const route = link.matches('.hiw-home') ? 'home' : currentAppRoute(target);
    if (target.origin !== location.origin || !route || (route === 'home' && !link.matches('.hiw-home'))) return;
    event.preventDefault();
    writeRoute(route);
    void syncFromLocation();
  });
  void syncFromLocation(true);
}
