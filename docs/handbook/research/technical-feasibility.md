# Khả thi kỹ thuật: mô hình dữ liệu, lưu trữ, căn chỉnh offline

Ngày đọc/chạy thử: **2026-09-29** · Trạng thái: Quan sát + đề xuất · Chủ trì: engineering · Liên quan: MIR-02, MIR-03, MIR-05, [kiến trúc](../engineering/architecture.md)

## Câu hỏi và phương pháp

Ba rủi ro kỹ thuật lớn nhất của handbook 0.1: (1) liên kết nguồn–dịch có sống sót khi sửa tự do ở Toàn văn; (2) lưu trữ nào trong Electron 44; (3) căn chỉnh offline ZH/JA/EN → VI có khả thi. Đọc tài liệu chính thức và repo; một phần chạy thử trên Node 24.14 (ICU 78.2), **chưa chạy trong Electron 44**. Nhãn [I] là suy luận.

## 1. Liên kết sống sót qua chỉnh sửa

| Cách | Nhận xét |
| --- | --- |
| Marker ID trong văn bản | Bền khi sửa nhưng lọt vào Markdown/xuất và người dùng có thể xóa/nhân đôi; trái nguyên tắc không tự viết lại văn bản. Loại. |
| Offset range + ánh xạ thay đổi | CodeMirror 6 `ChangeDesc.mapPos(pos, assoc, MapMode.TrackDel)` trả `null` khi vùng bị xóa; `touchesRange(from, to)` cho biết thay đổi chạm vùng. Offset chỉ đúng với đúng một revision văn bản. ([CodeMirror reference](https://codemirror.net/docs/ref/#state.ChangeDesc)) |
| Cây block (ProseMirror) | Tương đương về ánh xạ, nhưng kéo sang mô hình rich text thay vì Markdown thuần. |
| Yjs `RelativePosition` | Bền mà không cần ánh xạ, nhưng buộc dùng Yjs làm kho văn bản; quá nặng cho offline cá nhân. |

Tiền lệ: [InterText](https://github.com/czcorpus/InterText_editor) dùng câu có ID + bảng liên kết tách riêng (stand-off, `xtargets="s1 s2;t1"`) cho n:m; [memoQ](https://docs.memoq.com/current/en/Workspace/alignment-editor.html) phân biệt liên kết tự động với liên kết người dùng xác nhận; [XLIFF 2.1](https://docs.oasis-open.org/xliff/xliff-core/v2.1/xliff-core-v2.1.html) chỉ cho n:m trong một unit.

**Đề xuất:** văn bản thuần (Markdown) cho mỗi chương × mỗi bên; segment có ID ổn định và offset tại revision hiện tại; liên kết trỏ **segment ID**, không trỏ offset. Ở Toàn văn, mỗi transaction ánh xạ segment: bị chạm → `dirty` và liên kết `needs_review`; bị xóa hết → `orphaned`, giữ bản chụp chữ cũ. **Mode Từng câu không có kho riêng:** sửa một ô là gửi ChangeSet vào cùng `EditorState` của chương, nên hai mode chung một undo stack. Thao tác liên kết là `StateEffect` có nghịch đảo (`invertedEffects`) để undo cùng văn bản. Khi không có ChangeSet (file sửa ngoài app), neo lại bằng diff văn bản [I, cần prototype].

## 2. Lưu trữ

- Electron 44.4.5 đi kèm **Node 24.21.0** ([releases](https://releases.electronjs.org/)). `node:sqlite` ở mức release candidate từ Node 24.15, không cần flag từ 22.13; có `DatabaseSync`, session/changeset và `backup()` ([Node docs](https://nodejs.org/docs/latest-v24.x/api/sqlite.html)). **Chưa kiểm chứng** trong main process Electron — cần smoke-test; dự phòng `better-sqlite3` (native, rebuild theo ABI Electron).
- Loại sql.js (DB trong bộ nhớ, ghi cả file) và wa-sqlite/OPFS trong renderer (phức tạp, trái ranh giới IPC).
- WAL + `synchronous=FULL` cho file tác phẩm; autosave là transaction debounce trong main process. Backup bằng `VACUUM INTO` hoặc backup API, không copy file thô (bỏ sót `-wal`). ([WAL](https://www.sqlite.org/wal.html), [VACUUM INTO](https://www.sqlite.org/lang_vacuum.html#vacuuminto))
- **Đề xuất:** `library.db` nhỏ (chỉ mục tác phẩm, gần đây, cài đặt) + **một file SQLite cho mỗi tác phẩm** theo [SQLite as application file format](https://www.sqlite.org/appfileformat.html). Backup/restore một tác phẩm là một file; hỏng một file không lan sang tác phẩm khác.
- Lịch sử: **snapshot** (văn bản + segment + liên kết, nén) làm nguồn sự thật khi idle, đóng phiên, trước import/AI dịch/căn chỉnh; nhật ký `ChangeSet.toJSON` từ snapshot gần nhất dùng cho phục hồi sau crash.

Phác thảo bảng (đề xuất, bổ sung theo [ADR-002](../decisions/0002-ai-first-translation.md)):

```text
work, chapter(ord, title)
source_variant(id, work_id, lang, is_primary, label)         -- nhiều nguồn raw
text(chapter_id, variant|'target', content, rev)             -- Markdown chuẩn
segment(id, chapter_id, side, start, end, text_rev, status, anchor_text)
link(id, kind auto|ai|user, confidence, status ok|needs_review|broken)
link_member(link_id, segment_id, side, ord)                  -- n:m
provenance(segment_id, origin human|ai|import, provider, model, at)
ai_job(id, chapter_id, state, cursor, cost_estimate, error)  -- tiếp tục sau lỗi
glossary(term, translation, kind, note), address_matrix(speaker, listener, form, from_chapter)
style_example(src, tgt, source)                               -- từ bản dịch cũ
op_journal, snapshot
```

## 3. Căn chỉnh offline

**Tách câu** (chạy thử trên Node 24):

| Công cụ | ZH/JA | EN | VI |
| --- | --- | --- | --- |
| `Intl.Segmenter` (ICU) | `「` mở thoại dính cuối câu trước | Tách sai sau `Mr.`/`Dr.` | Tách sai sau `TP.`, `Th.S.` |
| [sentencex](https://github.com/wikimedia/sentencex-js) (MIT) | Đúng, xử lý `「」` tốt | Gộp quá tay | Tách sai `Th.S.` |

→ sentencex cho ZH/JA; `Intl.Segmenter` + danh sách viết tắt cho EN/VI; giữ bộ hồi quy từ chương thật.

**Thuật toán:** [Bertalign](https://github.com/bfsujason/bertalign) được đánh giá trên văn học Trung–Anh nhưng **GPL-3.0** — học ý tưởng, không lấy mã. [Vecalign](https://github.com/thompsonb/vecalign) và [SentAlign](https://github.com/steinst/SentAlign) Apache-2.0. Gale–Church theo độ dài cần ước lượng tỷ lệ theo từng chương cho ZH/JA → VI [I, chưa đo].

**Embedding chạy offline** (đo bằng `@huggingface/transformers`, int8, 400 câu ngắn):

| Model | Dung lượng | Thời gian | Giấy phép |
| --- | --- | --- | --- |
| multilingual-e5-small | 118 MB | ~0,64 s | MIT |
| paraphrase-multilingual-MiniLM-L12-v2 | 118 MB | ~0,60 s | Apache-2.0 |
| LaBSE | 471 MB | chưa đo | Apache-2.0 |

Cosine cặp dịch đúng ~0,86–0,96; **chưa đo cặp không liên quan**, chưa có ngưỡng.

**Đề xuất bậc thang:** Bậc 0 (không model) — neo đoạn/thoại/số/glossary + DP theo độ dài và dấu câu; Bậc 1 — cộng cosine embedding 118 MB; Bậc 2 — LaBSE tùy chọn. Confidence mỗi cặp từ chi phí, khoảng cách với phương án thứ hai, z-score độ dài/cosine và loại quan hệ; mọi câu bỏ/thêm vào hàng đợi kiểm tra.

**Sau [ADR-002](../decisions/0002-ai-first-translation.md):** segment do AI dịch đã có liên kết nên căn chỉnh rời khỏi đường chính. Vẫn cần cho nhập bản dịch cũ (văn phong), **đối chiếu nhiều nguồn raw** (EN ↔ ZH ↔ JA — nơi phương pháp theo độ dài yếu nhất, embedding có ích nhất) và sau khi sửa tự do. Lát cắt đầu chỉ cần Bậc 0.

## Bước kiểm chứng

1. Smoke-test `node:sqlite` trong main process Electron 44 (WAL, `VACUUM INTO`, `backup()`).
2. Spike CodeMirror: ánh xạ segment qua gõ/xóa/dán, undo chung hai mode, IME tiếng Việt.
3. Corpus hai chương mỗi cặp ngôn ngữ, gắn liên kết kỳ vọng; đo Bậc 0 và Bậc 1, cosine cặp ngẫu nhiên.

---

[Mục lục handbook](../README.md)
