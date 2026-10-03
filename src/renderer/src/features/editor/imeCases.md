# Bảng ca thử bộ gõ (IME) cho editor chương

Nguồn: yêu cầu "Tương thích bộ gõ (IME)" của spec `source-editor` (change `source-editor`). Bảng này được
điền tay trên máy thật; máy không mô phỏng được bộ gõ của hệ điều hành. Một ca không đạt chặn việc coi
change là xong (task 1.5 và 6.1).

## Chuẩn bị

1. `pnpm dev` (Electron 44), mở một tác phẩm có chương đã nhập bản gốc, mở chương đó.
2. Bật từng bộ gõ trong hệ điều hành: **Telex**, **VNI** (tiếng Việt), **Pinyin** (Microsoft Pinyin hoặc
   tương đương). Ghi lại tên bộ gõ và phiên bản Windows ở bảng kết quả.
3. "Đầu tiên" nghĩa là: ngay sau khi nhấp vào editor, hoặc sau khi chuyển sang cửa sổ khác rồi quay lại
   (đây là điều kiện của lỗi Chromium 149+ mất lần gõ IME đầu tiên trong `contenteditable`).
4. Ở bản tối thiểu (task 1.5) chưa có lưu và chưa có segment: các ca 3, 4, 5, 8 chỉ kiểm chữ có ra đúng
   chỗ; phần ID và lưu được kiểm lại ở task 6.1.

## Các ca

| #   | Ca                                                                                          | Telex | VNI | Pinyin | Kết quả đúng                                                     |
| --- | ------------------------------------------------------------------------------------------- | ----- | --- | ------ | ---------------------------------------------------------------- |
| 1   | **Đầu tiên:** gõ `Vieetj nam` (Telex) / `Vie65t nam` (VNI) / `nihao` rồi chọn 你好 (Pinyin) |       |     |        | Ra "Việt nam", "Việt nam", "你好"; ký tự đầu không mất           |
| 2   | Gõ dở một từ rồi nhấp sang chỗ khác                                                         |       |     |        | Từ được chốt đúng tại chỗ cũ, không nhảy                         |
| 3   | Gõ ở giữa một câu                                                                           |       |     |        | Chữ ra đúng chỗ; không nhấp nháy ranh giới (khi đã có segment)   |
| 4   | Gõ ngay cuối câu và ngay đầu câu                                                            |       |     |        | Chữ vào đúng chỗ (và đúng segment khi đã có segment)             |
| 5   | Gõ dở rồi bấm Ctrl+S (khi đã có lưu)                                                        |       |     |        | Việc lưu đợi chốt chữ rồi mới ghi; chữ vừa chốt có trong bản lưu |
| 6   | Gõ dở rồi bấm Ctrl+Z                                                                        |       |     |        | Không mất chữ đã chốt trước đó; editor không hỏng                |
| 7   | Gõ liên tục một đoạn ≥ 200 chữ, rồi sửa lại giữa chương                                     |       |     |        | Không rớt chữ, không trễ nhìn thấy được                          |
| 8   | Chọn một vùng nhiều câu rồi gõ đè bằng bộ gõ                                                |       |     |        | Vùng được thay đúng                                              |
| 9   | Chuyển cửa sổ rồi quay lại, gõ ngay                                                         |       |     |        | Như ca 1                                                         |

Ghi mỗi ô: `đạt`, `hỏng` (kèm mô tả: chữ nào mất, chữ nào thừa, nhảy chỗ nào), hoặc `chưa áp dụng`.

## Kết quả

| Lần                          | Ngày       | Bản build                                              | Hệ điều hành / bộ gõ           | Người thử    | Tóm tắt                                                            |
| ---------------------------- | ---------- | ------------------------------------------------------ | ------------------------------ | ------------ | ------------------------------------------------------------------ |
| 1 (bản tối thiểu, task 1.5)  | 2026-10-01 | Electron 44.4.5, CodeMirror `@codemirror/view` 6.43.13 | Windows 11; Telex, VNI, Pinyin | chủ sản phẩm | Báo đạt (không ghi riêng từng ô); lưu và ID chưa áp dụng ở bản này |
| 2 (bản hoàn chỉnh, task 6.1) |            |                                                        |                                |              |                                                                    |

## Nếu có ca hỏng

Làm theo D8 trong `design.md`, theo thứ tự: (1) chạy lại ca trên trang CodeMirror trần cùng Chromium để
phân định lỗi ở CodeMirror, Chromium hay mã Mira; (2) nếu ở mã Mira thì sửa; (3) nếu ở CodeMirror thì nâng
bản, thử các tuỳ chọn `contenteditable`/`EditContext`, rồi bản vá tại chỗ; (4) nếu ở Chromium thì nâng
Electron. Không chuyển sang `<textarea>`.

