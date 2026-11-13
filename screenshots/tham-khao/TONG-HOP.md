# Tổng hợp tham khảo UI: app khám phá quán ăn

Nguồn: ảnh chụp màn hình iPhone trên App Store (US), tải về ngày 13/11/2026. Chỉ dùng để học **mẫu bố cục và tương tác**: không sao chép logo, tên, màu nhận diện hay nguyên màn hình.
Mỗi thư mục chứa 01.jpg…0N.jpg; `_sheets/<app>.jpg` là ảnh ghép xem nhanh.

| App | Thư mục | Số ảnh |
|---|---|---|
| Beli | `beli/` | 6 |
| The Infatuation | `infatuation/` | 6 |
| Yelp | `yelp/` | 6 |
| Mapstr | `mapstr/` | 6 |
| YouKnow Map (YK) | `youknow-map/` | 5 |
| ForkIt! | `forkit/` | 5 |
| SpinEats | `spineats/` | 4 |
| What to eat? Spin for your meal ("Meal Roulette") | `what-to-eat/` | 6 |

Ký hiệu nhóm tính năng: **(a)** Gần tôi · **(b)** Dịp/mục đích · **(c)** Chọn ngẫu nhiên · **(d)** Tìm kiếm ngôn ngữ tự nhiên/AI · **(e)** Thẻ quán/chi tiết.

---

## Beli
- **(a)** Hàng chip lọc ngay dưới tab: `[icon lọc + số filter đang bật]` `Current Location ▾` `Reserve` `Open now` `Cuisine ▾`. Chip vị trí là dropdown, không phải màn riêng.
- **(a)** Thẻ trong danh sách có dòng meta xám: "1.0 mi · Closed · Opens 5:30 PM": khoảng cách, trạng thái mở cửa và giờ mở lại gộp **một dòng**.
- **(a)** Nút nổi "View Map" (viên thuốc, góc dưới phải) đè lên danh sách để chuyển list → map; trên bản đồ, mỗi pin hiển thị **điểm số** thay vì icon chung.
- **(e)** Thẻ quán: tên đậm, dòng `$$$$ | Ẩm thực`, dòng khu vực; điểm số trong vòng tròn nhỏ góc phải; hàng nút `+` (thêm vào list) và bookmark ở góc dưới phải.
- **(e)** Màn "Discover": danh sách "Top 10 …" dạng ảnh vuông bên trái + tiêu đề + mô tả, kèm tiến độ cá nhân "Bạn đã đến 2/10 quán": tạo động lực khám phá.
- **(b)** Danh sách theo chủ đề ("Date Night", "Pizza"…) thay cho bộ lọc dịp: dịp được thể hiện bằng **bộ sưu tập biên tập**.

## The Infatuation
- **(a)** Màn đầu là **bản đồ toàn màn hình**, ô tìm kiếm nổi phía trên ("What are you looking for?"); pin hiển thị điểm; nút "LIST VIEW" ở góc dưới trái, nút lọc và nút "về vị trí của tôi" góc dưới phải; thẻ quán nổi (ảnh + điểm + tên + loại) ở đáy bản đồ.
- **(b)** Chi tiết quán có dòng **"PERFECT FOR: Breakfast · Late nights · Lunch"**, tức là dịp/mục đích là thuộc tính của quán, hiển thị dạng tag chữ in hoa ngay dưới hàng nút.
- **(b)** Trang chủ "Guides for (almost) every situation": tab ngang `NEW OPENINGS | HIT LIST | TOP 25`, mỗi guide là ảnh lớn + tiêu đề in hoa.
- **(d)** Trợ lý chat: màn trống có mascot + câu chào, các **thẻ gợi ý câu hỏi lớn, nhiều màu**, cuộn ngang ("Quán West Village nào còn chỗ tối nay?", "Quán cà phê làm việc ở Brooklyn?"), ô "Start typing…" ở đáy.
- **(e)** Chi tiết: điểm số trong ô màu cạnh tên, dòng `$$ | loại | khu vực`, địa chỉ, ảnh lớn, rồi hàng nút viền `WEBSITE` `DIRECTIONS` `SAVE` cuộn ngang.
- **(e)** "Where You've Been": danh sách ảnh + điểm + tag, mỗi dòng có "Add a note…", nút "MAP VIEW" cố định ở đáy.

