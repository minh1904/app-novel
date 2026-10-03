## Why

Hôm nay người dùng chỉ chọn được **model nào** (một hàng checkbox trong Cài đặt) và một model mặc định. Họ không kiểm soát được **model sinh thế nào**: dịch chương và chat đều gửi `{model, messages}` và để nhà cung cấp dùng mặc định của họ. Dữ liệu thật của Gemini cho thấy mặc định đó đắt và khó đoán: cùng một câu ngắn tốn 125 token ở mặc định (thinking bật, 91 token ẩn) và 33 token với `reasoning_effort: "none"` ([change `ai-gateway`](../ai-gateway/design.md), "Xử lý ở 1.3"). Tầng kết nối đã nhận sẵn `maxTokens`, `temperature`, `reasoningEffort`, `extraBody`, nhưng không có chỗ nào để người dùng đặt chúng.

Chủ sản phẩm quyết định **theo y hệt LinguaGacha**, kể cả giao diện chat, và không thêm thứ thừa ngoài những gì họ có. Giao diện AI hiện tại chỉ là demo nên không bị ràng buộc. Mã LinguaGacha đã được đọc (clone ngày 2026-10-03; giấy phép chưa xác nhận nên chỉ học ý tưởng, không chép mã). Cấu trúc của họ, và là cấu trúc change này làm theo:

1. **Model là một mục cấu hình có id riêng, nhân bản được.** Nhiều mục có thể trỏ cùng một model thật với cấu hình khác nhau. Menu "…" của mỗi mục có: **Cơ bản, Tác vụ, Nâng cao, Sao chép, Xóa**.
2. **Ba hộp thoại cài đặt** (Cơ bản: tên, model thật với ba nút Nhập / Lấy / Kiểm tra, mức suy luận; Tác vụ: giới hạn token vào và ra, đồng thời, RPM; Nâng cao: nhiệt độ, `top_p`, header thêm, `extra_body`) cộng **một hộp thoại chọn model** từ danh sách lấy về, có ô lọc.
3. **Chỉ hiện những gì model hỗ trợ.** Mức suy luận lấy từ khả năng của model. models.dev, nguồn bảng giá Mira đang dùng, có sẵn `reasoning_options` (đã kiểm với Gemini: 2.5 Flash tắt được, 2.5 Pro chỉ có ngân sách tối thiểu 128 nên không tắt được, 3.x có `minimal` nhưng không có "tắt"). Script làm mới catalog của Mira hiện **bỏ** trường này.
4. **Nguyên tắc "chỉ gửi khi bật".** Mặc định `DEFAULT` nghĩa là không gửi gì; nhiệt độ, `top_p`, header và `extra_body` giữ giá trị khi tắt nhưng chỉ gửi khi bật.
5. **Một menu chọn "mục → mức suy luận"** dùng ở nơi dùng model; ô soạn chat chỉ có một nút "tên · mức".

## What Changes

- **Mục model có id riêng.** `ai_model` đổi từ `(kết nối, tên model)` sang mục có `id`, tên hiển thị, `model` (tên thật gửi cho nhà cung cấp) và `settings` JSON. Thêm, đổi tên, nhân bản, xóa, xếp thứ tự. Gõ được tên model bất kỳ, kể cả endpoint không liệt kê; danh sách lấy từ endpoint chỉ là gợi ý trong hộp thoại chọn model.
- **Hộp thoại Cơ bản:** tên hiển thị; tên model thật với nút **Nhập** (gõ tay), **Lấy** (mở hộp thoại chọn model), **Kiểm tra** (gửi một yêu cầu nhỏ bằng đúng cài đặt của mục, báo thành công kèm thời gian và token, hoặc thông điệp gốc của nhà cung cấp); mức suy luận (chỉ các mức model hỗ trợ).
- **Hộp thoại Tác vụ:** giới hạn token đầu vào mỗi lô (quyết định cỡ lô dịch; 0 = mặc định hiện tại 1.500), giới hạn token đầu ra (0 = tự động, không gửi), giới hạn đồng thời (0 = mặc định 4) và RPM (0 = không giới hạn; giãn nhịp các yêu cầu).
- **Hộp thoại Nâng cao:** nhiệt độ và `top_p` (thanh trượt, mỗi cái một công tắc), header thêm và `extra_body` (JSON, mỗi cái một công tắc).
- **Mức suy luận theo khả năng model:** menu chỉ đưa các mức model hỗ trợ, "Mặc định" (không gửi gì) khác "Tắt" (gửi giá trị tắt). Model không rõ khả năng chỉ có "Mặc định"; phần còn lại đi qua `extra_body`. Catalog giữ thêm `reasoning_options` và cờ `temperature`.
- **Một menu chọn mục model dùng chung:** hộp thoại dịch (thay ô chọn model hiện có) và ô soạn chat dùng cùng menu "mục → mức suy luận"; chọn mức là ghi vào mục. Ô soạn chat chỉ thêm một nút "tên · mức suy luận".
- **Dịch không trộn cấu hình:** kế hoạch dịch ghi lại cấu hình của mục model; nếu cấu hình bị sửa giữa các lô thì lô kế tiếp báo xung đột và người dùng lập kế hoạch lại (cùng khuôn `expectedRev` của văn bản). Chat áp cấu hình ở lượt kế tiếp; các vòng đọc công cụ của một lượt dùng cùng một cấu hình.
- **Tầng gọi và gateway:** `top_p` và header thêm vào yêu cầu; `extra_body` và header không được ghi đè phần lõi; bỏ chỗ âm thầm không gửi `reasoning_effort`; nhà cung cấp từ chối thì lỗi mang thông điệp gốc, không tự bỏ tham số rồi gọi lại. Gateway giữ **hàng chờ đồng thời và bộ giãn nhịp RPM theo từng mục** (bộ lập lịch khóa vẫn theo kết nối, vì khóa dùng chung).

