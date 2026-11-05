# Hệ thống quản lý quảng cáo DebtFreeLately

## Mục tiêu

Admin tải banner, nhập liên kết, chọn vị trí trên trang thực, đặt lịch và xuất bản ngay từ dashboard. Có thể sửa, tạm dừng, thay banner, đổi vị trí hoặc gỡ mà không sửa mã hay deploy lại. Giao diện, thông báo lỗi, biểu mẫu và báo cáo mới dùng tiếng Việt; giữ nền kem, màu olive và bố cục hiện tại.

## Nền tảng hiện có và điểm tích hợp

- Frontend: các ES module trong `dist/`; không đưa framework mới vào app.
- Dashboard: `dist/admin.html`, `dist/management.mjs`, `dist/moderation.css`; thêm mục **Quảng cáo** bên cạnh các công cụ quản trị hiện có.
- Backend: `server.mjs` và `api/index.js` trên Vercel Node.js 24; tiếp tục dùng session cookie HttpOnly và quyền admin từ `moderation.isAdmin()`.
- Dữ liệu: Turso, truy cập qua `database.mjs`; migration bổ sung bảng, không thay hoặc xóa các bảng hiện tại.
- Runtime: `runtime.mjs` khởi tạo dịch vụ quảng cáo cùng auth và moderation.

## Cách triển khai được đề xuất

Giữ nguyên frontend/API/Turso; lưu thông tin chiến dịch, cấu hình và sự kiện trong Turso. Banner gốc và các bản WebP đã tối ưu được lưu trong **Vercel Blob private** cùng project. API chỉ công khai ảnh của quảng cáo đủ điều kiện hoặc trả preview cho admin đã xác thực.

Các phương án đã cân nhắc: lưu ảnh trực tiếp trong Turso đơn giản hơn nhưng tăng dung lượng và tải truy vấn database; dùng một dịch vụ quảng cáo bên ngoài làm thay đổi hệ quản trị và khó kiểm soát dữ liệu. Chọn Turso + Blob vì giữ stack hiện tại và tách dữ liệu nghiệp vụ khỏi tệp ảnh.

Vercel Blob có hạn mức và chi phí theo tài khoản. Không tự nâng gói trả phí. Nếu không thể tạo kho private trong tài khoản hiện tại, báo chính xác bước bị chặn trước khi thay phương án lưu trữ.

## Dashboard bằng tiếng Việt

Các mục: **Tổng quan**, **Quản lý quảng cáo**, **Thêm quảng cáo**, **Vị trí hiển thị**, **Google AdSense**, **Thống kê & doanh thu**, **Cài đặt quảng cáo**. Có đường quay lại dashboard duyệt thẻ và đăng xuất hiện tại.

Tổng quan hiển thị chiến dịch đang chạy/chờ lịch/tạm dừng/hết hạn, số quảng cáo hoạt động, lượt hiển thị được ghi nhận, lượt nhấp hợp lệ, CTR và doanh thu trực tiếp đã nhập. Dữ liệu rỗng hiển thị 0 hoặc “Chưa có dữ liệu”; số liệu Google chưa kết nối hiển thị “Chưa kết nối”, không suy đoán bằng 0.

## Chiến dịch, banner và doanh thu

Biểu mẫu có tên quảng cáo, nhà quảng cáo/doanh nghiệp, banner, URL đích, vị trí, thiết bị, ngày giờ bắt đầu/kết thúc, ưu tiên, nguồn (trực tiếp/AdSense), trạng thái, giới hạn lượt hiển thị và giới hạn tần suất. Trường phụ: văn bản thay thế, ghi chú hợp đồng và doanh thu đã nhận.

Các hành động: **Lưu nháp**, **Xem trước**, **Xuất bản**, **Tạm dừng**, **Tiếp tục**, **Chỉnh sửa**, **Xóa**. AdSense dùng mã publisher/ad unit thay ảnh/URL trực tiếp. “Xóa” lưu tombstone để báo cáo và nhật ký cũ không mất; quảng cáo bị xóa không còn được phân phối. Tệp không còn tham chiếu có thể dọn sau thời hạn lưu trữ.

