## Bảng điểm

Chấm theo ảnh chụp 390px, đã đọc đủ 11 ảnh bản C và 13 ảnh bản D. Tôi không chạy app và không kiểm tra code.

| Tiêu chí | C (vòng trước) | D (bản cuối) |
|---|---|---|
| 1. Gọn, không rối | 7 · Banner bị cắt, emoji ở tiêu đề mục, chi tiết lặp "Đã đóng cửa" và "Đã đóng" | 8 · Banner gọn, tiêu đề mục sạch, không còn chip trùng. Trừ điểm vì chi tiết quán còn khoảng trống lớn ở cuối |
| 2. Phân cấp thị giác | 8 · Ảnh → tên → giá/giờ rõ ràng | 8 · Giữ nguyên thứ tự, tên quán to và đậm |
| 3. Dễ dùng (UX) | 7 · Nút Lưu nằm ngoài khung nhìn, tim không rõ trạng thái | 8 · Nút "Lưu thay đổi" dính đáy, bộ lọc giữ nguyên, tim danh sách có viền rõ |
| 4. Hiện đại, thẩm mỹ | 7 · Ảnh hero đẹp, bo góc và bóng tốt, còn nhiều emoji | 7 · Vẫn dùng emoji làm icon chính (📞 🧭 ✏️ 🙈 🏞️), tim chi tiết màu lilac nhạt |
| 5. Nhất quán | 6 · Toggle teal lệch palette, tim lilac ở admin | 7 · Toggle đã cam, nhưng nhãn trạng thái lệch nhau: "Đang mở" / "Mở cửa" / "Đang mở cửa". Tim danh sách xám, tim chi tiết lilac |
| 6. Accessibility | 6 · Tim lilac tương phản thấp, viền đôi ở ô mật khẩu | 6 · Viền đôi đã hết, nhưng tim lilac còn ở chi tiết, tên món bị cắt, nhãn nhóm xám nhỏ |
| 7. Dark mode | 7 · Chỉ thấy trang chủ và chi tiết | 8 · Có đủ trang chủ, chi tiết, admin, form; đọc rõ, nhất quán |
| 8. Quản trị dễ nhập liệu | 5 · Thực đơn 2 hàng mỗi món, không thấy nút Lưu | 7 · 1 hàng mỗi món, nút Lưu dính đáy. Trừ điểm vì tên món bị cắt và thẻ admin thiếu badge hiển thị/ẩn |
| **Điểm trung bình** | **6.6** | **7.4** |

Ghi chú: điểm C vòng trước là 7.0. Khi chấm lại ảnh, tôi hạ C xuống 6.6 vì nhãn trạng thái lặp và nút Lưu không thấy được là lỗi rõ hơn tôi đã nghĩ.

## Đối chiếu 10 vấn đề vòng trước

1. **Trang chủ, nút tim:** Đã sửa. Thẻ danh sách và thẻ hero dùng tim outline xám trong khung trắng có viền (sau/1, sau/1b). Chưa thấy trạng thái đã thích vì ảnh chỉ có trạng thái chưa thích.
2. **Form, thực đơn 2 hàng/món:** Đã sửa. Mỗi món là 1 hàng: tên | giá | ★ | ✕ (sau/7).
3. **Form, toggle teal:** Đã sửa. Toggle đã cam ở cả sáng và tối (sau/7, sau/11).
4. **Admin, tim trên thẻ quán:** Sửa một phần. Tim đã biến mất (sau/6), nhưng chưa có badge "Đang hiển thị / Đang ẩn" trên thẻ; chỉ có bộ đếm ở trên.
5. **Chi tiết, trạng thái trùng:** Đã sửa. Ốc Đêm đóng cửa chỉ còn "Đã đóng" ở dòng giờ (sau/3); quán mở chỉ còn "Đang mở" (sau/9).
6. **Login, ô mật khẩu:** Đã sửa. Chỉ còn một viền cam khi focus (sau/5).
7. **Form, nút Lưu:** Đã sửa. Nút "Lưu thay đổi" dính đáy màn, thấy được ngay (sau/7, sau/11).
8. **Banner "Dữ liệu mẫu":** Đã sửa. Câu hiển thị trọn trong một dòng, không còn lặp chữ và dấu "...".
9. **Emoji ở tiêu đề mục:** Đã sửa. "Quán tuyển chọn", "Quán khác", "Đánh giá", "Thực đơn" không còn emoji. Emoji ⭐ trên từng món vẫn còn.
10. **Chi tiết, khoảng trống cuối trang:** Chưa sửa. Sau "Thực đơn" vẫn có khoảng trống rất lớn (sau/3b).