## Yelp
- **(a)** Header "Restaurants · current location" + icon bản đồ ở góc phải để đổi list/map; bottom sheet danh sách kéo lên trên nền bản đồ.
- **(a)** Hàng chip: `[icon lọc]` `Sort ▾` `Offers delivery` (chip đang bật đổi viền/màu) `Price ▾`…; dòng meta thẻ: "$ · Nob Hill, 0.2 mi"; kết quả xếp hạng có số khoảng cách canh phải ("6.4 mi").
- **(b)** Thẻ có dòng tick xanh mô tả đặc điểm phục vụ: "✓ Indoor & Outdoor dining", "✓ Delivery, Takeout"; dấu ✗ cho cái không có. Đây là cách hiển thị thuộc tính quán gọn.
- **(d)** Trợ lý AI: tiêu đề chào, đoạn giải thích ngắn, rồi **các thẻ gợi ý dạng "I need to… / I want to…"** cuộn ngang ngay trên ô nhập "Tell me what I can help with…".
- **(e)** Thẻ: 3 ảnh xếp ngang trên cùng, tên có số thứ tự, sao + số review, chip ẩm thực xám, dòng "141 orders last week" (bằng chứng xã hội), nút hành động full-width.
- **(e)** Chi tiết: ảnh hero có tên đè lên, dòng "Open until 8:00 PM" màu xanh, hàng 4 nút tròn `Call` `View map` `Website` `Save`.

## Mapstr
- **(a)** Công tắc phân đoạn `Map | List` ngay đầu bản đồ: rõ ràng, một chạm.
- **(a)** Danh sách có "Sort by Date ⇅" và khoảng cách đặt **ngay sau tên quán** bằng chữ nhỏ xám ("Cala Macarella 1,004 km"), kèm "Open"/"Always Open" màu xanh.
- **(b)** Tag tự tạo có **emoji + màu** ("Nature", "Hotel", "Museum") dạng nhãn dán; danh mục bên trái có số đếm trong vòng tròn màu.
- **(e)** Nút `+` tròn lớn nổi giữa thanh tab = hành động chính "Thêm quán"; toast đen "Add any place to your map with one tap".
- **(e)** Thẻ danh sách: ảnh vuông trái, tên đậm + khoảng cách, địa chỉ 1 dòng, hàng tag màu bên dưới.

## YouKnow Map (YK)
- **(a)** Bottom sheet chi tiết quán trên bản đồ: "Café · ● Open · $ · 244 m away": loại, trạng thái, giá, khoảng cách trên **một dòng có dấu chấm ngăn cách**.
- **(a)** Danh sách đã lưu có chip `Cities ▾` `All types ▾` `Nearest ▾` (sắp xếp gần nhất là một chip), khoảng cách "91 m" canh phải mỗi dòng; trên bản đồ có chip nhỏ "Near me".
- **(d)** Ô tìm kiếm nổi ở đáy bản đồ, ngay trên tab bar: **"Search places, people or vibes…"**: khuyến khích gõ theo cảm giác/dịp.
- **(d)** Kết quả AI: dòng câu truy vấn ("business lunch near Hardbrücke") + "10 PLACES", câu tóm tắt cách hiểu ("Best matches for a business lunch…, prioritizing professional settings…"), rồi thẻ có số thứ tự `01`, **lý do gợi ý viết bằng văn xuôi**, và tag in hoa ("COCKTAIL BAR · LOCAL FAVOURITE · LOUD & FUN").
- **(b)** Danh sách cá nhân `Saved` `Want to go` `Avoid`: có cả trạng thái "tránh".
- **(e)** Chi tiết: ảnh dạng carousel thẻ bo góc có chấm trang; hàng nút viên thuốc `Website` `Socials` `Route` `Share`.

