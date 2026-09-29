# Mẫu bổ sung handbook

Cập nhật: 2026-09-29 · Trạng thái: mẫu làm việc. Thay các ô trong ngoặc bằng thông tin thật trước khi đưa trang vào mục lục; mục không áp dụng phải ghi lý do.

## Nghiên cứu

```markdown
# [Câu hỏi nghiên cứu]
Ngày đọc: [YYYY-MM-DD] · Trạng thái: Quan sát / Giả thuyết
Chủ trì: [vai trò] · Liên quan: [MIR-ID/spec]

## Câu hỏi và phương pháp
[Vì sao cần; chọn mẫu thế nào; đã đọc tài liệu hay chạy thử?]
## Quan sát
| Mệnh đề | Nguồn URL/version/ngày | Giới hạn |
| --- | --- | --- |
## Suy luận cho Mira
[Học gì, hoãn gì, điều gì có thể bác bỏ kết luận?]
## Bước kiểm chứng
[Corpus, cách đo, người thực hiện và quyết định cần đưa ra]
```

## Đặc tả tính năng

```markdown
# [Tên tính năng]
Cập nhật: [ngày] · Trạng thái: Proposed / Accepted
Chủ trì: [vai trò] · Yêu cầu: [MIR-ID] · Quyết định: [link]

## Bài toán và phạm vi
[Người dùng, đầu vào/đầu ra; ranh giới scope]
## Hành vi
[Luồng thường; trạng thái rỗng/lỗi; offline; undo; tác động dữ liệu]
## Nghiệm thu
| ID | Given / When | Then | Bằng chứng |
| --- | --- | --- | --- |
## Còn mở và phụ thuộc
[Không giấu câu hỏi chưa giải quyết trong giả định code]
```

## ADR

```markdown
# ADR-[số] — [Quyết định]
Ngày: [ngày] · Trạng thái: Proposed / Accepted / Superseded
Người quyết định và bằng chứng: [vai trò + link hoặc tham chiếu trao đổi]

## Bối cảnh
[Vấn đề, ràng buộc và bằng chứng]
## Các lựa chọn
[Lựa chọn thực sự đã cân nhắc và tradeoff]
## Quyết định
[Chọn gì, vì sao; phạm vi được chốt]
## Hệ quả và kiểm chứng
[Chi phí, migration, điều kiện xem xét lại]
## Liên kết
[Spec, ADR thay thế/bị thay thế, code hoặc báo cáo]
```

## Báo cáo kiểm chứng

```markdown
# [Bài kiểm chứng / mốc]
Ngày: [ngày] · Trạng thái: Planned / Executed
Build/commit: [thật] · OS/máy: [cấu hình] · Người chạy: [vai trò]
Fixture và quyền sử dụng: [ID/version] · Mạng: [online/offline]

## Kết quả
| Test ID | Bước tái hiện | Expected | Actual | Pass/Fail/Blocked |
| --- | --- | --- | --- | --- |
## Bằng chứng
[Log, file diff, ảnh hoặc ghi chép quan sát; không suy diễn từ build]
## Kết luận
[Được qua cổng nào, còn hạn chế gì, hành động tiếp theo]
```

---

[Mục lục handbook](../README.md)
