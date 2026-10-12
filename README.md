# Ngọc Đạt — Lớp Toán & khu học tập trực tuyến

Website song ngữ (VI/EN) gồm 3 phần:

| Ai | Thấy gì |
|---|---|
| **Khách / phụ huynh** (không đăng nhập) | Trang giới thiệu, thành tích, các khoá đang mở, **bài giảng mẫu** miễn phí |
| **Học sinh** (email + mật khẩu, kích hoạt bằng mã lớp) | Video bài giảng + tài liệu của **đúng khoá đã ghi danh** |
| **Admin** (chủ trang) | Tạo khoá, thêm video YouTube, upload tài liệu, phát mã, quản lý học sinh |

Hướng dẫn dùng cho admin: **[GUIDE.md](GUIDE.md)** · Thiết lập Supabase: **[supabase/SETUP.md](supabase/SETUP.md)**

## Kiến trúc

- **Frontend tĩnh** (HTML/CSS/JS thuần, không build) deploy trên **Vercel**.
- **Supabase**: Auth (email + mật khẩu), Postgres với **Row Level Security**, Storage (bucket private `materials`).
- **Video**: YouTube chế độ *Unlisted*, chỉ nhúng cho người có quyền (miễn phí, chịu tải lớn).

```
index.html            trang công khai (giới thiệu, khoá học, bài mẫu)
login.html            đăng nhập / đăng ký / quên & đặt lại mật khẩu
hoc.html              khu học tập của học sinh (nhập mã lớp, danh sách khoá)
khoahoc.html          xem bài học của một khoá (video + tài liệu)
admin.html            quản trị (chỉ admin)
assets/css/           tokens · base · components · landing · auth · admin
assets/js/            config · i18n · supabaseClient · auth · landing · login · hoc · khoahoc · admin
assets/vendor/        supabase-js 2.117.2 (tự host, đã pin phiên bản)
supabase/schema.sql   bảng, RLS, hàm kích hoạt mã, chính sách storage
vercel.json           header bảo mật (CSP, HSTS, chống clickjacking…)
.github/workflows/    keep-alive giữ Supabase không bị tạm dừng
```

## Mô hình bảo mật

- **Phân quyền ở server** bằng RLS: học sinh chỉ đọc được nội dung khoá mình ghi danh; anon chỉ đọc nội dung đánh dấu *mẫu*; chỉ admin được ghi. Kiểm tra trong JS chỉ để điều hướng — tắt JS hay sửa code trên trình duyệt cũng không lấy được dữ liệu.
- **Mã kích hoạt** kiểm tra trong hàm server `redeem_access_code` (giới hạn 10 lần thử / 10 phút, có log). Học sinh không thể tự ghi danh nếu không có mã hợp lệ, không thể tự nâng quyền admin.
- **Tài liệu** nằm trong bucket private, chỉ phát **signed URL hết hạn sau 1 giờ** cho người có quyền. Bucket giới hạn 50MB và chỉ nhận loại tệp an toàn.
- **CSP chặt**: chỉ chạy script của chính site (+ Cloudflare Turnstile); không script inline; chặn nhúng site vào iframe lạ.
- Anon key trong `config.js` là **khoá công khai theo thiết kế** của Supabase — an toàn vì mọi quyền do RLS quyết định. Không bao giờ đưa *service_role key* vào code.
- Chặn bot: xác nhận email + rate limit của Supabase; tuỳ chọn bật Cloudflare Turnstile (xem SETUP bước 7).

Giới hạn cần biết: video YouTube Unlisted chỉ được *ẩn*, học sinh đã có quyền vẫn có thể copy link chia sẻ. Muốn chống triệt để cần dịch vụ video trả phí (Bunny/Cloudflare Stream) — kiến trúc đã tách sẵn nên đổi sau không phải làm lại.

## Chạy thử ở máy

```bash
npx serve -l 5500
```

Mở `http://localhost:5500` (phải qua `http://`, không mở file trực tiếp). Nhớ thêm `http://localhost:5500/**` vào Redirect URLs của Supabase.

## Deploy

Push lên `main` → Vercel tự deploy. Các file nội bộ (SQL, tài liệu, file portfolio cũ) được loại khỏi bản deploy qua `.vercelignore`.