## ForkIt! (chọn quán ngẫu nhiên)
- **(c)** Nút chính lớn full-width ("Just Fork It"), kết quả hiện trong **khung viền nổi bật**: "You're going here" + tên quán chữ lớn + ♡ (thích) và ⊘ (đừng gợi ý nữa) + nút "Open Details".
- **(c)** Mục **"NOT FEELING IT?"** dưới kết quả: 2 phương án thay thế nhỏ (loại món, tên, sao, giá), không bắt người dùng quay lại từ đầu.
- **(a)** Bán kính dạng **chip có icon** `¼ mi` `½ mi` `1 mi` `1½ mi` + nút ghim vị trí; bộ lọc thu gọn thành dòng "Filters · 8 found" (số kết quả khớp, mở rộng được).
- **(c)** Ô "Not in the mood for: pizza, indian, sushi…" (loại trừ), công tắc "Skip the chains", "Recently shown: 1 · Clear history": tránh lặp lại quán vừa gợi ý.
- **(c)** Chế độ nhóm: mã phiên 4 ký tự, mỗi người đặt bộ lọc riêng, app chọn 1 quán hợp tất cả; tóm tắt dạng chip ("$", "thai", "nearby") → kết quả.

## SpinEats
- **(a)** 2 thẻ lớn chọn nguồn vị trí: `Current Location` | `Search Location` (thẻ đang chọn tô màu); chọn phương tiện `Walking` | `Driving`; **thanh trượt bán kính** có giá trị hiển thị ("2.6 mi"), min/max hai đầu.
- **(c)** **Vòng quay** chứa tên quán thật, kim chỉ ở đỉnh, nút "Spin!" ở đáy vòng.
- **(c)** Màn kết quả: hiệu ứng confetti, ảnh lớn, tên quán to, địa chỉ / loại / sao / giá / khoảng cách dạng danh sách có icon, nút tròn "Directions" ở giữa, nút **"Try Another"** dính ở đáy.

## What to eat? ("Meal Roulette")
- **(c)** Màn chính tối giản: tiêu đề + 1 câu hướng dẫn; khối 3 ô chọn `Search around` (vị trí) · `Distance 3 km` · `Cuisine`; vòng tròn nét đứt với nút **Spin** viên thuốc màu cam ở giữa.
- **(c)** Kết quả là **bottom sheet** "Today's Pick": tên quán lớn, loại, "↗ 148 m"; nút chính cam full-width "I'm eating here"; 2 nút phụ `Directions` `Diary`; "Open in Delivery App"; "Close".
- **(a)** Chọn tâm tìm kiếm: "Current location" (tick) + vị trí đã lưu **Home / Work / Custom**: rất hợp cho "gần nhà/gần công ty".
- **(a)** Ngay dưới vòng quay có "Nearby Options · 3 km · Restaurant": danh sách gần đó làm phương án dự phòng.
- **(e)** Nhật ký ăn uống: thống kê tháng (số bữa, điểm TB, tiền đã chi), hashtag phổ biến; bảng màu kem + cam ấm, thẻ bo góc lớn, tab bar dạng viên thuốc nổi.

---

## Đề xuất cho Ăn Gì HCM

