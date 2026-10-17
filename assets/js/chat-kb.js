/* ============================================================
   chat-kb.js - knowledge base of the online advisor (chatbot.js)

   Every answer below repeats facts already published on the home page.
   Deliberately NOT answered here, because the site does not state them:
   tuition, timetable, class size, in-person vs online format. Those
   intents hand the visitor over to Zalo / phone instead of guessing.

   To change an answer, edit the text in `say`. To teach the bot a new
   phrase, add it to `kw` WITHOUT Vietnamese accents (lower case);
   [phrase, weight] makes a phrase count more. Tokens {phone}, {email} are
   filled from config.js.
   ============================================================ */
(function () {
  const P = (text) => ({ p: text });
  const UL = (...items) => ({ ul: items });
  const ACT = (...acts) => ({ acts });
  const ZALO = { act: "zalo", label: "Nhắn Zalo tư vấn" };
  const CALL = { act: "call", label: "Gọi {phone}" };
  const GO = (sel, label) => ({ act: "go", sel, label });
  const LINK = (href, label) => ({ act: "link", href, label });

  const HAND_OVER = "Phần này anh Đạt tư vấn riêng theo từng học sinh nên mình không báo số liệu sai được. Bạn nhắn Zalo hoặc gọi, anh Đạt sẽ trả lời trực tiếp nhé.";

  const intents = [
    { id: "hello", label: "Xin chào", kw: ["xin chao", "chao", "hello", "hi", "alo", "hey", "chao anh", "chao ban"],
      say: [P("Xin chào! Mình là trợ lý tự động của Lớp Toán anh Đạt. Bạn muốn tìm hiểu điều gì?")] },

    { id: "fee", label: "Học phí", kw: [["hoc phi", 3], ["gia ca", 3], ["bao nhieu tien", 3], ["bao nhieu", 2], ["chi phi", 3], ["thu phi", 3], "phi", "gia", "tien"],
      say: [P("Học phí được anh Đạt tư vấn riêng theo trình độ và lớp của từng học sinh, nên chưa có bảng giá chung. " + "Bạn nhắn Zalo hoặc gọi để được báo giá chính xác nhé."), ACT(ZALO, CALL)],
      next: ["schedule", "courses"] },

    { id: "schedule", label: "Lịch học", kw: [["lich hoc", 3], ["gio hoc", 3], ["hoc khi nao", 3], ["buoi hoc", 2], ["hoc thu may", 3], ["may buoi", 3], ["khai giang", 3], ["so buoi", 3], ["moi tuan", 2], ["si so", 3], ["bao lau", 2], ["thoi gian", 2], ["bat dau", 2]],
      say: [P("Lịch học và sĩ số mỗi lớp được sắp xếp theo trình độ học sinh. " + HAND_OVER), ACT(ZALO, CALL)],
      next: ["fee", "courses"] },

    { id: "mode", label: "Hình thức học", kw: [["online", 3], ["offline", 3], ["truc tiep", 3], ["hoc o dau", 3], ["dia chi", 3], ["hoc tai nha", 3], ["hinh thuc", 3], ["zoom", 3], ["google meet", 3], ["trung tam", 2], ["o dau", 2], ["truc tuyen", 2]],
      say: [P("Học viên của lớp có khu Lớp học trực tuyến trên web để xem lại video bài giảng và tải tài liệu bất cứ lúc nào."),
        P("Hình thức học cụ thể của từng lớp (trực tiếp hay trực tuyến) và địa điểm, anh Đạt sẽ trao đổi khi bạn liên hệ. Anh Đạt ở TP. Hồ Chí Minh."), ACT(ZALO, CALL)],
      next: ["schedule", "fee"] },

    { id: "register", label: "Đăng ký học", kw: [["dang ky hoc", 4], ["muon hoc", 3], ["muon dang ky", 3], ["dang ky lop", 3], ["dang ky", 2], ["tham gia", 1], ["xin vao lop", 3], ["nhan hoc sinh", 3]],
      say: [P("Để đăng ký học, bạn nhắn Zalo hoặc gọi cho anh Đạt. Anh sẽ tư vấn lớp phù hợp, lịch học và học phí."),
        P("Sau khi đăng ký, anh Đạt gửi cho bạn một mã lớp. Bạn tạo tài khoản trên web và nhập mã đó để vào Lớp học trực tuyến."), ACT(ZALO, CALL)],
      next: ["account", "courses"] },

    { id: "account", label: "Tạo tài khoản và vào lớp", kw: [["tao tai khoan", 4], ["dang ky tai khoan", 4], ["tai khoan", 3], ["dang nhap", 3], ["ma lop", 3], ["ma kich hoat", 4], ["kich hoat", 3], ["nhap ma", 3], ["vao lop hoc", 3], ["vao hoc", 2], ["dang ky", 2], ["co ma", 2]],
      say: [P("Các bước tạo tài khoản và vào lớp:"),
        UL("Bấm Đăng nhập ở góc trên, chọn tab Đăng ký.",
          "Điền họ tên, email, số điện thoại (không bắt buộc) và mật khẩu từ 8 ký tự. Đợi ô xác minh chống robot hiện dấu tick rồi bấm Tạo tài khoản.",
          "Mở email, bấm link xác nhận (xem cả mục Spam).",
          "Đăng nhập, vào trang Lớp học, nhập mã lớp vào ô Có mã lớp rồi bấm Kích hoạt."),
        P("Mã lớp do anh Đạt gửi khi bạn đăng ký học."), ACT(LINK("login.html?tab=signup", "Tạo tài khoản"), ZALO)],
      next: ["email_issue", "code_problem"] },

    { id: "password", label: "Quên mật khẩu", kw: [["quen mat khau", 4], ["doi mat khau", 4], ["dat lai mat khau", 4], ["lay lai mat khau", 4], ["mat khau", 3], ["reset", 2]],
      say: [UL("Vào trang Đăng nhập, bấm Quên mật khẩu?", "Nhập email của tài khoản, rồi mở link trong email để đặt mật khẩu mới.", "Chưa thấy email thì đợi vài phút và kiểm tra mục Spam."),
        ACT(LINK("login.html", "Đến trang Đăng nhập"))],
      next: ["email_issue", "contact"] },

    { id: "email_issue", label: "Không nhận được email", kw: [["khong nhan duoc email", 5], ["khong thay email", 5], ["email xac nhan", 4], ["link xac nhan", 4], ["khong co email", 4], ["thu rac", 3], ["spam", 3], ["xac nhan", 2], ["chua nhan", 2], "email"],
      say: [UL("Đợi 1-2 phút rồi kiểm tra cả mục Spam, Quảng cáo hoặc Thư rác.", "Kiểm tra lại email đã nhập khi đăng ký có đúng chưa."),
        P("Vẫn chưa có? Nhắn anh Đạt qua Zalo kèm email bạn đã đăng ký để được hỗ trợ."), ACT(ZALO)],
      next: ["account", "contact"] },

    { id: "code_problem", label: "Mã lớp không dùng được", kw: [["ma khong dung", 5], ["ma sai", 4], ["ma het han", 5], ["het luot", 4], ["kich hoat khong duoc", 5], ["khong kich hoat", 5], ["ma khong duoc", 4], ["khong dang nhap duoc", 3], ["bao loi", 2]],
      say: [P("Bạn kiểm tra giúp mình: mã gõ đúng (không phân biệt hoa thường), còn lượt dùng và chưa hết hạn."),
        P("Nhập sai nhiều lần liên tiếp sẽ bị tạm khoá vài phút, bạn đợi rồi thử lại. Nếu vẫn lỗi, nhắn anh Đạt qua Zalo để được kiểm tra mã."), ACT(ZALO)],
      next: ["account", "contact"] },

    { id: "samples", label: "Học thử miễn phí", kw: [["hoc thu", 4], ["tai lieu mau", 4], ["video mau", 4], ["bai giang mau", 4], ["xem thu", 3], ["mien phi", 3], ["tai lieu", 2], ["bai giang", 2], ["video", 2], ["pdf", 2], ["tai ve", 2], "mau"],
      say: [P("Bạn xem miễn phí, không cần đăng nhập, ngay ở mục Tài liệu & bài giảng mẫu:"),
        UL("4 tài liệu PDF: Phương trình bậc hai và hệ thức Viète; Số học (chia hết, đồng dư, nghiệm nguyên); Phép chia hết và đồng dư thức; Số hữu tỉ và thực hiện phép tính.",
          "3 video bài giảng ngắn: giải hệ phương trình bậc hai hai ẩn; độ dài tiếp tuyến và diện tích tam giác; đường đi trong vườn (Pythagore và ứng dụng)."),
        ACT(GO("#mau", "Xem tài liệu mẫu"))],
      next: ["courses", "parents"] },

    { id: "parents", label: "Dành cho phụ huynh", kw: [["phu huynh", 4], ["bo me", 3], ["ba me", 3], ["con toi", 3], ["con em", 3], ["cho con", 3], ["cho em", 2]],
      say: [P("Phụ huynh có thể xem tài liệu và video mẫu ngay trên trang, không cần đăng nhập, để hình dung chất lượng bài giảng."),
        P("Muốn trao đổi về trình độ của con và chọn lớp phù hợp, phụ huynh nhắn Zalo hoặc gọi trực tiếp cho anh Đạt."), ACT(GO("#mau", "Xem tài liệu mẫu"), ZALO, CALL)],
      next: ["courses", "fee"] },

    { id: "contact", label: "Liên hệ nhanh", kw: [["lien he", 4], ["so dien thoai", 4], ["sdt", 4], ["hotline", 4], ["gap nguoi", 4], ["nguoi that", 3], ["tu van vien", 3], ["noi chuyen", 3], ["goi dien", 3], ["zalo", 3], "goi", "email"],
      say: [P("Bạn có thể liên hệ trực tiếp với anh Đạt:"), UL("Hotline / Zalo: {phone}", "Email: {email}", "Địa điểm: TP. Hồ Chí Minh"), ACT(ZALO, CALL)],
      next: ["courses", "fee"] },

    { id: "teacher", label: "Về anh Đạt", kw: [["anh dat", 3], ["giao vien", 3], ["ai day", 4], ["la ai", 3], ["thanh tich", 4], ["huy chuong", 4], ["kinh nghiem", 3], ["ngoai thuong", 3], ["bang cap", 3], ["uy tin", 3], ["gioi thieu", 2], "ftu"],
      say: [P("Anh Ngọc Đạt là sinh viên ngành Tài chính - Ngân hàng, Trường Đại học Ngoại thương (cơ sở TP. Hồ Chí Minh) và là cựu học sinh chuyên Tin, Trường Phổ thông Năng khiếu."),
        P("Một số thành tích:"),
        UL("Huy chương Bạc Olympic Toán học Sinh viên toàn quốc 2026, huy chương Đồng 2025 (môn Đại số).",
          "Huy chương Vàng IKMC lớp 11 và 12; Huy chương Vàng AMC và AMO lớp 12.",
          "Giải Nhất HSG Toán và Giải Nhất Giải toán trên máy tính cầm tay cấp Thành phố lớp 9; Giải Ba HSG Toán cấp Thành phố lớp 12."),
        P("Học sinh anh Đạt kèm đã đạt Giải Nhất HSG Toán, đỗ chuyên Toán THPT chuyên Lê Hồng Phong và chuyên Tin PTNK."), ACT(GO("#giao-vien", "Xem hồ sơ đầy đủ"))],
      next: ["courses", "contact"] },

    { id: "quocte", label: "Toán quốc tế", kw: [["thi quoc te", 5], ["quoc te", 4], ["amc", 4], ["amo", 4], ["ikmc", 4], ["olympic", 3], ["tieng anh", 3]],
      say: [P("Hướng Toán quốc tế (AMC, AMO, IKMC) giúp học sinh làm quen dạng đề, cách tư duy và thuật ngữ Toán bằng tiếng Anh."),
        P("Anh Đạt từng đạt Huy chương Vàng IKMC lớp 11 và 12, Huy chương Vàng AMC và AMO lớp 12. Lớp và lịch học cụ thể, bạn nhắn anh Đạt nhé."), ACT(ZALO, CALL)],
      next: ["courses", "fee"] },

    { id: "chuyen", label: "Ôn thi lớp 10 chuyên", kw: [["lop 10 chuyen", 5], ["chuyen toan", 4], ["chuyen tin", 4], ["thi chuyen", 4], ["vao chuyen", 4], ["truong chuyen", 4], ["le hong phong", 4], ["lhp", 4], ["nang khieu", 3], ["ptnk", 3]],
      say: [P("Hướng Ôn thi vào lớp 10 chuyên dành cho học sinh lớp 9: luyện đề tuyển sinh 10 và đề vào lớp chuyên Toán, chuyên Tin của PTNK và các trường chuyên."),
        P("Học sinh anh Đạt kèm đã đỗ chuyên Toán THPT chuyên Lê Hồng Phong và chuyên Tin PTNK."), ACT(ZALO, GO("#lop-hoc", "Xem các lớp"))],
      next: ["lop9", "hsg9"] },

    { id: "lop9", label: "Lớp 9 ôn thi tuyển sinh", kw: [["thi vao lop 10", 5], ["thi vao 10", 5], ["tuyen sinh 10", 5], ["vao lop 10", 5], ["tuyen sinh", 4], ["thi lop 10", 4], ["on thi lop 9", 4]],
      say: [P("Lớp 9 định hướng ôn thi tuyển sinh:"),
        UL("Đối tượng: học sinh lớp 9 chuẩn bị thi vào lớp 10, cả trường thường và trường chuyên.",
          "Mục tiêu: nắm chắc mọi dạng bài trong đề tuyển sinh, trình bày chặt chẽ, không mất điểm đáng tiếc.",
          "Nội dung: rút gọn căn thức, hàm số y = ax², phương trình bậc hai và Viète, toán thực tế, đường tròn, hệ thức lượng, BĐT và cực trị, bộ đề ôn PTNK.",
          "Tài liệu: bộ 25 chuyên đề có lời giải chi tiết, kèm đề tự luyện cuối mỗi chuyên đề."), ACT(ZALO, GO("#mau", "Xem tài liệu mẫu"))],
      next: ["fee", "schedule"] },

    { id: "hsg9", label: "HSG Toán 9", kw: [["hsg toan 9", 6], ["hoc sinh gioi lop 9", 6], ["hsg lop 9", 5], ["hsg 9", 5], ["gioi toan 9", 4]],
      say: [P("Lớp HSG Toán 9:"),
        UL("Đối tượng: học sinh khá giỏi lớp 9 thi học sinh giỏi cấp quận, cấp thành phố.",
          "Mục tiêu: thành thạo kỹ thuật chuyên sâu, xử lý được các câu phân loại trong đề HSG.",
          "Nội dung: bất đẳng thức, cực trị đại số, nghiệm nguyên, số học nâng cao, phương tích, đồng quy - thẳng hàng, tổ hợp - đếm, Dirichlet - cực hạn - bất biến.",
          "Tài liệu: bộ 30 chuyên đề HSG 9 và đề ôn tổng hợp."), ACT(ZALO, GO("#mau", "Xem tài liệu mẫu"))],
      next: ["fee", "schedule"] },

    { id: "hsg7", label: "HSG Toán 7", kw: [["hsg toan 7", 6], ["hoc sinh gioi lop 7", 6], ["hsg lop 7", 5], ["hsg 7", 5]],
      say: [P("Lớp HSG Toán 7:"),
        UL("Đối tượng: học sinh lớp 7 yêu thích Toán, thi học sinh giỏi cấp quận, cấp thành phố.",
          "Mục tiêu: xây nền tư duy sớm, làm quen bài khó và các kỹ thuật chứng minh.",
          "Nội dung: tính nhanh và dãy quy luật, giá trị tuyệt đối, chia hết và đồng dư, số nguyên tố, tỉ lệ thức, GTLN - GTNN, nguyên lý Dirichlet, hình học tam giác.",
          "Tài liệu: bộ 17 chuyên đề HSG 7 có lời giải chi tiết."), ACT(ZALO, GO("#mau", "Xem tài liệu mẫu"))],
      next: ["fee", "schedule"] },

    { id: "co_ban7", label: "Toán cơ bản lớp 7", kw: [["co ban lop 7", 6], ["toan co ban", 3], ["mat goc", 3], ["hoc yeu", 3], ["cung co", 3], ["co ban", 2], ["nen tang", 2]],
      say: [P("Lớp Toán cơ bản lớp 7:"),
        UL("Đối tượng: học sinh lớp 7 cần củng cố nền tảng hoặc muốn học thật vững kiến thức trên lớp.",
          "Mục tiêu: hiểu bài trên lớp, làm chắc bài kiểm tra và sẵn sàng học nâng cao.",
          "Nội dung: số hữu tỉ, lũy thừa, số thực và căn bậc hai, tỉ lệ thuận - nghịch, đa thức một biến, tam giác bằng nhau, thống kê - xác suất.",
          "Tài liệu: phiếu bài tập theo từng bài học và tài liệu chuyên đề."),
        P("Anh Đạt còn dạy Toán cơ bản cho các lớp 6-12, bạn nhắn Zalo để xếp lớp phù hợp."), ACT(ZALO)],
      next: ["fee", "schedule"] },

    { id: "courses", label: "Các lớp đang mở", kw: [["cac lop", 3], ["lop nao", 3], ["khoa hoc", 3], ["chuong trinh", 3], ["dang mo", 3], ["nhung lop", 3], ["danh sach lop", 4], ["lop gi", 3], ["day nhung gi", 4], ["lop hoc", 2], ["hoc gi", 2], ["mon gi", 2], "lop", "hsg"],
      say: [P("Hiện có 4 lớp để bạn chọn:"), UL("Lớp 9 định hướng ôn thi tuyển sinh", "HSG Toán 9", "HSG Toán 7", "Toán cơ bản lớp 7"),
        P("Ngoài ra anh Đạt còn dạy Toán cơ bản lớp 6-12, luyện thi HSG THCS lớp 6-9, ôn thi vào lớp 10 chuyên và Toán quốc tế (AMC, AMO, IKMC). Chọn một lớp bên dưới để xem chi tiết nhé."),
        ACT(GO("#lop-hoc", "Xem các lớp trên trang"))],
      next: ["lop9", "hsg9", "hsg7", "co_ban7", "quocte", "chuyen"] },

    // asked about a grade without saying which class: offer the matching ones
    { id: "grade9", label: "Lớp 9", kw: [],
      say: [P("Với lớp 9, anh Đạt có 2 lớp: Lớp 9 định hướng ôn thi tuyển sinh (thi vào lớp 10) và HSG Toán 9 (bồi dưỡng học sinh giỏi). Bạn quan tâm lớp nào?")], next: ["lop9", "hsg9", "chuyen"] },
    { id: "grade7", label: "Lớp 7", kw: [],
      say: [P("Với lớp 7, anh Đạt có 2 lớp: HSG Toán 7 (bồi dưỡng học sinh giỏi) và Toán cơ bản lớp 7 (củng cố nền tảng). Bạn quan tâm lớp nào?")], next: ["hsg7", "co_ban7"] },
    { id: "grade_mid", label: "Lớp 6 hoặc 8", kw: [],
      say: (c) => [P("Lớp " + c.grade + " thuộc hai hướng của anh Đạt: luyện thi HSG THCS (lớp 6-9) và Toán cơ bản (lớp 6-12). Các lớp đang mở xem ở mục Lớp học; riêng lớp " + c.grade + ", bạn nhắn Zalo để anh Đạt tư vấn xếp lớp phù hợp."), ACT(ZALO, GO("#lop-hoc", "Xem các lớp"))],
      next: ["courses", "fee"] },
    { id: "grade_high", label: "Lớp 10-12", kw: [],
      say: (c) => [P("Với lớp " + c.grade + ", anh Đạt có hướng Toán cơ bản (lớp 6-12) và Toán quốc tế (AMC, AMO, IKMC). Bạn nhắn Zalo để anh Đạt tư vấn lớp và lịch phù hợp."), ACT(ZALO, CALL)],
      next: ["quocte", "courses"] },

    { id: "thanks", label: "Cảm ơn", kw: [["cam on", 4], ["thanks", 4], ["thank", 3], ["tuyet voi", 2]],
      say: [P("Rất vui được hỗ trợ bạn! Cần thêm gì cứ hỏi mình, hoặc nhắn Zalo để anh Đạt tư vấn trực tiếp."), ACT(ZALO)], next: ["courses", "account"] },

    { id: "bye", label: "Tạm biệt", kw: [["tam biet", 4], ["bye", 4], ["hen gap lai", 4], ["thoi nhe", 2]],
      say: [P("Chào bạn, hẹn gặp lại! Khi cần cứ mở khung chat này hoặc nhắn Zalo cho anh Đạt nhé.")] },
  ];

  const fallback = {
    say: [P("Mình chưa hiểu rõ câu này. Bạn thử chọn một chủ đề bên dưới, hoặc nhắn Zalo để anh Đạt trả lời trực tiếp nhé."), ACT(ZALO, CALL)],
    next: ["courses", "fee", "account", "samples"],
  };

  window.CHAT_KB = {
    intents,
    fallback,
    menu: ["courses", "fee", "account", "samples", "teacher", "contact"],
    greeting: "Xin chào! Mình là trợ lý tự động của Lớp Toán anh Đạt. Bạn muốn tìm hiểu điều gì?",
    footnote: "Trả lời tự động từ thông tin trên trang. Muốn chắc chắn, hãy nhắn Zalo cho anh Đạt.",
  };
})();
