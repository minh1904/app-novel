# Phạm vi và quyết định

Cập nhật: 2026-10-04 · Trạng thái: tổng hợp quyết định hiện có và đề xuất phân ranh.
Chủ trì: chủ sản phẩm. Câu hỏi: module chịu trách nhiệm đến đâu?

## Mục tiêu

Giúp người dịch duy trì lựa chọn dịch nhất quán qua nhiều chương, nhưng vẫn diễn đạt đúng chuyển biến quan hệ, giọng nói và thông tin được tiết lộ. “Nhất quán” là tuân cùng quy ước và đúng phạm vi, không phải buộc mọi lần xuất hiện dùng một chuỗi giống nhau.

## Ràng buộc đã chốt

| Ràng buộc | Hệ quả cho module |
| --- | --- |
| Trước mắt nghiên cứu Nhật → Việt, lấy bản dịch người để học | Không dùng output AI hoặc kho không rõ nguồn làm corpus chuẩn |
| Người dịch chọn cách xử lý kính ngữ; không yêu cầu thì giữ hậu tố | Không kế thừa mặc định bỏ `-san/-kun/-chan` trong tài liệu tháng 6 |
| AI đề xuất, người dùng quyết định áp dụng vào chữ đã có | Đổi ngữ cảnh chỉ tạo thông tin ảnh hưởng/đề xuất, không sửa ngầm |
| Nội dung thuộc tác phẩm; SQLite là dữ liệu gốc, Markdown là bản chiếu | Ngữ cảnh cần đi cùng backup/restore của tác phẩm; không xây kho Markdown song song |
| Đơn vị làm việc là chương/đoạn; đã bỏ mô hình câu cố định | Có thể dùng ID tạm cho một request, không hồi sinh hệ thống segment bền vững |
| Tách lớp provider khỏi nghiệp vụ | Module chọn nội dung; provider vận chuyển, không tự suy quan hệ hoặc tự chọn glossary |

Nguồn quyết định: yêu cầu của người dùng trong phiên làm việc và [sổ quyết định cũ](https://github.com/minh1904/app-novel/blob/501be2a/docs/handbook/product/decisions.md). Quy tắc với bản dịch trống và dấu AI thuộc luồng dịch/đề xuất, không phải quyền riêng của module Ngữ cảnh.

## Sáu nhóm thông tin, không nhất thiết sáu bảng hoặc sáu màn hình

| Nhóm | Sở hữu | Không thay thế |
| --- | --- | --- |
| Glossary | khái niệm, tên, cách dịch, alias, biến thể không dùng | phân tích quan hệ từng câu |
| Nhân vật | danh tính, tên gọi, đặc điểm có bằng chứng | suy giới/tuổi từ tên hoặc archetype |
| Xưng hô | quy ước có chiều A→B, phạm vi cảnh và ngoại lệ | nhãn người nói/người nghe tự động chắc chắn |
| Thế giới | địa danh, tổ chức, quy tắc và sự kiện | mọi ghi chú đều gửi AI |
| Văn phong | quy ước biên tập, giọng kể, mẫu hợp lệ | một “bản dịch chuẩn” duy nhất cho mọi truyện |
| Ký ức | tóm tắt, thông tin lân cận, điều đã biết tại mốc | lịch sử chat vô hạn hoặc sự thật tự sinh từ output |

“Module Ngữ cảnh” là phạm vi tài liệu chung. Lộ trình cũ tách glossary, xưng hô, trích xuất và văn phong thành các đợt; không vì gom tài liệu mà bắt buộc xây tất cả cùng lúc.

## Ranh giới với các module khác

- **Editor/đề xuất:** giữ phiên bản văn bản, vị trí áp dụng, xác nhận và hoàn tác. Ngữ cảnh trả bằng chứng và đề xuất liên quan.
- **Tác vụ dịch:** chia lô, lịch chạy, retry, hủy và ghi kết quả. Ngữ cảnh trả snapshot phù hợp từng lô.
- **Provider/gateway:** xác thực, gọi model, lỗi mạng, usage và cache nhà cung cấp. Không nằm trong glossary.
- **QA/harness:** đo tuân thủ, chấm nghĩa và so các phương án. Ngữ cảnh cung cấp các mục thực sự đã dùng.
- **Import/backup:** mang đủ định danh, phiên bản và nguồn gốc; không chỉ xuất danh sách cặp từ.

## Hiện trạng không được nhầm với kế hoạch

[Mã lắp prompt chat](../../../src/main/services/ai/chatPrompt.ts) đã nhận các khối ngữ cảnh, đặt sau system và trước lịch sử. Điều này **không chứng minh** đã có kho glossary, ma trận xưng hô, truy hồi mẫu hay hệ thống hiệu lực theo chương.

[Change context-core](https://github.com/minh1904/app-novel/blob/501be2a/openspec/changes/context-core/proposal.md) cùng design/spec/tasks là đầu vào thiết kế cũ. Những quy tắc như một alias chỉ thuộc một mục, xóa mốc chương thành NULL, hoặc hash loại bỏ nguồn cần rà lại trước triển khai. Xem [các điểm cần giải quyết](roadmap.md), không coi chúng là hành vi ứng dụng hiện tại.

[Về mục lục](README.md)
