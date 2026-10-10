<div align="center">

<img src="resources/icon.png" width="96" alt="Mira" />

# Mira

**Workspace dịch truyện cùng AI, ngay trong editor**

Dịch truyện nhiều chương từ Anh, Trung, Nhật sang Việt: AI dịch và đề xuất sửa, bạn duyệt từng chỗ.

![Nền tảng](https://img.shields.io/badge/n%E1%BB%81n%20t%E1%BA%A3ng-Windows-1a1a1a)
![Electron](https://img.shields.io/badge/Electron-44-1a1a1a)
![Trạng thái](https://img.shields.io/badge/tr%E1%BA%A1ng%20th%C3%A1i-MVP%20th%E1%BB%AD%20nghi%E1%BB%87m-c2410c)

</div>

## 📖 Tổng quan

- **Làm việc cùng AI trong editor.** Bản gốc và bản dịch nằm hai pane cạnh nhau. AI dịch cả chương hoặc đề xuất sửa từng đoạn; bạn nhận hay bỏ từng chỗ ngay tại chỗ, `Ctrl+Z` hoàn tác được.
- **Dành cho truyện nhiều chương.** Mỗi tác phẩm có thư viện chương, thuật ngữ và bảng xưng hô riêng. AI đọc chúng mỗi lần dịch, giúp tên và cách xưng hô giữ nhất quán qua cả bộ truyện.
- **Dữ liệu nằm trên máy bạn.** Mọi thứ ngoại trừ bước gọi AI đều chạy offline. Mỗi tác phẩm là một tệp `.mira` (SQLite), sao lưu dễ dàng bằng cách sao chép tệp.
- **Chọn AI linh hoạt:** Hỗ trợ khóa API (Gemini, OpenRouter, OpenAI, DeepSeek, Anthropic, các endpoint tương thích OpenAI) hoặc đăng nhập tài khoản.

## ⚠️ Lưu ý

Mira đang là **bản MVP thử nghiệm**:

- Ứng dụng đã hoàn thiện các tính năng cốt lõi: thư viện tác phẩm, editor hai pane, dịch chương, bảng hỏi đáp AI.
- Đang tiếp tục tối ưu hóa trải nghiệm và hoàn thiện tính năng.
- Khuyến nghị sao lưu tệp tác phẩm định kỳ trong quá trình sử dụng.

## ✨ Tính năng

- **Dịch chương bằng AI**
  - Dịch theo lô, có giới hạn số lần gọi model mỗi chương.
  - Đoạn dịch lỗi được chạy lại riêng biệt.
  - Hỗ trợ chuyển sang model dự phòng khi cần.
- **Hỏi đáp AI theo ngữ cảnh chương**
  - Panel chat tự động nắm bắt nội dung chương, tra cứu trong tác phẩm, đối chiếu thuật ngữ và xưng hô.
  - Câu trả lời đi kèm đề xuất sửa đổi trực tiếp vào bản dịch.
  - Xem được quá trình suy nghĩ và các công cụ model đã sử dụng.
- **Duyệt đề xuất tại chỗ**
  - Mỗi đề xuất hiển thị trực tiếp trên đoạn văn, so sánh trực quan trước và sau.
  - Nhận hoặc bỏ từng đề xuất, hoặc áp dụng tất cả chỉ với một thao tác.
- **Quản lý thuật ngữ và xưng hô**
  - Tự động trích xuất ứng viên thuật ngữ từ bản gốc, kiểm tra trước khi đưa vào danh sách chính thức.
  - Thiết lập bảng quan hệ xưng hô giữa các nhân vật để đảm bảo tính nhất quán qua các chương.
- **Trau chuốt bản dịch:** Chẩn đoán lỗi ngữ pháp và diễn đạt trước khi đưa ra đề xuất chỉnh sửa.
- **Editor tối ưu hóa trải nghiệm đọc và biên tập:**
  - Định dạng cỡ chữ và khoảng cách dòng chuẩn cho văn bản dài (16 px, line-height 1.5);
  - Live preview Markdown, hỗ trợ chèn ảnh trực tiếp;
  - Cuộn mượt đồng bộ hai pane.
- **Giao diện tinh gọn:** Bảng màu tối giản, màu sắc dùng cho trạng thái rõ ràng, hỗ trợ theme sáng và tối.

## 🚀 Cách dùng

1. **Kết nối AI:** Trong lần khởi động đầu tiên, cấu hình nhà cung cấp AI qua khóa API hoặc đăng nhập tài khoản.
2. **Tạo tác phẩm:** Thiết lập tên tác phẩm, ngôn ngữ gốc, ảnh bìa.
3. **Nhập chương:** Dán văn bản hoặc nhập từ tệp `.txt` / `.md`.
4. **Dịch:** Mở chương, bắt đầu phiên dịch bằng AI và theo dõi tiến độ.
5. **Duyệt và chỉnh sửa:** Xem hai pane song song, duyệt đề xuất, hỏi đáp AI khi cần làm rõ ngữ cảnh.
6. **Xuất bản:** Xuất bản dịch ra định dạng `.txt`, `.md`, `.docx` hoặc `.pdf`.

## 📄 Định dạng hỗ trợ

| Mục | Định dạng |
| --- | --- |
| Nhập chương | `.txt`, `.md` hoặc dán trực tiếp |
| Nhập thuật ngữ | `Names.txt` |
| Xuất bản dịch | `.txt`, `.md`, `.docx`, `.pdf` |
| Ngôn ngữ gốc | Tiếng Anh, Trung giản thể, Trung phồn thể, Nhật |
| Ngôn ngữ đích | Tiếng Việt |

## 📚 Tài liệu

- [`ARCHITECTURE.md`](ARCHITECTURE.md): Quy tắc kiến trúc toàn repository và cấu trúc domain modules của renderer.
- [`DESIGN.md`](DESIGN.md): Hệ thống thiết kế UI, token và quy chuẩn thành phần giao diện.
- [Tài liệu theo module](docs/modules/README.md): Quyết định, nghiên cứu và trạng thái chi tiết của từng phạm vi sản phẩm.
- [Quy tắc repository](AGENTS.md): Quy chuẩn commit và các bước kiểm thử.

## 🛠️ Phát triển

Yêu cầu môi trường:
- Windows;
- Node.js ≥ 24;
- pnpm **8.9.0** (theo `packageManager` trong `package.json`, khuyến nghị dùng qua `corepack`).

```powershell
pnpm install                     # cài đặt dependencies bằng pnpm 8.9.0
pnpm dev                         # chạy ứng dụng ở chế độ phát triển
node scripts/check.mjs           # kiểm tra boundaries, typecheck, tests, lint trước khi commit
node scripts/check.mjs --build   # kiểm tra toàn diện và build gói trước khi push
```

> [!WARNING]
> Phiên bản pnpm toàn cục mới hơn bản ghim có thể in cảnh báo rồi thoát mà không chạy lệnh. Hãy luôn kiểm tra bằng `node scripts/check.mjs` thay vì gọi trực tiếp `pnpm test`.

**Công nghệ chủ đạo:**
- Electron + React + Tailwind CSS v4;
- CodeMirror cho editor biên tập hai pane;
- `node:sqlite` cho lưu trữ dữ liệu offline;
- Biome cho định dạng và lint;
- TypeScript cho type safety toàn diện.

**Cấu trúc mã nguồn:**
- `src/shared`: Contract và tiện ích thuần chia sẻ qua các tiến trình;
- `src/main`: Tiến trình nền Electron, dịch vụ SQLite, xử lý AI và IPC handlers;
- `src/preload`: Cầu nối typed an toàn (`window.mira`) cho renderer;
- `src/renderer`: Giao diện React tổ chức theo domain-first:
  - `modules/`: Các miền nghiệp vụ độc lập (`library`, `workspace`, `ai-connections`, `context`, `sources`, `export`), giao tiếp qua `public.ts`;
  - `app/`: Tầng điều phối cấp ứng dụng (`screens`, `navigation`, `shell`, `hooks`, `stores`);
  - `components/ui/`: Các UI component trung lập domain;
  - Bộ kiểm tra ranh giới phụ thuộc (`scripts/check-renderer-boundaries.mjs`) đảm bảo không có import vi phạm cấu trúc.

**Đóng góp:**
- Commit tuân theo [Conventional Commits](AGENTS.md#commits), commit message viết bằng tiếng Anh.
- Tài liệu sản phẩm viết bằng tiếng Việt.
