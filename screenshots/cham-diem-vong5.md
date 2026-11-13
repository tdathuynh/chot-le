# Chấm điểm vòng 5 — Ăn Gì HCM

Tôi chấm theo 20 ảnh trong `screenshots/sau/` (390px, 2x) và có đọc đủ từng ảnh. Có xem code ở `index.tsx` và `random-picker.tsx`, nhưng chỉ để xác nhận những gì đã thấy trong ảnh.

## Bảng điểm

| # | Tiêu chí | Vòng 4 | Vòng 5 | Lý do ngắn / vấn đề cụ thể nhất |
|---|---|---|---|---|
| 1 | Gọn, không rối | 8 | **7** | Trang chủ giờ có 7 tầng trước khi tới quán đầu tiên: tab, banner, tiêu đề + "Gợi ý", ô tìm + "Bộ lọc", chip mục đích, chip danh mục, rồi mới tới "Quán tuyển chọn". Khi mở câu mẫu (13), 4 dòng câu mẫu đẩy toàn bộ quán xuống dưới màn hình đầu. Form sửa quán dài khoảng 4 màn hình (7). |
| 2 | Phân cấp thị giác | 8 | **8** | Ảnh → tên → giá/trạng thái vẫn rõ. Dòng `600 m · Quận 1 · …` in đậm khoảng cách là đúng chỗ. Nút "Gợi ý" viền mảnh nên yếu hơn nút "Bộ lọc" khi lọc đang bật (nền cam đặc), dù "Gợi ý" là tính năng chủ đạo. |
| 3 | Dễ dùng (UX) | 8 | **8** | "Gần tôi" bật trong 1 chạm, tự sắp xếp gần nhất. Sheet lọc có nút "Xem 6 quán" đếm trực tiếp. Lỗi lớn: khi đang gõ câu (14a), app lọc theo từng chữ nên hiện ngay "0 quán · Không tìm thấy quán nào" trước khi người dùng bấm "Hiểu câu". |
| 4 | Hiện đại, thẩm mỹ | 7 | **8** | Icon đã thành line đồng bộ (chi tiết, admin, sheet lọc). Sheet "Hôm nay ăn gì?" với ảnh lớn bo góc trông như app cao cấp. Bị trừ vì empty state (14a) có emoji tô đè lên chữ "Không tìm thấy", và icon "Phòng riêng" trông như emoji mặt người, lạc tông với bộ icon line. |
| 5 | Nhất quán | 7 | **8** | Nhãn "Đang mở / Đã đóng" và nút tim đã thống nhất ở mọi nơi. Vấn đề mới: chip "Hẹn hò" dùng icon tim giống hệt nút Yêu thích (3, 7). Thẻ admin có hai viên xanh cùng kiểu là "Đang hiển thị" và "Đang mở" (6, 10). |
| 6 | Accessibility | 6 | **7** | Vùng chạm lớn, đủ 44px. Trạng thái có cả chấm và chữ, không chỉ dựa vào màu. Vẫn còn chữ phụ nhạt và nhỏ: "Vuốt ngang để xem", "THỬ GÕ CẢ CÂU", nhãn nhóm và gợi ý trong form. Chữ trong ô tìm bị cắt ngang ("0k gần tôi 5km r") vì nút "Hiểu câu" chiếm chỗ. |
| 7 | Dark mode | 8 | **7** | 4 ảnh dark hiện có vẫn đẹp và đọc rõ. Nhưng chưa có ảnh dark cho các tính năng mới (sheet lọc, sheet gợi ý, "Gần tôi", banner "Đã hiểu"), nên chưa thể nói dark mode tốt ngang light mode trên toàn app. |
| 8 | Quản trị dễ nhập liệu | 7 | **7** | Đã chia khối rõ, chọn bằng chip nhanh, nút Lưu dính đáy, tên món đã hiện đủ. Nhưng form dài ra nhiều (thêm "Phù hợp để", "Tiện ích", "Toạ độ"), và ô toạ độ bắt admin gõ tay `10.7769, 106.7009`. |
| 9 | Tính năng gợi ý *(mới)* | — | **8** | Đủ 5 tính năng và đều dễ hiểu: khoảng cách hiện trên thẻ, bán kính dạng chip 1/3/5/10 km, chip mục đích, tiện ích có icon, sheet ngẫu nhiên có "Đổi quán khác" và "Chỉ đường", câu mẫu bấm được, banner "Đã hiểu: …". Còn thiếu: không bỏ được từng tiêu chí đã hiểu, gợi ý ngẫu nhiên vẫn chọn quán đang đóng (15b), chi tiết quán không hiện khoảng cách. |
| | **Trung bình** | **7.4** (8 mục) | **7.6** (9 mục) · **7.5** nếu chỉ tính 8 mục cũ | |

