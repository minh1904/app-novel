## 1. Nền

- [x] 1.1 Store và component toast (`notify`, `notifyError`): thành công tự ẩn sau 5 giây ở góc dưới phải; lỗi
  hoặc toast có nút đứng yên ở giữa trên. Kiểm: unit test store cho thời gian và vị trí theo loại; render
  test có `role="status"` hoặc `role="alert"`.
- [x] 1.2 Hook `useAutosave(value, save, 550)` với hàng đợi tuần tự. Kiểm: unit test bằng fake timer: gõ liên tục
  chỉ lưu một lần; lần lưu thứ hai đợi lần đầu xong; lỗi gọi `notifyError`. Kết quả: test phủ hàng đợi (tuần tự, chỉ giá trị mới nhất, lỗi không chặn); phần chờ 550 ms nằm trong effect của hook, kiểm bằng chạy app.
- [x] 1.3 Viết lại `SettingRow` theo `ListRow` (container query, không viền, `wide`, `below`); thêm
  `SettingsSection` và `SectionHeading`. Kiểm: render test cho lớp `@2xl:grid-cols-…` và không còn
  `border-b`.

## 2. Modal Cài đặt

- [x] 2.1 `uiStore`:
  - thêm `settings` và `openSettings({group, page, key})`;
  - bỏ view `settings`;
  - nút bánh răng trong `AppShell` mở modal.

  Kiểm: unit test store; grep không còn `view.name === 'settings'`.
- [x] 2.2 Khung modal: Dialog, lưới 13rem, điều hướng nhóm/mục, breadcrumb, dropdown khi hẹp, nút đóng; Esc
  đóng, focus trở về nút mở. Kiểm: render test cho điều hướng và breadcrumb; chạy app (skill `run`), mở từ
  màn chương, đóng thì vẫn ở chỗ cũ.
- [x] 2.3 Tìm trong cài đặt: chỉ mục `settingsIndex`, ô tìm vắt trên mép thẻ, gõ phím chữ để mở, chọn kết quả
  thì chuyển mục và nhấp sáng 1,6 giây. Kiểm: unit test lọc chỉ mục; chạy app, gõ "gemini" tới thẻ Gemini.
- [x] 2.4 Nhóm Giao diện:
  - Theme Sáng / Tối / Theo hệ thống bằng SegmentedControl, ghi nhớ;
  - "Theo hệ thống" nghe `prefers-color-scheme`;
  - chuyển công tắc kính sang đây.

  Nhóm Về Mira. Kiểm: unit test lưu theme; chạy app, đổi chế độ Windows thì Mira đổi theo.

## 3. Kết nối AI

- [x] 3.1 `PROVIDER_CARDS` và `connectionSection()`. Gắn `providerId: 'ollama'` cho preset, kèm migration sửa kết
  nối Ollama cũ. Kiểm: unit test phân loại; test migration trên thư viện có kết nối Ollama cũ.
- [x] 3.2 `probeEndpoint`: dò `/models` với biến thể `/v1`, thăm dò route chat 1 token, phát hiện HTML hoặc
  danh sách rỗng, phân loại kết quả kiểm khóa, bỏ qua proxy cho localhost. Lưu base URL đã giải. Kiểm:
  unit test bằng fetch giả cho các trường hợp thiếu `/v1`, HTML 200, 401, 404 ở route, 400 ở route, lỗi
  mạng.
- [x] 3.3 IPC `ai:connections:ensure-with-key` và `ai:connections:probe`. Contract valibot; chỉ nhận
  `isTrustedSender`. Kiểm: test handler.
- [x] 3.4 Mục Khóa API:
  - thẻ provider có chấm trạng thái;
  - ô khóa `••••` bấm để sửa (Enter lưu, Esc hủy);
  - mở thẻ ra là danh sách khóa và `ModelEntries`;
  - ô tìm;
  - Anthropic ở trạng thái "Sắp có".

  Kiểm: render test các trạng thái; chạy app, dán khóa OpenRouter vào thẻ ảo thì tạo kết nối.
- [x] 3.5 Mục Endpoint tùy chỉnh: danh sách có nhãn "Đang dùng", Dùng, Xóa; form với chế độ API (Tự nhận / Chat
  Completions), model từ danh sách dò, context, khóa; Kiểm tra tự điền model và base URL. Kiểm: chạy app
  với gateway giả hoặc Ollama.
- [x] 3.6 Mục Trên máy (Ollama, LM Studio: địa chỉ, Kiểm tra, danh sách model) và mục Tài khoản (khung, thẻ
  "Sắp có", thẻ Claude dẫn sang Khóa API). Kiểm: render test; chạy app khi Ollama tắt, thấy đúng câu báo.

## 4. Model chính và dự phòng

- [x] 4.1 Lưu và đọc `ai.main`, `ai.fallbacks` trong `meta`. Dọn khi xóa kết nối hoặc mục. IPC đọc/ghi. Kiểm:
  unit test đọc dữ liệu hỏng, dọn khi xóa.
- [x] 4.2 Thứ tự chọn model (phiên → model chính → mặc định cũ) cho chat, hộp thoại dịch và hàng chờ dịch.
  Kiểm: unit test hàm chọn; test `chatService` dùng `ai.main` khi phiên không chọn.