Chiến dịch đang live được chỉnh trên revision nháp; chỉ **Xuất bản** mới thay snapshot đang chạy. Pause/resume/xóa là hành động riêng có hiệu lực tức thời ở server. Thời gian chạy dùng khoảng [start, end), lưu UTC và hiển thị Australia/Sydney; ngày kết thúc phải sau bắt đầu.

Doanh thu trực tiếp là khoản thu thực tế do admin ghi nhận theo ngày, chiến dịch, số tiền VND và ghi chú; không tự quy đổi lượt nhấp thành tiền. Báo cáo phân biệt tiền đã nhận với giá trị hợp đồng nếu nhập cả hai. Hủy một bút toán bằng bút toán điều chỉnh có audit; không ghi đè lịch sử.

Upload tối đa 2 MB, JPG/PNG/WebP; kiểm tra magic bytes và giải mã ảnh, không tin đuôi tệp hay Content-Type. Chặn SVG/HTML/ảnh động, giới hạn pixel để tránh giải nén quá lớn, bỏ metadata, tạo WebP ở các kích thước phù hợp desktop/mobile. Không tải ảnh từ URL tùy ý và không chạy HTML/script do admin nhập.

URL đích chỉ HTTPS công khai: chặn URL có credentials, localhost, IP riêng/reserved, scheme nguy hiểm và hostname mập mờ; không có open redirect. Không thể chứng nhận mọi website là không có mã độc: admin phải xem xét nội dung trước khi xuất bản, có thể chặn domain trong cài đặt.

## Vị trí và trình chỉnh sửa trực quan

Registry cố định gồm: đầu trang chủ, cuối trang chủ, bên cạnh Khám phá, trong nội dung Khám phá, Cộng đồng, How It Works, chân trang. Vị trí luôn là vùng trong luồng bố cục; không overlay/sticky và không được chọn selector hoặc tọa độ tùy ý.

Các vùng nhạy cảm luôn bị loại: đăng ký/đăng nhập, xác minh, hồ sơ và quản lý nợ riêng tư, trình tạo thẻ, tin nhắn, thanh toán, admin. Không cho cài đặt ghi đè danh sách này. Trên mobile, sidebar chuyển thành vùng banner an toàn trong luồng nội dung thay vì đè lên bộ điều khiển quẹt.

Editor chọn trang và desktop/mobile, hiển thị **iframe của chính trang app** ở chế độ preview đã xác thực admin. Vùng an toàn được đánh dấu; banner nháp được kéo giữa các vùng đó, đổi nguồn hoặc chọn tự luân phiên/danh sách chiến dịch. Có thao tác bằng nút/select thay thế kéo thả cho bàn phím và mobile. Chỉ cho chọn các preset tỷ lệ/kích thước và max-width trong giới hạn zone, không resize tự do.

Entry `/ads-preview` dùng các render component hiện có với dữ liệu trình bày công khai, bỏ qua đọc localStorage tài chính, load tài khoản/nợ riêng tư, lưu trạng thái, background mutation và đo lường. API preview vẫn xác thực admin. Chỉ entry preview được trả `X-Frame-Options: SAMEORIGIN` và CSP `frame-ancestors 'self'`; các trang admin/riêng tư tiếp tục DENY. Không nới cấu hình framing toàn site.

Zone Cộng đồng gắn vào khu vực cộng đồng hiện tại của Discover và cuối modal Cộng đồng; không tạo trang cộng đồng mới. Chỉ một zone Cộng đồng visible được đo tại một thời điểm.

Chế độ preview không ghi impression/click và không tải AdSense thật. Không tạo tài khoản hay nới quyền API để mở preview. Các điều khiển không liên quan của app trong preview bị vô hiệu để tránh thao tác dữ liệu thật.

Mỗi cấu hình có bản nháp và bản đã xuất bản, revision và thời điểm cập nhật. **Lưu nháp** không đổi website. **Xuất bản bố cục** cập nhật snapshot nguyên tử; kiểm tra revision để tránh hai tab ghi đè nhau. Website nhận cấu hình mới trong tối đa 30 giây, tab đang ẩn sẽ cập nhật khi mở lại. Dừng/gỡ quảng cáo có hiệu lực ở lần kiểm tra tiếp theo, link cũ không ghi thêm click hợp lệ.

## Phân phối và luân phiên

