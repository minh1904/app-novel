# context-assembly Specification

## Purpose
Chọn đúng các mục ngữ cảnh cho một đoạn đang dịch và lắp chúng thành các khối prompt có thứ tự cố định, có trần token và có mã băm, để cùng một đoạn với cùng một trạng thái ngữ cảnh luôn sinh ra đúng một prompt — điều kiện để tái hiện bản dịch và để biết segment nào chịu ảnh hưởng khi ngữ cảnh đổi.

## ADDED Requirements

### Requirement: Phạm vi chọn khác nhau theo kiểu mục

Hệ thống SHALL chọn mục **thuật ngữ** theo đoạn đang dịch: chỉ mục xuất hiện trong văn bản của đoạn đó. Hệ thống SHALL chọn mục **cặp xưng hô** và **nhân vật** theo **chương**: mọi cặp có hiệu lực tại chương đó giữa các nhân vật xuất hiện trong chương, kể cả khi đoạn đang dịch không nhắc tên nhân vật nào.

#### Scenario: Đoạn thoại không nhắc tên
- **WHEN** đoạn đang dịch chỉ gồm lời thoại không chứa tên nhân vật nào, nhưng chương có hai nhân vật và một cặp xưng hô giữa họ
- **THEN** cặp xưng hô đó vẫn nằm trong ngữ cảnh gửi đi

#### Scenario: Thuật ngữ không xuất hiện thì không gửi
- **WHEN** tác phẩm có 200 mục thuật ngữ và đoạn đang dịch chỉ chứa ba trong số đó
- **THEN** chỉ ba mục đó nằm trong ngữ cảnh gửi đi

#### Scenario: Dàn nhân vật của chương
- **WHEN** hệ thống cần dàn nhân vật của một chương nhiều lần cho nhiều đoạn
- **THEN** mọi đoạn của chương đó nhận cùng một dàn nhân vật và cùng một tập cặp xưng hô

### Requirement: Quy tắc khớp theo ngôn ngữ nguồn

Khớp văn bản SHALL theo ngôn ngữ nguồn của tác phẩm: với tiếng Trung và tiếng Nhật SHALL khớp chuỗi con, với tiếng Anh SHALL khớp theo biên từ. Khi hai mục cùng khớp tại một vị trí và một mục là tiền tố của mục kia, hệ thống SHALL chọn **mục dài hơn** và SHALL NOT tính mục ngắn hơn ở vị trí đó. Mục có từ khóa ngắn hơn ngưỡng tối thiểu SHALL NOT tự khớp trừ khi người dùng khai rõ là vẫn khớp.

#### Scenario: Khớp dài trước
- **WHEN** tác phẩm có hai mục "Thiên Lam" và "Thiên Lam Tông", và văn bản chứa "Thiên Lam Tông"
- **THEN** chỉ mục "Thiên Lam Tông" được tính cho vị trí đó

#### Scenario: Biên từ với nguồn tiếng Anh
- **WHEN** nguồn là tiếng Anh, mục có từ khóa "Ash" và văn bản chứa "Ashton"
- **THEN** mục đó không được coi là xuất hiện

#### Scenario: Từ khóa quá ngắn
- **WHEN** một mục có từ khóa một ký tự và người dùng chưa khai rõ là vẫn khớp
- **THEN** mục đó không tự khớp trong bất kỳ đoạn nào

### Requirement: Ba tầng có thứ tự bắt buộc

Ngữ cảnh SHALL được trả về thành ba tầng theo đúng thứ tự: **tầng A** ổn định trong cả một lần dịch (hướng dẫn, định dạng đầu ra theo ID, văn phong đã duyệt), **tầng B** ổn định trong một chương (cặp xưng hô có hiệu lực và nhân vật của chương), **tầng C** biến thiên theo đoạn (thuật ngữ đã khớp, các segment liền trước, văn bản nguồn). Không nội dung nào của tầng C SHALL được đặt trước tầng A hoặc tầng B. Hai đoạn khác nhau trong cùng một chương SHALL nhận **cùng nội dung tầng A và tầng B**, từng ký tự.

#### Scenario: Thứ tự khối không đổi
- **WHEN** lắp ngữ cảnh cho một đoạn có cả ba tầng
- **THEN** các khối xuất hiện theo thứ tự A trước, B giữa, C sau

#### Scenario: Hai đoạn cùng chương
- **WHEN** lắp ngữ cảnh cho đoạn thứ nhất và đoạn thứ tư của cùng một chương
- **THEN** phần tầng A và tầng B của hai lần lắp giống nhau từng ký tự, chỉ tầng C khác

### Requirement: Ngân sách có thứ tự cắt tĩnh và báo lại phần bị cắt

