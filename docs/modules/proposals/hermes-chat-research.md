# Học UI chat của Hermes Desktop

Cập nhật: 2026-10-08 · Trạng thái: **Đã chốt hướng** chat tự gọi tool (mục "Quyết định 2026-10-08"); **Quan sát** (phần 1–2), **Đề xuất** (phần 3–5). Phạm vi bốn nhóm
tính năng do chủ sản phẩm chọn cùng ngày; chi tiết bên trong mỗi nhóm vẫn là đề xuất. Chủ trì: chủ sản
phẩm, kỹ thuật.

## Câu hỏi chương này trả lời

Panel AI của Mira nên học những gì từ cách Hermes Desktop hiển thị tin nhắn, ô soạn, chọn model và quản
lý phiên? Học thế nào để không phá [các quyết định về đề xuất](decisions.md): mọi thay đổi AI ghi vào
bản dịch đều thành đề xuất chờ duyệt.

Chủ sản phẩm chọn bốn nhóm: **hiển thị tin nhắn, ô soạn, pill chọn model, quản lý phiên**. Kèm điều
kiện: tính năng nào không cần cho việc dịch truyện thì không thêm.

## Quyết định 2026-10-08: chat thường, AI tự gọi tool

Chủ sản phẩm chốt:

- **Ô soạn bỏ chọn chế độ (Hỏi / Sửa / Áp dụng) và bỏ chọn phạm vi** (cả chương hay đoạn đang sửa).
  Người dùng chat như bình thường. App không còn tự gửi kèm ngữ cảnh; model tự quyết lấy thông tin nào.
- **Cơ chế là function calling, không phải MCP hay skill.** Mỗi lượt, Mira gửi cho model danh sách tool
  (tên, mô tả, tham số JSON). Model trả về lời gọi tool, main process chạy hàm trên dữ liệu thật rồi gửi
  kết quả lại. Vòng này lặp tới khi model trả lời bằng chữ, có giới hạn số vòng và ngân sách ký tự. Hermes
  làm đúng như vậy (`tools/registry.py`, `model_tools.py`).
  - MCP (`tools/mcp_tool*.py` ở Hermes) chỉ là giao thức cắm tool server **bên ngoài**. Dữ liệu truyện
    nằm ngay trong Mira nên gọi hàm trực tiếp là đủ.
  - Skill (`tools/skills_tool.py`) là tài liệu hướng dẫn quy trình mà model tự mở khi cần. Chưa cần ở
    đợt này.
- **Tool đọc:**
  - chương đang mở;
  - danh sách chương; đọc chương theo trang; tìm trong tác phẩm (change `chat-tools-paging-search`);
  - đoạn gốc và đoạn dịch tương ứng;
  - glossary và xưng hô.
- **Tool ghi:** chỉ tạo **đề xuất** chờ duyệt (sửa đoạn, dịch một khoảng đoạn, thêm thuật ngữ). Không bao
  giờ ghi thẳng, đúng [quyết định về đề xuất](decisions.md).
- **Hiển thị lượt gọi tool như Hermes:** gộp thành một dòng tóm tắt, bấm để mở chi tiết.

Đặc tả sẽ nằm ở change OpenSpec `agentic-chat`. Các mục 3a–3d bên dưới vẫn là phạm vi UI của change đó.
Riêng các dòng về chế độ và phạm vi trong ô soạn không còn đúng.

## 1. Mira hiện có (quan sát mã, 2026-10-07)

**Thành phần:**

| Thành phần | File | Việc |
| --- | --- | --- |
| Panel | `src/renderer/src/features/chapter/AiPanel.tsx` | Nằm bên phải màn chương; chọn phiên đã lưu qua một menu |
| Lượt chat | `AiTurn.tsx` | Hiển thị lượt gọi tool, danh sách ngữ cảnh đã gửi kèm, Sao chép / Hỏi lại |
| Ô soạn | `AiComposer.tsx` | Chọn chế độ (`ask` / `edit` / `apply`), menu model; không gửi khi IME đang gõ dở |
| Markdown | `SafeMarkdown.tsx` | Tự viết, chỉ hỗ trợ đoạn, tiêu đề, trích dẫn, code và danh sách |

`SafeMarkdown.tsx` cố ý không chạy HTML và không tải ảnh; đây là ràng buộc an toàn, không phải thiếu
sót. CSP của renderer cũng chỉ cho tải ảnh `'self' data:`.

**Lưu trữ:**

