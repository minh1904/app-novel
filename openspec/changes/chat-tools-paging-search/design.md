## Context

Xem proposal.md — Why. Hiện trạng ràng buộc cách làm:

- `chatTools.ts` dựng runner đồng bộ trên `ChatToolLibrary` (hai hàm `listChapters`, `readText`); `workId`
  buộc khi dựng. `read_chapter` cắt ở `TOOL_TEXT_MAX = 20_000` và báo một dòng `[Đã cắt…]`.
- `chatService.ts` lặp tối đa `MAX_TOOL_ROUNDS = 3` vòng; vòng cuối không mời tool. Mỗi lần gọi tool phát
  `{ kind: 'tool', name, detail }` và lưu `toolSteps` vào bản ghi phiên.
- `TextRecord` có `content`, `rev`, `segments` (vị trí UTF-16, `textRev`, `status`). Đoạn là dòng không
  trống (ADR-005, `paragraphUnits`). Liên kết căn chỉnh n:m giữa segment hai phía nằm trong `linkFile.ts`
  (`listLinks`), và `buildRows` (shared/contracts/rows.ts) đã dựng hàng "segment nguồn → segment dịch".
- Mỗi tác phẩm là một file `.mira` SQLite đồng bộ (better-sqlite3); runner tool chạy trên main process.

## Goals / Non-Goals

**Goals:**
- Model đọc hết được một chương dài theo nhiều lần, biết chính xác đã đọc tới đâu.
- Model tra được một chuỗi trong cả tác phẩm và thấy cách nó đã được dịch, chỉ khi có căn cứ căn chỉnh.
- Chi phí mỗi lượt có trần rõ ràng.

**Non-Goals:**
- Chỉ mục FTS5, tokenizer bigram CJK, tìm mờ, tìm theo regex hay theo nghĩa.
- Tìm trong glossary, nhân vật, xưng hô (đã được gửi kèm qua khối `term`/`dyad`).
- Tool ghi bất kỳ thứ gì; đổi IPC hay giao diện panel ngoài chữ trong `detail`.
- Nén lịch sử chat.

## Decisions

### D1. Phân trang theo đoạn, con trỏ mờ mang đoạn + vị trí trong đoạn + revision

Tham số `read_chapter`: `chapter`, `side`, tùy chọn `from_paragraph` (1-based) **hoặc** `cursor`. Con trỏ
là chuỗi mờ, ví dụ `c<số chương>.<side>.p<đoạn>.o<offset trong đoạn>.r<rev>`, do tool sinh và tự đọc;
model chỉ chép lại.

- Vì sao theo đoạn chứ không theo offset ký tự thô: số đoạn là đơn vị model và `search_work` cùng dùng,
  và khi văn bản đổi, tiếp tục ở "đầu đoạn N" ít lệch hơn "ký tự thứ K".
- Offset trong đoạn chỉ dùng khi một đoạn dài hơn trần (spec "Một đoạn dài hơn trần").
- Khi `rev` trong con trỏ khác `rev` hiện tại: bỏ offset trong đoạn, đọc từ đầu đoạn N, kèm cảnh báo
  revision cũ/mới. Phương án từ chối con trỏ cũ bị loại vì buộc model đọc lại từ đầu, tốn vòng và token
  trong khi sửa nhỏ là trường hợp thường gặp.
- Header mỗi kết quả, dạng một dòng cố định:
  `Chương 3 · bản dịch · rev 12 · đoạn 41–80/120 · 19.640 ký tự · còn tiếp, con trỏ: c3.target.p81.o0.r12`.

### D2. Trần mỗi lần đọc giữ 20.000 ký tự; ngân sách mỗi lượt 80.000 ký tự; 6 vòng

- Trần mỗi lần đọc giữ `TOOL_TEXT_MAX` hiện tại để hành vi chương ngắn không đổi.
- Ngân sách tổng ký tự tool trả mỗi lượt: 80.000 (≈ 4 trang). Đếm trong `chatService` vì ngân sách thuộc
  lượt chứ không thuộc runner; runner nhận "còn lại bao nhiêu" và tự rút trần của lần đọc về
  `min(TOOL_TEXT_MAX, còn lại)`.
- `MAX_TOOL_ROUNDS` 3 → 6: đọc một chương 60.000 ký tự cần 3 vòng, cộng một vòng tìm và một vòng liệt kê.
  Ngân sách ký tự mới là thứ chặn chi phí; số vòng chỉ chặn lặp vô ích. Các số này là giá trị khởi
  đầu, ghi thành hằng có tên để chỉnh sau khi có dữ liệu dùng thật.

### D3. `search_work` quét chuỗi con trên văn bản đã lưu, không chỉ mục