Chỉ phân phối chiến dịch đã xuất bản, chưa xóa/tạm dừng, trong lịch chạy, đúng vùng/thiết bị, còn ngân sách impression và đạt giới hạn tần suất. Không dùng danh tính, khoản nợ, nội dung hồ sơ hoặc mức khó khăn tài chính để chọn quảng cáo.

Trong cùng zone, ưu tiên có trọng số, luân phiên theo cấu hình và tránh thay banner khi người dùng đang thao tác. Banner trống/no-fill bị tháo khỏi bố cục. AdSense chỉ được fallback khi tất cả điều kiện đồng ý/chính sách/trang an toàn đều đạt; không xoay/refresh AdSense bằng timer của hệ thống trực tiếp.

Frequency capping chỉ trong phiên trình duyệt bằng bộ nhớ nếu chưa có đồng ý lưu trữ. Không tạo mã theo dõi bền vững trước consent. Khi bật đo lường có consent, có thể dùng mã first-party ngẫu nhiên với thời hạn đã công bố; không gắn mã này với tài khoản.

Giới hạn impression được thực thi bằng transaction với reservation có hạn dùng, tránh phân phối vượt hạn mức khi nhiều phiên máy chủ cùng chạy. Impression chỉ được ghi khi banner có ít nhất 50% diện tích trên màn hình trong 1 giây liên tục và trang đang visible. Delivery token ngẫu nhiên, có hạn dùng, ràng buộc với đúng chiến dịch/vị trí/creative/revision; token được lưu dạng hash và mỗi token chỉ ghi một impression, một click hợp lệ.