- Store: `src/renderer/src/stores/aiChatStore.ts`.
- Phiên và đề xuất lưu theo tác phẩm.
- Câu trả lời stream qua sự kiện IPC `ai:chat:chunk`; hủy bằng `ai:chat:cancel`.

## 2. Hermes làm thế nào (quan sát mã, commit `bf871a5943`)

Đường dẫn tính từ `D:\personal\hermes-agent\apps\desktop`.

**Thư viện:**

| Việc | Thư viện / cách làm |
| --- | --- |
| Khung tin nhắn | `@assistant-ui/react` 0.14 với external-store runtime |
| Markdown | `streamdown` 2.5; tự sửa phần markdown dở dang khi đang stream |
| Code | `shiki` 4, nạp chậm; theme `github-dark-dimmed` / `github-light-default` |
| Công thức toán | KaTeX |
| Cuộn | `use-stick-to-bottom` |

**Tin AI** (`src/components/assistant-ui/thread/assistant-message.tsx`):

- **Phẳng, không bong bóng**, rộng hết cột, lùi lề 0,75rem.
- Chữ 13 px × 110 %, line-height 1,5, khoảng cách đoạn 0,7rem.
- Thanh thao tác chỉ hiện khi rê chuột: giờ, thời gian lượt ("⏱ 12s"), Copy, Regenerate, Branch.
- Có nút chuyển "n / m" khi một tin có nhiều nhánh.

**Tin người dùng** (`thread/user-message.tsx`):

- Bong bóng rộng hết cột, bo `rounded-xl`, viền và nền màu bong bóng.
- Khi lượt đó cuộn qua, bong bóng **dính ở đầu khung** và thu còn khoảng 2 dòng có mờ dần.
- Bấm vào bong bóng để sửa tin.

**Lượt gọi tool** (`src/components/assistant-ui/tool/fallback.tsx`):

- Nhiều lượt gọi liên tiếp gộp thành một dòng xám, ví dụ "Explored 3 files, ran 5 commands".
- Khi đang chạy, dòng này nhấp nháy và có một dòng ticker chạy bên dưới.
- Mở ra thì thấy từng lượt gọi, mỗi lượt có biểu tượng trạng thái, tiêu đề và thời gian.

**Suy luận** (`thread/message-parts.tsx:187-326`):

- Đang chạy: "Thinking" nhấp nháy và một đồng hồ.
- Xong: "Thought for Xs".
- Phần xem trước cao tối đa 10rem, chữ nhỏ màu muted.

**Chờ và lỗi:**

- Trước token đầu tiên có một nhịp chấm, một gợi ý và đồng hồ đếm.
- Thẻ lỗi:
  - nền tông destructive, có tiêu đề và nội dung;
  - phần "Details" thu gọn chứa thông báo gốc;
  - nút xử lý: Thử lại, Sửa tin trước, Chọn model khác.

**Ô soạn** (`src/app/chat/composer/`):

- Phím: Enter gửi, Shift+Enter xuống dòng, Esc dừng. Mũi tên ↑/↓ duyệt lịch sử đã gửi. `mod+Enter`
  xếp hàng khi model đang trả lời.
- Bảng hàng đợi cho sửa, xóa hoặc gửi ngay từng tin đang chờ.
- Nháp lưu theo phiên: `localStorage`, ghi sau 400 ms không gõ.
- Dán đoạn dài hơn 3.000 ký tự thì thành tệp đính kèm.
- Ô nhập tự giãn từ 1,625rem tới 9,375rem rồi cuộn.

**Phiên** (`src/app/chat/sidebar/`):

- Tìm kiếm, đổi tên, ghim, xóa có xác nhận, xuất JSON.
- Nhóm theo ngày: Hôm nay, Hôm qua, Tuần trước.

## 3. Đề xuất theo bốn nhóm

**Ký hiệu:** **Làm** = đưa vào change; **Bỏ** = không cần cho Mira.

### 3a. Hiển thị tin nhắn

