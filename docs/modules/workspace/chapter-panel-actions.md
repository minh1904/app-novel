# Nghiên cứu: Các thao tác với panel chương

Cập nhật: 2026-10-10 · Trạng thái: **Quan sát & Đề xuất** · Chủ trì: chủ sản phẩm, Antigravity.

## Câu hỏi tài liệu này trả lời

1. Khi người dịch đang làm việc trong màn dịch (`ChapterScreen`), panel danh sách chương ở thanh bên cần hỗ trợ những thao tác nào?
2. Chuột phải (context menu), hover, phím tắt và thao tác hàng loạt trên từng chương nên được thiết kế ra sao để tối ưu hoá tốc độ dịch truyện dài?
3. Sự phối hợp giữa panel danh sách chương (sidebar) và các pane soạn thảo (workspace) cần những thao tác tương hỗ nào?

---

## 1. Phân loại các "Panel" trong không gian làm việc của chương

Màn dịch của Mira là không gian làm việc đa cột:
1. **Panel danh sách chương (Chapter Nav Sidebar)**: Cột bên trái, hiển thị danh sách toàn bộ chương của tác phẩm, ô tìm kiếm và trạng thái dịch.
2. **Panel văn bản (Workspace Panes)**: Cột trung tâm, gồm Pane bản gốc (trái) và Pane bản dịch (phải).
3. **Panel trợ lý AI (AI Panel)**: Cột bên phải, hỗ trợ chat ngữ cảnh, đề xuất sửa và giải nghĩa.

Tài liệu này tập trung sâu vào **Panel danh sách chương**, đồng thời liên kết với các thao tác chuyển tiếp trên **Panel văn bản**.

---

## 2. Đối thủ và chuẩn mực ngành (Quan sát)

| Ứng dụng | Thao tác trên từng chương / mục | Thao tác cấp danh sách | Điều hướng giữa các chương |
| --- | --- | --- | --- |
| **Novelcrafter** | Chuột phải: Rename, Duplicate, Delete, Split scene, Change status (Draft, Revised, Final). Kéo thả sắp xếp. | Thêm chương (`+`), tìm kiếm, lọc theo nhân vật POV, gom theo Hồi/Tập (Act). | Nút mũi tên chuyển chương kế/trước ở thanh điều hướng. |
| **Scrivener** | "The Binder" cực mạnh: Chuột phải: Move to Trash, Duplicate, Split, Merge, Label, Status. Kéo thả tự do tạo thư mục lồng nhau. | Tìm kiếm, xem thẻ màu trạng thái, gộp tài liệu. | Phím tắt bàn phím lên/xuống tài liệu, phím tắt nhảy nhanh. |
| **Crowdin / Smartcat** | Chuột phải vào chuỗi/tài liệu: Mark completed, Clear translation, Copy source, Lock/Unlock. | Lọc trạng thái (Untranslated, Translated, Approved, Issues), Sort, Bulk Actions. | Phím tắt chuyển chuỗi: `Ctrl+Down` / `Ctrl+Up`, tự động nhảy chuỗi chưa dịch tiếp theo. |
| **VS Code / Obsidian** | Hover hiện icon thao tác nhanh; Chuột phải: Rename (F2), Delete, Reveal, Copy Path. Kéo thả file. | Quick filter, Collapse all, New file. | `Alt+Left` / `Alt+Right` chuyển file lịch sử, Command Palette. |

### Bài học rút ra cho Mira:
1. **Dịch giả truyện chữ cần tốc độ chuyển chương liên tục (Continuous Flow)**: Khi dịch xong Chương 1, thao tác thường gặp nhất là nhảy ngay sang Chương 2 để dịch tiếp mà không muốn phải rời tay khỏi bàn phím hoặc cuộn tìm.
2. **Không thể bắt người dịch phải thoát ra màn ngoài để thực hiện các thao tác cơ bản**: Đổi tên chương (sửa chính tả tiêu đề), xóa chương thừa, thêm chương mới vào giữa danh sách cần thao tác được ngay tại sidebar.
3. **Menu chuột phải (Context Menu) là cứu cánh cho giao diện tối giản**: Không làm rối mắt thanh bên bằng quá nhiều nút bấm, nhưng khi bấm chuột phải vào bất kỳ chương nào thì có đủ đồ nghề.

