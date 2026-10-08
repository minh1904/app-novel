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

- **Làm việc cùng AI trong editor.** Bản gốc và bản dịch nằm hai pane cạnh nhau. AI dịch cả chương
  hoặc đề xuất sửa từng đoạn; bạn nhận hay bỏ từng chỗ ngay tại chỗ, `Ctrl+Z` hoàn tác được.
- **Dành cho truyện nhiều chương.** Mỗi tác phẩm có thư viện chương, thuật ngữ và bảng xưng hô
  riêng. AI đọc chúng mỗi lần dịch, nên tên và cách xưng hô giữ nhất quán qua cả bộ truyện.
- **Dữ liệu nằm trên máy bạn.** Mọi thứ trừ bước gọi AI đều chạy offline. Mỗi tác phẩm là một tệp
  `.mira` (SQLite), sao lưu bằng cách chép tệp.
- **Chọn AI theo cách bạn có:** khóa API (Gemini, OpenRouter, OpenAI, DeepSeek, Anthropic, endpoint
  tương thích OpenAI) hoặc đăng nhập tài khoản ChatGPT, GitHub Copilot.

## ⚠️ Lưu ý

Mira đang là **bản MVP để thử nghiệm**:

- App chạy được: thư viện, editor hai pane, dịch chương, panel Hỏi AI.
- Chưa được kiểm chứng đầy đủ với nhà cung cấp AI thật.
- **Đừng dùng nó làm nơi giữ bản dịch duy nhất của bạn.** Định dạng dữ liệu còn thay đổi giữa các
  phiên bản.

## ✨ Tính năng

- **Dịch chương bằng AI** 👈
  - Dịch theo lô, có giới hạn số lần gọi model mỗi chương.
  - Đoạn dịch hỏng được chạy lại riêng.
  - Có thể chuyển sang model dự phòng.
- **Hỏi AI về chương đang mở** 👈
  - Panel chat tự đọc chương, tìm trong tác phẩm, tra thuật ngữ và xưng hô bằng công cụ.
  - Câu trả lời đi kèm đề xuất sửa để bạn duyệt.
  - Xem được model đã nghĩ gì và đã gọi công cụ nào.
- **Duyệt đề xuất tại chỗ**
  - Mỗi đề xuất hiện ngay trên đoạn văn, có so sánh trước và sau.
  - Nhận hoặc bỏ từng phần, hay áp dụng tất cả một lần.
- **Thuật ngữ và xưng hô**
  - AI trích ứng viên thuật ngữ từ bản gốc, code kiểm lại trước khi đưa bạn duyệt.
  - Bảng quan hệ xưng hô giữa các nhân vật (anh – em, ta – ngươi…) được đưa vào mỗi lần dịch.
- **Trau chuốt bản dịch:** chẩn đoán lỗi trước rồi mới sửa, kèm các phép kiểm bằng code.
- **Editor dễ đọc:**
  - chữ truyện theo editor Obsidian (16 px, dòng 1,5);
  - live preview Markdown, ảnh dán thẳng vào bản dịch;
  - cuộn mượt.
- **Giao diện gọn:** đen, trắng, xám; màu chỉ dùng cho trạng thái; có theme sáng và tối.

## 🚀 Cách dùng

1. **Kết nối AI:** lần mở đầu, Mira hỏi nhà cung cấp. Dán khóa API, hoặc đăng nhập ChatGPT hay
   GitHub Copilot.
2. **Tạo tác phẩm:** đặt tên, ngôn ngữ gốc, ảnh bìa nếu muốn.
3. **Nhập chương:** dán văn bản hoặc chọn tệp `.txt` / `.md`.
4. **Dịch:** mở chương, bấm dịch bằng AI, theo dõi tiến độ từng lô.
5. **Duyệt và sửa:** đọc hai pane song song, nhận hoặc bỏ đề xuất, hỏi AI ở panel bên phải khi cần.
6. **Xuất:** lấy bản dịch ra `.txt`, `.md`, `.docx` hoặc `.pdf`.

## 📄 Định dạng hỗ trợ

