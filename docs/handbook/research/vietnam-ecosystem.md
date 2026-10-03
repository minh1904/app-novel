# Hệ sinh thái dịch truyện Việt và nhà cung cấp AI

Ngày đọc: **2026-09-29** · Trạng thái: Quan sát + suy luận · Chủ trì: research/product · Liên quan: MIR-04, MIR-06, MIR-09, [ADR-002](../decisions/0002-ai-first-translation.md)

## Câu hỏi và phương pháp

Người dịch truyện sang tiếng Việt làm việc thế nào, đăng ở đâu, đau ở đâu; và Mira được phép kết nối model theo những cách nào. Chỉ đọc tài liệu công khai, diễn đàn và repository; chưa phỏng vấn người dùng, chưa đăng thử lên nền tảng. Nhãn: **[V]** đã mở và đọc nguồn; **[S]** chỉ thấy qua tóm tắt tìm kiếm, trang không mở được; **[I]** suy luận.

## Quan sát: nền tảng và chính sách

| Mệnh đề | Nguồn | Giới hạn |
| --- | --- | --- |
| Hako/docln chia *Truyện dịch*, *Convert/Máy dịch*, *OLN*; truyện dịch phải đọc được, không dựa Google Dịch; admin phạt chia chương sai. [V] | [Quy định truyện dịch](https://docln.net/thao-luan/2745-quy-dinh-doi-voi-truyen-dich), [quy định chung](https://ln.hako.vn/thao-luan/20-quy-dinh-chung-doi-voi-cac-du-an-dang-tai-cong-light-novel-bao-gom-truyen-dichconvert-va-oln) | Chưa xem editor đăng bài (trang hướng dẫn không tải được) |
| 2023: bản AI/máy phải vào mục Convert. **2025-05-05: mở mục “AI dịch” riêng**; từ chối output QuickTranslator; chấp nhận Gemini, GPT-4, DeepSeek… nếu văn tự nhiên, kiểm duyệt theo chất lượng. [V] | [Về việc dùng AI (2023)](https://ln.hako.vn/thao-luan/2562-ve-viec-su-dung-ai), [Thông báo AI dịch](https://ln.hako.vn/thao-luan/3097-thong-bao-ve-ai-dich), [mục AI dịch](https://ln.hako.vn/ai-dich) | Chính sách có thể đổi |
| Wikidich (nay wikicv.net) hoạt động như QuickTranslator trên web: nhúng raw Trung, ba chế độ đọc Trung/Hán Việt/convert. [S] | [wikicv.net](https://wikicv.net/) | Chưa đăng nhập thử |
| Sáng Tác Việt: sửa tên trong chương được áp dụng cho chương sau; converter chia sẻ “gói name”. Có extension bên thứ ba thêm dịch Gemini. [S]/[V] | [sangtacviet.vn](https://sangtacviet.vn/), [phwgna-stv](https://github.com/itzmonnz/phwgna-stv) | Chưa rõ định dạng gói name |
| Wattpad nhận dán vào editor hoặc TXT < 2 MB, không nhập DOCX. [V] | [Wattpad help](https://support.wattpad.com/hc/en-us/articles/205351944-Formatting-issues) | — |
| Metruyencv/TruyenCV, TruyenYY: chưa tìm thấy quy định định dạng hoặc AI công khai. | [metruyencv.net](https://metruyencv.net/), [TruyenYY](https://truyenyy.vip/page/huong-dan-dang-truyen/) | Cần kiểm tra thủ công |

## Quan sát: quy trình và công cụ

- **Convert → biên tập:** QuickTranslator tạo bản thô, converter sửa trật tự, editor viết lại. [S] ([dembuon](https://dembuon.vn/threads/huong-dan-edit-cach-lay-convert-raw-truyen-chu.83850/))
- **Từ điển QuickTranslator:** `Names.txt`, `VietPhrase.txt` là UTF-8, mỗi dòng `中文=nghĩa1/nghĩa2`; Names ưu tiên hơn VietPhrase. [V] ([yukitosai](http://yukitosai.blogspot.com/2013/07/phan-mem-quick-translator-qt-moi-nhat.html), [bnsach](https://bnsach.com/forum/threads/8499/))
- **Chuyển sang AI:** công cụ cộng đồng trên Voz chia TXT/EPUB theo chương, xoay vòng nhiều API key Gemini, gộp kết quả; có công cụ quét tên viết lệch qua hàng trăm chương. [V]/[S] ([Voz Gemini](https://voz.vn/t/tool-dich-truyen-bang-gemini.1076131/), [MC-AI Novel Trans](https://voz.vn/t/mc-ai-novel-trans-cong-cu-dich-truyen-tranh-tieu-thuyet-ho-tro-ai.1190485/))
- Dự án GitHub cộng đồng giữ **sổ nhân vật + ma trận xưng hô thay đổi theo tiến trình truyện**. [S] ([novel-publisher-agy](https://github.com/tritamk14/novel-publisher-agy), README không mở được)

## Quan sát: nỗi đau thường gặp

1. **Tên riêng và thuật ngữ lệch giữa chương** khi dùng AI. [S]
2. **Xưng hô hỗn loạn:** AI nhảy “ta/ngươi” ↔ “anh/em”; dùng một cặp xưng hô cho mọi nhân vật buộc phải soát lại toàn bộ. [S] ([ngontinhgroup](https://ngontinhgroup.wordpress.com/cach-edit-cho-nguoi-moi/))
3. **Vận hành công cụ AI khó:** nhiều API key, lỗi khi chạy ~1.000 chương, thiếu truyện ngắn khi chia file, antivirus chặn. [V] (Voz Gemini)
4. **Lời thoại:** tiếng Việt dùng gạch đầu dòng *hoặc* ngoặc kép, không trộn; nguồn Nhật/Trung cần chuẩn hóa `「」`. [S]/[I]
5. **Mất bài:** chưa tìm thấy bằng chứng là nỗi đau nổi bật. Không bỏ yêu cầu an toàn dữ liệu, nhưng không dùng làm thông điệp chính khi chưa phỏng vấn.

## Nhà cung cấp AI

| Kiểu kết nối | Quan sát | Nguồn |
| --- | --- | --- |
| OAuth thuê bao Claude Free/Pro/Max | **Cấm** dùng trong sản phẩm bên thứ ba; Anthropic chặn phía server từ 01/2026, làm rõ tài liệu ngày 2026-02-19. Nhà phát triển phải dùng API key. | [The Register](https://www.theregister.com/2026/02/20/anthropic_clarifies_ban_third_party_claude_access/), [Claude Code legal](https://code.claude.com/docs/en/legal-and-compliance) |
| OAuth Antigravity / Gemini CLI | **Cấm**; Google đã khóa cả tài khoản trả phí dùng qua công cụ bên thứ ba, khuyên dùng API key AI Studio/Vertex. | [Gemini CLI discussion](https://github.com/google-gemini/gemini-cli/discussions/20632), [openclaw.rocks](https://openclaw.rocks/blog/google-antigravity-ban) |
| OpenRouter | Có luồng OAuth PKCE chính thức cho app; người dùng nhận API key do họ kiểm soát. | [OpenRouter PKCE](https://openrouter.ai/docs/use-cases/oauth-pkce), [công cụ dịch AI](ai-translation-tools.md) |
| API key trực tiếp, endpoint tương thích OpenAI | Hợp lệ; Ollama/LM Studio chạy local không cần mạng. | Tài liệu nhà cung cấp |

## Suy luận cho Mira

- Mira nên là nơi **tạo và soát bản dịch AI có kiểm soát**, không chỉ là editor. Lợi thế so với script cộng đồng: glossary/xưng hô/văn phong đi vào prompt, job dịch bền vững (tiếp tục sau lỗi), soát theo segment, QA nhất quán. *(Cập nhật 2026-10-03, [ADR-005](../decisions/0005-ai-first-proposals-no-sentence-mode.md): "soát theo segment" nay là duyệt đề xuất AI từng khối ngay trong editor; không còn đơn vị segment/câu.)*
- **Import `Names.txt`/`VietPhrase.txt`** làm glossary khởi đầu là rẻ và khớp thói quen Trung–Việt.
- **Ghi nguồn gốc bản dịch theo chương** (tay / AI / convert) giúp người dùng đăng đúng mục trên Hako.
- **Xuất “dán sạch”** theo chương và tùy chọn kiểu lời thoại quan trọng hơn EPUB/DOCX cho việc đăng.
- Điều có thể bác bỏ: nếu phỏng vấn cho thấy người dùng chỉ cần dịch nhanh để đọc, không soát, thì editor hai mode là chi phí thừa. *(Cập nhật 2026-10-03: chủ sản phẩm đã bỏ hai mode theo ADR-005 mà chưa chạy phiên quan sát này; nếu phiên cho thấy người dùng cần soát theo từng câu thì mở lại quyết định, xem mục "Điều có thể làm đảo quyết định" của ADR-005.)*

## Bước kiểm chứng

Mở trang đăng bài Hako/Metruyencv để xác nhận định dạng dán; lấy mẫu gói name STV; phỏng vấn 5–8 người theo [kế hoạch kiểm chứng](../delivery/validation.md), ưu tiên người đang dùng AI dịch.

---

[Mục lục handbook](../README.md)
