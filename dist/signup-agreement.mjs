import {t} from './i18n.mjs';

export function signupAgreement() {
  const terms = '<a href="/terms.html" target="_blank" rel="noopener">' +
    t('Terms &amp; Conditions', 'Điều khoản sử dụng', '이용약관') + '</a>';
  const privacy = '<a href="/privacy.html#privacy-policy" target="_blank" rel="noopener">' +
    t('Privacy Policy', 'Chính sách quyền riêng tư', '개인정보 처리방침') + '</a>';
  return `<label class="signup-agreement">
    <input type="checkbox" name="acceptedPolicies" value="yes" required>
    <span>${t(
      `I agree to the ${terms} and acknowledge the ${privacy}.`,
      `Tôi đồng ý với ${terms} và xác nhận đã đọc ${privacy}.`,
      `${terms}에 동의하며 ${privacy}을 확인했습니다.`
    )}</span>
  </label>`;
}

export function bindSignupAgreement(form, isAvailable = () => true) {
  const checkbox = form.elements.acceptedPolicies;
  const submit = form.querySelector('.registration-submit');
  const refresh = () => {
    submit.disabled = !isAvailable() || form.getAttribute('aria-busy') === 'true' ||
      (checkbox && !checkbox.checked);
  };
  form.addEventListener('change', refresh);
  refresh();
  return refresh;
}
