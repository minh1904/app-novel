# ADR-002 — AI dịch từ raw là luồng chính của bản đầu

Ngày: 2026-09-29 · Trạng thái: **Accepted — một phần bị [ADR-005](0005-ai-first-proposals-no-sentence-mode.md) thay thế (2026-10-03)** · Người quyết định: chủ sản phẩm qua trao đổi ngày 2026-09-29.

> **Cập nhật 2026-10-03.** ADR-005 thay các ý sau của trang này: **hai mode** (Từng câu bị bỏ), **“AI dịch theo segment có ID”** (đơn vị là đoạn, ID chỉ sống trong một lần gọi), **“soát ở Từng câu”** (duyệt đề xuất ngay trong pane) và đoạn **“căn chỉnh sinh ra từ job dịch”** ở mục Hệ quả. Phần còn lại giữ nguyên: AI dịch từ raw là luồng chính, nhiều nguồn raw, văn phong và xưng hô là tài nguyên ngữ cảnh, kết nối bằng API key (không OAuth thuê bao), offline trừ bước gọi AI, AI không âm thầm ghi đè. Các chỗ bị thay được đánh dấu ngay bên dưới; văn bản gốc giữ nguyên làm lịch sử.

Thay thế phần “AI dịch/viết lại ở giai đoạn sau P0” trong [quyết định hiện hành](../product/decisions.md) và [scope v0.1](../product/scope.md). Các ràng buộc khác (Windows, offline cho đọc/sửa/lưu, ~~hai mode~~ *(bị ADR-005 thay)*, dữ liệu nội bộ có xuất/backup) giữ nguyên.

## Bối cảnh

Handbook 0.1 đặt người dùng đầu là dịch giả tự dịch, AI để sau P0. Khi được hỏi người dùng chính là ai, chủ sản phẩm trả lời: dịch giả dịch từ raw có AI hỗ trợ cải thiện, và dịch giả **dịch toàn bộ bằng AI từ raw**; một truyện có thể có nhiều nguồn (Anh, Nhật, Trung); cần copy văn phong từ bản dịch cũ cho bản dịch mới. Ưu tiên **dịch full bằng AI**.

Nghiên cứu cùng ngày ([hệ sinh thái dịch truyện Việt](../research/vietnam-ecosystem.md)) cho thấy cộng đồng đã chuyển sang hậu biên tập bản AI: Hako mở mục “AI dịch” riêng từ 2025-05-05; nỗi đau lớn nhất là tên riêng và xưng hô không nhất quán giữa các chương.

## Các lựa chọn

1. **Giữ AI sau P0**, bản đầu chỉ là editor. Không khớp người dùng chính đã xác nhận.
2. **Tích hợp AI dịch từ raw ngay bản đầu**, editor hai mode trở thành nơi soát/sửa output AI. Chọn.
3. **Chỉ nhập output AI từ công cụ khác.** Rẻ hơn nhưng bỏ mất lợi thế glossary/xưng hô/văn phong được đưa vào prompt.

## Quyết định

- Luồng chính: nhập raw → chia segment → **AI dịch theo segment có ID** → soát ở Từng câu / sửa ở Toàn văn → QA nhất quán → xuất. Dịch tay và nhập bản dịch có sẵn vẫn được hỗ trợ. *(Từ ADR-005: nhập raw → AI dịch theo đoạn → duyệt đề xuất và sửa trong editor → QA → xuất.)*
- Một tác phẩm có thể có **nhiều nguồn raw**; **người dùng chọn nguồn chính** để chia segment, nguồn phụ làm ngữ cảnh.
- **Văn phong từ bản dịch cũ** và **ma trận xưng hô** là tài nguyên ngữ cảnh của tác phẩm. Ma trận xưng hô có thể cập nhật song song; ưu tiên màn xem trước.
- **Kết nối model:** API key (Anthropic, Gemini, OpenAI, DeepSeek…), **OpenRouter** (có luồng OAuth PKCE cho app) và endpoint tương thích OpenAI (Ollama/LM Studio chạy local). **Không** dùng OAuth thuê bao Claude Pro/Max hay Antigravity/Gemini CLI: nhà cung cấp cấm và đã khóa tài khoản vi phạm (xem [nghiên cứu](../research/vietnam-ecosystem.md#nhà-cung-cấp-ai)).
- **Offline giữ nguyên:** đọc, sửa, lưu, lịch sử, nhập/xuất, backup không cần mạng. Chỉ bước gọi AI cần mạng, trừ model local.
- **Auth tài khoản Mira và đồng bộ** để sau.
- AI chỉ tạo **bản dịch/đề xuất** có nguồn gốc ghi lại; không âm thầm ghi đè văn bản người dùng đã sửa.

## Hệ quả

- Căn chỉnh không còn nằm trên đường chính: segment do AI dịch sinh ra đã có liên kết. Căn chỉnh offline vẫn cần cho nhập bản dịch cũ (lấy văn phong), đối chiếu các nguồn raw và sau khi sửa tự do ở Toàn văn. Model embedding không còn là điều kiện của lát cắt đầu. *(ADR-005 bỏ luôn liên kết bền và change `segment-auto-align`; căn chỉnh bản dịch cũ cho văn phong chưa có thiết kế mới.)*
- Mô hình dữ liệu cần thêm: nguồn raw nhiều biến thể, job dịch AI bền vững (tiếp tục sau lỗi), cấu hình provider, glossary, ma trận xưng hô, ví dụ văn phong, nguồn gốc bản dịch theo segment/chương.
- Cần spec riêng cho dữ liệu gửi đi, chi phí, xử lý lỗi và lưu khóa API (Electron `safeStorage`).
- Chính sách nhà cung cấp thay đổi nhanh; đọc lại điều khoản trước mỗi lần thêm kiểu kết nối.

## Liên kết

[Quyết định hiện hành](../product/decisions.md) · [Roadmap](../delivery/roadmap.md) · [Nghiên cứu hệ sinh thái Việt](../research/vietnam-ecosystem.md) · [Nghiên cứu khả thi kỹ thuật](../research/technical-feasibility.md) · [Công cụ dịch AI](../research/ai-translation-tools.md)

---

[Mục lục handbook](../README.md)
