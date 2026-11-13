import {t} from './i18n.mjs';

const mobile = matchMedia('(width < 768px)');
const welcome = document.querySelector('#welcome');
const top = welcome.querySelector('.welcome-top');
const nav = top.querySelector('.welcome-nav');
const actions = top.querySelector('.welcome-actions');
const help = actions.querySelector('a');
const login = actions.querySelector('#welcome-login-button');
const rolePanel = welcome.querySelector('.welcome-panel');
const title = document.querySelector('#welcome-title');
const hint = document.querySelector('#welcome .welcome-hint');

const toggle = document.createElement('button');
toggle.type = 'button';
toggle.className = 'welcome-mobile-toggle';
toggle.setAttribute('aria-label', t('Menu', 'Menu', '메뉴'));
toggle.setAttribute('aria-controls', 'welcome-mobile-menu');
toggle.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg>';

const menu = document.createElement('div');
menu.id = 'welcome-mobile-menu';

const lead = document.createElement('div');
lead.className = 'welcome-mobile-lead';

const purpose = document.createElement('p');
purpose.className = 'welcome-mobile-purpose';
purpose.textContent = t(
  'Create a debt card, share your story on your terms, and connect with people who can help.',
  'Tạo thẻ nợ, chia sẻ câu chuyện theo cách của bạn và kết nối với những người có thể giúp đỡ.',
  '채무 카드를 만들고 원하는 방식으로 이야기를 공유하며 도움을 줄 수 있는 사람들과 연결되세요.',
);

const calls = document.createElement('div');
calls.className = 'welcome-mobile-ctas';
const start = document.createElement('button');
start.type = 'button';
start.textContent = t('Sign up for FREE', 'Đăng ký miễn phí', '무료 가입');
start.addEventListener('click', () => {
  rolePanel.querySelector('.role-card').focus({preventScroll: true});
  rolePanel.scrollIntoView({block: 'start'});
});
const sample = document.createElement('a');
sample.href = '/demo-card-preview';
sample.textContent = t('Try a Sample Card', 'Thử thẻ mẫu', '샘플 카드 체험');
calls.append(start, sample);

function setMenu(open) {
  toggle.setAttribute('aria-expanded', String(open));
  menu.inert = !open;
  menu.classList.toggle('is-open', open);
}

toggle.addEventListener('click', () => setMenu(menu.inert));
menu.addEventListener('click', event => {
  if (event.target.closest('a')) setMenu(false);
});
login.addEventListener('click', () => {
  if (mobile.matches) setMenu(false);
});
document.addEventListener('click', event => {
  if (mobile.matches && !top.contains(event.target)) setMenu(false);
});
document.addEventListener('keydown', event => {
  if (event.key !== 'Escape' || !mobile.matches || menu.inert) return;
  setMenu(false);
  toggle.focus();
});

function syncLayout() {
  if (mobile.matches) {
    setMenu(false);
    top.append(toggle, menu);
    menu.append(nav);
    nav.append(help, login);
    title.before(lead);
    lead.append(title, hint, purpose, calls);
    welcome.classList.add('welcome-mobile');
  } else if (menu.isConnected) {
    welcome.classList.remove('welcome-mobile');
    top.insertBefore(nav, actions);
    actions.querySelector('#welcome-language').after(help, login);
    toggle.remove();
    menu.remove();
    purpose.remove();
    calls.remove();
    lead.replaceWith(...lead.childNodes);
  }
}

mobile.addEventListener('change', syncLayout);
syncLayout();
