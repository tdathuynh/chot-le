# Chấm điểm vòng 6 (Claude CLI)

## Bảng điểm


| # | Tiêu chí | Vòng 5 | Vòng 6 | Lý do ngắn / vấn đề cụ thể nhất |
|---|---|---|---|---|
| 1 | Gọn, không rối | 7 | **6** | Trang chủ (1, 14) vẫn có 6 tầng trước danh sách. Banner "Đã hiểu" (14) chiếm gần 1/4 màn hình và lặp lại chip "Hẹn hò" và "Gần tôi · 5 km" ngay bên dưới. Form sửa quán (7) vẫn dài khoảng 4 màn hình. |
| 2 | Phân cấp thị giác | 8 | **8** | Ảnh → tên → giá/trạng thái vẫn rõ. Chi tiết (3b) có "NÊN THỬ" và món được tô viền cam. Nút "Gợi ý" và "Bộ lọc" đang bật vẫn cạnh tranh nhau ở hàng trên. |
| 3 | Dễ dùng (UX) | 8 | **8** | Banner "Đã hiểu" có ✕ riêng cho từng tiêu chí (14). Sheet ngẫu nhiên chỉ chọn quán đang mở (15b). Sheet lọc có "Xem 6 quán" đếm trực tiếp (2). Trừ điểm: ô tìm bị cắt chữ ("Tìm món, quán hoặc cả câ" ở 14; "0k gần tôi 5km n" ở 14a). |
| 4 | Hiện đại, thẩm mỹ | 8 | **8** | Pin giá trên bản đồ (18) và sheet ảnh lớn (15b, 17) có cảm giác app cao cấp. Trừ điểm: nút "Bản đồ" nổi che đầu thẻ đầu tiên (1, 14). |
| 5 | Nhất quán | 8 | **8** | Icon tim và trạng thái "Đang mở / Đã đóng" thống nhất. Admin đã tách "Đang hiển thị" (icon mắt) khỏi "Đang mở" (viên xanh) (6, 10). Trừ điểm: nút "Gợi ý" mở sheet có tiêu đề "Hôm nay ăn gì?", hai tên cho một tính năng. |
| 6 | Accessibility | 7 | **7** | Vùng chạm đủ lớn, trạng thái có cả chấm và chữ. Nhãn nhóm in hoa xám nhỏ vẫn còn ("KHOẢNG CÁCH TỪ BẠN", "THÔNG TIN CƠ BẢN", "DANH SÁCH QUÁN (6)", "Vuốt ngang để xem"). Ô tìm bị cắt chữ. |
| 7 | Dark mode | 7 | **8** | Có ảnh dark cho sheet gợi ý (17), banner và "Gần tôi" (16), trang chủ (8), chi tiết (9), quản trị (10) và form (11). Chưa có ảnh dark cho sheet lọc và bản đồ. |
| 8 | Quản trị dễ nhập liệu | 7 | **7** | Ô "Vị trí chính xác" đã thu gọn và hiện "Đã có toạ độ" (7). Nút "Xóa quán này" đã đỏ (7, 11). Vẫn dài, nhãn nhỏ và nhạt. |
| 9 | Tính năng gợi ý | 8 | **8** | "Gần tôi" hiện khoảng cách trên thẻ (12). Sheet ngẫu nhiên có "Không ưng? Thử 2 quán này" (15b). Có chế độ bản đồ (18). Câu mẫu bấm được (13). Thiếu: khoảng cách trong sheet ngẫu nhiên và chi tiết; nhãn "Gợi ý" và "Hôm nay ăn gì?" không khớp; dòng "Hợp vì" bị cắt giữa câu. |
| | **Trung bình** | **7.5** (8 mục cũ) · **8** (tiêu chí 9) · **7.6** (9 mục) | **7.5** (8 mục cũ) · **8** (tiêu chí 9) · **7.6** (9 mục) | |

Điểm trung bình đứng yên. Nhiều lỗi cũ đã sửa, nhưng trang chủ dày thêm nên Gọn giảm từ 7 xuống 6.

## Đối chiếu 8 vấn đề vòng trước (trong cham-diem-vong5.md)

