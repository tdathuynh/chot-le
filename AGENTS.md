# Chốt Lẹ — hướng dẫn cho AI coding agent (Codex, Claude…)

App gợi ý quán ăn ngon ở TP.HCM (tên cũ: Ăn Gì HCM; khẩu hiệu "Đi ăn hông? Chốt lẹ!"). **Admin** nhập quán (ảnh, giá, địa chỉ, món) qua web hoặc điện thoại; **người dùng** chỉ xem, không cần đăng nhập.
Giao diện và nội dung hiển thị viết bằng **tiếng Việt**.

## Kiến trúc
- **Một codebase Expo** (`app/`) chạy iOS, Android và Web. Trang quản trị nằm ngay trong app (tab "Quản trị"), chỉ hiện chức năng sửa khi tài khoản có trong bảng `admins`.
- **Supabase** là backend duy nhất: Postgres + Storage (bucket `place-photos`) + Auth. Không có server riêng.
- **Tính năng cộng đồng** (bình chọn, gợi ý quán, thống kê lượt xem/chỉ đường, "Đang hot"): khách KHÔNG đọc/ghi bảng trực tiếp; đi qua hàm RPC `security definer` trong `schema.sql` (tự kiểm tra dữ liệu, giới hạn spam theo mã máy). Bảng tương ứng bật RLS, chỉ admin đọc.
- Phân quyền hoàn toàn bằng **RLS** trong `supabase/schema.sql`: `anon` chỉ đọc quán `is_published = true`, chỉ `public.is_admin()` được ghi. Mọi bảng mới **bắt buộc** bật RLS và có policy tương tự.

## Cấu trúc thư mục
```
supabase/functions/parse-query  Edge Function: hiểu câu tìm kiếm bằng Claude (khóa ở secret Supabase)
supabase/schema.sql          Toàn bộ schema + RLS + storage policy + danh mục mẫu (chạy lại được, idempotent)
HUONG_DAN_SUPABASE.md        Hướng dẫn tạo project Supabase và tài khoản admin
app/                         Expo app (SDK 58, Expo Router, TypeScript strict)
  app/AGENTS.md              Quy tắc riêng của Expo: đọc trước khi đụng API Expo
  src/app/(tabs)/index.tsx   Trang chủ: tìm kiếm, lọc danh mục/giá/quận/đang mở, "Chọn ngẫu nhiên"
  src/app/(tabs)/chat.tsx     Tab "Hỏi": chat tìm quán, chạy trên máy (src/lib/assistant.ts); sau này có thể thay bằng AI, giữ AssistantReply
  src/app/(tabs)/favorites.tsx  Quán yêu thích (lưu trên máy)
  src/app/(tabs)/admin.tsx   Đăng nhập admin + danh sách quản lý quán
  src/app/place/[id].tsx     Chi tiết quán (ảnh, giá, giờ, thực đơn, chỉ đường, gọi)
  src/app/edit-place/[id].tsx  Form thêm/sửa quán (id = "new" để thêm; ?maps=&name= để tạo từ gợi ý), upload ảnh, món ăn, ưu đãi
  src/app/vote/new.tsx       Tạo bình chọn "Chọn quán cùng hội bạn" (?ids= chọn sẵn quán)
  src/app/vote/[id].tsx      Trang bình chọn qua link (khách không cần đăng nhập), người tạo "Chốt quán"
  src/app/suggest.tsx        Khách gợi ý quán mới; admin duyệt trong tab Quản trị
  src/lib/supabase.ts        Supabase client (env EXPO_PUBLIC_SUPABASE_URL / _PUBLISHABLE_KEY)
  src/lib/api.ts             MỌI truy vấn Supabase đặt ở đây, màn hình không gọi supabase trực tiếp
  src/lib/auth.tsx           AuthProvider + useAuth() → { session, isAdmin, loading, signIn, signOut }
  src/lib/types.ts           Kiểu dữ liệu khớp với schema.sql + danh sách quận
  src/lib/format.ts          Định dạng giá (65k), giờ, isOpenNow, normalize (bỏ dấu để tìm kiếm)
  src/lib/favorites.ts       Yêu thích lưu local (useSyncExternalStore)
  src/lib/device.ts          Mã máy ngẫu nhiên (getDeviceId) + tên hiển thị khi bình chọn; KHÔNG phải tài khoản
  src/lib/share-link.ts      Link chia sẻ bình chọn (web origin / EXPO_PUBLIC_WEB_URL / deep link chotle://)
  src/lib/filters.ts         Bộ lọc dùng chung (Filters, applyFilters) + hiểu câu tiếng Việt trên máy (parseQueryLocal)
  src/lib/location.ts        Vị trí người dùng (expo-location), khoảng cách, toạ độ từ link Google Maps, directionsUrl
  src/lib/maps-link.ts       Dán link Google Maps → tự điền tên, địa chỉ, quận (đoán theo toạ độ nếu thiếu), toạ độ; địa chỉ dự phòng từ OpenStreetMap
  src/components/random-picker.tsx  Bảng "Hôm nay ăn gì?" (gợi ý ngẫu nhiên theo bộ lọc)
  src/components/icon.tsx    Icon đơn sắc Lucide (lucide-react-native) — KHÔNG dùng emoji; thêm icon mới vào bảng ICONS; categoryIcon() theo cột categories.icon
  src/components/places-map(.web).tsx  Bản đồ quán: Leaflet + OpenStreetMap trong WebView (điện thoại) / iframe (web); HTML ở src/lib/map-html.ts
  src/lib/local-storage(.web).ts  localStorage: expo-sqlite trên native, window.localStorage trên web
  src/lib/confirm.ts         confirmAsync/notify: chạy được cả web (Alert của RN không chạy trên web)
  src/components/ui.tsx      Button, Chip, Field, Section, Center: tái sử dụng, đừng tạo trùng
  src/components/place-card.tsx  Thẻ quán dùng ở mọi danh sách
  src/constants/theme.ts     Màu (light/dark, có tint = cam), Spacing, MaxContentWidth, WebTopInset
```

