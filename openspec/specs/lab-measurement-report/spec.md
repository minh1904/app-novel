# lab-measurement-report Specification

## Purpose
Đặc tả cách Mira Lab ghi và báo cáo kết quả dịch thử nghiệm: tách khả năng hoàn thành khỏi chất
lượng, đo lặp để biết độ dao động, và phân lớp phép kiểm theo độ tin cậy, để mọi so sánh giữa các
cấu hình dựa trên cùng một tập đoạn và không lẫn lần chạy hỏng với lần chạy hợp lệ.

## Requirements

### Requirement: Ghi kết cục của từng đoạn định dịch

Mỗi lần dịch của Lab SHALL ghi, cho từng đoạn trong tập định dịch, đúng một kết cục trong các loại:
`translated` (có bản dịch hợp lệ), `refused` (nhà cung cấp chặn nội dung, kèm lý do nếu phản hồi có),
`missing` (thiếu sau khi đã hỏi lại, hoặc lỗi mạng/hạn mức không phục hồi), `request_error` (yêu cầu
bị từ chối vì cấu hình hay tham số, không phải vì nội dung), và `not_run` (lần chạy dừng trước khi tới
đoạn đó). Kết cục SHALL được lưu cùng lần chạy trong sổ đăng ký để đọc lại được mà không cần gọi model.

#### Scenario: Lô có đoạn bị chặn và đoạn thiếu
- **WHEN** một lô trả về 27 đoạn hợp lệ, 2 đoạn bị bộ lọc chặn và 1 đoạn thiếu sau khi hỏi lại
- **THEN** sổ ghi 27 `translated`, 2 `refused` và 1 `missing` cho đúng các id đó

#### Scenario: Lần chạy chết vì tham số không hợp lệ
- **WHEN** mọi lời gọi trả HTTP 400 do tham số thinking không hợp lệ
- **THEN** các đoạn của lần chạy được ghi `request_error`, không ghi `refused`

#### Scenario: Bản ghi cũ không có kết cục
- **WHEN** báo cáo đọc một lần chạy ghi trước khi có kết cục từng đoạn
- **THEN** lần chạy đó được nhãn “không có kết cục từng đoạn” và không bị coi là hoàn thành 100%

### Requirement: Báo cáo khả năng hoàn thành trên toàn tập

Báo cáo SHALL có một phần “Hoàn thành” tính trên **toàn bộ** tập đoạn định dịch của mỗi cấu hình,
gồm số và tỷ lệ của từng loại kết cục, chi phí (USD và token) và độ trễ. Phần này SHALL KHÔNG loại
đoạn nào khỏi mẫu số.

#### Scenario: Cấu hình bị từ chối nhiều hơn
- **WHEN** cấu hình A có 3 đoạn `refused` và cấu hình B có 0 trên cùng 355 đoạn
- **THEN** phần Hoàn thành hiện A 352/355 và B 355/355, kèm số đoạn bị từ chối theo lý do

### Requirement: Báo cáo chất lượng trên tập đoạn so được

Phần “Chất lượng” khi so nhiều cấu hình SHALL chỉ tính trên các đoạn có kết cục `translated` ở **mọi**
cấu hình đang so. Báo cáo SHALL công bố số đoạn bị loại khỏi phần này và lý do (theo cấu hình và loại
kết cục). Một đoạn không hoàn thành SHALL KHÔNG được tính là 0 điểm chất lượng; nó chỉ xuất hiện ở
phần Hoàn thành.

#### Scenario: Đoạn bị chặn ở một bản
- **WHEN** đoạn 12 chương 3 bị `refused` ở bản A nhưng `translated` ở bản B
- **THEN** đoạn đó bị loại khỏi phần Chất lượng của **cả hai** bản và báo cáo ghi “loại 1 đoạn: A refused”

#### Scenario: Không còn đoạn chung
- **WHEN** giao các đoạn `translated` của các cấu hình rỗng
- **THEN** báo cáo không đưa ra chỉ số chất lượng và nói rõ không có đoạn chung để so

### Requirement: Đo lặp và độ phân tán

