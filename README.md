# Portfolio — Setup Guide

Site portfolio public với hero cinematic. Owner login bằng magic link để upload/edit/xóa projects. Mọi người khác chỉ xem được.

## Files

- `index.html` — toàn bộ trang web (1 file duy nhất, không cần build)
- `supabase-setup.sql` — script tạo bảng + bảo mật, chạy 1 lần
- `README.md` — file này

---

## Demo trước khi setup backend

Mở `index.html` bằng trình duyệt là chạy được ngay ở **demo mode** (lưu localStorage). Để vào owner mode trong demo: click "Sign in" ở footer, nhập email `ngocdat2006@gmail.com`, click submit.

Demo phù hợp để xem giao diện. Bước thật bắt đầu bên dưới.

---

## Bước 1 — Tạo Supabase project

1. Vào https://supabase.com/dashboard, sign up / log in (free tier đủ dùng)
2. **New project** → đặt tên (ví dụ "portfolio") → chọn region gần bạn (Singapore) → set DB password → Create
3. Đợi ~2 phút project khởi tạo

## Bước 2 — Chạy SQL setup

1. Mở project vừa tạo → sidebar **SQL Editor** → **New query**
2. Mở file `supabase-setup.sql`, **Find & Replace** tất cả `ngocdat2006@gmail.com` thành email bạn muốn dùng làm owner (4 chỗ). Mặc định đã đúng nếu bạn dùng email đó.
3. Paste toàn bộ vào SQL editor → bấm **Run** (hoặc Ctrl+Enter)
4. Phải thấy "Success. No rows returned" — nghĩa là tables, RLS policies, storage bucket đã được tạo

## Bước 3 — Bật Email auth

1. Sidebar **Authentication** → **Providers** → đảm bảo **Email** đang On
2. **Authentication** → **URL Configuration** → set **Site URL** thành domain bạn sẽ deploy (vd `https://your-portfolio.netlify.app`). Khi đang test local, để `http://localhost:5500` hoặc tương tự.

## Bước 4 — Lấy API key & gắn vào HTML

1. Sidebar **Project Settings** (icon bánh răng) → **API**
2. Copy **Project URL** và **anon public** key
3. Mở `index.html`, tìm block `CONFIG` (gần dòng ~480), điền vào:

```js
const CONFIG = {
  SUPABASE_URL: 'https://xxxxx.supabase.co',          // ← Project URL
  SUPABASE_ANON_KEY: 'eyJhbGc...',                    // ← anon key
  OWNER_EMAIL: 'ngocdat2006@gmail.com',               // ← email owner
  STORAGE_BUCKET: 'portfolio'
};
```

Save file. Mở lại trong trình duyệt — banner "Demo mode" sẽ biến mất.

## Bước 5 — Login lần đầu

1. Click **Sign in** ở footer
2. Nhập email owner → **Send magic link**
3. Mở email, click vào link → bạn được redirect về site
4. Banner vàng "Owner Mode" hiện ở trên cùng → bạn đã có quyền edit
5. Click **+ Add New Project** ở cuối phần Work để tạo project đầu tiên

## Bước 6 — Deploy public

Bất kỳ static host nào cũng được. Đơn giản nhất:

**Netlify Drop** — kéo thả folder chứa `index.html` vào https://app.netlify.com/drop. Có ngay URL public.

**Vercel** — `npx vercel` trong folder, follow prompts.

**GitHub Pages** — push `index.html` lên repo → Settings → Pages → branch main / root.

⚠️ Sau khi deploy, quay lại Supabase **Authentication → URL Configuration** và update **Site URL** thành domain thật để magic link redirect đúng chỗ.

---

## Cách dùng

**Public visitors** — xem grid project, click vào để xem chi tiết, download file.

**Owner (bạn)** — sau khi login:
- Click **+ Add New Project** để tạo mới
- Mỗi card project có nút edit (✎) và delete (🗑) ở góc trên
- Trong editor: drag-drop cover image/video, drag-drop nhiều file đính kèm (PDF, video, sheet, image, text — bất kỳ định dạng gì)
- Click **Sign out** trong auth modal để thoát owner mode

**Limits** — Supabase free tier: 500MB database, 1GB file storage, 5GB bandwidth/tháng. Đủ cho portfolio cá nhân vài chục projects với file <50MB. Nếu đầy có thể upgrade $25/tháng.

---

## Custom

**Đổi text hero** — sửa thẳng trong `index.html`, tìm thẻ `<h1>` trong `<header class="hero">`.

**Đổi màu accent** — đầu file CSS có biến `--accent: #d6b67a` (màu vàng kem). Đổi hex code thôi.

**Đổi font** — tìm `@import` Google Fonts, đổi sang font khác.

**Đổi video background** — sửa `<source src="...">` trong thẻ `<video>` ở section hero.

**Custom domain** — Netlify/Vercel đều có settings để add custom domain miễn phí.

---

## Bảo mật

- RLS (Row Level Security) đảm bảo chỉ email owner có thể INSERT/UPDATE/DELETE projects và files. Anon key bị lộ không sao — Supabase chặn bằng policy.
- Magic link auth: không có password để bị crack.
- Người không phải owner login vào → policy trả 0 rows khi insert/update → họ không phá được data của bạn.

---

Có gì sai sót báo lại nhé.
