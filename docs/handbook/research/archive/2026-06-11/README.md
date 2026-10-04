# Bản lưu tài liệu dịch thuật ban đầu

Khôi phục ngày **2026-10-04** · Trạng thái: **tài liệu lịch sử, không phải đặc tả hiện hành**.
Chủ trì: research/product.

Nguồn: commit `9244b076b6e1d5f2f1ffd63d2b36b4c60a6911e2`, ngày 11/06/2026,
`Add architecture & AI docs; update security/configs`. Commit nằm trong lịch sử `origin/main`.
Tám tệp dưới đây bị xóa khỏi cây hiện hành ở commit
`45eb7e9ebada60a3cdab5ea0d452f1989407e8d3` ngày 23/09/2026 khi tổ chức lại prototype/tài liệu.

Đã fetch rồi `git pull --ff-only`: không có cập nhật mới để merge. HEAD lúc kiểm tra là
`c10b8dd`, `origin/main` là `a26ebf0`; nhánh local đi trước remote chín commit.
Không reset nhánh, stash hay ghi đè các thay đổi đang làm. Việc khôi phục là lấy nội dung từ Git
bằng `git show` vào khu lưu này, không đưa kiến trúc cũ trở lại ứng dụng.

## Tệp nguyên bản

Nội dung giữ nguyên từ commit trên, không cập nhật thông tin cũ bên trong; khác biệt xuống dòng
LF/CRLF không thay đổi văn bản. Đường dẫn trong ví dụ là đường dẫn của prototype tại thời điểm đó.

| Tệp | Vai trò khi đọc lại |
| --- | --- |
| [Chỉ mục AI](docs/03-ai/README.md) | Cấu trúc bộ tài liệu gốc |
| [Tích hợp LLM](docs/03-ai/llm-integration.md) | Thiết kế cũ; SDK/model, storage và ví dụ code không dùng để triển khai hiện tại |
| [Thiết kế prompt](docs/03-ai/prompt-engineering.md) | Các lớp ngữ cảnh và preset đề xuất |
| [Đánh giá chất lượng](docs/03-ai/quality-evaluation.md) | Rubric, mức lỗi, vòng duyệt cảnh báo |
| [Hướng dẫn xưng hô](docs/03-ai/vietnamese-honorifics.md) | Quan hệ có chiều, biến thể theo cảnh, các bảng còn cần thẩm định |
| [Chỉ mục nghiên cứu](docs/04-research/README.md) | Nguồn và ưu tiên lịch sử |
| [Cách đưa ngữ cảnh vào prompt](docs/04-research/prompt-injection-analysis.md) | Quan sát repo không có commit pin; chưa coi là mô tả hiện tại |
| [Ý tưởng cải thiện](docs/04-research/brainstorm-prompt-improvements.md) | Giả thuyết, không phải kết quả đo |

Ví dụ dịch trong tài liệu này **không có provenance chứng minh là bản dịch người**. Không dùng làm
gold corpus hoặc mẫu văn phong. Các mệnh đề “mặc định”, “không ai làm”, “impact cao” và lộ trình
bên trong là nội dung lịch sử, không thay quyết định hiện hành.

Đọc [đối chiếu và nghiên cứu mở rộng](../../translation-research-lineage.md) để biết phần nào
kế thừa, sửa hoặc chưa đủ chứng cứ; nghiên cứu Nhật–Việt hiện hành ở
[chương chuyên đề](../../ja-vi-translation.md).