---

## 3. Bản đồ các thao tác trên Panel danh sách chương

```text
┌──────────────────────────────────────────────────────────────┐
│ [🔍 Tìm hoặc nhảy số...   ] [+] [⋮]  <- Header actions       │
├──────────────────────────────────────┤
│ [Tất cả] [Chưa dịch] [Đã dịch] [AI]  <- Filter chips         │
├──────────────────────────────────────┤
│ • 1. Chương 1                        │
│ • 2. Chương 2  [⋮] (hover)           │
│   ┌────────────────────────────────┐ │
│   │ ↗ Mở trong tab mới             │ │
│   │ ✎ Đổi tên (F2)                 │ │
│   │ ＋ Chèn chương mới phía sau    │ │
│   │ ⇄ Đổi trạng thái dịch...      │ │
│   │ ⤒ Chuyển vị trí...             │ │
│   │ ⤓ Xuất chương này...           │ │
│   │ ────────────────────────────── │ │
│   │ 🗑 Xóa chương...               │ │
│   └────────────────────────────────┘ │
│ • 3. Chương 3                        │
├──────────────────────────────────────┤
│ 12/120 chương đã dịch (10%)          │ <- Footer summary
└──────────────────────────────────────┘
```

### 3.1. Thao tác trên từng chương (Item-Level Actions)

#### A. Thao tác chuột:
1. **Click chuột trái**: Mở chương và nạp vào workspace (nếu chương cũ có văn bản chưa lưu, `leaveGuard` sẽ hỏi xác nhận lưu/hủy trước khi chuyển).
2. **Click chuột phải (Context Menu)**:
   - **Đổi tên (`PenNewSquareIcon`, F2)**: Mở ô input inline ngay trên row hoặc popup đổi tên nhanh mà không cần thoát ra trang tác phẩm.
   - **Chèn chương mới phía sau (`AddIcon`)**: Tạo Chương $N+1$ ngay sau chương hiện tại (rất hữu ích khi bổ sung ngoại truyện hoặc tách chương).
   - **Chuyển trạng thái dịch**:
     - *Đánh dấu đã dịch* (ép chuyển sang dot xanh).
     - *Đánh dấu cần xem lại* (đổi sang dot cam/vàng).
   - **Chuyển vị trí (`HashtagIcon`)**: Hộp thoại nhập số thứ tự mới để dời chương.
   - **Xuất riêng chương này (`UploadMinimalisticIcon`)**: Xuất nhanh ra tệp `.txt` hoặc `.docx`.
   - **Xóa chương (`TrashBinMinimalisticIcon`)**: Hộp thoại xác nhận xóa (báo rõ nếu chương đã có bản dịch/bản gốc để tránh xóa nhầm).
3. **Hover vào hàng**:
   - Hiện nhẹ nút `⋮` (More actions) ở đuôi hàng để người dùng dùng chuột mà không bắt buộc phải nhớ chuột phải.
   - Tooltip tóm tắt: Số từ, số đoạn, ngày cập nhật gần nhất.

#### B. Thao tác kéo thả (Drag & Drop) - Đề xuất lát sau:
- Kéo một chương để đổi số thứ tự trực tiếp trong danh sách.
- Khi truyện có số lượng chương vừa phải (< 100 chương), kéo thả trực quan hơn nhập số.

---

### 3.2. Thao tác cấp toàn Panel (Panel-Level Actions)

1. **Tìm kiếm & Nhảy số chương** *(đã triển khai)*:
   - Gõ số nhảy số, gõ chữ lọc tiêu đề.
   - Phím tắt `/` kích hoạt từ bất kỳ đâu.
2. **Bộ lọc trạng thái (Status Filter Chips)**:
   - `Tất cả` (All)
   - `Chưa dịch` (Untranslated): Giúp dịch giả tập trung vào các chương cần làm tiếp.
   - `Có đề xuất AI` (Proposals): Gom các chương có thay đổi/đề xuất của AI chờ duyệt.
   - `Đã dịch` (Translated).
