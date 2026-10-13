# Hướng dẫn quản trị - Lớp Toán anh Đạt

Tài liệu cho admin (anh Đạt, email `ngocdat2006@gmail.com`).
Thiết lập lần đầu (Supabase, email, chống bot): xem [supabase/SETUP.md](supabase/SETUP.md).

---

## 0. Website gồm những gì

| Thành phần | Dùng để làm gì | Ở đâu |
|---|---|---|
| **Vercel** | Chạy website `https://ngocdat.vercel.app`. Mỗi lần push lên GitHub là tự cập nhật sau khoảng 1 phút. | vercel.com |
| **GitHub** | Lưu mã nguồn và chạy việc tự động hằng ngày (giữ Supabase không bị tạm dừng). | github.com/bangbangdimid/ngocdat-portfolio |
| **Supabase** | Tài khoản học sinh, khoá học, mã kích hoạt, tài liệu (file). | supabase.com, project `oblugkacwssddaibbvvx` |
| **YouTube** | Chứa video bài giảng (chế độ Không công khai). | youtube.com |
| **Cloudflare Turnstile** | Ô "Tôi không phải robot" ở trang đăng nhập/đăng ký. | dash.cloudflare.com |

Học sinh **không** có cách nào xem video/tài liệu của khoá khi chưa nhập đúng mã kích hoạt. Quyền này do database kiểm tra, không phụ thuộc giao diện.

---

## 1. Việc admin cần làm để duy trì web

### Khi có học sinh mới (vài phút mỗi lần)
1. Vào **Quản trị** → chọn khoá → tab **Mã kích hoạt** → tạo mã (mục 4).
2. Gửi mã và link `https://ngocdat.vercel.app/login.html` cho học sinh qua Zalo.
3. Hướng dẫn em đăng ký theo mục 5 (có thể gửi luôn đoạn tin nhắn mẫu ở cuối mục 5).

### Hằng tuần
- Đăng video bài giảng mới lên YouTube rồi thêm vào khoá (mục 3).
- Tải tài liệu, đề, lời giải mới (mục 3).
- Xem hộp thư `ngocdat2006@gmail.com`: nếu có email của GitHub báo **"Keep Supabase awake" failed** thì làm theo mục 7.1.

### Hằng tháng (khoảng 10 phút)
- **Supabase → Usage**: xem dung lượng còn trong hạn mức miễn phí:
  - Database 500 MB, gần như không bao giờ chạm tới;
  - File Storage 1 GB, chủ yếu do tài liệu PDF;
  - Băng thông (Egress) 5 GB/tháng, tốn nhiều khi học sinh tải tài liệu nặng.

  Nếu Storage gần đầy: xoá tài liệu cũ không dùng, hoặc nén PDF trước khi tải lên.
- **GitHub → tab Actions → Keep Supabase awake**: các lần chạy gần nhất phải có dấu ✓ xanh.
- Tab **Mã kích hoạt** của từng khoá: tắt (⏸) hoặc xoá các mã đã phát xong.

### Mỗi khi kết thúc khoá hoặc học sinh nghỉ
- Tab **Học sinh** → **Gỡ khỏi lớp** những em đã nghỉ hoặc hết hạn học phí. Em đó mất quyền xem **ngay lập tức**.
- Tắt mã cũ để không ai dùng lại được.
- Nếu khoá không tuyển nữa: bấm **Gỡ xuất bản**. Học sinh đã ghi danh vẫn học được, chỉ là khoá không còn hiện công khai.

### Khi muốn sửa trang chủ
Xem mục 6. Sửa xong commit và push là web tự cập nhật.

---

## 2. Vào trang quản trị
`/login.html` → đăng nhập bằng email admin → tự chuyển tới **Quản trị** (`/admin.html`).
Từ trang **Lớp học** cũng có nút **Quản trị** ở góc trên.

