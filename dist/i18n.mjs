export function normalizeLanguage(value) {
  return value === 'vi' || value === 'ko' ? value : 'en';
}

export function language() {
  return normalizeLanguage(globalThis.document?.documentElement.lang);
}

export function t(english, vietnamese, korean) {
  return {en: english, vi: vietnamese, ko: korean}[language()];
}

const serviceErrors = new Map([
  ['Ảnh đại diện không hợp lệ.', ['Choose a valid profile picture.', '올바른 프로필 사진을 선택해 주세요.']],
  ['Email hoặc mật khẩu không đúng.', ['The email address or password is incorrect.', '이메일 주소 또는 비밀번호가 올바르지 않습니다.']],
  ['Địa chỉ email không hợp lệ.', ['Enter a valid email address.', '올바른 이메일 주소를 입력해 주세요.']],
  ['Biệt danh hoặc mật khẩu không đúng.', ['The nickname or password is incorrect.', '닉네임 또는 비밀번호가 올바르지 않습니다.']],
  ['Biệt danh này đã được sử dụng.', ['This nickname is already taken.', '이미 사용 중인 닉네임입니다.']],
  ['Biệt danh này đã được sử dụng. Vui lòng chọn tên khác.', ['This nickname is already taken. Choose another one.', '이미 사용 중인 닉네임입니다. 다른 닉네임을 선택해 주세요.']],
  ['Biệt danh phải có 3–30 ký tự: chữ, số, dấu chấm, gạch ngang hoặc gạch dưới.', ['Use 3–30 letters, numbers, periods, hyphens, or underscores for your nickname.', '닉네임은 문자, 숫자, 마침표, 하이픈 또는 밑줄로 3~30자 이내로 입력해 주세요.']],
  ['Chưa cấu hình dịch vụ gửi email.', ['The email service is not configured.', '이메일 서비스가 설정되지 않았습니다.']],
  ['Đã thử đăng nhập quá nhiều lần. Vui lòng thử lại sau 15 phút.', ['Too many sign-in attempts. Try again in 15 minutes.', '로그인 시도 횟수를 초과했습니다. 15분 후에 다시 시도해 주세요.']],
  ['Không gửi được email. Vui lòng thử lại sau.', ['We could not send the email. Try again later.', '이메일을 보내지 못했습니다. 잠시 후 다시 시도해 주세요.']],
  ['Mã đã hết hạn hoặc không hợp lệ. Hãy yêu cầu mã mới.', ['The code has expired or is invalid. Request a new code.', '코드가 만료되었거나 올바르지 않습니다. 새 코드를 요청해 주세요.']],
  ['Mã xác nhận không đúng. Bạn có tối đa 5 lần thử.', ['The verification code is incorrect. You have up to five attempts.', '인증 코드가 올바르지 않습니다. 최대 5회까지 시도할 수 있습니다.']],
  ['Mật khẩu phải có 8–128 ký tự.', ['Use a password with 8–128 characters.', '비밀번호는 8~128자로 입력해 주세요.']],
  ['Tài khoản không tồn tại.', ['This account does not exist.', '계정이 존재하지 않습니다.']],
  ['Vui lòng đợi 60 giây trước khi yêu cầu mã mới hoặc thử lại sau một giờ.', ['Wait 60 seconds before requesting a new code. If you have reached the hourly limit, try again in an hour.', '새 코드를 요청하기 전에 60초를 기다려 주세요. 시간당 요청 한도에 도달했다면 한 시간 후에 다시 시도해 주세요.']],
  ['Vui lòng kiểm tra tên thật, giới tính, tuổi và số điện thoại.', ['Check your full name, gender, age, and phone number.', '실명, 성별, 나이, 전화번호를 확인해 주세요.']],
  ['Yêu cầu không hợp lệ.', ['This request is invalid.', '잘못된 요청입니다.']],
  ['Yêu cầu quá dài.', ['The request is too large.', '요청 데이터가 너무 큽니다.']],
  ['Dữ liệu không hợp lệ.', ['The data is invalid.', '데이터가 올바르지 않습니다.']],
  ['Không tìm thấy.', ['Not found.', '찾을 수 없습니다.']],
  ['Vui lòng đăng nhập.', ['Please sign in.', '로그인해 주세요.']],
  ['Vui lòng đăng nhập và xác minh email.', ['Sign in and verify your email address.', '로그인한 뒤 이메일 주소를 인증해 주세요.']],
  ['Vui lòng đăng nhập để thay đổi cài đặt.', ['Sign in to change your settings.', '설정을 변경하려면 로그인해 주세요.']],
  ['Thông tin hồ sơ hoặc ảnh không hợp lệ.', ['Your profile details or photo are invalid.', '프로필 정보 또는 사진이 올바르지 않습니다.']],
  ['Danh sách thông báo không hợp lệ.', ['The notification list is invalid.', '알림 목록이 올바르지 않습니다.']],
  ['Quá nhiều yêu cầu. Vui lòng thử lại sau.', ['Too many requests. Try again later.', '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.']],
  ['Dịch vụ gửi email chưa được cấu hình. Tài khoản chưa được tạo.', ['The email service is unavailable. Your account has not been created.', '이메일 서비스를 이용할 수 없어 계정이 생성되지 않았습니다.']],
  ['Dịch vụ tạm thời chưa sẵn sàng. Vui lòng thử lại.', ['The service is temporarily unavailable. Try again later.', '서비스를 일시적으로 이용할 수 없습니다. 잠시 후 다시 시도해 주세요.']],
  ['Vui lòng điền đầy đủ thông tin.', ['Complete all required fields.', '필수 항목을 모두 입력해 주세요.']],
  ['Số nợ phải từ 1.000 đến 1.000.000.000.000 ₫.', ['The debt amount must be between ₫1,000 and ₫1 trillion.', '부채 금액은 1,000동에서 1조 동 사이여야 합니다.']],
  ['Số cam kết phải lớn hơn 0 và không vượt phần còn lại.', ['Enter a pledge greater than zero and no more than the remaining amount.', '지원 약속 금액은 0보다 크고 남은 금액 이하여야 합니다.']],
  ['Vui lòng thêm từ 1 đến 20 khoản nợ.', ['Add between one and 20 debts.', '부채를 1개에서 20개까지 추가해 주세요.']],
  ['Vui lòng xác minh email trước khi gửi thẻ.', ['Verify your email before submitting a card.', '카드를 제출하기 전에 이메일을 인증해 주세요.']],
  ['Mã gửi thẻ không hợp lệ.', ['The card submission ID is invalid.', '카드 제출 ID가 올바르지 않습니다.']],
  ['Lựa chọn riêng tư không hợp lệ.', ['The privacy settings are invalid.', '개인정보 공개 설정이 올바르지 않습니다.']],
  ['Thẻ này đã gửi. Hãy tạo thẻ mới để gửi nội dung khác.', ['This card was already submitted. Create a new card to submit different details.', '이미 제출된 카드입니다. 다른 내용을 제출하려면 새 카드를 만들어 주세요.']],
  ['Bạn đang có 10 thẻ chờ duyệt. Vui lòng chờ admin xử lý.', ['You already have 10 cards awaiting review. Wait for an administrator to review them.', '검토 대기 중인 카드가 이미 10개 있습니다. 관리자의 검토를 기다려 주세요.']],
]);