1. **Dòng meta thống nhất trên mọi thẻ quán**: `Cơm tấm · 35–60k · 1,2 km · ● Đang mở (đến 22:00)`, một dòng, ngăn bằng dấu chấm giữa; chấm trạng thái xanh/xám; khi chưa cấp quyền vị trí thì bỏ phần khoảng cách thay vì hiện "?". Dùng lại `PlaceCard`, chỉ thêm prop `distanceKm`.
2. **Thanh chip lọc cuộn ngang dưới ô tìm kiếm**, chip đầu là `📍 Gần tôi ▾` (mở sheet chọn: Vị trí hiện tại / Nhà / Công ty / Chọn quận), tiếp theo `Đang mở`, `Giá ▾`, `Dịp ▾`, `Danh mục ▾`. Chip đang bật tô nền cam nhạt + viền cam; icon lọc ở đầu có **badge số filter đang bật**.
3. **Bán kính bằng chip bậc thang** thay vì thanh trượt: `500 m` `1 km` `2 km` `5 km` `Cả TP`, kèm dòng "Tìm thấy 12 quán" cập nhật trực tiếp. Hợp kiểu đi xe máy ở HCM hơn mile/km lẻ. Khi chọn "Gần tôi", tự đổi sắp xếp sang "Gần nhất" và hiện nhãn `Sắp xếp: Gần nhất ⇅`.
4. **Nút nổi "Bản đồ ⇄ Danh sách"** dạng viên thuốc ở giữa-đáy màn hình (trên tab bar), giữ nguyên bộ lọc khi chuyển. Trên bản đồ, pin hiển thị **giá khởi điểm** ("35k") thay vì icon; chạm pin mở thẻ nổi ở đáy, vuốt ngang để qua quán kế bên.
5. **Dịp/mục đích là thuộc tính của quán** (cột `occasions text[]`: `hen_ho`, `di_nhom`, `mot_minh`, `lam_viec`, `gia_dinh`, `an_dem`…), admin tick trong form. Trên trang chủ: hàng **thẻ dịp to có emoji** (💑 Hẹn hò · 👯 Đi nhóm · 🧍 Một mình · 💻 Ngồi làm việc · 🌙 Ăn khuya) làm lối vào nhanh; trong chi tiết quán: dòng "Hợp để: Hẹn hò · Đi nhóm".
6. **Thuộc tính thực tế dạng tick** trong chi tiết: ✓ Máy lạnh · ✓ Chỗ để xe máy · ✓ Wifi · ✗ Không nhận thẻ: thông tin người Sài Gòn thật sự cần, trình bày gọn kiểu checklist.
7. **"Hôm nay ăn gì?" = 1 nút lớn + bottom sheet kết quả**: màn có 3 ô chọn gọn (Quanh đâu · Bao xa · Thèm gì/Dịp) và nút cam tròn lớn ở giữa; khi bấm, chạy hiệu ứng xáo thẻ ảnh quán ~1 giây (nhẹ hơn vòng quay, dễ làm bằng Reanimated), rồi kéo lên sheet "Chốt quán này!" gồm ảnh, tên lớn, dòng meta, nút chính **"Chỉ đường"**, nút phụ `Gọi` `Xem chi tiết` `♡`.
8. **Quay lại mà không mất ngữ cảnh**: trong sheet kết quả có nút "🎲 Đổi quán khác" (giữ nguyên bộ lọc), nút "⊘ Không thích món này" (loại danh mục đó khỏi lượt sau), và mục nhỏ **"Không ưng? Thử 2 quán này"** với 2 thẻ mini. Lưu lịch sử 10 quán vừa gợi ý trong local storage để không lặp lại; có "Xoá lịch sử".
9. **Ô tìm kiếm ngôn ngữ tự nhiên** đặt ở đầu trang chủ với placeholder xoay vòng theo giờ trong ngày: "bún bò gần Quận 3 dưới 50k", "quán yên tĩnh ngồi làm việc Bình Thạnh", "ăn khuya đi nhóm 5 người". Khi ô trống và được focus, hiện 4–6 **thẻ gợi ý câu hỏi** bấm được.
10. **Hiển thị lại cách app hiểu câu hỏi bằng chip có nút ✕**: sau khi tìm "lẩu đi nhóm gần Q1 dưới 150k", dưới ô tìm hiện `Lẩu ✕` `Đi nhóm ✕` `Quận 1 ✕` `≤150k ✕` + câu tóm tắt nhỏ "Đang tìm quán lẩu hợp đi nhóm ở Quận 1, giá dưới 150k". Chip chính là các filter thật nên sửa/bỏ được, minh bạch và không cần màn kết quả AI riêng. Bản đầu có thể parse bằng luật từ khóa (dùng `normalize` trong `format.ts`) với nhánh `isDemo`, sau đó mới nâng cấp lên AI.
11. **Thẻ quán khi là kết quả gợi ý/AI có dòng "Vì sao hợp"** (1–2 câu, ví dụ "Không gian riêng, nhạc nhẹ, có phòng lạnh: hợp hẹn hò") và số thứ tự `01 02 03`; thẻ thường thì không có, giữ danh sách gọn.
12. **Chi tiết quán**: carousel ảnh bo góc có chấm trang → tên + dòng meta → hàng nút viên thuốc cuộn ngang `Chỉ đường` `Gọi` `Lưu` `Chia sẻ` → "Hợp để" → thực đơn có giá → giờ mở cửa. Dùng nền kem ấm và cam làm màu nhấn (`tint` sẵn có trong theme), tab bar giữ nguyên; nút hành động chính luôn là cam đặc, nút phụ là viền.
