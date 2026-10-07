# translation-call-budget Specification

## Purpose
Giới hạn số lời gọi model mà một lượt dịch chương được dùng, chia giữa lượt chính của các lô và các
vòng phụ, báo rõ đã dùng bao nhiêu và đoạn nào chưa dịch vì hết ngân sách.

## Requirements

### Requirement: Ngân sách chung cho một lượt dịch chương

Mỗi lượt dịch chương (một `runId`) SHALL có một ngân sách lời gọi model được xác định lúc lập kế hoạch.
Ngân sách SHALL được tính chung cho mọi lô của lượt và mọi vòng trong lô: lượt chính, chia lô khi bị
bộ lọc chặn, gửi lại không kèm ngữ cảnh, và hỏi lại id thiếu. Mỗi lời gọi model SHALL được trừ vào
ngân sách trước khi gửi, kể cả khi các lô chạy song song.

#### Scenario: Các lô cùng lượt dùng chung ngân sách
- **WHEN** hai lô của cùng một lượt đều bị bộ lọc chặn và cùng chia lô
- **THEN** tổng số lời gọi của hai lô không vượt ngân sách của lượt

#### Scenario: Trần cũ không còn cộng dồn
- **WHEN** một lô bị lọc ở lượt chính rồi vẫn còn đoạn bị chặn ở vòng gửi lại không ngữ cảnh
- **THEN** lời gọi của cả hai vòng chia được trừ vào cùng một ngân sách, không mỗi vòng một trần riêng

### Requirement: Lượt chính của mỗi lô có phần dành sẵn

Ngân sách SHALL dành sẵn một lời gọi lượt chính cho mỗi lô trong kế hoạch. Các vòng phụ SHALL chỉ rút
từ phần còn lại, nên vòng phụ của một lô không làm lô khác mất lượt chính.

#### Scenario: Lô đầu bị lọc nặng
- **WHEN** lô đầu tiên dùng hết quỹ vòng phụ để chia lô
- **THEN** các lô sau vẫn được gửi lượt chính

### Requirement: Hết ngân sách là một lý do thất bại riêng

Khi quỹ vòng phụ cạn, hệ thống SHALL dừng mọi vòng phụ chưa gửi, SHALL giữ mọi đoạn đã dịch được, và
SHALL trả các đoạn chưa xong với lý do `budget_exhausted`. Lý do này SHALL tách khỏi đoạn bị nhà cung
cấp từ chối và đoạn thiếu do phản hồi. Thông báo cho người dịch SHALL nói số đoạn chưa dịch vì hết
ngân sách và cho thử lại riêng các đoạn đó.

#### Scenario: Hết ngân sách giữa lúc chia lô
- **WHEN** quỹ vòng phụ cạn khi một lô đang chia để khoanh đoạn bị chặn
- **THEN** đoạn đã khoanh là bị chặn vẫn báo là bị từ chối, đoạn chưa kịp thử báo là hết ngân sách, và
  đoạn đã dịch được vẫn vào đề xuất

#### Scenario: Thử lại phần hết ngân sách
- **WHEN** người dịch bấm thử lại phần lỗi của lượt
- **THEN** lượt thử lại được cấp lại quỹ vòng phụ và chỉ gửi các đoạn còn lỗi

### Requirement: Báo cáo mức dùng ngân sách

Kết quả mỗi lô và trace của đề xuất SHALL ghi số lời gọi model đã dùng theo từng vòng, giới hạn của
lượt, số lần thử HTTP của gateway, và chi phí ước tính khi biết giá model. Khi lượt đã dùng từ 80%
ngân sách, giao diện SHALL hiện cảnh báo một lần cho lượt đó.

#### Scenario: Cảnh báo 80%
- **WHEN** số lời gọi đã dùng của lượt chạm 80% ngân sách
- **THEN** người dịch thấy một cảnh báo kèm số đã dùng trên giới hạn, và việc dịch vẫn tiếp tục

#### Scenario: Retry mạng được ghi nhưng không trừ
- **WHEN** gateway thử lại một lời gọi vì lỗi mạng
- **THEN** số lần thử HTTP tăng trong báo cáo, còn số lời gọi model trừ vào ngân sách không đổi

### Requirement: Cấu hình ngân sách trong Lab

Mira Lab SHALL cho đặt ngân sách lời gọi của mỗi chương bằng cờ dòng lệnh và SHALL ghi số lời gọi đã
dùng, số đoạn hết ngân sách và giới hạn đã đặt vào sổ đăng ký lần chạy.

#### Scenario: Chạy Lab với ngân sách thấp
- **WHEN** Lab chạy một chương với ngân sách nhỏ hơn nhu cầu chia lô
- **THEN** lần chạy hoàn tất, sổ đăng ký ghi số đoạn hết ngân sách tách khỏi số đoạn bị từ chối
