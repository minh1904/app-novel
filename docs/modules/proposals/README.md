# Module Trợ lý AI và đề xuất

Cập nhật: 2026-10-11 · Trạng thái: quyết định sản phẩm và roadmap hiện hành. Foundation agent có
nhiều khối đã tồn tại trong mã nhưng đường chạy đầu-cuối chưa được nghiệm thu lại.

Module này chịu trách nhiệm cho hội thoại với Trợ lý, tác vụ AI dài, thao tác ghi có thể hoàn tác và
dữ liệu proposal cũ. Trợ lý là tính năng toàn ứng dụng; tác phẩm và chương chỉ là ngữ cảnh hoặc đích
của một lượt.

| Cần biết | Nguồn hiện hành |
| --- | --- |
| Sản phẩm đã chốt điều gì? | [Quyết định](decisions.md) |
| Làm agent theo thứ tự nào và gate hoàn thành là gì? | [Roadmap agent](agent-roadmap.md) |
| Session, turn, operation và task khác nhau thế nào? | [Phiên và tác vụ](sessions-and-jobs.md) |
| Ghi dữ liệu và hoàn tác phải an toàn ra sao? | [Dữ liệu và an toàn](data-and-safety.md) |
| Proposal cũ được duyệt thế nào? | [Luồng duyệt proposal legacy](review-flow.md) |

## Hiện trạng

Mira đã có schema session toàn ứng dụng, target resolver, capability registry, operation journal,
checkpoint, một phần runner dịch chương và module renderer cho agent. Các phần này là nền để tái sử
dụng, không phải bằng chứng rằng Trợ lý đã chạy hoàn chỉnh.

Đường tích hợp còn thiếu hoặc chưa chứng minh gồm UI → IPC → `AgentService`, vòng model gọi
capability, cancel/undo thật, progress và usage xuyên suốt, xử lý lỗi capability, cùng tác vụ nhiều
chương có thể phục hồi. [Roadmap agent](agent-roadmap.md) là nguồn trạng thái duy nhất cho phần này.

Proposal theo tác phẩm và Accept/Deny vẫn tồn tại để đọc dữ liệu cũ và phục vụ các luồng legacy chưa
chuyển đổi. Không dùng thiết kế proposal-only cũ làm contract cho lượt agent mới.

OpenSpec [`app-agent-foundation`](../../../openspec/changes/app-agent-foundation/proposal.md) mô tả
foundation dự kiến. Checklist của change là hồ sơ thực hiện tại thời điểm viết, không thay cho kiểm
chứng runtime hiện tại.

[Về mục lục module](../README.md)