### Tạo khoá học
**+ Khoá học mới** → nhập tên, mô tả → tích **Xuất bản** nếu muốn khoá hiện công khai → **Lưu khoá**.
- Khoá **nháp** (chưa xuất bản) không hiện công khai, nhưng học sinh đã ghi danh vẫn vào học được.
- Ở đầu trang của mỗi khoá có các nút **Gỡ xuất bản / Xuất bản**, **Sửa**, **Xoá khoá**.
- **Xoá khoá** sẽ xoá luôn toàn bộ bài, mã và ghi danh của khoá đó, không khôi phục được.

## 3. Thêm bài giảng và tài liệu

### Video (YouTube)
1. Tải video lên YouTube, chọn chế độ hiển thị **Không công khai (Unlisted)**. *Không* chọn Riêng tư (Private) vì sẽ không phát được trên web.
2. Trong khoá → tab **Bài giảng & tài liệu** → **Video (YouTube)** → dán link (`https://youtu.be/...` hoặc link đầy đủ) → chọn quyền xem → **+ Thêm video**.

### Tài liệu (tệp)
Tab **Tài liệu (tệp)** → kéo-thả tệp → đặt tiêu đề, quyền xem → **+ Tải lên**.
- Nhận PDF, Word, Excel, PowerPoint, ảnh, TXT/CSV, ZIP, MP3/MP4 nhỏ, tối đa **50 MB**/tệp.
- Không nhận HTML/SVG/JS/EXE (có thể chứa mã độc).
- Học sinh mở tài liệu qua link tạm thời **hết hạn sau 1 giờ**, nên link bị gửi ra ngoài cũng nhanh chóng vô hiệu.

### Quyền xem và thứ tự
- **Chỉ học sinh đã ghi danh**: mặc định, dùng cho bài học chính.
- **Công khai (mẫu)**: hiện ở trang chủ, mục **Tài liệu & bài giảng mẫu**, cho phụ huynh xem thử. Chỉ hiện khi khoá đã xuất bản.
- **Thứ tự**: số nhỏ hiện trước (0, 1, 2...).

## 4. Phát mã kích hoạt
Tab **Mã kích hoạt** → nhập mã (vd `TOAN9-2026`) hoặc **để trống để tự sinh**, rồi đặt:
- **Số lượt dùng tối đa**: mã chung cho cả lớp thì đặt bằng sĩ số (vd 30); mã riêng từng em thì để 1.
- **Hết hạn** (tuỳ chọn): sau ngày này mã không dùng được nữa.

Mã chỉ gồm chữ, số, dấu gạch ngang (4-32 ký tự) và **không phân biệt hoa thường**.
Danh sách **Mã đã phát** cho biết mỗi mã *Đã dùng x/y*. Có thể **tắt** (⏸) hoặc **xoá** mã bất cứ lúc nào; học sinh đã kích hoạt trước đó vẫn giữ quyền.

---

## 5. Tạo tài khoản mới và vào lớp học

### Phía admin (làm trước)
1. Có khoá học (mục 2) và đã phát mã cho khoá đó (mục 4).
2. Gửi mã cho học sinh.

### Phía học sinh
1. Mở `https://ngocdat.vercel.app` → bấm **Đăng nhập** (góc trên) → chọn tab **Đăng ký**.
2. Điền **Họ và tên**, **Email**, **Số điện thoại** (tuỳ chọn), **Mật khẩu** (tối thiểu 8 ký tự).
3. Đợi ô xác minh chống robot hiện dấu ✓ rồi bấm **Tạo tài khoản**.
4. Mở email, bấm vào link xác nhận. Nếu không thấy thì kiểm tra cả mục **Spam / Quảng cáo**.
5. Quay lại trang đăng nhập → nhập email, mật khẩu → **Đăng nhập**. Web tự chuyển vào trang **Lớp học**.
6. Ở ô **Có mã lớp?** nhập mã đã được gửi → bấm **Kích hoạt**. Thông báo "Kích hoạt thành công!" hiện ra và khoá học xuất hiện bên dưới.
7. Bấm vào khoá để xem video và tài liệu.