## Ca riêng cho ô bản dịch của mode Từng câu (change `sentence-mode`, task 5.2)

> **Không còn cần (ADR-005, 2026-10-03):** mode Từng câu đã bỏ và đang tạm ẩn, không ai điền bảng này. Giữ nguyên bảng làm lịch sử cho tới khi mã mode bị gỡ.

Chạy `pnpm dev`, mở một chương đã có bản gốc, bấm tab **Từng câu**. Ô bản dịch của mỗi hàng là `<textarea>` bản địa (không phải CodeMirror) nên cần thử riêng. Bật Telex rồi VNI.

| #   | Ca                                                                                   | Telex | VNI | Kết quả đúng                                                                              |
| --- | ------------------------------------------------------------------------------------ | ----- | --- | ----------------------------------------------------------------------------------------- |
| R1  | Ô của hàng **chưa dịch**: nhấp vào ô rồi gõ `Vieetj nam` / `Vie65t nam` ngay lần đầu |       |     | Ra "Việt nam"; ký tự đầu không mất                                                        |
| R2  | Gõ dở một từ chưa chốt rồi bấm **Enter**                                             |       |     | Enter chốt từ (không ghi hàng, không sang hàng kế); Enter lần hai mới ghi và sang hàng kế |
| R3  | Gõ dở một từ rồi bấm Tab sang ô khác                                                 |       |     | Từ được chốt và hàng cũ được ghi đủ chữ                                                   |
| R4  | Sửa giữa câu ở ô **đã có chữ** (đặt con trỏ giữa câu, gõ thêm một từ)                |       |     | Chữ ra đúng chỗ, con trỏ không nhảy                                                       |
| R5  | Gõ tới hết ô nhiều dòng (câu dài, ô tự cao lên)                                      |       |     | Không mất chữ, ô cao lên vừa đủ, không thanh cuộn                                         |
| R6  | Gõ ở ô rồi bấm Ctrl+Enter giữa lúc từ chưa chốt                                      |       |     | Từ chốt trước, rồi mới xác nhận và nhảy hàng                                              |
| R7  | Chuyển hàng liên tiếp bằng Enter 5 hàng, mỗi hàng gõ một câu Telex                   |       |     | Mỗi hàng ghi đúng chữ của nó, không lẫn sang hàng kế                                      |

## Ca riêng cho pane bản dịch (change `translation-editor`, task 4.2)

Chạy `pnpm dev`, mở một chương đã có bản gốc. Dùng pane **Bản dịch** (bên phải). Bật Telex rồi VNI (và Pinyin nếu muốn thử gõ chữ Hán vào bản dịch).

| #   | Ca                                                                                                 | Telex | VNI | Kết quả đúng                                                     |
| --- | -------------------------------------------------------------------------------------------------- | ----- | --- | ---------------------------------------------------------------- |
| T1  | Bản dịch **trống**, gợi ý đang hiện: nhấp vào pane rồi gõ `Vieetj nam` / `Vie65t nam` ngay lần đầu |       |     | Ra "Việt nam"; ký tự đầu không mất; gợi ý biến mất khi có chữ    |
| T2  | Gõ dở một từ (chưa chốt) rồi nhấp sang pane **Bản gốc** (đã khóa) rồi nhấp lại                     |       |     | Từ được chốt đúng chỗ, không mất chữ, không nhảy                 |
| T3  | Gõ dở một từ rồi bấm Tab để rời pane                                                               |       |     | Từ được chốt, không chèn ký tự Tab                               |
| T4  | Gõ dở rồi bấm Ctrl+S (lưu cả hai bên)                                                              |       |     | Việc lưu đợi chốt chữ rồi mới ghi; chữ vừa chốt có trong bản lưu |
| T5  | ~~Gõ một đoạn dài (≥ 200 chữ) rồi bấm "Đọc", đọc, bấm "Soạn thảo", gõ tiếp~~                       |       |     | Không còn áp dụng: Reading view đã bị gỡ (commit `81bbd2f`)      |
| T6  | Mở khóa bản gốc ("Sửa bản gốc"), gõ Telex ở bản gốc rồi chuyển sang bản dịch gõ tiếp               |       |     | Cả hai bên nhận chữ đúng, không lẫn qua bên kia                  |
| T7  | Dán một bản dịch dài vào pane trống rồi gõ ngay một từ Telex ở giữa                                |       |     | Chữ ra đúng chỗ; không nhấp nháy ở lề (cột số đã bỏ)             |
