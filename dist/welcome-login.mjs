import {t} from './i18n.mjs';
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
    title.textContent = {login: t("Already have an account?", "Đã có tài khoản?", "이미 계정이 있으신가요?"), request: t("Forgot your password?", "Quên mật khẩu?", "비밀번호를 잊으셨나요?"), verify: t("Set a new password", "Đặt mật khẩu mới", "새 비밀번호 설정")}[mode];
    submit.textContent = {login: t("Sign in", "Đăng nhập", "로그인"), request: t("Send code by email", "Gửi mã qua email", "이메일로 코드 보내기"), verify: t("Save password and sign in", "Lưu mật khẩu và đăng nhập", "비밀번호를 저장하고 로그인")}[mode];
    toggle.textContent = login ? t("Forgot your password?", "Quên mật khẩu?", "비밀번호를 잊으셨나요?") : t("Back to sign-in", "Quay lại đăng nhập", "로그인으로 돌아가기");
    email.readOnly = verify;
    codeField.hidden = code.disabled = !verify;
    code.required = verify;
    passwordField.hidden = password.disabled = mode === 'request';
    password.required = !password.disabled;
    password.autocomplete = login ? 'current-password' : 'new-password';
    password.minLength = verify ? 8 : 0;
    passwordLabel.textContent = verify ? t("New password (at least 8 characters)", "Mật khẩu mới (ít nhất 8 ký tự)", "새 비밀번호 (8자 이상)") : t("Password", "Mật khẩu", "비밀번호");
    code.value = password.value = '';
    setMessage(error, '');
    setMessage(status, {
      login: '',
      request: t("Enter your registered email address to receive a verification code.", "Nhập email đã đăng ký để nhận mã xác nhận.", "등록한 이메일 주소를 입력하여 인증 코드를 받으세요."),
      verify: t("If this address is registered, check your inbox and enter the six-digit code within 10 minutes.", "Nếu email đã đăng ký, hãy kiểm tra hộp thư và nhập mã 6 chữ số trong vòng 10 phút.", "등록된 이메일 주소라면 받은편지함을 확인하고 10분 안에 6자리 코드를 입력해 주세요."),
    }[mode]);
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
      form.closest('details').open = false;
      if (document.body.classList.contains('onboarding')) onLogin(user);
    } catch (failure) {
      setMessage(error, failure.message);
    } finally {
      submit.disabled = toggle.disabled = false;
    }
  });
}
