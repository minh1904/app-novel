# Module Trợ lý AI và đề xuất

Cập nhật: 2026-10-12 · Trạng thái: quyết định sản phẩm và roadmap hiện hành. Đường chạy đầu-cuối của
foundation agent đã được nối trong change `repair-agent-runtime` (commit `e6090be`, chưa archive).

Module này chịu trách nhiệm cho hội thoại với Trợ lý, tác vụ AI dài, thao tác ghi có thể hoàn tác và
dữ liệu proposal cũ. Trợ lý là tính năng toàn ứng dụng; tác phẩm và chương chỉ là ngữ cảnh hoặc đích
của một lượt.

| Cần biết | Nguồn hiện hành |
| --- | --- |
| Sản phẩm đã chốt điều gì? | [Quyết định](decisions.md) |
| Làm agent theo thứ tự nào và gate hoàn thành là gì? | [Roadmap agent](agent-roadmap.md) |
| Agent được tách thành những lát/spec nào, dựa trên nghiên cứu gì? | [Chương trình đặc tả Agent](agent-spec-program.md) — 6 change độc lập; lát 1 `repair-agent-runtime` đã triển khai (commit `e6090be`), lát 2–6 chưa; lát MCP đã bỏ |
| Người dùng gói thuê bao (Kimi, xAI, Claude/Antigravity qua gateway) kết nối thế nào? | [`add-subscription-gateway-auth`](../../../openspec/changes/add-subscription-gateway-auth/proposal.md) — track riêng, chưa triển khai |
| Gemini CLI, Gemini web hoặc web app riêng có thể điều khiển Mira thế nào? | [Tích hợp agent bên ngoài](external-agent-integration.md) |
| Session, turn, operation và task khác nhau thế nào? | [Phiên và tác vụ](sessions-and-jobs.md) |
| Ghi dữ liệu và hoàn tác phải an toàn ra sao? | [Dữ liệu và an toàn](data-and-safety.md) |
| Proposal cũ được duyệt thế nào? | [Luồng duyệt proposal legacy](review-flow.md) |

## Hiện trạng

Mira đã có schema session toàn ứng dụng, target resolver, capability registry, operation journal,
checkpoint, một phần runner dịch chương và module renderer cho agent. Các phần này là nền để tái sử
dụng, không phải bằng chứng rằng Trợ lý đã chạy hoàn chỉnh.

`repair-agent-runtime` đã nối UI → IPC → `AgentService`, cancel/undo thật, usage và ghi có điều phối cho
một chương. Còn thiếu vòng model gọi capability và tác vụ nhiều chương có thể phục hồi.
[Roadmap agent](agent-roadmap.md) là nguồn trạng thái duy nhất cho phần này.

Proposal theo tác phẩm và Accept/Deny vẫn tồn tại để đọc dữ liệu cũ và phục vụ các luồng legacy chưa
chuyển đổi. Không dùng thiết kế proposal-only cũ làm contract cho lượt agent mới.

OpenSpec [`app-agent-foundation`](../../../openspec/changes/app-agent-foundation/proposal.md) mô tả
foundation dự kiến. Checklist của change là hồ sơ thực hiện tại thời điểm viết, không thay cho kiểm
chứng runtime hiện tại.

[Về mục lục module](../README.md)