Click đi qua endpoint của app rồi redirect tới URL đã được kiểm tra. Không nhận URL đích từ client. Lọc token giả/hết hạn, nhấp trùng, bot rõ ràng và click chưa có impression. Đây là đo lường first-party có chống lạm dụng cơ bản, không phải chứng nhận chống gian lận quảng cáo độc lập. Link có nhãn **Quảng cáo**/**Được tài trợ**, `rel=sponsored noopener noreferrer` và không gửi referrer chứa nội dung app.

Mặc định Direct Ads chỉ đổi banner sau 30 giây và chỉ khi zone không được focus/hover; tab ẩn dừng timer. Delivery reservation hết hạn sau 2 phút; click token hết hạn sau 15 phút. Campaign đã pause/hết hạn không ghi thêm click; liên kết cũ có thể đi tới URL an toàn đã được duyệt, trừ khi URL/domain đã bị thu hồi thì hiển thị thông báo an toàn. Frequency mặc định 3 lượt/campaign/phiên; chỉ dùng bộ nhớ nếu chưa có consent lưu trữ.

## AdSense và bảo vệ dữ liệu

Trang cài đặt lưu Publisher ID, Ad Unit ID theo zone, responsive, fallback và trạng thái bật/tắt. Không cho dán script/HTML tùy ý. Mặc định tắt; chỉ cho bật sau khi admin xác nhận tài khoản/website được duyệt, quyền cần thiết và phương án consent đã sẵn sàng. Không tự nhận rằng Google đã phê duyệt chỉ vì admin nhập ID đúng định dạng.

Script Google chỉ được tải sau consent phù hợp. EEA/UK/Thụy Sĩ cần CMP được Google chứng nhận và tín hiệu TCF hợp lệ; không coi checkbox nội bộ là thay thế CMP. Không có tín hiệu phù hợp thì không tải script/không gọi quảng cáo Google.

**Cách ly origin, không chỉ đổi document:** script bên thứ ba ở cùng origin vẫn đọc được localStorage tài chính ngay cả khi đổi màn hình hoặc tải document mới. AdSense vì vậy chỉ được bật trên một hostname công khai tách biệt, gắn với cùng Vercel project và cùng mã nguồn; đó là alias phần giới thiệu, không phải app quản trị riêng. Hostname mặc định của app tiếp tục không tải Google. Địa chỉ công khai mới phải còn trống, thuộc quyền người dùng và được thêm/xét duyệt trong AdSense trước khi kích hoạt. Nếu chưa có địa chỉ này, Direct Ads vẫn hoạt động và Google hiển thị trạng thái “Chưa cấu hình vùng công khai an toàn”.

Hostname quảng cáo chỉ phục vụ entry `public.html` và module công khai, giữ cùng thiết kế landing/How It Works/trang thông tin. Không import `app.mjs`, không đọc/ghi dữ liệu nợ hoặc gọi API tài khoản. Tất cả Join/Broke/Bros/logo/Home dẫn theo quy tắc rõ ràng: liên kết nội dung giữ trên public origin; liên kết vào app/đăng ký dùng full navigation tới canonical app origin. Server từ chối auth/admin/private API trên public origin và chuyển mọi route app riêng tư về canonical origin trước khi trả HTML. Cookie tài khoản giữ host-only; không dùng Domain cookie chia sẻ giữa hai origin.

Không nhúng AdSense vào iframe tự chế hoặc sửa hành vi chuẩn của Google. Khám phá/Cộng đồng chỉ dùng Direct Ads vì có thể hiển thị nội dung nợ; giao diện giải thích khi nguồn không hợp lệ cho một vùng. Quyền consent và publisher ID do dashboard canonical quản lý; public endpoint chỉ trả cấu hình được phép công khai.

Trang preview của placement editor là iframe nội bộ để xem bố cục, không phải iframe phân phối AdSense. Direct Ads dùng ảnh từ API của app, không chấp nhận pixel theo dõi, third-party script hay redirect ngoài kiểm soát.

Doanh thu AdSense chỉ lấy từ báo cáo chính thức của Google: cung cấp liên kết báo cáo và trạng thái chưa kết nối; hỗ trợ nhập báo cáo CSV chính thức với khoảng ngày, tiền tệ và nguồn rõ ràng. Không cộng báo cáo nhập trùng cùng kỳ; không trộn tiền tệ. Đồng bộ tự động bằng AdSense Management API chỉ hoạt động khi chủ tài khoản đã cấu hình Google Cloud OAuth/read-only access; tuyệt đối không giả lập số liệu khi chưa có quyền. Nếu triển khai OAuth, token chỉ lưu server-side và có thao tác ngắt kết nối.

Bản đầu hỗ trợ CSV báo cáo Google thay vì tự xây OAuth chưa có thông tin ứng dụng Google Cloud. Có bước xem trước mapping cột ngày/ad unit/metric/currency và báo rõ định dạng không được hỗ trợ. Khóa tổng hợp Google gồm account, ngày, ad unit, metric và currency: nhập trùng thay thế cùng khóa thay vì cộng dồn; file chồng kỳ phải được xác nhận phạm vi thay thế. Khoản ESTIMATED_EARNINGS được ghi rõ “Thu nhập ước tính theo Google”, không gọi là khoản đã thanh toán. Không có dữ liệu Google thì không đưa một con số giả vào tổng doanh thu.

## Database và API

Các bảng bổ sung, tên có tiền tố `ad_`: advertisers, campaigns, creatives, placements, placement_drafts, placement_releases, delivery_tokens, daily_metrics, revenue_entries, settings, settings_drafts, audit_logs, adsense_report_imports. Không dùng lại bảng dữ liệu nợ cho nhắm quảng cáo.

Nhóm API `/api/admin/ads/*`: bootstrap, CRUD advertiser/campaign, upload/preview creative, trạng thái chiến dịch, draft/publish placement, draft/publish settings, thống kê và doanh thu, audit, AdSense config/report import. Mỗi endpoint đều kiểm tra session và admin ở server; mutation kiểm tra Origin/JSON hoặc multipart hợp lệ, kích thước body và rate limit. Upload có giới hạn riêng để không bỏ giới hạn JSON hiện tại.

Nhóm public `/api/ads/*`: cấu hình an toàn, delivery theo zone/device/page allowlist, creative đã được phép, ghi view và click redirect. Không nhận user id/debt id/financial fields. Không trả nháp, cấu hình nội bộ, doanh thu hay thông tin liên hệ advertiser.

Audit lưu admin id, hành động, entity id, timestamp và thay đổi cấu hình đã lọc; không lưu token/cookie hoặc nội dung tài chính riêng tư. Mọi publish và chuyển trạng thái quan trọng cùng audit trong một transaction.

## Thống kê và vận hành

Báo cáo ngày/tuần/tháng theo múi giờ Australia/Sydney, lọc chiến dịch/vị trí/thiết bị/khoảng ngày; CTR = valid clicks / viewable impressions, mẫu số 0 hiển thị 0%. Hiển thị rõ các impression bị bỏ do token trùng/hết hạn ở dữ liệu vận hành phù hợp, không làm phồng số liệu giao cho nhà quảng cáo.

Không gửi dữ liệu quảng cáo trực tiếp sang Google Analytics hay advertiser. Giới hạn lưu delivery token và dữ liệu sự kiện; dọn định kỳ. Thống kê tổng hợp và audit giữ theo thời hạn được cấu hình, không dùng việc xóa chiến dịch để xóa dấu vết quản trị.

Mặc định token và sự kiện chống trùng giữ 48 giờ, báo cáo tổng hợp và audit giữ 24 tháng. Dọn nhỏ trong tác vụ phân phối có giới hạn, kết hợp Vercel Cron hằng ngày với CRON_SECRET; cron không đọc hoặc gửi dữ liệu tài chính. Preset banner dùng chiều rộng tối đa của zone, tỷ lệ 6:1/3:1/2:1 và fit contain; mobile không cho chiều cao quảng cáo vượt 200 px hoặc che thao tác.

## Kiểm thử và bàn giao

- Chạy toàn bộ test hiện tại trước và sau thay đổi; không thay API auth/card hiện có.
- Test quyền admin ở mọi nhóm endpoint và chặn Origin ngoài.
- Test ảnh giả định dạng/quá lớn/quá số pixel, URL nguy hiểm, lỗi upload và tệp mồ côi.
- Test tạo/sửa/nháp/xuất bản/lịch chạy/hết hạn/pause/resume/xóa; public không xem được creative nháp.
- Test publish cấu hình nguyên tử, revision conflict và database restart.
- Test rotation/priority, strict impression cap khi đồng thời, dedup click/view và preview không ghi số liệu.
- Test sensitive-page exclusion, không tải Google khi thiếu consent/approval, document navigation loại bỏ script trước khi vào view riêng tư.
- Test số liệu báo cáo/doanh thu thực tế, import Google không trùng và phân biệt tiền tệ.
- Kiểm tra giao diện thật trên desktop/mobile: home, How It Works, Khám phá, editor; không che navigation/form/swipe controls; vùng không có quảng cáo không chiếm chỗ.
- Deploy staged, kiểm tra CRUD → publish → hiển thị → pause/remove trên cloud bằng chiến dịch kiểm thử và dọn đúng dữ liệu kiểm thử. Không bật quảng cáo hoặc AdSense thật tự động khi bàn giao.

## Những cấu hình bên ngoài vẫn cần chủ tài khoản

Google phải xét duyệt website/tài khoản; chủ tài khoản nhập publisher/ad unit thực và hoàn tất consent/CMP. OAuth Google Cloud hoặc CSV chính thức cần cho báo cáo Google. App không thể tự phê duyệt tài khoản Google, tự chứng nhận banner không độc hại, hoặc biến dashboard thành hệ thống thanh toán nếu không có hợp đồng và dịch vụ thanh toán riêng.

Các lựa chọn kỹ thuật trên là đề xuất của người triển khai; yêu cầu gốc của người dùng là tài liệu đính kèm, không mặc định coi các lựa chọn này đã được người dùng phê duyệt.

## Kiểm tra thiết kế

Đã có một lượt builder-check độc lập. Các điểm được sửa trước triển khai: cách ly AdSense khỏi localStorage tài chính bằng public origin, ngoại lệ framing chỉ cho preview, bootstrap preview không đọc dữ liệu riêng, mapping rõ Cộng đồng hiện tại, revision nháp cho campaign live, xử lý báo cáo chồng kỳ và thời hạn token. Không có câu hỏi sản phẩm bắt buộc chưa được giải đáp; còn chờ người dùng duyệt đề xuất thiết kế này.

Nguồn đã kiểm tra: [quy định iframe AdSense](https://support.google.com/adsense/answer/3394713?hl=en-GB), [yêu cầu CMP](https://support.google.com/adsense/answer/13554020?hl=en), [Google reporting API](https://developers.google.com/adsense/management/reference/rest/v2/accounts.reports/generate), [Vercel Blob private](https://vercel.com/docs/vercel-blob/private-storage).