## Quy ước
- Khi đổi schema: sửa `supabase/schema.sql` (giữ idempotent: `if not exists`, `drop policy if exists`), cập nhật `src/lib/types.ts` và `src/lib/api.ts` cùng lúc.
- Dùng `ThemedText` / `ThemedView` / `useTheme()` cho màu; không hard-code màu nền/chữ.
- Màn hình trong tab trên web phải chừa `WebTopInset` vì thanh tab web nằm đè phía trên.
- Không gọi `setState` đồng bộ trong `useEffect` (ESLint `react-hooks/set-state-in-effect` sẽ báo lỗi); set trong callback của promise.
- **Khu vực dùng tên quận/huyện CŨ** (Quận 1, Bình Thạnh, Thủ Đức…) theo `DISTRICTS` trong `src/lib/types.ts`, dù TP.HCM đã bỏ cấp quận từ 1/7/2025. Đây là quyết định của chủ dự án vì người dùng quen gọi như vậy; **không** đổi sang phường mới.
- **Chế độ demo:** khi thiếu `app/.env`, `src/lib/api.ts` (`isDemo`) và `auth.tsx` dùng dữ liệu mẫu trong `src/lib/demo-data.ts`, lưu trong bộ nhớ, đăng nhập bằng email/mật khẩu bất kỳ. Hàm mới trong `api.ts` phải có nhánh `isDemo` tương ứng.
- Không bao giờ đưa `service_role`/secret key hoặc mật khẩu DB vào app.
- Cài package bằng `npx expo install <pkg>` (không dùng `npm install <pkg>`).

## Lệnh (chạy trong `app/`)
```bash
npm run web          # chạy bản web (http://localhost:8081)
npm start            # chạy dev server, quét QR bằng Expo Go
npx tsc --noEmit     # typecheck: phải sạch trước khi xong việc
npx eslint src       # lint: phải sạch trước khi xong việc
```
(`npx expo lint` hiện báo lỗi phiên bản ESLint; dùng `npx eslint src`.)

**Deploy bản web** (EAS Hosting, project `an-gi-hcm` của tài khoản Expo chủ dự án, tên miền https://chot-le.expo.app):
```bash
npx expo export --platform web          # tạo dist/ (đọc EXPO_PUBLIC_* từ app/.env, gồm EXPO_PUBLIC_WEB_URL)
npx eas-cli@latest deploy --prod        # đưa lên production
```
Ổ C máy chủ dự án gần đầy: nếu cài/xuất lỗi, đặt `TEMP`/`TMP` và `npm_config_cache` sang ổ D.

## Việc tiếp theo (gợi ý)
- Gói "quán đối tác": cho chủ quán xem thống kê của quán mình (cần bảng owners + RLS theo quán).
- Nén/resize ảnh trước khi upload (expo-image-manipulator) để tiết kiệm dung lượng Storage.
- Bản đồ đang dùng ảnh nền OpenStreetMap miễn phí (giới hạn lượt dùng); khi đông người dùng nên chuyển sang nhà cung cấp có khóa (MapTiler, Stadia…) trong src/lib/map-html.ts.
- Kéo-thả sắp xếp thứ tự ảnh; quản lý danh mục (thêm/sửa) ngay trong tab Quản trị.
- Build lên store bằng EAS (`npx eas-cli@latest build`).
