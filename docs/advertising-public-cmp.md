# Thiết lập CMP cho hostname công khai

Bản phát hành này không tự cài CMP. Quảng cáo trực tiếp không cần tích hợp Google. Tùy chọn “consentConfigured” chỉ ghi nhận công việc cấu hình bên ngoài, không tạo CMP và không cấp sự đồng ý thay người dùng. Google giữ tắt cho đến khi hostname công khai, tài khoản/website, publisher, ad unit và CMP thực tế đã được cấu hình.

Client hiện chỉ chấp nhận Google LLC CMP, IAB CMP ID 300. Chủ tài khoản cần cấu hình và xuất bản thông báo European regulations trong Google AdSense Privacy & messaging cho đúng hostname công khai, rồi triển khai CMP trên hostname đó bằng một thay đổi mã đã được xem xét. Không dán HTML, JavaScript hoặc URL script tùy ý vào dashboard. Bản phát hành này không chứa tag CMP độc lập được Google xác nhận; không nên bật Google trước khi bước triển khai đó hoàn tất. Thông báo Google thường dựa vào tag AdSense/GPT để tự triển khai; cơ chế đó không thể dùng làm bootstrap ở đây vì chính sách của ứng dụng chặn tag quảng cáo cho đến khi đã có sự đồng ý. Vì vậy cần giải quyết bootstrap CMP độc lập trước khi kích hoạt.

Kiểm tra trên hostname công khai trong phiên trình duyệt sạch: CMP phải cung cấp __tcfapi, cmpStatus loaded, cmpId 300, TC string hợp lệ, event tcloaded/useractioncomplete, đồng ý purpose 1 và vendor 755. Client chờ CMP được khởi tạo muộn và lắng nghe thay đổi quyết định, không giới hạn 3 giây. Không có tín hiệu thì không tải script quảng cáo. Kiểm tra việc từ chối ban đầu không tạo request adsbygoogle; đồng ý sau đó chỉ tải trên hostname công khai; rút lại đồng ý gỡ vùng quảng cáo và reload document để loại bỏ mã Google đang chạy.

Chuyển trang nội dung bằng hash gỡ unit cũ và chỉ yêu cầu unit trang mới khi vẫn có đồng ý. Không dùng timer để refresh unit Google. Quảng cáo Google không xuất hiện trong iframe preview, app canonical, Khám phá hoặc Cộng đồng. Cookie đăng nhập phải giữ host-only; public API không được chấp nhận cookie dùng chung Domain.

Nguồn chính thức đã kiểm tra ngày 2026-11-05:

- [Google Privacy & Messaging JavaScript API](https://developers.google.com/funding-choices/fc-api-docs): cách triển khai thông báo, TCF, và callback bất đồng bộ.
- [Google AdSense European regulations messages](https://support.google.com/adsense/answer/10961068): cấu hình và xuất bản thông báo.
- [IAB Global CMP List](https://cmplist.consensu.org/v2/cmp-list.json): ID 300 là Google LLC.
