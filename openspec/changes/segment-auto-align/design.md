## Context

Lý do và phạm vi: xem `proposal.md`; yêu cầu: xem `specs/`. Nền đã có:

- `sentenceRows.ts` `autoPair`: ghép thuần theo thứ tự, `kind: 'ai'`, `status: 'needs_review'`, `confidence: 0` cố định. Change này thay phần "ghép" bên trong, giữ chữ ký và transaction hiện có.
- `LinkRecord.confidence: number | null` đã có sẵn trong schema (`src/shared/contracts/links.ts`) — chưa cột nào cần thêm.
- Nghiên cứu đã có ở [technical-feasibility.md §3](../../../docs/handbook/research/technical-feasibility.md) và [alignment.md](../../../docs/handbook/experience/alignment.md): khung Bậc 0 (không model) / Bậc 1 (embedding) / Bậc 2 (model lớn, không làm ở change này); nguyên lý hai pha neo-rẻ-trước/DP-cửa-sổ-hẹp học từ Bertalign (GPL-3.0, không lấy mã); model `multilingual-e5-small` (MIT) xác nhận hỗ trợ tiếng Việt, có benchmark BitextMining, chạy qua `@huggingface/transformers` (Transformers.js) trên Node — **chưa đo trong Electron thật, chưa đo độ chính xác trên văn bản ZH/JA/VI thật nào**.
- `pnpm` dependencies hiện chưa có gói embedding/transformers nào (`package.json` kiểm tra ngày viết design này).
- ADR-002: mọi thứ trừ bước gọi AI dịch chạy offline. Model embedding không phải "gọi AI dịch" nhưng là tài sản ngoài, cần quyết định cách lấy nó mà không phá nguyên tắc offline.

## Goals / Non-Goals

**Goals:**
- Ước lượng liên kết 1-1 có cơ sở ngữ nghĩa cho các segment chưa ghép, rẻ trước đắt sau (Bậc 0 trước Bậc 1), giới hạn chi phí theo chương lớn.
- Không phá đường cũ: khi không ước lượng được hoặc model không có sẵn, hệ thống vẫn chạy được bằng ghép theo thứ tự như hiện tại (suy giảm nhẹ nhàng, không lỗi cứng).
- Giữ nguyên transaction, schema và chữ ký kênh `rows:autopair` đã có.

**Non-Goals:**
- Không tự động hóa 100%: liên kết sinh ra luôn `kind: 'ai'`, không tự `markReviewed`; dịch giả vẫn soát qua mode Từng câu như đã có.
- Không tối ưu tốc độ bằng cách viết lại `autoPair`/`buildRows` hiện có ngoài việc gọi thêm bước ước lượng.
- Không chọn ngưỡng confidence cuối cùng ở đây — số trong D3 là giả thuyết, chờ đo trên corpus thật (xem Open Questions và `technical-feasibility.md` mục "Bước kiểm chứng").
- Không làm Bậc 2 (model lớn như LaBSE/full) hay đối chiếu nhiều nguồn raw.

## Decisions

### D1. Chạy embedding trong main process, qua một module `alignment` riêng

`src/main/alignment/{heuristics.ts, embeddings.ts, align.ts}` (thuần, không phụ thuộc Electron ngoài đọc file cache model), gọi từ `sentenceRows.ts`. Main process có sẵn Node đầy đủ để tải/cache model xuống đĩa và đã là nơi mọi thao tác kho dữ liệu chạy (nhất quán với `linkFile.ts`, `textFile.ts`); renderer không cần tải runtime embedding (~vài chục MB JS/WASM) vào bundle UI.

Phương án khác: chạy trong renderer qua Web Worker — bỏ vì phải đưa toàn bộ segment hai bên qua IPC trước (vốn đã có ở main) và nhân đôi chỗ cache model.

### D2. Model tải một lần, cache cục bộ, suy giảm nhẹ nhàng khi không có mạng/model