- Mỗi lần gọi: `listChapters` rồi `readText` từng chương phía được chọn, tìm mọi vị trí bằng `indexOf`
  sau khi chuẩn hóa NFC cả hai phía; chữ Latin so không phân biệt hoa thường (`toLocaleLowerCase` giữ
  độ dài cho phần lớn chữ; nếu độ dài đổi thì so trên bản gốc không hạ chữ). CJK khớp tự nhiên vì không
  cần tách từ.
- Vì sao không FTS5 ngay: cần migration schema `.mira`, trigger đồng bộ khi lưu văn bản, và tokenizer
  bigram CJK tự viết hoặc trigram (FTS5 trigram không khớp chuỗi < 3 ký tự, mà tên CJK hai chữ rất hay
  gặp). Với tác phẩm vài trăm chương × 20.000 ký tự, quét tuyến tính vài triệu ký tự là chấp nhận được
  cho một lần gọi tool; đo trong task 4.4 trước khi quyết định cần chỉ mục.
- Giới hạn: chuỗi 1–100 ký tự sau khi trim; tối đa 20 kết quả; đoạn trích ±60 ký tự quanh chỗ khớp,
  cắt ở ranh giới đoạn. Kết quả xếp theo số chương rồi vị trí. Báo tổng chỗ khớp và số chương khớp
  (đếm hết, chỉ trả 20) — đếm hết vẫn rẻ vì đã quét.
- Số đoạn của chỗ khớp tính bằng cùng hàm tách đoạn với `read_chapter`, để model đọc tiếp bằng
  `from_paragraph` đúng chỗ.

### D4. Phía tương ứng chỉ lấy từ liên kết

- Thêm vào `ChatToolLibrary` một hàm đọc liên kết của chương (bọc `listLinks`), và dùng `buildRows` để
  biết segment nguồn nào nối với segment dịch nào. Chỗ khớp → segment chứa nó (theo `start`/`end`) →
  liên kết → segment phía kia → văn bản theo vị trí.
- Segment có `status` khác `ok`, `textRev` khác `rev` hiện tại, hoặc liên kết `needs_review`/`broken`:
  vẫn trả văn bản tương ứng nhưng gắn "liên kết chưa chắc đúng".
- Không có segment hoặc không có liên kết: ghi "chưa căn chỉnh — đọc bản dịch chương N bằng
  read_chapter". Không ghép theo số thứ tự đoạn: hai phía thường lệch số đoạn (model gộp/tách dòng,
  người dịch nối câu), và một đoạn dịch sai chỗ trông như bằng chứng thật.
- Đọc liên kết chỉ cho các chương có chỗ khớp nằm trong 20 kết quả trả về, không cho mọi chương.

### D5. `detail` của panel giàu hơn, hợp đồng không đổi

Giữ `{ name, detail }`. Ví dụ:
- `Chương 5 · bản gốc — đoạn 1–42/120, 19.800 ký tự, còn tiếp`
- `Tìm "魔王" · bản gốc — 37 chỗ ở 9 chương, trả 20`
- `Hết ngân sách đọc của lượt (80.000 ký tự)`

## Risks / Trade-offs

- [Quét tuyến tính chặn main process khi tác phẩm rất lớn] → đo thời gian trên fixture lớn (task 4.4);
  thêm trần số ký tự quét mỗi lần gọi, vượt thì dừng và báo "đã tìm N/M chương". FTS5 là bước sau nếu
  đo thấy cần.
- [Con trỏ do model chép lại có thể bị sửa hoặc bịa] → con trỏ được kiểm cú pháp, số chương phải khớp
  tham số `chapter`, đoạn phải trong phạm vi; sai thì lỗi rõ ràng (spec "Con trỏ hỏng").
- [6 vòng × 80.000 ký tự tăng chi phí mỗi lượt so với hiện nay] → ngân sách ký tự là trần cứng; chi
  phí cộng dồn vẫn hiện trên lượt như hiện tại.
- [Chuẩn hóa NFC/hạ chữ làm lệch offset] → tìm trên chuỗi chuẩn hóa nhưng chỉ dùng offset khi độ dài
  không đổi; ngược lại so trên chuỗi gốc.
- [Danh sách tool dài hơn làm prompt mỗi vòng dài thêm] → ba tool, mô tả ngắn; không cần tool search.

## Migration Plan

Không có migration dữ liệu. Thay đổi chỉ ở main process; triển khai một lần. Lùi lại bằng cách revert
commit; bản ghi phiên cũ chỉ chứa `detail` dạng chữ nên vẫn hiển thị được.

## Open Questions

- Có cần cho `search_work` tìm cả hai phía trong một lần gọi không: để sau khi thấy model gọi hai lần
  liên tiếp thường xuyên.
- Trần 80.000 ký tự và 6 vòng chỉnh theo dữ liệu dùng thật sau khi chạy một thời gian.