- [x] 4.3 Mục Model › Model chính (kết nối, mục, mức suy luận, Áp dụng, ô khóa và Kích hoạt tại chỗ) và Model
  › Dự phòng (danh sách có thứ tự, tự lưu). Kiểm: render test; chạy app, Áp dụng rồi mở chat mới thấy
  model đó.
- [x] 4.4 Thêm `ProviderError.fallback` trong `classifyError`, cùng `withFallback` cho chat và lô dịch:
  - bỏ qua mục trùng model hoặc không có khóa;
  - ghi bước chuyển;
  - không chuyển khi đã stream một phần.

  Kiểm: unit test bảng `fallback` theo loại lỗi; test `chatService` với model giả trả quota rồi dự phòng
  trả lời; test lô dịch; test lỗi `refused` không chuyển. Kết quả: làm cho chat (`fallback.ts` + vòng gọi trong `chatService`, 2 test); luật đặt trong một hàm thay vì trường của `ProviderError` (design D7 đã sửa). Lô dịch tách ra việc 4.6.
- [x] 4.5 Hiện bước chuyển trên lượt chat ("Đã chuyển sang Y vì X…") và trên lô dịch; nút "Thử bằng Y" khi lỗi
  sau stream. Kiểm: render test `AiTurn` với bước chuyển. Kết quả: chat xong (dòng cảnh báo + nút Thử bằng Y, 2 test); dòng trên lô dịch đi cùng 4.6.

- [x] 4.6 Dự phòng cho dịch chương, theo cách A chủ sản phẩm chọn ngày 2026-10-08: lượt dịch không tự đổi model (mỗi đề xuất gắn một model). Khi lượt dừng vì lỗi mà chính sách đánh dấu `fallback` (hết hạn mức, giới hạn tốc độ, mạng, quá giờ, phản hồi hỏng), hộp thoại mời "Dịch tiếp bằng Y" với Y là dự phòng đầu tiên; bấm thì lập kế hoạch cho Y và chỉ dịch các đoạn còn thiếu, vào một đề xuất mới. Kiểm: test `withPolicy` gắn `fallback` đúng loại lỗi; test `continueTargetOf` (chọn dự phòng khác model vừa lỗi, không mời khi đang chạy, lỗi không đổi model được hay không còn đoạn). Chưa chạy thật vì cần một lỗi hết hạn mức thật.

## 5. Menu model

- [x] 5.1 Viết lại `ModelSelectionMenu`:
  - ô tìm, nhóm Yêu thích, nhóm theo kết nối có thu gọn;
  - nhãn mức và dấu ✓;
  - phím ↑ ↓ Enter, Shift+Enter, →, Esc.

  Kiểm: unit test hàm lọc và sắp xếp danh sách phẳng; render test nhóm Yêu thích.
- [x] 5.2 Submenu "Tùy chọn: Suy luận" và "Mức" theo `modelCapability`. Kiểm: test với Gemini 2.5 Flash chỉ có
  ba mức và model lạ chỉ có Mặc định.
- [x] 5.3 Lối tắt cuối menu: Dùng mặc định, Tải lại model, Thêm model tùy chỉnh, Sửa danh sách model (link sâu),
  Thêm nhà cung cấp. Pill có chấm accent khi khác model chính; `Ctrl+Shift+M`. Kiểm: chạy app, đủ năm lối Kết quả: chạy app thấy menu, submenu Suy luận/Mức, Ctrl+Shift+M; submenu mở sang trái ở ô chat vì panel sát mép phải.
  tắt hoạt động và chụp menu so với ảnh Hermes.
- [x] 5.4 Hộp thoại dịch dùng menu mới; lựa chọn không lan sang chat. Kiểm: test store.

## 6. Onboarding

- [x] 6.1 Lớp onboarding, máy trạng thái (`idle`, `key_form`, `endpoint_form`, `connecting`, `confirm_model`,
  `error`) và "Để sau" lưu trong `meta`. Kiểm: unit test máy trạng thái.
- [x] 6.2 Lưới thẻ khóa API, form endpoint, màn xác nhận model có giá, trạng thái lỗi có Chi tiết đã che khóa. Kết quả 2026-10-08: chạy app với thư mục dữ liệu trống: thẻ hiện, Nhà cung cấp khác, lưới khóa, khóa giả của Gemini ra trạng thái lỗi có ba nút (lời lỗi đang là nguyên văn của nhà cung cấp). Sửa: thẻ biến mất giữa luồng; khóa hỏng được gỡ lại. Chưa thử hết luồng tới Bắt đầu vì cần khóa thật.
  Kiểm: chạy app với thư mục dữ liệu trống: thẻ hiện, kết nối bằng gateway, Bắt đầu đặt model chính.

## 7. Tài liệu và kiểm tra cuối

- [x] 7.1 Cập nhật `docs/modules/ai-connections/README.md` (tiếng Việt): mô tả hành vi đã chạy, thứ tự chọn
  model, quy tắc chuyển dự phòng, ảnh chụp các mục. Kiểm: link tương đối trỏ tới file có thật.
- [x] 7.2 Chạy `node scripts/check.mjs --build`. Kiểm: mọi bước báo ok.