`multilingual-e5-small` (ONNX, MIT, ~118 MB) **không đóng gói sẵn trong bộ cài** mà tải một lần khi tính năng được dùng lần đầu (lần đầu bấm "Ghép theo thứ tự" cần Bậc 1), cache vào thư mục dữ liệu ứng dụng. Các lần sau dùng bản cache, không cần mạng.

Khi model chưa có và không tải được (offline, lỗi mạng): việc ước lượng SHALL chỉ chạy Bậc 0, không báo lỗi cứng — kết quả ít hơn nhưng vẫn đúng theo spec `segment-alignment` (segment không có ứng viên đủ tin thì không gán, không phải là lỗi). `autoPair` vẫn hoàn tất bằng ghép theo thứ tự cho phần còn lại như hiện nay.

Phương án khác: đóng gói model trong bộ cài (Apache/MIT cho phép) — bỏ vì tăng ~118 MB cho mọi người dùng kể cả người chưa dùng mode Từng câu nhiều; tải một lần khi cần là đánh đổi hợp lý vì đây là tiện ích thêm, không phải đường chính (AI dịch raw vẫn là luồng chính theo ADR-002).

### D3. Tham số hai bậc (giả thuyết ban đầu, chờ đo lại)

**Bậc 0 — điểm neo rẻ**, mỗi cặp ứng viên (segment nguồn, segment dịch chưa ghép) được chấm theo: thứ tự tương đối (gần đúng vị trí tỷ lệ trong danh sách chưa ghép của mỗi bên), số/ngày trùng, thuật ngữ glossary trùng ở cả hai câu, tỷ lệ độ dài ký tự trong khoảng hợp lý cho ZH/JA→VI (ước lượng ban đầu, cần đo). Một cặp "đủ tin" ở Bậc 0 khi có ít nhất một bằng chứng mạnh (số/ngày hoặc thuật ngữ glossary trùng) **và** thứ tự tương đối không mâu thuẫn; chỉ cần thứ tự mà không có bằng chứng khác thì coi là yếu, chuyển sang Bậc 1.

**Bậc 1 — embedding trong cửa sổ**: với các segment nguồn chưa có cặp Bậc 0 đủ tin, tính embedding (`multilingual-e5-small`) cho nó và cho các segment dịch ứng viên trong cửa sổ quanh vị trí tương đối (kích thước cửa sổ tỷ lệ theo số segment chưa ghép, chặn trên để chương cực lớn không phình chi phí — số cụ thể chờ đo ở tasks). Chọn ứng viên có cosine similarity cao nhất trong cửa sổ.

**Ngưỡng confidence** (giả thuyết, map về `[0,1]`): dưới **floor** → không gán cặp (theo yêu cầu "không ép khớp"); từ floor tới **ok** → gán, `status: needs_review`; từ **ok** trở lên → gán, `status: ok`. Giá trị floor/ok cụ thể để trống tới khi có số đo trên corpus thật (Open Questions).

### D4. Chi phí bị chặn, không ước lượng mọi segment còn lại trong một lần nếu quá lớn

Gọi `autoPair` cho chương cực lớn (ví dụ 5.000 segment chưa ghép, đã đo ở `sentence-mode` là 464–562 ms cho ghép thuần) có thể tốn thêm đáng kể nếu chạy Bậc 1 cho toàn bộ (tham khảo: ~0,64 s mỗi 400 câu đo trước đây cho `multilingual-e5-small` trên Node 24, nghĩa là có thể cần hàng chục giây cho vài nghìn segment nếu không giới hạn). Việc ước lượng SHALL giới hạn số segment chạy Bậc 1 trong một lần gọi (số cụ thể chờ đo); phần vượt giới hạn rơi về Bậc 0/ghép theo thứ tự ở lần gọi đó, người dùng gọi lại để xử lý tiếp phần còn lại. IPC `rows:autopair` giữ nguyên dạng một lời gọi - một kết quả như hiện tại (không stream tiến trình) cho bản đầu; nếu đo cho thấy cần, việc báo tiến trình để sau.

