# Tạo bài ảnh TikTok từ quán trong Chốt Lẹ

Công cụ lấy các quán **đang hiển thị** trong app (Supabase) rồi xuất ra một bộ ảnh dọc 1080×1920 để đăng TikTok dạng ảnh lướt, kèm sẵn caption và hashtag.

Mỗi bài gồm:

- 1 ảnh bìa;
- mỗi quán 1 ảnh (hình, tên, khu vực, giá, giờ mở cửa, món nổi bật, tiện ích, ưu đãi);
- 1 ảnh kết.

Ảnh lấy từ ảnh bìa và ảnh quán bạn đã tải lên trong app. Quán càng có ảnh đẹp, nhiều món thì bài càng đẹp.

## Cách chạy

Mở terminal tại thư mục `D:\AI_appreview` rồi chạy một trong các lệnh dưới.

```bash
# 5 quán ngon bất kỳ (ưu tiên quán nổi bật, có ảnh)
node tools/tiktok/make.mjs

# 5 quán ốc dưới 100k ở Bình Thạnh
node tools/tiktok/make.mjs --mon oc --gia 100 --khu "Bình Thạnh"

# Quán hẹn hò có máy lạnh, 4 quán
node tools/tiktok/make.mjs --dip hen-ho --tien-ich may-lanh --so 4

# Chọn đúng vài quán theo tên, tự đặt tiêu đề
node tools/tiktok/make.mjs --quan "bò né 68, phan thiết" --tieu-de "2 quán ruột của team" --phu-de "ở Bình Thạnh"

# Trộn ngẫu nhiên mỗi lần một kiểu
node tools/tiktok/make.mjs --khu "Quận 1" --ngau-nhien

# Xem tất cả tuỳ chọn
node tools/tiktok/make.mjs --help
```

Kết quả nằm trong `tiktok-posts\<ngày>-<tên bài>\`:

| File | Dùng để |
|---|---|
| `01.png`, `02.png`… | Ảnh đăng lên TikTok, đúng thứ tự |
| `caption.txt` | Mô tả bài: danh sách quán, câu kêu gọi bình luận, hashtag. Sửa lại cho tự nhiên trước khi đăng |
| `post.json` | Dữ liệu đã dùng (để sửa tay rồi tạo lại nếu cần) |

## Tuỳ chọn

| Tuỳ chọn | Ý nghĩa |
|---|---|
| `--khu "Bình Thạnh"` | Lọc theo quận. Nhiều quận thì cách nhau bằng dấu phẩy |
| `--gia 100` | Giá tối đa của quán ≤ 100k |
| `--mon oc` | Tìm trong danh mục, tên quán và tên món. Không cần gõ dấu |
| `--dip hen-ho` | Dịp đi ăn: `ban-be`, `hen-ho`, `mot-minh`, `gia-dinh`, `cong-viec` |
| `--tien-ich may-lanh` | Tiện ích: `may-lanh`, `giu-xe`, `o-to`, `wifi`, `the`, `phong-rieng`, `ngoai-troi` |
| `--quan "a, b"` | Chọn đúng các quán có tên chứa a, b (giữ thứ tự) |
| `--so 5` | Số quán, tối đa 10 |
| `--ngau-nhien` | Chọn ngẫu nhiên thay vì ưu tiên quán nổi bật |
| `--tieu-de`, `--phu-de` | Tự đặt chữ trên ảnh bìa |
| `--mau` | Dùng dữ liệu mẫu để thử giao diện |

## Mẹo đăng bài

- **Tên quán:** sửa tên trong app sẽ đẹp hơn trên ảnh, vd "Bò Né 68 Thành Nhân" thay vì viết hoa toàn bộ.
- **Nhạc:** chọn nhạc trong thư viện TikTok khi đăng. Nhạc ngoài dễ bị tắt tiếng.
- **Giờ đăng:** 11h–12h hoặc 18h–20h.

## Ghi chú kỹ thuật

- **Nguồn dữ liệu:** chỉ đọc quán đã bật hiển thị, bằng khoá publishable trong `app/.env` (giống app), không cần khoá bí mật.
- **Cách chụp ảnh:** dùng Microsoft Edge chạy ẩn (có sẵn trên Windows). Máy không có Edge thì đặt biến `EDGE_PATH` tới Chrome.
- **Giao diện ảnh:** nằm trong `template.mjs`. Chữ quan trọng được giữ ngoài vùng bị caption và nút của TikTok che (dưới ~380px, phải ~140px, trên ~160px).