Lần sau chỉ cần **Đăng nhập** là vào thẳng lớp. Một tài khoản có thể kích hoạt nhiều khoá bằng nhiều mã khác nhau.

**Quên mật khẩu**: trang đăng nhập → **Quên mật khẩu?** → nhập email → mở link trong email → đặt mật khẩu mới.

### Học sinh báo lỗi

| Học sinh thấy | Nguyên nhân và cách xử lý |
|---|---|
| Không nhận được email xác nhận | Kiểm tra Spam. Nếu vẫn không có: Supabase chưa cài SMTP riêng (SETUP bước 6) hoặc đã hết lượt gửi trong giờ. Có thể xác nhận tay cho em, xem "Xác nhận email thủ công" bên dưới. |
| "Email chưa được xác nhận" | Em chưa bấm link trong email. |
| "Email hoặc mật khẩu không đúng." | Gõ sai, hoặc dùng **Quên mật khẩu?**. |
| "Email này đã có tài khoản." | Em đã đăng ký rồi, chỉ cần đăng nhập. |
| "Mã không đúng hoặc đã hết lượt/hết hạn." | Kiểm tra trong tab Mã kích hoạt: mã còn *Đang bật*, còn lượt, chưa hết hạn. |
| "Bạn đã ở trong lớp này rồi." | Không phải lỗi, khoá đã mở sẵn. |
| Thử mã sai nhiều lần bị chặn | Hệ thống cho thử tối đa 10 lần/10 phút để chống dò mã. Đợi 10 phút. |
| "Vui lòng đợi ô xác minh chống robot..." | Đợi ô Cloudflare hiện ✓ rồi bấm lại. Tắt chặn quảng cáo/VPN nếu ô không hiện. |
| Video không phát | Video trên YouTube phải ở chế độ *Unlisted* và cho phép nhúng. |

### Xác nhận email thủ công / ghi danh không cần mã
Dùng khi email không tới hoặc khi tạo tài khoản test. Học sinh vẫn phải tự đăng ký (bước 1-3) với mật khẩu của em; admin **không** đặt mật khẩu thay học sinh.
Vào Supabase → **SQL Editor**, thay email và tên khoá (slug) rồi chạy:
```sql
-- xác nhận email
update auth.users set email_confirmed_at = now()
where email = 'hocsinh@example.com' and email_confirmed_at is null;

-- (tuỳ chọn) ghi danh thẳng vào khoá, khỏi cần mã
insert into public.enrollments (user_id, course_id)
select u.id, c.id from auth.users u, public.courses c
where u.email = 'hocsinh@example.com' and c.slug = 'hsg-toan-9'
on conflict (user_id, course_id) do nothing;
```
Slug của khoá xem bằng: `select slug, title from public.courses;`

### Đoạn tin nhắn gửi cho học sinh
> Em vào https://ngocdat.vercel.app/login.html, chọn **Đăng ký**, điền họ tên, email, mật khẩu. Mở email bấm link xác nhận (xem cả mục Spam). Đăng nhập xong nhập mã lớp **MÃ-CỦA-EM** vào ô "Có mã lớp?" rồi bấm **Kích hoạt** là vào học được nhé.

---

## 6. Sửa nội dung trang chủ
Phần lớn nội dung hay sửa nằm trong `assets/js/config.js`. Sửa xong commit và push là website tự cập nhật.

**Hotline / Zalo** (dùng cho mọi nút gọi, nút Zalo và nút nổi ở góc màn hình):
```js
CONTACT_PHONE: "0775118240",
ZALO_URL:      "https://zalo.me/0775118240",
```

**Cảm nhận của học sinh** (`TESTIMONIALS`): mỗi em gồm `name`, `badge` (thành tích) và `quote` (lời cảm nhận). Chỉ dán đúng lời học sinh viết. Nếu xoá hết, phần này tự ẩn.

