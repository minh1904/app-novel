## Why

Người dùng cần Codex/Gemini CLI có thể đọc batch, tự sinh bản dịch bằng quota của client rồi gửi về Mira. Nếu client mở database trực tiếp hoặc retry không có idempotency, dữ liệu có thể xung đột với editor và bị ghi lặp.

## What Changes

- Thêm MCP stdio adapter và broker local; transport chỉ chuyển request vào capability/task service.
- Pair client với grant read/read-write theo tác phẩm và kiểm lại mỗi tool call.
- Thêm claim một batch, TTL/attempt, revision/context/instruction snapshot và submit nguyên batch.
- Ràng buộc submit bằng idempotency key + payload digest; kết quả muộn/cũ/revoked bị chặn.
- Ghi actor/client/task/operation trong Mira và hiển thị source external; không giả lập transcript ngoài.
- Không thêm HTTP gateway, OAuth cloud, Gemini web, daemon hoặc direct DB access.

## Capabilities

### New Capabilities

- `external-translation-worker`: contract MCP local để external agent nhận và nộp batch dịch an toàn.

### Modified Capabilities

Không có.

## Impact

- Phụ thuộc task/context/steering/QA core đã ổn định; chat nội bộ không bắt buộc cho client ngoài.
- MCP server package/entrypoint, local broker, secret/grant storage và packaging.
- Capability registry/task repository/journal/Undo, activity source label và settings UI.
- Security, reconnect, stale claim, idempotency và end-to-end test bằng MCP client thật.