### D5. Test: tách phần thuật toán thuần khỏi phần model thật

`heuristics.ts` (Bậc 0) và `align.ts` (ghép cửa sổ + chọn ngưỡng) là hàm thuần, test bằng fixture câu dựng tay, không cần tải model. `embeddings.ts` (gọi `@huggingface/transformers`) test riêng bằng một embedding giả lập (vector cố định cho câu test) để không phụ thuộc mạng/model thật trong CI; độ chính xác với model thật được đo bằng tay trong Electron (tasks mục kiểm chứng), như cách `sentence-mode` đã đo hiệu năng thật thủ công.

### D6. Cấu trúc mã

```text
src/main/alignment/
  heuristics.ts        Bậc 0: chấm điểm cặp ứng viên không cần model
  heuristics.test.ts
  embeddings.ts         tải/cache model, tính embedding một câu/một lô
  embeddings.test.ts    dùng embedding giả lập, không tải model thật
  align.ts              hợp Bậc 0 + Bậc 1 thành danh sách cặp đề xuất kèm confidence
  align.test.ts
src/main/infra/storage/sentenceRows.ts   autoPair gọi align.ts trước, ghép theo thứ tự cho phần còn lại
```

## Risks / Trade-offs

- **[Chưa có số đo độ chính xác thật trên văn bản ZH/JA/VI]** → Ngưỡng ở D3 là giả thuyết; task kiểm chứng đo trên ít nhất hai chương thật mỗi cặp ngôn ngữ trước khi coi ngưỡng là đáng tin, không đổi spec nếu số đổi.
- **[Model 118 MB cần mạng lần đầu]** → Tải một lần, cache, suy giảm về chỉ Bậc 0 khi không tải được; không chặn luồng chính của app.
- **[Chi phí embedding tăng nhanh với chương lớn]** → Giới hạn cửa sổ Bậc 1 theo vị trí tương đối và giới hạn số segment chạy Bậc 1 mỗi lần gọi (D4); đo lại hiệu năng thật như `sentence-mode` đã làm.
- **[Ngưỡng sai khiến cặp sai được gán `status: ok`]** → Vẫn `kind: 'ai'`; dịch giả thấy hàng là *AI đã dịch* và có thể sửa/xác nhận lại; không `markReviewed` tự động, không ảnh hưởng tới văn bản nếu dịch giả không chạm vào hàng đó.
- **[Đổi model/provider embedding sau này]** → Cô lập trong `embeddings.ts`, phần còn lại không phụ thuộc chi tiết model, chỉ cần một vector mỗi câu.

## Migration Plan

Không đổi schema, không đổi dữ liệu có sẵn. Model không có cho tới khi được dùng lần đầu; chương chưa từng chạy `autoPair` theo cách mới không bị ảnh hưởng. Hoàn tác: revert code; liên kết đã tạo bằng engine mới vẫn hợp lệ với schema cũ (chỉ là `confidence` có giá trị thật thay vì 0).

## Open Questions

1. **Ngưỡng floor/ok chính xác** cho confidence — chờ đo trên corpus thật ZH/JA/VI (ít nhất hai chương mỗi cặp ngôn ngữ, theo bước kiểm chứng đã ghi ở `technical-feasibility.md`). Không đổi spec nếu số đổi, chỉ đổi hằng số.
2. **Giới hạn số segment chạy Bậc 1 mỗi lần gọi** cho chương cực lớn — chờ đo hiệu năng thật trong Electron trước khi chốt số.
3. **Có cần báo tiến trình tải model lần đầu** trong giao diện hay tận dụng thông báo lỗi/trạng thái hiện có khi offline — ảnh hưởng UI nhỏ, không đổi hành vi đã đặc tả, quyết định khi làm `tasks` phần giao diện.
