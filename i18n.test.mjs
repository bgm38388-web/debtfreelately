import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
import {normalizeLanguage, t, translateError} from './dist/i18n.mjs';

test('English is the default and unsupported preferences fall back to English', () => {
  assert.equal(normalizeLanguage(null), 'en');
  assert.equal(normalizeLanguage('fr'), 'en');
  assert.equal(t('Sign in', 'Đăng nhập', '로그인'), 'Sign in');
});

test('each entry point loads the language preference before application code', async () => {
  for (const name of ['index', 'public', 'admin', 'my-cards', 'ads-preview', 'about', 'privacy', 'community-safety', 'transparency']) {
    const html = await readFile(new URL(`./dist/${name}.html`, import.meta.url), 'utf8');
    assert.match(html, /<html lang="en"/);
    assert.equal(html.match(/<script type="module" src="([^"]+)"/)?.[1], '/language-picker.mjs', name);
  }
});

test('known service errors are translated and unknown messages are preserved', () => {
  assert.equal(translateError('Email hoặc mật khẩu không đúng.'), 'The email address or password is incorrect.');
  assert.equal(translateError('Custom message'), 'Custom message');
});

test('localized validation preserves debt numbers and user-provided reasons', t => {
  globalThis.document = {documentElement: {lang: 'ko'}};
  t.after(() => { delete globalThis.document; });
  assert.equal(translateError('Khoản nợ 3: nhập câu chuyện từ 1–3.000 ký tự.'), '부채 3: 이야기를 1~3,000자로 입력해 주세요.');
  assert.equal(translateError('Bạn đang có 10 thẻ chờ duyệt. Vui lòng chờ admin xử lý.'), '검토 대기 중인 카드가 이미 10개 있습니다. 관리자의 검토를 기다려 주세요.');
  assert.equal(translateError('Tài khoản đã bị chặn. Nội dung gốc.'), '이 계정은 차단되었습니다. Nội dung gốc.');
  document.documentElement.lang = 'vi';
  assert.equal(translateError('Khoản nợ 3: nhập câu chuyện từ 1–3.000 ký tự.'), 'Khoản nợ 3: nhập câu chuyện từ 1–3.000 ký tự.');
});
