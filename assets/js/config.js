/* ============================================================
   config.js - shared runtime config (loaded first on every page)
   The anon key is public by design; Row Level Security protects data.
   ============================================================ */
window.APP_CONFIG = {
  SUPABASE_URL:      "https://oblugkacwssddaibbvvx.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ibHVna2Fjd3NzZGRhaWJidnZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1MzUyMjUsImV4cCI6MjA5NDExMTIyNX0.WUWDsydW3fIQzMRU8ZJAiszaflmoKbgKvQbD7NBC0kE",
  OWNER_EMAIL:       "ngocdat2006@gmail.com",
  STORAGE_BUCKET:    "materials",

  // Cloudflare Turnstile site key (public). Leave "" to disable the widget.
  TURNSTILE_SITE_KEY: "0x4AAAAAAFU3R9-jhWGso78h",

  // Hotline / Zalo chính thức (hiển thị ở trang chủ và nút liên hệ nhanh).
  CONTACT_PHONE: "0775118240",
  CONTACT_EMAIL: "ngocdat2006@gmail.com",
  ZALO_URL:      "https://zalo.me/0775118240",

  // Cảm nhận của học sinh. Phần này chỉ hiện trên trang chủ khi có ít nhất
  // một mục có "quote". Điền đúng lời học sinh viết (không tự soạn thay).
  //   name: tên hiển thị, badge: lớp/khoá đã học, quote: lời cảm nhận
  TESTIMONIALS: [
    {
      name: "Quang Khôi",
      badge: "Giải Nhất HSG môn Toán",
      quote: "Học đội tuyển với anh Đạt cuốn thật sự. Anh không bắt học vẹt công thức mà dạy cách đào sâu bản chất bài toán, rèn cách lập luận chặt chẽ từng bước một. Tài liệu LaTeX anh soạn siêu xịn và chuẩn chỉ. Nhờ anh đồng hành sát sao mà em tự tin ẵm luôn giải Nhất HSG đợt vừa rồi!",
    },
    {
      name: "Đông Nghi",
      badge: "Đỗ Chuyên Toán - THPT Chuyên Lê Hồng Phong",
      quote: "Giai đoạn ôn thi vào Chuyên Toán LHP áp lực cực kỳ, nhưng cứ tới giờ học với anh Đạt là thấy nhẹ đầu hẳn. Mấy câu hình học với đại số phân loại khó nhằn được anh mổ xẻ rất dễ hiểu, chỉ cần nhìn đúng bản chất là ra hướng làm ngay. Em đỗ được nguyện vọng 1 công lớn là nhờ anh Đạt kèm.",
    },
    {
      name: "Hải Đăng",
      badge: "Đỗ Chuyên Tin 2 - Phổ thông Năng khiếu",
      quote: "Tư duy số học với logic anh Đạt rèn cho em lúc học đội tuyển bổ trợ cực mạnh cho môn Tin. Anh dạy tư duy bài toán rất mạch lạc, tối ưu và không bị rập khuôn. Nhờ nền tảng toán vững chắc anh xây cho mà em đã chinh phục thành công mục tiêu Chuyên Tin 2 PTNK.",
    },
  ],

  // where to send students after login, and admins
  ROUTES: { home: "index.html", login: "login.html", app: "hoc.html", admin: "admin.html" },
};
