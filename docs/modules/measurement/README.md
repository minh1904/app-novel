# Module Bộ đo chất lượng dịch

Cập nhật: 2026-10-04 · Trạng thái: lõi đã triển khai; phép hiệu chuẩn judge ngoài Gemini chưa chạy.
Chủ trì: kỹ thuật và người đánh giá bản dịch.

## Vai trò

Bộ đo trả lời một câu hỏi: **một thay đổi có làm bản dịch tốt hơn trên tập kiểm đã khai báo hay
không?** Nó không tự quyết định sản phẩm, không sửa bản dịch và không sở hữu giao diện QA.

```text
Thay đổi prompt / model / context
                │
                ▼
      Chạy cùng fixture và cấu hình
                │
      ┌─────────┼─────────┐
      ▼         ▼         ▼
  T0 bằng luật  T1 judge  T3 người chấm
      └─────────┼─────────┘
                ▼
        Báo cáo số liệu + giới hạn
                │
                ▼
       Con người quyết định giữ/bỏ
```

## Phạm vi

- Nạp và kiểm fixture công khai/riêng tư, nguồn và quyền sử dụng.
- Dịch qua đường dịch thật của app, ghi cấu hình, usage và mã băm prompt.
- Chấm lại offline; ghép đoạn bị model gộp/tách chỉ để đo.
- Kiểm tất định T0, so cặp mù bằng judge tùy chọn và trang người chấm offline.
- So hai lần chạy trên phần giao nhau và xuất toàn bộ số liệu cấu thành.

Không thuộc module: schema Context của sản phẩm, UX cảnh báo QA, tự sửa chữ, tự chọn model/prompt,
hoặc một cổng `keep/no-keep` áp cho mọi loại thí nghiệm.

## Đọc theo nhu cầu

| Câu hỏi | Tài liệu |
| --- | --- |
| Fixture gồm gì, dữ liệu nào được commit? | [Fixture và quyền sử dụng](fixtures.md) |
| T0/T1/T3 đo gì và không chứng minh gì? | [Phép đo và chấm](metrics-and-judging.md) |
| Chạy, chấm lại và so hai điều kiện thế nào? | [Vận hành thí nghiệm](running-experiments.md) |
| B1/B2a/B3 và V14 đã cho thấy gì? | [Kết quả và quyết định](results.md) |

Spec triển khai nằm ở change
[`measure-harness`](../../../openspec/changes/measure-harness/proposal.md). Fixture ở
[`fixtures/`](../../../fixtures/README.md). Các thuật toán thuần có thể được module QA gọi lại,
nhưng QA tự quyết severity và cách hiển thị.
