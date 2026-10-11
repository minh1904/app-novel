# Roadmap Trợ lý AI

Cập nhật: 2026-10-11 · Trạng thái: **roadmap hiện hành**.

## Đích sản phẩm

Mira có một Trợ lý toàn ứng dụng để trò chuyện và thực hiện công việc đọc, dịch, biên tập tiểu thuyết.
Agent hiểu mục tiêu và chọn capability; workflow trong ứng dụng chịu trách nhiệm cho công việc dài,
ghi dữ liệu và phục hồi. Kiến trúc này dùng các service hiện có, chưa cần thêm framework agent.

## Nền có thể tái sử dụng

- schema `agent_session`, `agent_turn`, `agent_operation`, `agent_activity` trong `library.db`;
- target resolver và capability registry;
- translation core, context snapshot và các service glossary/addressing;
- operation journal, checkpoint, write lease và cấu trúc Undo;
- module renderer agent và protocol stream;
- vòng model/tool của chat legacy làm tham khảo, không dùng contract proposal-only của nó.

Các mục trên chỉ xác nhận thành phần tồn tại. Chúng chưa chứng minh đường chạy Trợ lý hoàn chỉnh.

## Bộ OpenSpec theo lát

Roadmap được triển khai qua bảy change độc lập, không apply như một change lớn:

1. [`repair-agent-runtime`](../../../openspec/changes/repair-agent-runtime/proposal.md) — nối và nghiệm thu foundation.
2. [`add-agent-conversation`](../../../openspec/changes/add-agent-conversation/proposal.md) — model/tool loop và chat toàn ứng dụng.
3. [`add-durable-translation-tasks`](../../../openspec/changes/add-durable-translation-tasks/proposal.md) — task dịch dải chương.
4. [`add-agent-context-workflow`](../../../openspec/changes/add-agent-context-workflow/proposal.md) — extraction, review và snapshot Context.
5. [`add-agent-steering`](../../../openspec/changes/add-agent-steering/proposal.md) — điều chỉnh phần chưa chạy có điểm hiệu lực.
6. [`add-translation-task-qa`](../../../openspec/changes/add-translation-task-qa/proposal.md) — kiểm cấu trúc và nhất quán.
7. [`add-external-translation-worker`](../../../openspec/changes/add-external-translation-worker/proposal.md) — MCP local/external inference.

Nguồn khảo sát, dependency graph và bài học từ Hermes, Gemini CLI, LangGraph, OpenAI Agents SDK và MCP
nằm tại [Chương trình đặc tả Agent](agent-spec-program.md). Change sau chỉ bắt đầu khi gate dependency
đã có bằng chứng runtime; trạng thái OpenSpec `complete` của foundation cũ không thay thế gate này.

## 0. Nối và kiểm chứng foundation

Nối UI → preload/IPC → `AgentService` → capability thật. Hoàn thiện semantics lỗi, cancel, progress,
usage, settings và Undo; mọi terminal event phải phản ánh đúng kết quả.

**Gate:** từ UI, người dùng yêu cầu dịch chương hiện tại; operation chạy thật, stream tiến độ, hủy
được giữa lô, Undo khôi phục nội dung khi revision hợp lệ và lỗi capability không bị báo thành công.

## 1. Vòng agent hội thoại

Thay dispatch bằng regex bằng vòng model chọn capability có schema. Resolver chốt target trước thao tác;
thiếu dữ kiện chuyển turn sang `waiting_user`. Áp giới hạn số vòng tool, dữ liệu đọc, operation ghi và
ngân sách.

**Gate:** cùng một session xử lý được câu hỏi không ghi, lệnh ghi rõ target và yêu cầu mơ hồ cần làm rõ;
không có ID hoặc primitive lưu trữ do model tự cấp quyền.

## 2. Tác vụ dịch nhiều chương

Thêm `agent_task` và item bền cho `translate_range`. Chạy tuần tự, dùng translation core hiện có,
pause/cancel/retry được và phục hồi từ journal sau khi mở lại app.

**Gate:** yêu cầu “dịch chương 1–30, dừng khi vượt ngân sách” tiếp tục được sau khi đóng app, không dịch
lặp chương đã commit và hiển thị đúng chương lỗi.

## 3. Chuẩn bị Context

Nối workflow trích glossary/nhân vật → bằng chứng → pending review → snapshot đã duyệt → dịch. Side
panel chương cung cấp xem và duyệt nhanh; khu Context cấp tác phẩm giữ thao tác hàng loạt.

**Gate:** pending không xuất hiện trong prompt; người dùng thấy chính xác context nào đã được dùng cho
mỗi run và có thể duyệt trước khi task dịch bắt đầu.

## 4. Steering và kiểm tra nhất quán

Cho phép sửa hướng dẫn hoặc Context áp dụng cho các item chưa chạy. Sau dịch, kiểm tên riêng, glossary,
xưng hô và lỗi thiếu/thừa đoạn; kết quả kiểm tra là activity hoặc task riêng có target rõ.

**Gate:** thay đổi giữa task không sửa lại item đã commit, các item sau dùng revision context mới và UI
phân biệt tiến độ dịch với tiến độ kiểm tra.

## 5. Mở rộng capability

Sau khi bốn gate trên đạt, thêm import nguồn, polish, QA và export qua registry hiện có. Mỗi capability
mới phải khai báo quyền, target policy, budget và activity; không mở primitive SQL, shell hoặc file cho
model.

## Hoãn có chủ ý

Chưa làm multi-agent, DAG tổng quát, marketplace skill, scheduler song song, attachment, memory tự động,
rename/pin/archive session hay framework LangGraph. Chỉ bổ sung khi một workflow đã chạy chứng minh cần.

## Nguồn kỹ thuật

- [OpenSpec foundation](../../../openspec/changes/app-agent-foundation/proposal.md): thiết kế các khối
  nền; checklist không phải trạng thái nghiệm thu runtime hiện tại.
- [Roadmap Context](../context/roadmap.md): thứ tự glossary, addressing, extraction và style/memory.
- [`ARCHITECTURE.md`](../../../ARCHITECTURE.md): ownership `main/services/agent` và module renderer.

[Quyết định](decisions.md) · [Phiên và tác vụ](sessions-and-jobs.md) · [Về module](README.md)