1. **0 quán hiện trước khi bấm "Hiểu câu": Đã sửa.** Ảnh 14a giữ "Kết quả tìm kiếm · 6 quán" và hiện dòng "Bấm Hiểu câu hoặc Enter để lọc theo câu này".
2. **Quá nhiều tầng trên trang chủ: Sửa một phần.** Câu mẫu thành chip một hàng (13). Nhưng hàng mục đích và hàng danh mục vẫn tách hai hàng (1), và banner mới thêm một khối (14).
3. **Banner chỉ có một ✕: Đã sửa.** Ảnh 14: mỗi tiêu chí có chip và ✕ riêng, có "Xóa hết".
4. **Sheet gợi ý chọn quán đang đóng: Sửa một phần.** Ảnh 15b ghi "Chọn trong 4 quán đang mở" và có "Không ưng? Thử 2 quán này". Dòng meta chưa có khoảng cách.
5. **Hai viên xanh giống nhau ở thẻ admin: Đã sửa.** Ảnh 6, 10: "Đang hiển thị" là chữ có icon mắt. Chưa có ảnh quán đang ẩn.
6. **Chip "Hẹn hò" dùng icon tim: Đã sửa.** Chip không còn icon tim (2, 12); chi tiết dùng icon ly rượu (3, 9).
7. **Emoji đè empty state, ô toạ độ, nút xoá: Sửa một phần.** Toạ độ đã thu gọn, nút xoá đã đỏ. Chưa chụp empty state.
8. **Nhãn nhóm và chữ phụ nhạt, thiếu dark: Chưa sửa.** Nhãn in hoa xám vẫn còn. Dark đã có cho sheet gợi ý, banner, trang chủ nhưng chưa có cho sheet lọc.

Tổng: đã sửa 4, sửa một phần 3, chưa sửa 1.

## So với app nước ngoài

- **Đã ngang:** Chuyển "Bản đồ ⇄ Danh sách" dạng viên thuốc, pin hiển thị giá (18), gần Infatuation và Mapstr. Chip ✕ riêng cho từng tiêu chí (14) đúng mẫu YouKnow Map.
- **Đã ngang:** "Không ưng? Thử 2 quán này" (15b, 17) gần như sao chép mục "NOT FEELING IT?" của ForkIt.
- **Đã ngang:** "Gần tôi" bật một chạm, hiện "600 m · Quận 1" trên thẻ (12), giống dòng meta của Beli và YouKnow Map.
- **Còn thua:** Chi tiết của Yelp và YouKnow Map có 4 nút (Gọi, Bản đồ, Website, Lưu, Chia sẻ). Của ta chỉ có Lưu, Gọi, Chỉ đường; "Chia sẻ" nằm góc trên (3). ForkIt có "Đừng gợi ý nữa" và lịch sử tránh lặp; ta chưa có.
- **Còn thua:** Mapstr và YouKnow Map có danh sách "Đã lưu / Muốn đi / Tránh". Ta chỉ có "Yêu thích" (4).

## Vấn đề còn lại

1. **Banner "Đã hiểu" lặp bộ lọc đang hiện bên dưới (14).** "Hẹn hò" xuất hiện ở banner và hàng mục đích; "Trong 5 km" thành "Gần tôi · 5 km". Cách sửa: banner chỉ hiện tiêu chí không có chip tương ứng (ví dụ "Ốc / Hải sản", "Dưới 300k", "Ngồi ngoài trời"), và thu gọn thành một dòng khi không chạm.
2. **Ô tìm bị cắt chữ (14, 14a, 16).** Nút "Hiểu câu" chiếm gần nửa ô. Cách sửa: thu nút thành icon sparkle 36px trong ô, giữ dòng gợi ý bên dưới.
3. **Chi tiết thiếu khoảng cách và Chia sẻ trong thanh dưới (3, 3b, 9).** Cách sửa: thêm "1,4 km" cạnh "Bản đồ" ở dòng Địa chỉ; thanh dưới thành 4 nút: tim, Chia sẻ, Gọi, Chỉ đường.
4. **Nhãn không khớp: nút "Gợi ý" mở sheet tiêu đề "Hôm nay ăn gì?" (1, 15b); sheet không hiện khoảng cách.** Cách sửa: đặt cùng một tên, và thêm khoảng cách vào dòng meta của sheet.
5. **Dòng "Hợp vì" bị cắt giữa câu và lẫn giá với khoảng cách (14, 16).** Cách sửa: chỉ hiện một lý do ngắn ("Hợp: Hẹn hò"); nếu thừa chỗ thì xuống dòng thay vì cắt.
6. **Bản đồ: pin chồng nhau, không có tên (18).** "55k" che "45k". Cách sửa: gộp pin sát nhau thành cụm có số; khi chạm pin thì card hiện tên quán.
7. **Nhãn nhóm và chữ phụ nhỏ, nhạt (2, 6, 7, 1).** Cách sửa: 13px, đậm 600, màu khoảng #5A5249 trên #FAF7F2 để đạt khoảng 4.5:1.
8. **Nút "Bản đồ" nổi che đầu thẻ đầu tiên (1, 14, 12).** Cách sửa: thêm padding đáy cho danh sách cộng khoảng 24px, và dải gradient mờ phía trên nút.

## Kết luận

Vòng này sửa hoàn toàn 4 lỗi và một phần 3 lỗi. Luồng "gõ cả câu" không còn báo "0 quán", và sheet ngẫu nhiên chỉ chọn quán đang mở. Điểm vẫn 7.6 vì trang chủ dày thêm. Để đạt "hoàn hảo, không rối", cần gọn phần đầu trang chủ trước (mục 1, 2), rồi thêm khoảng cách vào chi tiết và sheet ngẫu nhiên (mục 3, 4).