Nhìn chung, các lỗi cũ đã sửa gần hết, nhưng tính năng mới làm trang chủ và form dày hơn, nên điểm "Gọn" giảm. Tổng điểm 8 mục cũ chỉ nhích nhẹ (7.4 → 7.5), không tăng mạnh.

## Đối chiếu 8 vấn đề vòng trước

1. **Khoảng trống lớn dưới "Thực đơn" (chi tiết): Đã sửa.** Ở ảnh 3b, sau thẻ Thực đơn chỉ còn một khe vừa đủ cho thanh hành động cố định.
2. **Icon emoji lẫn icon đơn sắc: Sửa phần lớn.** Chi tiết, admin, banner và nút "Chọn ảnh" đều dùng icon line. Còn lại icon "Phòng riêng" kiểu emoji trong sheet lọc và form, emoji tô trong empty state, và logo emoji ở thanh tab.
3. **Tim ở chi tiết khác tim ở danh sách: Đã sửa.** Chưa thích là tim outline xám ở cả hai nơi; đã thích là tim cam đặc có viền cam (3c, 4, 12).
4. **Nhãn trạng thái không thống nhất: Đã sửa.** Mọi nơi đều dùng "Đang mở / Đã đóng"; sheet gợi ý thêm giờ ("Đang mở · đến 14:00", "Đã đóng · mở 17:00").
5. **Thẻ admin thiếu trạng thái hiển thị: Đã sửa, nhưng sinh lỗi mới.** Đã có badge "Đang hiển thị" dưới tên. Badge này lại cùng màu và cùng hình dạng với viên "Đang mở" ngay bên dưới. Chưa có ảnh quán đang ẩn để kiểm tra nút có đổi thành "Hiện lại" không.
6. **Tên món bị cắt trong form: Đã sửa.** "Phở tái nạm gầu" hiển thị đủ trong ô (7, 11).
7. **Nhãn nhóm và chữ phụ quá nhạt, quá nhỏ: Chưa sửa.** Nhãn nhóm in hoa xám ("THÔNG TIN CƠ BẢN", "TIỆN ÍCH"…) và các dòng gợi ý dưới ô nhập vẫn nhỏ và nhạt. Trang chủ còn thêm nhãn mới cùng kiểu "THỬ GÕ CẢ CÂU".
8. **Thẻ admin có đường kẻ đôi ở đáy: Đã sửa.** Giữa thông tin và hàng nút chỉ còn một đường phân cách (6, 10).

## So với app nước ngoài

- **Đã ngang:** Dòng meta trên thẻ (`1,4 km · Quận 4 · địa chỉ` + giá + trạng thái + giờ) đúng mẫu Beli và YouKnow Map. Nút "Gần tôi" bật một chạm và tự đổi tiêu đề thành "Gần bạn nhất" là cách làm gọn hơn Yelp.
- **Đã ngang:** Sheet "Hôm nay ăn gì?" có ảnh lớn, tên to, viên trạng thái kèm giờ, nút chính "Chỉ đường" và nút phụ "Đổi quán khác". Bố cục này tương đương Meal Roulette và SpinEats, chỉ thiếu hiệu ứng lúc chọn.
- **Gần ngang:** Tìm bằng câu có câu mẫu bấm được (giống Yelp AI) và banner "Đã hiểu: …". Nhưng YouKnow Map và đề xuất #10 cho mỗi tiêu chí thành một chip có ✕ riêng; ở đây chỉ có một nút ✕ xoá cả cụm. Ngoài ra không có câu "vì sao hợp" trên từng thẻ kết quả.
- **Còn thua:** Chưa có chế độ bản đồ (Infatuation, Yelp, Mapstr, Beli đều có), và chưa có mục "Không ưng? Thử 2 quán này" như ForkIt. Gợi ý ngẫu nhiên chưa tránh quán đang đóng và chưa có lịch sử để khỏi lặp lại quán vừa gợi ý.
- **Còn thua:** Trang chi tiết thiếu khoảng cách và thiếu nút "Chia sẻ". Hàng nút hành động mới có Gọi, Chỉ đường và Lưu, trong khi Yelp và YouKnow Map có 4 nút.

## Vấn đề còn lại