Việc lắp ngữ cảnh SHALL nhận một trần token và SHALL NOT vượt trần đó. Khi vượt trần, hệ thống SHALL bỏ nội dung theo một thứ tự ưu tiên cố định, bắt đầu từ ví dụ văn phong, rồi các segment liền trước, rồi hồ sơ nhân vật. Hệ thống SHALL NOT tự bỏ cặp xưng hô có hiệu lực hoặc mục thuật ngữ đã khớp. Khi riêng hai nhóm không được bỏ đó đã vượt trần, hệ thống SHALL báo lỗi cho người gọi thay vì cắt bớt chúng. Mọi phần bị bỏ SHALL được trả về cho người gọi dưới dạng liệt kê được, không bỏ im lặng.

#### Scenario: Cắt theo thứ tự
- **WHEN** ngữ cảnh vượt trần token và có cả ví dụ văn phong, segment liền trước và hồ sơ nhân vật
- **THEN** ví dụ văn phong bị bỏ trước, và phần bị bỏ được báo lại cho người gọi

#### Scenario: Không cắt hai nhóm bắt buộc
- **WHEN** chỉ riêng cặp xưng hô có hiệu lực và thuật ngữ đã khớp đã vượt trần
- **THEN** hệ thống báo lỗi và không trả về một ngữ cảnh đã bị cắt bớt hai nhóm đó

### Requirement: Lắp ngữ cảnh là tất định và băm được

Với cùng một trạng thái ngữ cảnh của tác phẩm, cùng một chương và cùng một đoạn, việc lắp SHALL luôn trả về cùng nội dung và cùng một **mã băm ngữ cảnh**. Việc lắp SHALL NOT phụ thuộc vào thời điểm, thứ tự ngẫu nhiên, hay bất kỳ truy cập mạng nào. Đổi một mục đang được dùng SHALL làm mã băm đổi; đổi một mục không được dùng SHALL NOT làm mã băm đổi.

#### Scenario: Hai lần lắp giống nhau
- **WHEN** lắp ngữ cảnh cho cùng một đoạn hai lần, không có gì thay đổi ở giữa
- **THEN** nội dung và mã băm trùng khít

#### Scenario: Đổi mục đang dùng
- **WHEN** người dùng sửa bản dịch của một mục thuật ngữ đang khớp trong đoạn đó
- **THEN** mã băm của đoạn đó đổi

#### Scenario: Đổi mục không liên quan
- **WHEN** người dùng sửa một mục không xuất hiện trong đoạn và không có hiệu lực tại chương đó
- **THEN** mã băm của đoạn đó không đổi

### Requirement: Những mục không bao giờ được gửi

Hệ thống SHALL loại khỏi mọi khối ngữ cảnh: mục chưa duyệt hoặc đã loại, mục ở mức không bao giờ gửi, mục chưa có hiệu lực hoặc đã hết hiệu lực tại chương đang dịch, và mục thuật ngữ **bị cấm**.

#### Scenario: Mục chưa tới chương hiệu lực
- **WHEN** một mục có chương bắt đầu là 200, kèm ghi chú tiết lộ tình tiết muộn, và hệ thống lắp ngữ cảnh cho chương 3
- **THEN** không phần nào của mục đó, kể cả ghi chú, xuất hiện trong ngữ cảnh gửi đi

#### Scenario: Thuật ngữ bị cấm không được nêu
- **WHEN** một mục thuật ngữ được đánh dấu là bị cấm
- **THEN** cách dịch bị cấm đó không xuất hiện trong khối ngữ cảnh nào

### Requirement: Thiếu dữ liệu xưng hô thành cờ, không thành phỏng đoán ngầm

Khi một chương có hai nhân vật đối thoại mà **không có** cặp xưng hô nào có hiệu lực cho cặp đó, hệ thống SHALL kèm vào ngữ cảnh một chỉ dẫn giữ cách gọi trung tính, và SHALL đánh dấu để người dịch xem lại. Hệ thống SHALL NOT tự chọn một cặp xưng hô thay người dùng và SHALL NOT bỏ qua im lặng.

#### Scenario: Cặp chưa khai
- **WHEN** chương có hai nhân vật và không có cặp xưng hô nào giữa họ có hiệu lực
- **THEN** ngữ cảnh mang chỉ dẫn trung tính và chương đó được đánh dấu là có cặp xưng hô chưa khai

#### Scenario: Chỉ có một chiều
- **WHEN** chỉ chiều A→B được khai, chiều B→A thì không
- **THEN** chiều A→B được gửi như đã khai, và chiều B→A được đánh dấu là chưa khai
