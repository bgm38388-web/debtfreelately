import {authRequest} from './registration.mjs';

export function initWelcomeLogin(onLogin) {
  const form = document.querySelector('#welcome-login');
  const {email, code, password} = form.elements;
  const title = form.querySelector('h2');
  const codeField = form.querySelector('#welcome-code-field');
  const passwordField = form.querySelector('#welcome-password-field');
  const passwordLabel = passwordField.querySelector('label');
  const status = form.querySelector('#welcome-login-status');
  const error = form.querySelector('#welcome-login-error');
  const submit = form.querySelector('button[type="submit"]');
  const toggle = form.querySelector('#welcome-password-toggle');
  let mode = 'login';
  let challenge;

  function setMessage(element, message) {
    element.textContent = message;
    element.hidden = !message;
  }

  function show(next) {
    mode = next;
    const login = mode === 'login';
    const verify = mode === 'verify';
    title.textContent = login ? 'Đã có tài khoản?' : 'Tạo hoặc đặt lại mật khẩu';
    submit.textContent = {login: 'Đăng nhập', request: 'Gửi mã xác nhận', verify: 'Lưu mật khẩu và đăng nhập'}[mode];
    toggle.textContent = login ? 'Tạo hoặc đặt lại mật khẩu' : 'Quay lại đăng nhập';
    email.readOnly = verify;
    codeField.hidden = code.disabled = !verify;
    code.required = verify;
    passwordField.hidden = password.disabled = mode === 'request';
    password.required = !password.disabled;
    password.autocomplete = login ? 'current-password' : 'new-password';
    password.minLength = verify ? 8 : 0;
    passwordLabel.textContent = verify ? 'Mật khẩu mới (ít nhất 8 ký tự)' : 'Mật khẩu';
    code.value = password.value = '';
    setMessage(error, '');
    setMessage(status, verify ? 'Nếu email đã đăng ký, bạn sẽ nhận được mã xác nhận có hiệu lực trong 10 phút.' : '');
  }

  toggle.addEventListener('click', () => {
    challenge = undefined;
    show(mode === 'login' ? 'request' : 'login');
    email.focus();
  });

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (submit.disabled) return;
    submit.disabled = toggle.disabled = true;
    setMessage(error, '');
    try {
      if (mode === 'request') {
        const address = email.value;
        challenge = await authRequest('request-code', {email: address, purpose: 'password'});
        email.value = address;
        show('verify');
        code.focus();
        return;
      }
      const {user} = mode === 'verify'
        ? await authRequest('verify-code', {id: challenge.id, code: code.value, password: password.value})
        : await authRequest('email-login', {email: email.value, password: password.value});
      challenge = undefined;
      form.reset();
      show('login');
      if (document.body.classList.contains('onboarding')) onLogin(user);
    } catch (failure) {
      setMessage(error, failure.message);
    } finally {
      submit.disabled = toggle.disabled = false;
    }
  });
}