Không thuộc change này (LinguaGacha có, nhưng Mira chưa có chỗ dùng): chế độ **tự động** của đồng thời (thăm dò, giảm một nửa khi gặp 429, cần có nhiều lô chạy song song mới có nghĩa; thuộc module Tác vụ), mức tốc độ dịch vụ `speed_level` (chỉ giao thức Responses, Mira chưa có), model dựng sẵn "đặt lại" và đăng nhập ChatGPT. Cũng không thêm thứ LinguaGacha không có: penalty, `seed`, bản tóm tắt "sẽ gửi", ghi đè theo lần chạy, cảnh báo động, ước lượng chi phí nói về thinking, % ngữ cảnh. Mỗi mục có lý do trong `design.md`.

## Capabilities

### New Capabilities

- `ai-model-settings`: model là một mục cấu hình nhân bản được với ba nhóm cài đặt (cơ bản, tác vụ, nâng cao); mức suy luận theo khả năng model; chỉ gửi khi bật; kiểm tra một mục; chọn mục bằng một menu dùng chung cho dịch và chat; cấu hình không trộn lẫn giữa các lô; không âm thầm bỏ tham số.

### Modified Capabilities

- `ai-connection`: "Danh sách model và model mặc định" thành danh sách **mục model**: thêm tên bất kỳ, chọn từ danh sách lấy về, nhân bản, đặt mục mặc định.

## Impact

- **Dữ liệu:** `library.db` v4 → **v5**. `ai_model` được dựng lại với `id`, `name`, `settings` (SQLite không đổi khóa chính tại chỗ), mỗi hàng cũ thành một mục có id mới, tên hiển thị bằng tên model, `settings = '{}'`; `ai_connection.default_model` đổi từ tên model sang id mục. Có migration viết bằng hàm (cần sinh uuid), snapshot schema đóng băng và test nâng cấp từ snapshot v4. Tệp `.mira` không đổi; kết nối vẫn thuộc ứng dụng.
- **Hợp đồng IPC (đổi, không tương thích ngược):** `ConnectionView.models` từ `string[]` thành danh sách mục kèm khả năng; `translatePlan`, `translateBatch`, `chatSend` nhận `entryId` thay cho `model`; thêm các kênh quản lý mục model và kênh kiểm tra một mục. Renderer là bên dùng duy nhất nên đổi cùng lúc.
- **Dữ liệu catalog:** `scripts/refresh-model-catalog.mjs` giữ thêm `reasoning_options` và `temperature`; `modelCatalog.json` được làm mới (cần mạng).
- **Code mới:** `shared/contracts/modelSettings.ts`, `infra/providers/{modelCapability,generation}.ts`, `infra/providers/gateway/ratePacer.ts`, các kênh `ai:models:*`.
- **Code sửa:** `infra/storage/{librarySchema,connections}.ts`, `shared/contracts/{aiConnections,aiTranslate,aiChat,channels,desktop-api}.ts`, `preload/index.ts`, `ipc/handlers/ai.ts`, `services/ai/{connectionService,chapterTranslation,chatService}.ts`, `infra/providers/{openAiChatTransport,compat,openAiCompatible,modelCatalog}.ts`, `infra/providers/gateway/{gateway,limiter}.ts`, và phía renderer `settings/*`, `AiTranslateDialog.tsx`, `AiComposer.tsx`, `useAiTranslate.ts`, `useAiChat.ts`.
- **Dependency:** không thêm.
- **Hành vi hiện tại:** không đổi cho tới khi người dùng đặt một tham số: mọi mục mới sinh ra có `settings` rỗng, tức không gửi gì và dùng các mặc định hiện có (cỡ lô 1.500 token, đồng thời 4, không RPM).
- **Rủi ro chính:** (1) **catalog có thể sai hoặc thiếu** (models.dev là dữ liệu cộng đồng, và alias của gateway tự dựng không có trong đó): khi sai, người dùng vẫn có `extra_body` và nút **Kiểm tra** để biết nhà cung cấp có nhận cài đặt hay không; `reasoning_options` chỉ được xác nhận bằng gọi thật với Gemini 2.5 Flash, chưa với 2.5 Pro hay 3.x (task 2). (2) Đổi khóa chính và hợp đồng IPC là thay đổi lớn hơn một cột JSON; đổi lại bỏ được khái niệm ghi đè theo lần chạy. (3) Đặt trần token đầu ra nhỏ khi suy luận bật ra câu cụt (đã đo: một token); chữ mô tả của ô nói điều này, đúng khuôn mô tả từng ô của LinguaGacha. (4) Phạm vi giao diện lớn: ba hộp thoại, hộp thoại chọn model, menu mục, menu chọn dùng chung, nút ở ô soạn chat.
- **Tài liệu:** `engineering/current-state.md`, `experience/ai-connection-settings.md` (phương án F là demo, thay bằng ghi chú đối chiếu LinguaGacha ở task 1), `research/ai-core-architecture.md`, `maintenance/changelog.md`.
