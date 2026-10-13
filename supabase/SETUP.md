# Thiết lập Supabase cho nền tảng khoá học

Phần này **chỉ chủ trang làm được** (trong dashboard Supabase / Cloudflare). Các bước 1–5 bắt buộc, 6–8 khuyến nghị.

---

## 1. Bật đăng nhập Email + Mật khẩu
Dashboard → **Authentication → Sign In / Providers → Email**:
- Bật **Email**, bật **Confirm email** (chống tạo tài khoản rác).
- Độ dài mật khẩu tối thiểu: **8**.

## 2. URL cho link xác nhận & đặt lại mật khẩu
Authentication → **URL Configuration**:
- **Site URL**: `https://ngocdat.vercel.app`
- **Redirect URLs** - thêm đủ 3 dòng (có `/**` ở cuối):
  ```
  https://ngocdat.vercel.app/**
  https://*-bangbangdimids-projects.vercel.app/**
  http://localhost:5500/**
  ```
  Dòng 2 cho các bản preview của Vercel (đổi theo tên team Vercel của bạn nếu khác). Thiếu dòng nào thì link trong email ở môi trường đó sẽ không quay về đúng trang.

## 3. Chạy schema (chạy LẠI mỗi khi file `schema.sql` được cập nhật)
SQL Editor → **New query** → **Ctrl+A** xoá trắng → dán **toàn bộ** `schema.sql` → **Run** → phải thấy *Success*.
File an toàn khi chạy nhiều lần. Nó cũng tự tạo bucket `materials` ở chế độ **private**, giới hạn 50MB và chỉ nhận tệp an toàn (PDF, ảnh, Word, Excel, PowerPoint, ZIP…).

> Bản mới nhất đã thêm: lưu SĐT lúc đăng ký, mã kích hoạt không phân biệt hoa/thường, giới hạn độ dài hồ sơ, giới hạn loại tệp. **Hãy chạy lại 1 lần.**

## 4. Biến tài khoản của bạn thành admin
Đăng ký tài khoản bằng email của bạn trên website (hoặc Authentication → Users → Add user), rồi chạy:
```sql
update public.profiles
set role = 'admin'
where id = (select id from auth.users where email = 'ngocdat2006@gmail.com');
```

## 5. Kiểm tra nhanh
Đăng nhập ở `/login.html` bằng email admin → phải vào thẳng trang **Quản trị**.

---

## 6. (Bắt buộc trước khi tuyển sinh) Gửi email bằng SMTP riêng - miễn phí
Email mặc định của Supabase chỉ dành để thử nghiệm: **giới hạn rất thấp (vài email/giờ)** và có thể không gửi tới email của người ngoài nhóm dự án. Không cài SMTP riêng thì học sinh có thể không nhận được email xác nhận / đặt lại mật khẩu.
1. Tạo tài khoản miễn phí ở **Resend** (3.000 email/tháng) hoặc **Brevo** (300 email/ngày).
2. Lấy thông tin SMTP (host, port, user, password).
3. Supabase → Authentication → **Emails → SMTP Settings** → bật **Custom SMTP**, điền thông tin.
4. Authentication → **Rate Limits**: tăng giới hạn email/giờ cho phù hợp (vd 30).

## 7. (Khuyến nghị) Chặn bot bằng Cloudflare Turnstile - miễn phí
1. https://dash.cloudflare.com → **Turnstile** → **Add widget** → domain `ngocdat.vercel.app` (thêm `localhost` nếu muốn test local) → chế độ **Managed** → lấy **Site Key** + **Secret Key**.
2. Supabase → Authentication → **Attack Protection** → bật **CAPTCHA protection** → chọn **Turnstile** → dán **Secret Key**.
3. Mở `assets/js/config.js`, điền `TURNSTILE_SITE_KEY: "Site Key của bạn"` → commit & push.
   *Làm bước 2 và 3 cùng lúc* - nếu bật ở Supabase mà chưa điền key ở website thì đăng nhập sẽ báo lỗi CAPTCHA.
4. **Secret Key tuyệt đối không dán vào code / không gửi ai.**

## 8. Giữ database luôn "thức"
Supabase gói Free tự tạm dừng sau ~7 ngày không có truy cập → học sinh không đăng nhập được.
Repo đã có GitHub Action `.github/workflows/keep-supabase-awake.yml` ping database mỗi ngày, và tự bật lại lịch chạy của chính nó nên không bị GitHub tắt sau 60 ngày không có commit. Kiểm tra: GitHub → tab **Actions** → *Keep Supabase awake* → **Run workflow** → phải có dấu ✓ xanh. Xem thêm GUIDE mục 7.1.

---

## Dọn dẹp hệ thống portfolio cũ (tuỳ chọn)
Nếu chưa xoá, có thể bỏ bảng và bucket **public** cũ:
```sql
drop table if exists public.project_files cascade;
drop table if exists public.projects cascade;
```
Rồi Storage → bucket **`portfolio`** → xoá bucket (bucket này đang public).
