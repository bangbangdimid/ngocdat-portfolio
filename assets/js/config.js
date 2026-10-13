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
    { name: "Đông Nghi",  badge: "", quote: "" },
    { name: "Hải Đăng",   badge: "", quote: "" },
    { name: "Quang Khôi", badge: "", quote: "" },
  ],

  // where to send students after login, and admins
  ROUTES: { home: "index.html", login: "login.html", app: "hoc.html", admin: "admin.html" },
};