**Tài liệu & bài giảng mẫu** có 2 nguồn:
- *Mẫu cố định* (4 tài liệu PDF và 3 video): tệp nằm trong `assets/samples/` và `assets/lessons/`, khai báo trong `index.html` ở phần `id="mau"`.
- *Mẫu đăng từ trang Quản trị*: mọi video/tài liệu đặt quyền xem **Công khai (mẫu)** trong khoá **đã xuất bản** sẽ tự hiện thêm ở cuối phần này. Không cần sửa code.

Các đoạn chữ khác (giới thiệu, thành tích, lớp học) sửa trực tiếp trong `index.html`.
Quy ước: chỉ tiếng Việt, xưng "anh Đạt", dùng dấu gạch ngắn "-" và không dùng dấu gạch dài.

**Thêm video mẫu tự quay (mp4) vào trang chủ**: nén về 720p khổ dọc 9:16, đặt vào `assets/lessons/` kèm ảnh poster `.jpg` cùng tên, rồi thêm một khối `lesson-card` trong `index.html`. Video trên 20 MB nên đưa lên YouTube và đăng qua trang Quản trị.

---

## 7. Sự cố thường gặp

### 7.1 Không ai đăng nhập được: Supabase bị tạm dừng
Supabase gói miễn phí **tự tạm dừng project sau khoảng 7 ngày không có truy cập**.

**Cách web đang tự chống:**
- GitHub Action **Keep Supabase awake** (`.github/workflows/keep-supabase-awake.yml`) gửi 1 yêu cầu đọc nhỏ vào database **mỗi ngày** (khoảng 9 giờ sáng, GitHub có thể chạy trễ vài tiếng).
- GitHub vốn tự tắt lịch chạy của repo public sau 60 ngày không có commit. Action này tự bật lại chính nó sau mỗi lần chạy nên không bị tắt.
- Nếu một lần ping thất bại, GitHub gửi email báo lỗi về email chủ repo.

**Khi nhận email báo lỗi, hoặc học sinh báo không đăng nhập được:**
1. Vào supabase.com → project → nếu thấy **Paused** thì bấm **Resume / Restore project**, đợi vài phút.
2. GitHub → **Actions** → **Keep Supabase awake** → **Run workflow** → kiểm tra có dấu ✓ xanh.
3. Nếu thấy dòng "This scheduled workflow is disabled" thì bấm **Enable workflow**.

> Project bị tạm dừng quá 90 ngày thì Supabase không cho khôi phục từ dashboard nữa. Vì vậy đừng bỏ qua email báo lỗi.

### 7.2 Website không mở được
- Vào vercel.com → project → **Deployments**: bản mới nhất phải là **Ready**. Nếu lỗi thì bấm vào bản Ready trước đó → **Promote to Production** để quay lại.
- Vừa sửa code mà web hỏng: hoàn tác commit gần nhất rồi push lại.

### 7.3 Thêm admin khác
Người đó đăng ký tài khoản trên web, rồi chạy câu SQL ở SETUP bước 4 với email của người đó.

### 7.4 Lưu ý về gói miễn phí
- **Supabase Free**: 500 MB database, 1 GB file, 5 GB băng thông/tháng, 50.000 người dùng hoạt động/tháng. Dư cho một lớp dưới 500 học sinh nếu video để trên YouTube.
- **Email**: email mặc định của Supabase chỉ gửi được rất ít và có thể không tới email của học sinh. **Bắt buộc** cài SMTP riêng miễn phí (Resend/Brevo) theo SETUP bước 6 trước khi tuyển sinh thật.
- **Vercel Hobby** (gói miễn phí) theo điều khoản chỉ dành cho mục đích phi thương mại. Khi lớp chạy ổn định và có thu học phí qua web, nên cân nhắc nâng gói hoặc chuyển sang Cloudflare Pages (miễn phí, cho phép thương mại).
