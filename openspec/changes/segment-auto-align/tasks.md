## 1. Bậc 0 — điểm neo rẻ (hàm thuần)

- [ ] 1.1 `src/main/alignment/heuristics.ts`: chấm điểm một cặp (segment nguồn, segment dịch ứng viên) theo thứ tự tương đối, số/ngày trùng, thuật ngữ glossary trùng, tỷ lệ độ dài; hàm quyết định "đủ tin ở Bậc 0" theo quy tắc D3
- [ ] 1.2 `heuristics.test.ts`: cặp có số/ngày trùng → đủ tin; chỉ thứ tự trùng không bằng chứng khác → không đủ tin; tỷ lệ độ dài bất thường → không đủ tin; glossary rỗng không lỗi

## 2. Bậc 1 — embedding trong cửa sổ

- [ ] 2.1 Thêm `@huggingface/transformers` vào `package.json`; xác nhận `pnpm install` qua được và app vẫn build (`pnpm build`)
- [ ] 2.2 `src/main/alignment/embeddings.ts`: tải model `multilingual-e5-small` (ONNX) lần đầu dùng, cache vào thư mục dữ liệu ứng dụng, tính embedding một câu/một lô; trả lỗi rõ ràng (không throw làm sập) khi không tải được, để nơi gọi coi là "không có Bậc 1"
- [ ] 2.3 `embeddings.test.ts` dùng embedding giả lập (vector cố định theo câu test, không tải model thật): hàm cosine similarity đúng, lỗi tải model được báo đúng kiểu, không gọi mạng trong test
- [ ] 2.4 `src/main/alignment/align.ts`: với mỗi segment nguồn chưa đủ tin ở Bậc 0, lấy cửa sổ segment dịch ứng viên theo vị trí tương đối (kích thước cửa sổ và giới hạn số segment chạy Bậc 1 mỗi lần gọi theo D3/D4 — chọn số khởi điểm, ghi lại trong code comment là cần đo), chọn ứng viên cosine cao nhất trong cửa sổ
- [ ] 2.5 `align.test.ts` (dùng embedding giả lập của 2.3): chọn đúng ứng viên trong cửa sổ, bỏ qua ứng viên ngoài cửa sổ, segment không có ứng viên nào vượt floor thì không được gán, chương không có Bậc 1 (model lỗi) vẫn trả kết quả Bậc 0 không throw

## 3. Hợp hai bậc, áp ngưỡng confidence

- [ ] 3.1 `align.ts`: hàm `estimateLinks(source, target, unmatchedSourceIds, unmatchedTargetIds)` trả danh sách `{ sourceId, targetId, confidence }` theo quy tắc floor/ok của D3, không ép khớp dưới floor; hằng số ngưỡng đặt ở một chỗ, có comment "giả thuyết, xem design.md Open Questions"
- [ ] 3.2 Test: Bậc 0 thắng khi đủ tin (không chạy Bậc 1 cho segment đó — kiểm bằng spy/đếm lần gọi embedding); kết quả dưới floor bị loại hẳn, không lọt ra ngoài; không có segment nào được gán hai cặp

## 4. Tích hợp vào `autoPair`

- [ ] 4.1 `src/main/infra/storage/sentenceRows.ts` `autoPair`: gọi `estimateLinks` cho segment nguồn *chưa dịch* và segment dịch trong `unlinkedTargets`; với mỗi cặp được đề xuất, tạo liên kết `kind: 'ai'`, `status` theo ngưỡng ok/needs_review, `confidence` thật; phần còn lại (không được đề xuất) ghép theo thứ tự như cũ (`status: 'needs_review'`, `confidence: null`); trả về tổng số cặp đã ghép ở cả hai bước
- [ ] 4.2 `sentenceRows.test.ts` bổ sung: cặp đủ tin → `status: 'ok'`, hàng tương ứng hiện *AI đã dịch* (qua `rowState`); cặp tin cậy thấp → `status: 'needs_review'`, hàng hiện *Cần kiểm tra*; không có ứng viên ngữ nghĩa nào (embedding giả lập không khớp) → toàn bộ rơi về ghép theo thứ tự như hành vi cũ, kết quả giống test hiện có của `autoPair`; model lỗi/không có mạng (giả lập `embeddings.ts` trả lỗi) → vẫn hoàn tất bằng Bậc 0 + ghép theo thứ tự, không throw

## 5. Đo và kiểm chứng

- [ ] 5.1 Đo trong Electron thật (nối tiếp số đo đã có ở `sentence-mode`): `autoPair` với chương cực lớn (5.000 segment chưa ghép) — thời gian chạy, có vượt ngưỡng chấp nhận được không; nếu vượt nhiều, giảm giới hạn số segment chạy Bậc 1 mỗi lần gọi (cập nhật hằng số ở 2.4, không đổi spec) và đo lại
- [ ] 5.2 Lấy ít nhất hai chương thật mỗi cặp ngôn ngữ (ZH→VI, JA→VI) có bản dịch đã biết trước (gắn liên kết kỳ vọng bằng tay), chạy `estimateLinks`, đo tỷ lệ cặp đúng/sai ở từng mức confidence; ghi kết quả vào `technical-feasibility.md` (thay phần "giả thuyết" bằng số đo thật) và chỉnh lại hằng số floor/ok ở 3.1 nếu cần
- [ ] 5.3 Thử tắt mạng hoàn toàn trước lần đầu dùng tính năng: xác nhận `autoPair` vẫn chạy được (chỉ Bậc 0 + ghép theo thứ tự), không có lỗi hiện ra khó hiểu cho người dùng
- [ ] 5.4 Chạy `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`; cập nhật `engineering/current-state.md`, `delivery/backlog.md` (gỡ placeholder M3, ghi `segment-auto-align` đã triển khai), `delivery/roadmap.md`, `maintenance/changelog.md`, `research/technical-feasibility.md` (số đo thật từ 5.2 thay cho giả thuyết)
