# Hướng dẫn tạo Supabase (khoảng 5–10 phút)

## 1. Tạo tài khoản và project
1. Vào https://supabase.com → **Start your project** → đăng nhập bằng GitHub hoặc email.
2. Bấm **New project**:
   - **Name:** `an-gi-hcm` (tùy bạn)
   - **Database Password:** bấm *Generate*, lưu lại ở chỗ an toàn. **Không** đưa mật khẩu này vào app.
   - **Region:** `Southeast Asia (Singapore)`, gần Việt Nam nhất nên app tải nhanh.
   - **Plan:** Free
3. Đợi khoảng 2 phút để project khởi tạo.

## 2. Tạo bảng dữ liệu
1. Menu trái → **SQL Editor** → **New query**.
2. Mở file `supabase/schema.sql` trong thư mục dự án, copy **toàn bộ** nội dung, dán vào ô query rồi bấm **Run**.
3. Kiểm tra: menu **Table Editor** phải có các bảng `places`, `categories`, `dishes`, `place_photos`… Bảng `categories` có sẵn 8 danh mục mẫu.

## 3. Tạo tài khoản admin
1. Menu **Authentication** → **Users** → **Add user** → **Create new user**.
2. Nhập email và mật khẩu bạn sẽ dùng để đăng nhập trang quản trị. Tick **Auto Confirm User**.
3. Quay lại **SQL Editor**, chạy lệnh sau (thay bằng email vừa tạo):
   ```sql
   insert into public.admins (user_id)
   select id from auth.users where email = 'email-cua-ban@example.com';
   ```
4. (Nên làm) **Authentication** → **Sign In / Providers** → tắt **Allow new users to sign up** để người lạ không tự tạo tài khoản được. Kể cả khi họ tạo được, họ cũng không phải admin nên không sửa được dữ liệu.

## 4. Lấy khóa kết nối cho app
1. Menu **Project Settings** → **API Keys** (hoặc nút **Connect** ở đầu trang).
2. Copy 2 giá trị:
   - **Project URL**, dạng `https://xxxx.supabase.co`
   - **Publishable key**, bắt đầu bằng `sb_publishable_...` (nếu project chỉ hiện *anon key* thì dùng anon key)
3. Trong thư mục `app/`, copy file `.env.example` thành `.env` rồi điền:
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxx
   ```
   ⚠️ **Tuyệt đối không** dùng `secret key` / `service_role key` trong app.

## 5. Chạy app
```bash
cd app
npm run web       # mở trên trình duyệt (trang quản trị dùng tốt nhất ở đây)
npm start         # quét QR bằng app Expo Go trên điện thoại
```
Vào tab **Quản trị** → đăng nhập bằng tài khoản admin ở bước 3 → bắt đầu thêm quán.

## 6. Cập nhật khi app có tính năng mới

Mỗi lần `supabase/schema.sql` thay đổi (vd thêm cột `occasions` cho "Đi ăn để"), mở **SQL Editor**, dán lại toàn bộ file và **Run**. File chạy lại an toàn, không mất dữ liệu.

## 7. (Không bắt buộc) Bật "Tìm bằng câu nói" bằng AI

Không làm bước này thì app vẫn hiểu câu bằng bộ quy tắc chạy ngay trên máy (`app/src/lib/filters.ts`). Bật AI giúp hiểu những câu khó hơn.

1. Tạo khóa API Claude tại https://platform.claude.com (có tính phí theo lượt dùng, mỗi lượt tìm rất nhỏ).
2. Cài Supabase CLI, đăng nhập và liên kết project:
   ```bash
   npx supabase login
   npx supabase link --project-ref <mã-project>
   ```
3. Lưu khóa vào secret của Supabase (khóa **không** nằm trong app) rồi deploy function:
   ```bash
   npx supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
   npx supabase functions deploy parse-query
   ```
Nếu function lỗi hoặc chưa deploy, app tự quay về bộ hiểu câu trên máy.
