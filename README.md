# Debtfreelately

Web app tiếng Việt, HTML/CSS/JavaScript, Node.js 24 và SQLite/Turso.

Chạy `npm install`, `npm start` rồi mở http://127.0.0.1:4173. Kiểm tra: `npm test`.

Bros: khám phá, tìm kiếm, lọc, quẹt trái/phải, hoàn tác lần bỏ qua gần nhất, lưu hồ sơ, xem chi tiết, tạo/hủy cam kết. Broke: tạo, sửa, xóa bài đăng. Dữ liệu lưu trong localStorage của trình duyệt theo origin; không có đồng bộ nhiều thiết bị hoặc người dùng. Bài riêng chỉ hiện trong Bài đăng của tôi. Bộ hồ sơ mẫu minh họa luồng Bros.

Đăng nhập, hồ sơ tài khoản, thông báo, chặn tài khoản và duyệt thẻ dùng API máy chủ. Chỉ thẻ đã duyệt với các trường được cho phép công khai mới xuất hiện trên feed. Chưa có xác minh giấy tờ hoặc thanh toán; cam kết không phải tiền đã trả. Tin nhắn, bài nháp và cam kết minh họa vẫn lưu trên thiết bị.

Vercel phục vụ `dist/` và API Node tại `api/index.js`; Turso lưu dữ liệu lâu dài. Đọc [AUTH-SETUP.md](AUTH-SETUP.md) để cấu hình email, chủ sở hữu và triển khai. Không commit `.env`, `.env.local` hoặc `.runtime/`.
