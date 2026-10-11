## Context

Change cuối cung cấp external inference local sau khi task/context/steering/QA đã ổn định. MCP TypeScript
SDK hiện có stdio/HTTP nhưng đang ở major line mới; dependency/version chỉ chọn sau spike với Node/Electron
và package manager pinned. Business logic phải ở Mira runtime, adapter không mở DB.

## Goals / Non-Goals

**Goals:** CLI agent local pair/grant, đọc batch tối thiểu, submit idempotent, task/activity/Undo nhìn thấy
trong Mira và không gọi provider nội bộ khi external sinh chữ.

**Non-Goals:** Gemini web, HTTPS/OAuth/relay, daemon chạy khi app tắt, remote multi-user, full transcript
sync, quota scraping, direct DB/file/shell tools.

## Decisions

### Hai process, một writer

MCP client thường khởi chạy stdio server child process. `mira-mcp` nói JSON-RPC/MCP trên stdin/stdout rồi
kết nối broker do Main sở hữu qua Windows Named Pipe có tên ngẫu nhiên theo installation/user. Broker
validate protocol/version và authenticated pairing credential; only Main gọi registry/task services.

```text
Codex/Gemini CLI
  ⇄ MCP stdio process (transport/schema only)
  ⇄ authenticated local pipe
  ⇄ Mira Main broker
  → task/capability/write coordinator
  → SQLite owner
```

Không import storage layer vào MCP package. stdout chỉ protocol; diagnostic stderr. Nếu Mira không chạy,
server trả `app_unavailable` thay vì tự mở app/DB trong MVP.

### SDK spike trước dependency

Spike xác nhận Node version/Electron packaging, stdio shutdown, Valibot/Standard Schema compatibility,
bundle size và client interoperability. Dùng official TypeScript SDK nếu đạt; nếu SDK v2 yêu cầu runtime
không phù hợp, pin supported v1.x thay vì viết protocol tay. Quyết định version được ghi bằng lockfile và
test client; không thêm Express/HTTP packages.

### Pairing và grant

Settings cho phép tạo pairing code một lần, client exchange qua pipe rồi nhận opaque credential. Secret
Store giữ credential hash/secret; DB thường giữ clientId, label, created/lastUsed/revoked và grants:
`read | read_write`, allowed work IDs. OS pipe ACL giới hạn user hiện tại nhưng không thay app auth.

Mỗi broker request dựng principal từ connection credential; tool args không có actor/grant authoritative.
Revoke increment grant version; in-flight call kiểm lại trước commit. Không log credential/claim.

### Tool surface nhỏ và versioned

Adapter đăng ký tools:

- `list_works`, `list_chapters`, `read_chapter`, `get_context` (cursor/limits/revisions);
- `create_translation_task`, `get_task`, `cancel_task`;
- `get_next_translation_item`, `submit_translation_item`, `report_translation_error`;
- `undo_operation`, `open_target` nếu client có local open affordance.

Tool result ưu tiên structuredContent và text summary ngắn. Limit source/result dựa trên translation batch
hiện có; không đưa 30 chapters vào một call. Resources có thể thêm sau khi tool flow ổn, chưa cần cho MVP.

### Claim khác write lease

Claim record gắn task/item/batch/client/attempt/requestKey, token hash, issued/expires, manifest/snapshot refs
và state. TTL mặc định 10 phút chỉ là giá trị spike; config nội bộ. Một live claim/task giữ scheduler không
giao batch khác nhưng không khóa editor. Editor có thể sửa; submit sẽ conflict qua revision guard.

`get_next` cùng requestKey trả claim hiện có. Expiry/revoke/pause/cancel đóng claim; attempt mới có token
mới. Source payload bao gồm exact revisions, instruction/context snapshot hashes để client không nộp vào
phiên bản khác.

### Submit lookup thứ tự để retry an toàn

1. xác thực principal và scope tối thiểu;
2. canonicalize payload, tính digest, tra committed idempotency record;
3. nếu cùng key/digest đã commit, trả result cũ;
4. nếu key khác digest, conflict;
5. nếu chưa commit, kiểm grant hiện tại, task/claim/attempt/state/revisions/manifest/version;
6. structural QA, flush/write coordinator, transaction target+journal+checkpoint;
7. persist projection/result, close claim, trả operation/revision/progress.

Tra committed result trước kiểm claim expiry giúp timeout-after-commit retry được, nhưng vẫn kiểm principal
đúng owner để không lộ result. Idempotency record nằm cùng journal transaction với effect.

### External inference không kéo provider nội bộ

Task `inferenceSource=external_agent`; scheduler chờ claim/submit, không gọi ChapterTranslator provider.
Deterministic QA chạy local. Optional model QA/chat vẫn là request riêng chỉ khi user chọn. Client usage
nếu gửi phải có source/completeness; Mira không kiểm chứng quota subscription nên hiển thị “do client báo”.

### Audit/UI

Activity/operation ghi `actor=external_mcp`, clientId/label và sessionId ngoài nếu client cung cấp như
metadata không-authoritative. Không tạo agent turn giả cho tool-only task. Jobs/operation UI có nguồn,
Cancel, Mở đích, Undo. Settings có list/revoke grants và last used.

## Risks / Trade-offs

- **Local malware lấy credential** → OS ACL + SecretStore + revoke; không hứa chống process cùng user đã compromise.
- **SDK/spec thay đổi** → pin exact version, conformance test, adapter mỏng.
- **Client giữ source sau revoke** → revoke chỉ chặn truy cập/commit tương lai; UI nói rõ dữ liệu đã gửi không thu hồi được.
- **Claim làm task treo** → TTL + waiting_external + retry/claim mới; không auto fallback trả phí.
- **Payload lớn/DoS local** → max request/source/output, rate/concurrency limit trước parse/domain.

## Migration Plan

1. Spike SDK + stdio echo/conformance trong package tách biệt; chưa expose write.
2. Thêm broker/pairing/grant và read-only tools; security/packaging tests.
3. Thêm claim/get-next với fake task, expiry/reconnect tests.
4. Thêm submit idempotency + write coordinator, fault injection timeout-after-commit.
5. Nối activity/settings/Jobs, rồi E2E bằng một MCP client thật và fake translator client deterministic.
6. Chỉ sau local gate mới mở change nghiên cứu remote HTTP/Gemini web.

Rollback tắt connector/revoke grants; task external đang chờ chuyển paused/needs_attention. Không xóa
operations/batches đã commit hoặc credential audit.

## References

- MCP SDK, Gemini policy, OpenAI approval binding và LangGraph idempotency được ghim trong
  [`agent-spec-program.md`](../../../docs/modules/proposals/agent-spec-program.md).