## Vấn đề còn lại của bản D

1. **Chi tiết quán (sau/3b, sau/9): khoảng trống lớn dưới "Thực đơn".** Đây là lỗi cũ chưa sửa và nhìn rất rõ khi quán có ít món. Sửa: bỏ chiều cao tối thiểu của vùng nội dung, chỉ chừa padding đúng bằng chiều cao thanh hành động cố định.
2. **Icon emoji lẫn với icon đơn sắc.** Chi tiết quán có 📞 hồng và 🧭 la bàn; admin có ✏️ và 🙈; form có 🏞️ và 📍; banner có 🧪. Sửa: dùng một bộ icon line (Ionicons, đã có trong Expo) cùng cỡ, cùng màu theo theme cho mọi nút và nhãn.
3. **Tim ở chi tiết không khớp tim ở danh sách.** Tim trên ảnh hero và tim ở thanh dưới (sau/3, sau/9) là màu lilac nhạt, còn tim danh sách là outline xám. Sửa: một icon outline cho cả hai chỗ; khi đã thích thì đổi sang đỏ/cam đặc.
4. **Nhãn trạng thái không thống nhất.** Carousel ghi "Đang mở", danh sách ghi "Mở cửa", bộ lọc ghi "Đang mở cửa", chi tiết ghi "Đang mở". Sửa: chọn một bộ, ví dụ "Đang mở" / "Đã đóng", và dùng cho mọi nơi kể cả bộ lọc.
5. **Thẻ admin thiếu trạng thái hiển thị.** Thẻ chỉ có "Mở cửa" (giờ hoạt động) và không có gì cho biết quán đang hiện hay đang ẩn; giữa tên và địa chỉ có khoảng trống lớn. Sửa: thêm badge "Đang hiển thị" (xanh) hoặc "Đang ẩn" (xám) ngay dưới tên, giảm khoảng trống; nút "Ẩn khỏi app" đổi thành "Hiện / Ẩn" theo trạng thái.
6. **Form, tên món bị cắt (sau/7).** Ô tên món "Phở tái nạm gầu" bị cắt ở mép phải vì cột tên quá hẹp so với cột giá. Sửa: cột tên `flex:1` với `minWidth:0`, cột giá cố định khoảng 88px; hoặc cho tên món xuống dòng trong cùng một ô.
7. **Nhãn nhóm và chữ phụ quá nhạt và nhỏ.** Các tiêu đề nhóm như "THÔNG TIN CƠ BẢN", "TRẠNG THÁI HIỂN THỊ" và dòng gợi ý như "Không bắt buộc..." có màu xám nhạt, cỡ khoảng 12px trên nền be và đen. Sửa: tăng cỡ lên 13px và đậm màu chữ phụ để đạt tương phản khoảng 4.5:1.
8. **Thẻ admin có đường kẻ đôi ở đáy (sau/6).** Viền thẻ và đường phân cách nút hành động chồng lên nhau, tạo hai vạch sát nhau. Sửa: bỏ viền dưới của thẻ hoặc bỏ đường phân cách, giữ một trong hai.

## Kết luận

Bản D đã sửa gần hết lỗi bố cục và tương tác vòng trước (8 trong 10 vấn đề sửa hẳn hoặc sửa một phần), nhưng chưa đạt "hoàn hảo, hiện đại, không rối". Còn lệch ở bộ icon emoji, tim, nhãn trạng thái và một khoảng trống bố cục rõ ràng ở chi tiết quán. Cách mục tiêu khoảng 2.5 điểm (7.4/10). Cần sửa thêm trước khi chấm vòng sau: mục 1–5 ở trên, và chụp thêm trạng thái đã thích, trạng thái tải, và thẻ admin đang ẩn.
