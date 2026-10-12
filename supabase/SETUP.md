# Thiết lập nền tảng khoá học — Phase 0

Phần này **chỉ bạn bấm được** (trong dashboard Supabase + Cloudflare). Làm 1 lần, ~15–20 phút. Làm xong báo mình để build Phase 1 (đăng nhập + phân quyền).

> Dùng chung project Supabase hiện tại cũng được. Schema mới **thay thế** hệ thống `projects` cũ (portfolio) — bảng cũ đang trống nên bỏ qua an toàn; muốn gọn có thể xoá sau (bước 7).

---

## 1. Bật đăng nhập Email + Mật khẩu
Dashboard → **Authentication → Providers → Email**:
- Bật **Email**.
- Bật **Confirm email** (bắt buộc xác thực email — chống tạo tài khoản rác).
- (Khuyến nghị) Authentication → **Policies/Passwords**: bật **Leaked password protection**, đặt độ dài mật khẩu tối thiểu 8.

## 2. Đặt Site URL & Redirect
Authentication → **URL Configuration**:
- **Site URL**: domain thật khi deploy (vd `https://ngocdat-portfolio.vercel.app`). Khi test local để `http://localhost:5500`.
- **Redirect URLs**: thêm cả hai (local + domain thật).

## 3. Chạy schema
SQL Editor → **New query** → **Select All (Ctrl+A)** rồi dán **toàn bộ** `schema.sql` → **Run**.
Phải thấy "Success". File được bọc trong transaction nên nếu lỗi sẽ tự rollback sạch (không để lại trạng thái nửa vời) — cứ sửa và chạy lại, an toàn khi chạy nhiều lần.

## 4. Tạo bucket lưu tài liệu
Storage → **New bucket**:
- Tên: **`materials`**  (đúng tên này)
- **Private** (KHÔNG tích public).

Policy cho bucket đã nằm sẵn trong `schema.sql` (phần D) nên **không cần chạy lại gì thêm** — tạo bucket trước hay sau khi chạy schema đều được.

## 5. Biến bạn thành admin
Đăng ký 1 tài khoản bằng email owner (`ngocdat2006@gmail.com`) trên chính website (sau khi có Phase 1) **hoặc** tạo nhanh ở Authentication → Users → Add user. Sau đó SQL Editor chạy:
```sql
update public.profiles
set role = 'admin'
where id = (select id from auth.users where email = 'ngocdat2006@gmail.com');
```

## 6. Chặn bot — Cloudflare Turnstile (LÀM SAU, không bắt buộc ngay)
> Không liên quan tới bước 7. Có thể bỏ qua ở Phase 1 — giai đoạn đầu đã có xác thực
> email + rate-limit của Supabase + RLS. Khi nào sẵn sàng gia cố thì làm:
1. Vào https://dash.cloudflare.com → **Turnstile** → **Add site** → nhập domain → lấy **Site Key** + **Secret Key**.
2. Supabase → Authentication → **Attack Protection (CAPTCHA)** → chọn **Turnstile** → dán **Secret Key**.
3. Gửi **Site Key** cho mình (key này công khai, dán vào frontend). **Secret Key tuyệt đối không đưa cho ai / không commit.**

## 7. (Tuỳ chọn, KHÔNG liên quan Turnstile) Dọn hệ thống portfolio cũ
Nếu không dùng kho portfolio cũ nữa:
```sql
drop table if exists public.project_files cascade;
drop table if exists public.projects cascade;
```

---

## Checklist gửi lại cho mình
- [ ] Đã chạy `schema.sql` thành công
- [ ] Bucket `materials` (private) đã tạo + đã chạy lại mục 7
- [ ] Đã set role admin cho email của bạn
- [ ] **Turnstile Site Key:** `...` (dán vào đây)
- [ ] Site URL đang dùng: `...`

Xong 4 ô trên là mình bắt tay vào Phase 1.
