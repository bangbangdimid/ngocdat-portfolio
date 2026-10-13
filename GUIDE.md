# Hướng dẫn sử dụng — dành cho admin

Thiết lập lần đầu (Supabase, email, chống bot): xem [supabase/SETUP.md](supabase/SETUP.md).

---

## 1. Vào trang quản trị
`/login.html` → đăng nhập bằng email admin → tự chuyển tới **Quản trị** (`/admin.html`).
Từ khu học tập cũng có nút **Quản trị** ở góc trên.

## 2. Tạo khoá học
**+ Khoá học mới** → nhập tên, mô tả → tích **Xuất bản** nếu muốn khoá hiện ở trang chủ → *Lưu khoá*.
- Khoá **nháp** (chưa xuất bản) không hiện công khai, nhưng học sinh đã ghi danh vẫn vào học được.
- Nút **Gỡ xuất bản / Xuất bản**, **Sửa**, **Xoá khoá** ở đầu trang của từng khoá. Xoá khoá sẽ xoá luôn toàn bộ bài, mã và ghi danh của khoá đó.

## 3. Thêm video bài giảng
1. Upload video lên YouTube, chọn chế độ hiển thị **Không công khai (Unlisted)** — *không* chọn Riêng tư (Private) vì sẽ không phát được khi nhúng.
   Nên tắt bình luận và đặt *Not made for kids* tuỳ ý.
2. Trong khoá → tab **Bài giảng & tài liệu** → **Video (YouTube)** → dán link (`https://youtu.be/...` hoặc link đầy đủ) → chọn quyền xem → **+ Thêm video**.
3. **Quyền xem**:
   - *Chỉ học sinh đã ghi danh* — mặc định, cho bài học chính.
   - *Công khai (mẫu)* — hiện ở trang chủ mục **Bài giảng mẫu** cho phụ huynh xem thử (chỉ hiện khi khoá đã xuất bản).
4. **Thứ tự**: số nhỏ hiện trước (0, 1, 2…).

## 4. Tải tài liệu (đề, lời giải, slide…)
Tab **Tài liệu (tệp)** → kéo-thả tệp → đặt tiêu đề, quyền xem → **+ Tải lên**.
- Nhận: PDF, Word, Excel, PowerPoint, ảnh, TXT/CSV, ZIP, MP3/MP4 nhỏ — tối đa **50MB**/tệp.
- Không nhận HTML/SVG/JS/EXE (có thể chứa mã độc).
- Học sinh mở tài liệu qua link tạm thời **hết hạn sau 1 giờ**, nên link gửi ra ngoài cũng nhanh chóng vô hiệu.

## 5. Phát mã kích hoạt cho học sinh
Tab **Mã kích hoạt** → nhập mã (vd `TOAN9-2026`) hoặc **để trống để tự sinh** → đặt:
- **Số lượt dùng tối đa** — mã chung cho cả lớp: đặt bằng sĩ số (vd 30); mã riêng từng em: để 1.
- **Hết hạn** (tuỳ chọn) — sau ngày này mã không dùng được nữa.

Gửi mã cho học sinh (Zalo/tin nhắn). Mã **không phân biệt hoa thường**. Có thể **tắt** (⏸) hoặc **xoá** mã bất cứ lúc nào — học sinh *đã* kích hoạt trước đó vẫn giữ quyền.

## 6. Học sinh vào học như thế nào
1. Vào website → **Đăng nhập** → tab **Đăng ký** (họ tên, email, SĐT, mật khẩu ≥ 8 ký tự).
2. Mở email, bấm link xác nhận (kiểm tra cả mục Spam).
3. Đăng nhập → **Khu học tập** → nhập **mã lớp** → khoá hiện ra → bấm **Vào học**.
4. Quên mật khẩu: trang đăng nhập → **Quên mật khẩu?** → nhận link đặt lại qua email.

## 7. Quản lý học sinh
Tab **Học sinh** của từng khoá: tên, SĐT, ngày ghi danh.
**Gỡ khỏi lớp** (🗑) → học sinh mất quyền xem khoá **ngay lập tức** (dùng khi học sinh nghỉ học / hết hạn học phí). Muốn cho học lại thì phát mã mới.

## 8. Sửa nội dung trang chủ
Mọi chỗ có thể sửa nhanh đều nằm trong `assets/js/config.js`, sửa xong commit & push là website tự cập nhật.

**Hotline / Zalo** (dùng cho mọi nút gọi, nút Zalo và nút nổi góc màn hình):
```js
CONTACT_PHONE: "0775118240",
ZALO_URL:      "https://zalo.me/0775118240",
```

**Cảm nhận của học sinh**: phần này **tự ẩn** cho tới khi có ít nhất một lời cảm nhận. Dán đúng lời học sinh viết (không tự soạn thay):
```js
TESTIMONIALS: [
  { name: "Đông Nghi",  badge: "HSG Toán 9 - 2025", quote: "Lời cảm nhận của Nghi..." },
  { name: "Hải Đăng",   badge: "Ôn thi 10 chuyên",  quote: "..." },
  { name: "Quang Khôi", badge: "",                  quote: "..." },
],
```

**Tài liệu & bài giảng mẫu** có 2 nguồn:
- *Mẫu cố định* (4 tài liệu PDF + 3 video): tệp trong `assets/samples/` và `assets/lessons/`, khai báo trong `index.html` ở phần `id="mau"`.
- *Mẫu đăng từ trang Quản trị*: mọi video/tài liệu bạn đặt quyền xem **Công khai (mẫu)**, thuộc khoá **đã xuất bản**, sẽ tự hiện thêm vào cuối phần này. Không cần sửa code.

Các đoạn chữ khác (giới thiệu, thành tích, lớp học) sửa trực tiếp trong `index.html`. Quy ước: chỉ tiếng Việt, dùng dấu gạch ngắn "-", không dùng dấu "—".

## 9. Câu hỏi thường gặp
- **Học sinh báo "Email chưa được xác nhận"** → bảo em kiểm tra Spam; nếu email không tới, xem SETUP bước 6 (SMTP).
- **Học sinh báo "Mã không đúng"** → kiểm tra mã còn *Đang bật*, còn lượt (*Đã dùng x/y*) và chưa hết hạn.
- **Video không phát** → video trên YouTube phải ở chế độ *Unlisted* và cho phép nhúng.
- **Thêm video bài giảng mẫu tự quay (mp4) vào trang chủ** → nén về 720p (khổ dọc 9:16), đặt vào `assets/lessons/` kèm ảnh poster `.jpg` cùng tên, rồi thêm một khối `lesson-card` trong `index.html`. Video quá 20MB nên đưa lên YouTube và đăng qua trang Quản trị.
- **Không ai đăng nhập được** → Supabase có thể đang bị tạm dừng: vào dashboard bấm *Resume*, rồi kiểm tra GitHub Action keep-alive (SETUP bước 8).
- **Muốn thêm admin khác** → chạy câu SQL ở SETUP bước 4 với email của người đó.