| | Định dạng |
| --- | --- |
| Nhập chương | `.txt`, `.md` hoặc dán trực tiếp |
| Nhập thuật ngữ | `Names.txt` |
| Xuất bản dịch | `.txt`, `.md`, `.docx`, `.pdf` |
| Ngôn ngữ gốc | Tiếng Anh, Trung giản thể, Trung phồn thể, Nhật |
| Ngôn ngữ đích | Tiếng Việt |

## 📚 Tài liệu

- 👉 [Tài liệu theo module](docs/modules/README.md): quyết định, nghiên cứu và trạng thái của từng
  phần sản phẩm. Bắt đầu ở đây.
- [Kết nối AI](docs/modules/ai-connections/README.md): nhà cung cấp, đăng nhập tài khoản, cách gọi model.
- [Ngữ cảnh truyện](docs/modules/context/README.md): thuật ngữ, xưng hô, trau chuốt.
- [Đo lường](docs/modules/measurement/README.md): bộ đo chất lượng bản dịch và Mira Lab.
- [Hệ thiết kế](docs/modules/design-system/README.md): token, component và quy tắc giao diện.
- [Quy tắc repository](AGENTS.md): kiểm tra, commit.

Handbook cũ đã gỡ ngày 2026-10-06; bản cuối nằm ở commit `501be2a`, chỉ để tra lịch sử.

## 🆕 Cập nhật gần đây

- **2026-10-08**
  - Giao diện đen trắng xám.
  - Chữ truyện theo editor Obsidian.
  - Cuộn chuột mượt.
  - Mọi màn dùng chung một bộ component.
- **2026-10-08**
  - Chat tự đọc chương và đề xuất qua công cụ, không còn chọn chế độ.
  - Hiện phần suy nghĩ của model.
- **2026-10-08**
  - Đăng nhập ChatGPT và GitHub Copilot.
  - Hỗ trợ API Responses và Messages.
- **2026-10-08** Dịch chương có giới hạn số lần gọi model và chế độ xuất JSON theo schema.
- **2026-10-06**
  - Trích thuật ngữ bằng AI.
  - Trau chuốt bản dịch theo kiểu chẩn đoán rồi sửa.
  - Prompt khai báo xưng hô trước khi dịch.

## 🛠️ Phát triển

Yêu cầu:
- Windows;
- Node.js ≥ 24;
- pnpm **8.9.0** theo `packageManager` trong `package.json`. Nên lấy qua `corepack`.

```powershell
pnpm install                     # bằng pnpm 8.9.0 (corepack)
pnpm dev                         # chạy Electron ở chế độ phát triển
node scripts/check.mjs           # typecheck, test, lint: chạy trước khi commit
node scripts/check.mjs --build   # thêm bản build: chạy trước khi push
pnpm build:win                   # bộ cài Windows, chưa phải quy trình phát hành chính thức
```

> [!WARNING]
> pnpm toàn cục mới hơn bản ghim có thể in cảnh báo rồi thoát mã 0 **mà không chạy gì**. Dùng nó để
> `pnpm install` / `pnpm add` sẽ ghi đè `pnpm-lock.yaml` sang lockfileVersion 9.0. Vì vậy hãy kiểm
> tra bằng `node scripts/check.mjs`, không bằng `pnpm test`.

**Công nghệ:**
- Electron + React + Tailwind v4;
- CodeMirror cho editor;
- `node:sqlite` cho kho dữ liệu;
- Biome cho format và lint.

Mã nguồn chia theo tầng:
- `src/shared`: chạy ở mọi nơi;
- `src/main`: `infra` < `services` < `ipc` < `electron`, mỗi tầng chỉ import tầng dưới;
- `src/preload`;
- `src/renderer`.

Biome chặn import ngược tầng. Chi tiết kiến trúc ở [tài liệu theo module](docs/modules/README.md).

Lần cài đầu cần tải Electron qua mạng. Nếu terminal đặt `NPM_CONFIG_OFFLINE=true`, đổi sang `false`
khi cài.

**Đóng góp:**
- Commit theo [Conventional Commits](AGENTS.md#commits), message bằng tiếng Anh.
- Tài liệu sản phẩm viết bằng tiếng Việt.

Mira từng tên là Miyati, đổi ngày 2026-09-29. Thư mục repo vẫn là `app-novel`.