3. **Đảo chiều danh sách (Sort Order)**:
   - `1 → N` (Tăng dần): Mặc định khi đọc từ đầu.
   - `N → 1` (Giảm dần): Đưa các chương mới nhất lên đầu, dịch giả theo dõi truyện ra hàng ngày không phải cuộn xuống đáy.
4. **Thu gọn / Mở rộng Sidebar**:
   - Phím tắt `Ctrl+B` hoặc nút icon trên Topbar: Thu gọn sidebar thành chế độ tập trung toàn màn hình cho trình soạn thảo.

---

### 3.3. Thao tác bàn phím & Dòng chảy làm việc (Workflow Hotkeys)

Dịch giả chuyên nghiệp thao tác chủ yếu bằng bàn phím. Các phím tắt đề xuất:

| Phím tắt | Thao tác | Mô tả |
| :--- | :--- | :--- |
| `Alt + Down` hoặc `Ctrl + ]` | **Chương kế tiếp** | Lưu chương hiện tại và mở chương tiếp theo. |
| `Alt + Up` hoặc `Ctrl + [` | **Chương trước đó** | Lưu chương hiện tại và mở chương trước. |
| `Alt + Shift + Down` | **Chương chưa dịch kế tiếp** | Nhảy cóc đến chương chưa dịch gần nhất tiếp theo. |
| `F2` | **Đổi tên chương** | Đổi tên chương đang mở hoặc đang focus trong sidebar. |
| `/` | **Tìm chương** | Focus vào ô tìm kiếm sidebar. |
| `Ctrl + B` | **Ẩn/hiện panel chương** | Mở rộng diện tích soạn thảo. |

---

## 4. Sự phối hợp giữa Panel chương và Workspace soạn thảo

Không gian soạn thảo cũng cần các điểm chạm tương hỗ với panel chương:

1. **Nút điều hướng dưới thanh trạng thái (Status Bar Navigation)**:
   - Ở chân màn hình soạn thảo (`ChapterStatusBar`), thêm 2 nút nhỏ:
     `[← Chương trước]` và `[Chương kế →]` kèm hiển thị tiến độ.
   - Giúp dịch giả khi cuộn đến cuối chương dịch xong có thể bấm 1 click để sang ngay chương tiếp theo mà không cần nhìn sang thanh bên.
2. **Chỉ báo chương đang có chỉnh sửa chưa lưu (Dirty Indicator)**:
   - Nếu chương đang soạn thảo có chữ chưa lưu, dấu chấm trên sidebar hoặc breadcrumb nhấp nháy hoặc hiển thị dấu sao `*` nhẹ để người dùng biết.

---

## 5. Đề xuất lộ trình triển khai (MoSCoW)

### Lát 1: Cần thiết nhất (Must Have - Triển khai ngay)
- **Menu chuột phải / nút `⋮` trên từng hàng chương**:
  - Đổi tên chương (Rename)
  - Xóa chương (Delete)
  - Xuất chương này
- **Phím tắt chuyển chương nhanh**:
  - `Alt + Down` (Chương kế tiếp) và `Alt + Up` (Chương trước đó).
- **Nút "Chương trước / Chương sau"** ở thanh trạng thái đáy màn hình hoặc đầu editor.

### Lát 2: Rất nên có (Should Have)
- **Dải chip lọc trạng thái**: `Tất cả` · `Chưa dịch` · `Có đề xuất AI`.
- **Nút đảo chiều danh sách** (`1 → N` / `N → 1`).
- **Phím tắt nhảy chương chưa dịch kế tiếp** (`Alt + Shift + Down`).

### Lát 3: Nâng cao (Could Have)
- **Kéo thả sắp xếp (Drag & Drop)** chương trong sidebar.
- **Phân nhóm theo Quyển / Tập / Hồi (Volumes / Arcs)** cho các tác phẩm quy mô lớn.
- **Thao tác hàng loạt (Bulk Selection)** ngay trên sidebar (chọn nhiều chương để dịch AI hàng loạt hoặc xuất hàng loạt).