| Tính năng | Đề xuất | Lý do |
| --- | --- | --- |
| Tin AI phẳng, tin người dùng là bong bóng, cỡ chữ và khoảng cách theo Hermes | **Làm** | Đúng yêu cầu học y hệt |
| Thay `SafeMarkdown` bằng `streamdown` và `shiki` | **Làm**, có điều kiện | Phải tắt HTML thô và chặn ảnh từ xa như `SafeMarkdown` hiện nay; phải giữ test an toàn |
| Bảng GFM | **Làm** | Hay dùng khi so sánh cách dịch |
| Gộp lượt gọi tool thành một dòng tóm tắt | **Làm** | Thay danh sách "AI đã đọc" hiện tại, giữ đủ thông tin trang và số chỗ khớp ([change `chat-tools-paging-search`](../../../openspec/changes/chat-tools-paging-search/proposal.md)) |
| Khối "Thinking / Thought for Xs" | **Làm** | Chỉ khi provider trả về suy luận |
| Thẻ lỗi có Details và nút xử lý | **Làm** | Dùng lý do lỗi đã phân loại sẵn (`classifyError.ts`) |
| Thanh thao tác khi rê: giờ, thời gian lượt, Sao chép, Tạo lại | **Làm** | |
| Bong bóng người dùng dính đầu khung khi cuộn | **Làm** | |
| KaTeX, Mermaid, nhúng YouTube, lightbox ảnh, reaction, đọc to | **Bỏ** | Không cần cho việc dịch truyện |

### 3b. Ô soạn

| Tính năng | Đề xuất |
| --- | --- |
| Enter gửi, Shift+Enter xuống dòng, Esc dừng, giữ chặn gửi khi IME đang gõ dở | **Làm** |
| ↑/↓ duyệt lịch sử đã gửi | **Làm** |
| Nháp theo phiên, lưu sau 400 ms không gõ | **Làm** |
| Ô tự giãn theo khoảng cao của Hermes | **Làm** |
| Hàng đợi tin khi model đang trả lời | **Làm**, dạng đơn giản: sửa, xóa, gửi ngay |
| Dán đoạn dài thành tệp đính kèm | **Bỏ**: Mira không có kiểu tệp đính kèm, và đoạn dán vào thường chính là văn bản cần dịch |
| Lệnh `/`, `@` nhắc tệp, `:` emoji, giọng nói, composer nổi | **Bỏ** |

### 3c. Pill chọn model

Làm như Hermes:

- Pill hiện tên model ▾ trong ô soạn; phím tắt `mod+shift+m`.
- Menu tìm kiếm, nhóm Yêu thích, nhóm theo kết nối, giá, submenu mức suy luận.

Chi tiết nằm ở [Kết nối AI](../ai-connections/README.md), phần 3. `ModelSelectionMenu` vẫn là một menu
duy nhất, dùng chung cho chat và hộp thoại dịch.

### 3d. Quản lý phiên

| Tính năng | Đề xuất |
| --- | --- |
| Danh sách phiên của tác phẩm thay cho menu hiện tại: tìm theo tiêu đề, nhóm theo ngày | **Làm** |
| Đổi tên, xóa có xác nhận | **Làm** |
| Ghim phiên | **Làm** |
| Sửa tin của người dùng, tạo lại câu trả lời | **Làm**, có điều kiện: đề xuất của lượt cũ giữ nguyên trạng thái duyệt và không tự bị thu hồi |
| Rẽ nhánh (branch) sang phiên mới, xuất JSON | **Bỏ** ở đợt này |

## 4. Ràng buộc khi làm

- Panel AI là cột bên phải màn chương, không phải cả cửa sổ như Hermes. Kích thước, cỡ chữ và màu học
  theo Hermes, nhưng bố cục giữ dạng panel. Danh sách phiên là một popover hoặc một ngăn trong panel,
  không phải sidebar riêng.
- Mọi kết quả AI ghi vào bản dịch vẫn đi qua đề xuất. Thanh thao tác và thẻ lỗi không được tạo đường ghi
  thẳng.
- Thư viện mới (`streamdown`, `shiki`, `use-stick-to-bottom`) cần thêm bằng pnpm 8.9.0 đúng phiên bản
  ghim, để không đổi định dạng `pnpm-lock.yaml`.

## 5. Câu hỏi còn mở

1. **Nhóm phiên theo ngày.** Có nhóm phiên theo ngày không? Panel hẹp có thể chỉ cần danh sách theo thời
   gian cùng ô tìm kiếm.
2. **Đề xuất của lượt cũ.** Khi tạo lại hoặc sửa một lượt cũ, các đề xuất chưa duyệt của lượt đó xử lý
   thế nào: giữ, hay đánh dấu "lượt đã bị thay"?

---

[Đề xuất và phiên AI](README.md) · [Kết nối AI](../ai-connections/README.md) ·
[Design system theo Hermes](../design-system/hermes-comparison.md)
