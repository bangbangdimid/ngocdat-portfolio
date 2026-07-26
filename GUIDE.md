# Personal Website — Hướng dẫn đầy đủ

Một site cá nhân để chia sẻ **bài giảng, sheet, PDF, project**. Public ai cũng xem & download được. **Chỉ riêng bạn** (owner) được upload, edit, xoá.

---

## 1. Cấu trúc thư mục

```
Personal_website/
├── index.html              ← nội dung trang (markup song ngữ VI/EN)
├── assets/
│   ├── css/
│   │   ├── tokens.css      ← màu, font, spacing (design tokens)
│   │   ├── base.css        ← reset, typography, nav, hero, section, footer
│   │   └── components.css  ← lưới tài liệu, thẻ, modal, form
│   └── js/
│       └── app.js          ← toàn bộ JS + CONFIG Supabase + song ngữ
├── supabase-setup.sql      ← script tạo database & policy (chạy 1 lần)
├── GUIDE.md                ← file này
└── README.md               ← bản tóm tắt
```

Frontend là **HTML/CSS/JS thuần** — không build, không npm. Deploy tĩnh (Vercel/Netlify/GitHub Pages) là chạy. Chỉ cần chạy qua một web server (http://), không mở bằng `file://` vì magic-link auth cần origin http.

---

## 2. Hai chế độ chạy

### 2A. Demo mode (chạy ngay, không cần backend)

- Mở `index.html` trong trình duyệt → site lên ngay
- Banner đen "Demo mode" hiện ở trên cùng
- Dữ liệu lưu trong **localStorage trình duyệt** — chỉ máy bạn thấy, không chia sẻ được
- Để vào owner mode demo: click "Sign in" ở footer → nhập đúng email owner (`ngocdat2006@gmail.com`) → owner banner màu vàng hiện ra, bạn upload thử được

⚠️ Demo mode chỉ để **xem trước giao diện**. Muốn share thật cho người khác, làm tiếp phần 2B.

### 2B. Production mode (có backend Supabase — free, để share thật)

Đây là chế độ bạn cần để gửi link cho nhiều người xem. Setup mất ~10 phút, làm 1 lần.

---

## 3. Setup Supabase (chỉ làm 1 lần)

### Bước 1 — Tạo Supabase project

1. Vào https://supabase.com → **Sign up** (dùng Google/GitHub cho nhanh)
2. Bấm **New project**
3. Đặt tên (vd `personal-site`) → chọn region **Southeast Asia (Singapore)** → set DB password (lưu lại) → **Create**
4. Đợi ~2 phút project khởi tạo xong

### Bước 2 — Chạy SQL setup

1. Trong dashboard → sidebar **SQL Editor** → **New query**
2. Mở file `supabase-setup.sql` trong dự án
3. **Find & Replace** tất cả `ngocdat2006@gmail.com` (4 chỗ) → email bạn dùng làm owner (nếu khác)
4. Copy toàn bộ SQL → paste vào editor → bấm **Run** (hoặc Ctrl+Enter)
5. Phải thấy "Success. No rows returned" → DB + storage bucket đã tạo xong

### Bước 3 — Bật Email auth

1. Sidebar **Authentication** → **Providers** → đảm bảo **Email** đang **On**
2. Sidebar **Authentication** → **URL Configuration**:
   - **Site URL**: tạm để `http://localhost:5500` (sẽ đổi sau khi deploy)
   - **Redirect URLs**: thêm domain bạn sẽ deploy (vd `https://your-site.netlify.app/*`)

### Bước 4 — Lấy API key + dán vào index.html

1. Sidebar **Project Settings** (bánh răng) → **API**
2. Copy:
   - **Project URL** (vd `https://abcxyz.supabase.co`)
   - **anon public** key (chuỗi dài bắt đầu `eyJhbGc...`)
3. Mở `assets/js/app.js`, block `CONFIG` nằm ngay đầu file, điền vào:

```js
const CONFIG = {
  SUPABASE_URL:      "https://abcxyz.supabase.co",   // ← Project URL
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIs...",      // ← anon key
  OWNER_EMAIL:       "ngocdat2006@gmail.com",        // ← email owner
  STORAGE_BUCKET:    "portfolio",
};
```

Save file. Reload trình duyệt — banner "Demo mode" sẽ biến mất.

### Bước 5 — Login lần đầu

1. Click **Sign in** ở footer (góc dưới phải, chữ nhỏ "· Sign in")
2. Nhập email owner → bấm **Send magic link**
3. Mở email → click link → bạn được redirect về site
4. Banner màu vàng "Owner mode" hiện trên cùng → bạn đã có quyền upload

---

## 4. Cách upload file (sau khi đã login owner)

### Thêm piece mới

1. Cuộn xuống phần "The Archive" (section work)
2. Cuối lưới các card, có 1 tile gạch nét đứt **"+ Add a new piece"** (chỉ owner mới thấy)
3. Click vào → modal mở ra
4. Điền:
   - **Title** — tên hiển thị (vd "Bài giảng 03 — Tích phân")
   - **Description** — 1 dòng mô tả
   - **Type** — chọn loại: Lecture / Paper / Doc / Sheet / Code / Folder / Studies. Loại này dùng cho filter chips ở trên đầu lưới.
   - **Tags** — phân cách dấu `,` hoặc `·` (vd `Toán 12, Chương 4`)
   - **Meta** — text hiện ở góc thumbnail (vd `42 phút`, `12 trang`, `v1.2`)
5. **Cover image** — drag-drop 1 ảnh/video vào ô gạch nét đứt phía dưới. Không bắt buộc — nếu trống sẽ dùng thumbnail mặc định theo type.
6. **Attachments** — drag-drop **nhiều file cùng lúc** (PDF, video, sheet, ảnh, code zip, v.v.). Hoặc click ô để chọn file. Mỗi file xuất hiện 1 dòng — có thể xoá lẻ trước khi save.
7. Bấm **Save piece** → upload chạy → toast "Đã thêm" → card xuất hiện trong lưới.

### Edit / xoá piece cũ

- Khi đang ở owner mode, **hover lên card** → thấy 2 nút tròn ở góc trên phải:
  - 🖉 (bút chì) — mở lại editor, đổi info hoặc add/remove file
  - 🗑 (thùng rác) — confirm xong là xoá luôn (cả file trên storage)

### Người khác xem & tải file

- Bất kỳ ai mở link → thấy lưới project (không có nút edit/delete, không có "+ Add")
- Click vào card → modal chi tiết mở ra → list toàn bộ file đính kèm
- Mỗi file có link **Download** → bấm để tải hoặc mở trong tab mới

---

## 5. Deploy public (gửi link cho người khác)

Site là static HTML — deploy free ở bất kỳ host nào.

### Cách 1 — Netlify Drop (nhanh nhất, 30 giây)

1. Vào https://app.netlify.com/drop
2. Kéo cả thư mục `Personal_website` (chứa `index.html` + folder `assets`) thả vào trang
3. Có ngay URL public dạng `https://wonderful-cat-123.netlify.app`
4. (Optional) Vào dashboard → đổi site name hoặc add custom domain

### Cách 2 — Vercel

```bash
cd Personal_website
npx vercel
```

Follow prompt → có URL.

### Cách 3 — GitHub Pages

1. Push folder lên GitHub repo
2. Settings → Pages → branch `main` / root → Save
3. ~1 phút sau có URL `https://username.github.io/repo-name/`

### ⚠️ Sau khi deploy

Quay lại Supabase → **Authentication → URL Configuration**:
- Đổi **Site URL** thành domain thật (vd `https://your-site.netlify.app`)
- Thêm domain vào **Redirect URLs**

Không làm bước này → magic link click xong sẽ redirect về localhost, không login được.

---

## 6. Filter & chia sẻ link

Ở section work có thanh filter chips: **All Work · Lectures · Papers & PDFs · Docs · Sheets · Code · Folders · Studies**. Click để lọc theo type.

Khi share link, người nhận chỉ cần URL chính, vd:
```
https://your-site.netlify.app
```
Không cần đăng nhập, không cần app. Chỉ owner cần login.

---

## 7. Customize nhanh

Trang song ngữ: mỗi đoạn text có `data-vi="..."` và `data-en="..."` trong `index.html`. **Sửa cả hai** để đổi nội dung ở cả hai ngôn ngữ (phần bên trong thẻ là bản tiếng Việt hiển thị mặc định).

| Muốn đổi | Sửa ở đâu |
|---|---|
| **Tên "Ngọc Đạt"** | Find-replace `Ngọc Đạt` trong `index.html` (nav, hero, about, footer) |
| Text hero | Tìm `<h1 class="reveal d1"` trong `index.html` — sửa cả text hiển thị lẫn `data-vi`/`data-en` |
| Sub-title hero | Tìm `class="hero-sub"` |
| Số liệu (stats) hero | Tìm `class="hero-stats"` |
| Thành tích / huy chương | Tìm `<div class="ledger">` (mỗi giải là 1 `.ledger-row`) |
| Nội dung giảng dạy | Tìm `class="teach-grid"` và `class="teach-proof"` |
| Email contact | Find-replace `ngocdat2006@gmail.com` |
| Link GitHub / LinkedIn | Tìm `class="socials"` trong footer, thay `href="#"` |
| Màu accent (ink-blue) | Đổi `--accent` trong `assets/css/tokens.css` |
| Tông màu / nền giấy | Đổi `--paper`, `--ink`, `--brass` trong `tokens.css` |
| Font | Đổi `<link>` Google Fonts trong `<head>` + biến `--serif/--sans/--mono` trong `tokens.css` |
| Loại tài liệu & nhãn | Sửa `TYPE_LABELS` và chip filter (`data-f`) trong `app.js` + `index.html` |

---

## 8. Giới hạn & cost

Supabase **free tier**:
- 500 MB database (~10K rows)
- 1 GB file storage
- 5 GB bandwidth/tháng
- 50K monthly active users

Đủ dùng cho portfolio cá nhân với vài chục piece, file < 50 MB. Khi đầy có thể upgrade Pro $25/tháng (8 GB DB, 100 GB storage, 250 GB bandwidth).

⚠️ **Free project sẽ bị pause sau 1 tuần không ai truy cập**. Có cách giữ active: cài cron job ping mỗi tuần, hoặc đơn giản là mở site 1 lần/tuần.

---

## 9. Bảo mật

- **RLS (Row Level Security)** ở Supabase chặn mọi INSERT/UPDATE/DELETE từ user không phải owner. Lộ anon key cũng không sao — Supabase chặn bằng policy ở server side.
- **Magic link auth** — không password, không bị brute-force.
- Anyone có thể login bằng email khác → nhưng policy trả 0 rows khi họ cố insert/update → không phá được data.

---

## 10. Troubleshooting

| Lỗi | Cách fix |
|---|---|
| Vẫn thấy "Demo mode" banner sau khi điền CONFIG | Hard refresh (Ctrl+Shift+R). Check console F12 xem có lỗi load Supabase SDK không. |
| Magic link click → về localhost | Bạn quên đổi **Site URL** ở Supabase sau khi deploy. |
| "Owner mode" không hiện sau khi click magic link | Email login phải **đúng tuyệt đối** với `OWNER_EMAIL` trong CONFIG (lowercase OK). |
| Upload báo lỗi "row violates RLS policy" | Bạn chưa login đúng email owner, hoặc SQL setup chưa thay đúng email ở 4 chỗ. Mở SQL Editor → chạy lại file SQL. |
| Drag-drop không hoạt động | Một số browser cần permission. Click vào ô để chọn file thay thế. |
| File upload chậm | Supabase free tier upload ~5 MB/s. File > 50 MB nên convert / nén trước. |
| Sau deploy, project vẫn hiện list cũ của demo | Demo dùng localStorage máy bạn. Mở site mới không có data trong DB → trang sẽ trống. Login owner → add piece mới. |

---

## 11. Mở rộng (optional)

Vài hướng nâng cấp nếu thích:

- **Tag filter nâng cao** — hiện chỉ filter theo type. Có thể thêm filter theo tags.
- **Sort / search** — thêm ô search ở đầu archive.
- **View counter** — thêm cột `views` vào DB, increment khi mở detail modal.
- **Categories ghép vào URL** — `index.html#work?filter=paper` để share link tới 1 filter.
- **Email subscribe** — Supabase auth có sẵn signup, có thể làm list email gửi update khi có piece mới.

Code đã structure khá rõ để mở rộng, hỏi mình lúc nào cần.

---

Done. Gửi link cho bạn bè được rồi 🌊