1. **Trang chủ, đang gõ câu (14a): kết quả 0 quán hiện trước khi bấm "Hiểu câu".** Người dùng làm đúng hướng dẫn "gõ cả câu" nhưng thấy ngay "Không tìm thấy quán nào", trông như app bị lỗi. Cách sửa: khi `looksLikeRequest(query)` đúng thì tạm ngừng lọc theo chữ, giữ danh sách cũ và hiện dòng nhắc "Bấm Hiểu câu hoặc Enter để tìm theo ý". Hoặc tự chạy hiểu câu sau khi ngừng gõ khoảng 600 ms.
2. **Trang chủ, quá nhiều tầng trên màn hình đầu (1, 13).** Cách sửa: gộp chip mục đích vào cùng hàng chip danh mục, hoặc chỉ giữ một hàng chip cuộn ngang theo thứ tự `Gần tôi · Đang mở · Hẹn hò · Đi nhóm · …` và chuyển danh mục vào "Bộ lọc". Câu mẫu chỉ hiện khi ô tìm được focus, tối đa 2–3 câu dạng chip ngang chứ không phải 4 dòng full-width. Banner "Dữ liệu mẫu" có thể rút thành một chấm nhỏ cạnh logo.
3. **Banner "Đã hiểu" (14): chỉ có một ✕ xoá cả cụm.** Cách sửa: tách thành các chip riêng `Trong 5 km ✕` `Ốc / Hải sản ✕` `Hẹn hò ✕` `Dưới 300k ✕` `Ngồi ngoài trời ✕`. Giữ một dòng tóm tắt nhỏ phía trên, và nút "Xoá hết" ở cuối hàng.
4. **Sheet gợi ý (15b): chọn quán đang đóng.** Lúc trưa app vẫn gợi ý "Mì Xào Giòn · Đã đóng · mở 17:00". Cách sửa: mặc định chỉ chọn trong các quán đang mở, chỉ lấy quán đóng khi không còn quán mở nào và báo rõ "Không còn quán mở, đây là quán mở sớm nhất". Hiện thêm khoảng cách trong dòng meta nếu đã có vị trí. Thêm mục "Không ưng? Thử 2 quán này" với 2 thẻ nhỏ.
5. **Thẻ admin (6, 10): hai viên xanh giống hệt nhau.** "Đang hiển thị" là trạng thái quản trị, còn "Đang mở" là giờ hoạt động. Cách sửa: đổi "Đang hiển thị" thành chữ nhỏ có icon mắt (không dùng viên màu), hoặc dùng viên viền xám; trạng thái "Đang ẩn" dùng viên xám đặc. Cần chụp thêm thẻ của quán đang ẩn để kiểm tra.
6. **Chip "Hẹn hò" dùng icon tim (2, 3, 7).** Icon này trùng nghĩa với nút Yêu thích nằm ngay trên cùng màn hình. Cách sửa: đổi sang icon khác, ví dụ ly rượu, nến hoặc hai người.
7. **Empty state (14a): emoji bát phở đè lên tiêu đề.** Thêm vào đó, form có ô "Toạ độ" bắt nhập tay. Cách sửa: chừa khoảng cách khoảng 12px giữa hình và tiêu đề, và dùng minh hoạ line cùng bộ icon. Trong form, ẩn ô toạ độ vào mục "Nâng cao" vì đã có nút "Dùng vị trí hiện tại của tôi" và tự lấy toạ độ từ link Google Maps. Nút "Xoá quán này" nên dùng màu đỏ để báo hành động nguy hiểm, thay vì cam giống nút thường.
8. **Chữ phụ nhạt và thiếu ảnh dark.** Các nhãn nhóm in hoa xám, "Vuốt ngang để xem" và gợi ý trong form cần đậm màu hơn để đạt tương phản khoảng 4.5:1. Cũng cần chụp dark mode cho sheet lọc, sheet gợi ý, "Gần tôi" và banner "Đã hiểu" để kiểm chứng tiêu chí 7.

## Kết luận

Bản này đã sửa gần hết 8 lỗi vòng trước (6 sửa hẳn, 1 sửa phần lớn, 1 chưa sửa) và bổ sung đủ bộ tính năng gợi ý. Các tính năng mới được trình bày dễ hiểu, nhiều chỗ đã ngang Yelp, Beli hay Meal Roulette. Đổi lại, trang chủ và form dày lên rõ, và luồng "gõ cả câu" có một khoảnh khắc báo "0 quán" gây hiểu nhầm. Vì vậy điểm chỉ lên 7.6/10 (7.5 nếu chỉ tính 8 mục cũ), chưa đạt mức "hoàn hảo, không rối". Ưu tiên tiếp theo là mục 1–4 ở phần Vấn đề còn lại: sửa luồng hiểu câu, gọn phần đầu trang chủ, tách chip có ✕ riêng, và cho gợi ý ngẫu nhiên tránh quán đang đóng.
