# Ngọc Đạt — Personal Website

Trang cá nhân **song ngữ Việt–Anh** theo hướng *academic tối giản*: hồ sơ học thuật (Olympic Toán, thành tích), giới thiệu giảng dạy, và một **kho tài liệu** công khai. Ai cũng xem & tải được; **chỉ owner** (đăng nhập bằng magic link) mới thêm/sửa/xoá tài liệu.

## Cấu trúc

```
index.html              nội dung trang (markup song ngữ VI/EN)
assets/css/tokens.css   design tokens — màu, font, spacing
assets/css/base.css     reset, typography, nav, hero, section, footer
assets/css/components.css  lưới tài liệu, thẻ, modal, form
assets/js/app.js        JS + CONFIG Supabase + hệ thống song ngữ
supabase-setup.sql      script tạo database & policy (chạy 1 lần)
GUIDE.md                hướng dẫn setup đầy đủ (đọc file này để deploy)
```

Không cần build/npm. Deploy tĩnh (Vercel/Netlify/GitHub Pages). Khi chạy local phải qua web server (`http://`), không mở bằng `file://` — magic-link auth cần origin http.

## Bắt đầu nhanh

1. **Xem trước:** chạy một static server trong thư mục này, ví dụ `npx serve` hoặc `python -m http.server 5500`, rồi mở `http://localhost:5500`.
2. **Backend Supabase:** đã cấu hình sẵn trong `assets/js/app.js` (block `CONFIG` ở đầu file). Owner email hiện là `ngocdat2006@gmail.com`. Chi tiết tạo project + chạy SQL: xem [GUIDE.md](GUIDE.md).
3. **Đăng nhập owner:** footer → *Đăng nhập* → nhập email owner → mở magic link trong hộp thư → banner "Chế độ chủ trang" hiện lên → thêm tài liệu bằng ô **+**.

## Song ngữ

Nút **VI / EN** ở góc phải nav. Mỗi đoạn text có thuộc tính `data-vi` và `data-en` trong `index.html`; muốn đổi nội dung nhớ sửa cả hai. Lựa chọn ngôn ngữ được lưu trong `localStorage`.

## Tuỳ biến

Xem bảng "Customize nhanh" trong [GUIDE.md](GUIDE.md). Nhanh nhất:
- Đổi tên: find-replace `Ngọc Đạt` trong `index.html`.
- Đổi màu/nền/font: sửa biến trong `assets/css/tokens.css`.
- Đổi thành tích: sửa các `.ledger-row` trong `index.html`.

## Bảo mật

RLS (Row Level Security) ở Supabase đảm bảo chỉ email owner mới INSERT/UPDATE/DELETE được — anon key để lộ cũng không sao vì policy chặn ở server. Magic-link: không có mật khẩu để bị lộ.