const debtErrors = new Map([
  ['nhập tiêu đề từ 1–100 ký tự.', ['Enter a title with 1–100 characters.', '제목을 1~100자로 입력해 주세요.']],
  ['nhập câu chuyện từ 1–3.000 ký tự.', ['Enter a story with 1–3,000 characters.', '이야기를 1~3,000자로 입력해 주세요.']],
  ['nhập số tiền nợ nguyên dương, tối đa 1.000 tỷ VNĐ.', ['Enter a positive whole amount, up to ₫1 trillion.', '부채 금액은 1조 동 이하의 양의 정수로 입력해 주세요.']],
]);

export function translateError(message) {
  const translation = serviceErrors.get(message);
  if (translation) return t(translation[0], message, translation[1]);
  if (typeof message !== 'string' || language() === 'vi') return message;
  const blockedPrefix = 'Tài khoản đã bị chặn. ';
  if (message.startsWith(blockedPrefix)) {
    return t('This account has been blocked. ', blockedPrefix, '이 계정은 차단되었습니다. ') + message.slice(blockedPrefix.length);
  }
  const debt = /^Khoản nợ (\d+): (.+)$/.exec(message);
  if (debt) {
    const copy = debtErrors.get(debt[2]);
    if (copy) return t(`Debt ${debt[1]}: ${copy[0]}`, message, `부채 ${debt[1]}: ${copy[1]}`);
  }
  return message;
}