Lab SHALL cho chạy cùng một cấu hình N lần (N ≥ 2) trên một tập chương cố định, với ngữ cảnh dịch
(glossary, nhân vật, cặp xưng hô) giống hệt nhau giữa các lần — xác nhận bằng hash nội dung ngữ cảnh.
Với mỗi chỉ số ở cả hai trục, báo cáo SHALL hiện số lần lặp, min, max, trung bình và độ lệch chuẩn.
Lab SHALL báo ước tính chi phí của N lần trước khi gửi lời gọi đầu tiên.

#### Scenario: Ba lần lặp
- **WHEN** người chạy yêu cầu 3 lần lặp cho một cấu hình trên chương 1–10
- **THEN** báo cáo hiện cho mỗi chỉ số `n=3`, min, max, trung bình và độ lệch

#### Scenario: Ngữ cảnh đổi giữa các lần lặp
- **WHEN** hash ngữ cảnh của một lần lặp khác các lần còn lại
- **THEN** Lab từ chối gộp lần lặp đó vào cùng nhóm và nói rõ lần nào lệch

### Requirement: Phép so chỉ kết luận khi chênh vượt dao động

Khi so hai cấu hình, Lab SHALL đánh dấu một chỉ số là “khác biệt” chỉ khi cả hai cấu hình có ít nhất
2 lần lặp và khoảng [min, max] của hai bên không chồng nhau. Trường hợp còn lại SHALL được ghi “chưa
phân biệt được” hoặc “chưa đủ lần lặp”, kèm số liệu thô. Lab SHALL KHÔNG dùng một ngưỡng nhiễu cố định
lấy từ hệ thống khác.

#### Scenario: Chỉ có một lần chạy mỗi bên
- **WHEN** so hai cấu hình mỗi bên một lần chạy
- **THEN** mọi chỉ số được ghi “chưa đủ lần lặp” và không có mũi tên “tốt hơn”

#### Scenario: Khoảng chồng nhau
- **WHEN** tuân thủ glossary của A dao động 92–95% và của B 94–96%
- **THEN** chỉ số được ghi “chưa phân biệt được”

### Requirement: Phân lớp phép kiểm theo độ tin cậy

Mỗi chỉ số trong báo cáo SHALL mang một lớp: `gate` (lỗi chứng minh được bằng code: id thiếu, id trùng,
phản hồi không đọc được, số đoạn lệch), `flag` (heuristic có thể báo nhầm: xưng hô, độ dài bất thường,
chữ CJK còn sót, glossary không khớp), `judge` (T1, tham khảo) hoặc `human` (chấm mù). Chỉ chỉ số lớp
`gate` SHALL được dùng để kết luận một cấu hình hỏng; chỉ số lớp `flag` SHALL được trình bày là số cờ
cần xem, không phải số lỗi.

#### Scenario: Glossary không khớp
- **WHEN** báo cáo hiện số mục glossary không khớp
- **THEN** chỉ số được ghi lớp `flag` và đặt tên là “cờ glossary”, không phải “lỗi glossary”

### Requirement: Lịch sử tách lần chạy hỏng

Bảng lịch sử sinh tự động SHALL đánh dấu lần chạy không có chỉ số chất lượng nào hoặc có tỷ lệ
`request_error` từ 50% trở lên là “hỏng”, kèm lý do ngắn (ví dụ “400 tham số thinking”), và SHALL tách
các lần chạy đó khỏi bảng so sánh chính của truyện.

#### Scenario: Lần chạy chết vì 400
- **WHEN** lịch sử gặp lần chạy có mọi lời gọi lỗi 400 và chi phí $0
- **THEN** lần chạy hiện trong mục “Lần chạy hỏng” với lý do, không nằm trong bảng biến thể chính

### Requirement: Bộ so sánh cũ áp cùng quy tắc loại đoạn

Lệnh so sánh của bộ đo cũ SHALL áp quy tắc tập đoạn so được khi hai lần chạy có kết cục từng đoạn.
Khi một trong hai lần chạy không có dữ liệu đó, báo cáo SHALL ghi rõ “chỉ lấy giao chương, chưa loại
đoạn bị từ chối” ở đầu phần T0.

#### Scenario: Lần chạy cũ thiếu kết cục
- **WHEN** so hai lần chạy cũ chỉ có tệp bản dịch theo chương
- **THEN** báo cáo vẫn xuất số liệu T0 nhưng có dòng cảnh báo về quy tắc loại đoạn chưa áp
