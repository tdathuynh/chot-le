# Chấm điểm vòng 7 (Claude CLI)

## Bảng điểm

Đã đọc đủ 26 ảnh trong `screenshots\sau`, gồm cả 10 ảnh mới của vòng này. Chấm theo ảnh 390px, không chạy app.

| Tiêu chí | Vòng trước (D) | Vòng này | Lý do |
|---|---|---|---|
| 1. Gọn, không rối | 8 | 7 | Trang chủ khi gõ câu có tới 4 tầng: ô tìm, hàng "Đã hiểu", hàng chip "Gần tôi", hàng loại món. Mục tiêu "1 việc chính mỗi màn" bị loãng. |
| 2. Phân cấp thị giác | 8 | 8 | Ảnh → tên đậm → giá cam → trạng thái pill rõ ràng ở thẻ, sheet gợi ý và chi tiết (1, 15, 3). |
| 3. Dễ dùng (UX) | 8 | 7 | Gợi ý ngẫu nhiên và chỉ đường làm được trong 1–2 chạm. Trừ điểm vì thanh điều hướng nằm trên cùng khó với tới, và "Xóa lọc" ở dark mode gần như biến mất (19). |
| 4. Hiện đại, thẩm mỹ | 7 | 7 | Ảnh món là nhân vật chính, bo góc và màu cam ấm nhất quán. Còn emoji 🍜 ở logo và 🦪 🦞 ở tag chi tiết (3, 3b, 9). |
| 5. Nhất quán | 7 | 7 | Nhãn "Đang mở" và toggle cam đã thống nhất. Nhưng chip "Đã hiểu" dùng cùng kiểu cam đặc với chip lọc đang bật (14, 16), và tag chi tiết lẫn emoji với icon đơn sắc. |
| 6. Accessibility | 6 | 6 | "Xóa lọc" dark gần như vô hình (19). Tên quán trong mini card bị cắt (15, 15b, 17). Nhãn nhóm và dòng gợi ý trong form vẫn nhỏ, nhạt (7). |
| 7. Dark mode | 8 | 8 | Đủ trang chủ, chi tiết, admin, form, sheet, bộ lọc, bản đồ. Đọc rõ, nhất quán (8, 9, 10, 11, 16, 17, 19, 20). |
| 8. Quản trị dễ nhập liệu | 7 | 7 | Form chia 9 khối, tên món đã hiển thị đủ, nút Lưu dính đáy (7, 11). Trừ điểm vì giá nhập là số thô "55000" trong khi app hiển thị "55k". |
| 9. Tính năng gợi ý | — | 7 | Gần tôi, khoảng cách "600 m", lọc theo mục đích, gợi ý ngẫu nhiên có "Đổi quán khác", tìm bằng câu nói có chip ✕. Dễ hiểu, nhưng ba cơ chế chip chồng nhau và chưa có hiệu ứng "quay" khi chọn ngẫu nhiên. |
| **Điểm trung bình** | **7.4** (8 tiêu chí) | **7.1** (9 tiêu chí) | Trung bình 8 tiêu chí cũ hiện là 7.1, thấp hơn 7.4 vòng trước. Nguyên nhân là trang chủ khi có câu tìm kiếm thêm nhiều tầng chip, không phải do lỗi mới ở chi tiết hay admin. |

## Đối chiếu 8 vấn đề vòng trước

1. **Nhãn trạng thái không thống nhất:** Đã sửa. Thẻ, carousel, sheet và chi tiết đều dùng "Đang mở" / "Đã đóng" (1, 12, 15, 3).
2. **Icon emoji lẫn với icon đơn sắc:** Sửa một phần. Nút hành động và nhãn "Hợp để" đã dùng icon line, nhưng logo 🍜 và tag 🦪 🦞 vẫn còn (3, 3b, 9).
3. **Tim chi tiết không khớp tim danh sách:** Đã sửa. Tim outline ở hero và thanh dưới, đã thích thì đổi sang cam đặc ở cả hai (3c).
4. **Thẻ admin thiếu trạng thái hiển thị:** Đã sửa. Có dòng "Đang hiển thị" với icon mắt và thống kê "Đang ẩn" (6, 10).
5. **Tên món bị cắt trong form:** Đã sửa. "Phở tái nạm gầu" hiện đủ trên một dòng (7).
6. **Nhãn nhóm và chữ phụ quá nhạt, nhỏ:** Chưa sửa. Các nhãn như "THÔNG TIN CƠ BẢN" và dòng "Không bắt buộc..." vẫn nhỏ, nhạt (7, 11).
7. **Thẻ admin có đường kẻ đôi:** Đã sửa. Chỉ còn một đường phân cách trên hàng nút (6).
8. **Khoảng trống lớn cuối trang chi tiết:** Đã sửa một phần. Sau "Thực đơn" còn một khoảng nhỏ, không còn khoảng trống lớn như trước (3b).

## So với app nước ngoài

- **Đã ngang ở:** Khoảng cách đặt trong dòng meta của thẻ, như Mapstr và Yelp (12). Chip "Hợp để" và dòng "Hợp: Hẹn hò" giống cách Infatuation và YouKnow hiển thị dịp dùng (3, 14). Sheet gợi ý có "Đổi quán khác" và "Không ưng? Thử 2 quán này", giống ForkIt (15).
- **Đã ngang ở bản đồ:** Pin hiện giá "40k", "55k" thay vì icon chung, như Beli và Infatuation. Chạm pin mở thẻ quán ở đáy (18, 18b).
- **Còn thua ở điều hướng:** Beli, YouKnow và Mapstr đều đặt tab ở đáy. Thanh "Khám phá / Yêu thích / Quản trị" ở đầu trang là kiểu web, không phải kiểu app di động.
- **Còn thua ở chọn ngẫu nhiên:** SpinEats và What to eat có vòng quay hoặc hiệu ứng khi quay. Ở đây chỉ có sheet hiện ra ngay. Ngoài ra chưa có lịch sử đã gợi ý kiểu "Recently shown" của ForkIt.
- **Còn thua ở lưu có phân loại:** YouKnow có Saved, Want to go và Avoid. Ở đây chỉ có một nút tim.

## Vấn đề còn lại

1. **Trang chủ khi có câu tìm kiếm (14, 14a, 16, 19):** Chip "Đã hiểu" dùng cùng kiểu cam đặc với chip lọc đang bật, nên người dùng không phân biệt được chip nào là điều kiện đã hiểu, chip nào là bộ lọc thật. Nút "Xóa" nằm cuối hàng cuộn ngang, ở 19 chỉ thấy "Xó…". Sửa: chip "Đã hiểu" dùng nền cam nhạt viền cam, đưa "Xóa tất cả" cố định đầu hàng, và cho hàng chip xuống dòng thay vì cuộn ngang.
2. **Thanh điều hướng trên cùng (1, 4, 5, 6):** Ba tab nằm đầu màn hình, khó với bằng ngón cái trên máy lớn. Sửa: chuyển thành tab bar dưới đáy có icon và nhãn, đưa "Bản đồ" vào tab "Khám phá". Bỏ được khoảng 80px đầu màn.
3. **Chế độ tối, "Xóa lọc" gần như vô hình (19):** Nút nền tối trên sheet tối, không đủ tương phản. Sửa: khi chưa có lọc nào, ẩn nút hoặc dùng viền đứt với chữ đạt tối thiểu 4.5:1.
4. **Trang chủ chồng ba hàng chip (13, 1):** Hàng câu mẫu, hàng "Gần tôi / Đi nhóm / Hẹn hò" và hàng loại món đẩy nội dung xuống khoảng 40% màn hình. Sửa: gộp "Đi ăn để" thành một chip mở sheet, chỉ hiện câu mẫu khi ô tìm được focus.
5. **Emoji còn lại (3, 3b, 9, 1):** Logo 🍜 ở thanh trên, tag 🦪 🦞 🍜 ở chi tiết. Sửa: thay bằng icon đơn sắc cùng bộ với "Hợp để", hoặc bỏ emoji khỏi tag.
6. **Mini card "Không ưng? Thử 2 quán này" bị cắt tên (15, 15b, 17):** "Phở Bò Gia Truyề…", "Bún Bò Huế O H…". Sửa: cho tên xuống hai dòng hoặc xếp mini card thành danh sách một cột, bỏ dòng giá trong mini card.
7. **Form admin, giá nhập thô và nhãn nhỏ (7, 11):** Ô giá hiện "55000" trong khi thẻ hiện "55k". Sửa: thêm hậu tố "đ" hoặc hiển thị "55.000", và nâng nhãn nhóm lên 13px, đậm hơn.
8. **Địa chỉ chi tiết bị ngắt dở (3, 3b, 9):** Số "4" của "Quận 4" nằm riêng một dòng. Sửa: giữ "Quận 4" không ngắt dòng, hoặc đưa địa chỉ xuống dòng riêng.

Chưa có ảnh cho trạng thái tải, trạng thái admin đang ẩn một quán, và trạng thái gợi ý khi chưa cấp quyền vị trí. Ba trạng thái này còn chưa kiểm chứng.

## Kết luận

Vòng này sửa gần hết lỗi bố cục và trạng thái ở chi tiết, admin và form (7.1/10 trên 9 tiêu chí). Điểm bị kéo xuống bởi trang chủ khi tìm bằng câu nói: thanh điều hướng trên đầu, ba hàng chip chồng nhau, và chip "Đã hiểu" trông giống bộ lọc. Sửa ba việc đó trước, đưa điều hướng xuống đáy, rồi chụp thêm ba trạng thái còn thiếu, đây là đường nhanh nhất để lên khoảng 8.
