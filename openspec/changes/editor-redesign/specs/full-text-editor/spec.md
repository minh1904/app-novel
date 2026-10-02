## ADDED Requirements

### Requirement: Khung màn chương gọn theo phương án D

Màn chương SHALL dựng chrome theo phương án wireframe D ("B gọn chữ"), tức là **hai thanh cố định** trên vùng dịch, không phải một khối tiêu đề nhiều dòng:

- Thanh thứ nhất cao 42px SHALL chứa tên chương (cỡ chữ 12.5px, đậm) với tác phẩm, cặp ngôn ngữ và số liệu đi sau ở màu chữ phụ, và các nút thao tác dồn về mép phải.
- Thanh thứ hai cao 36px SHALL chứa tab mode và hàng nhãn Ngữ cảnh trên **cùng một hàng**.
- Vùng hai pane SHALL sát mép và sát nhau (không khoảng cách, không bo góc), mỗi pane vuông, nền `--surface-sidebar`, đệm trong 12px, ngăn cách nhau và ngăn cách mép cửa sổ bằng đúng một đường kẻ 1px dùng chung (`divide-x` ở khung lưới, không phải viền riêng của từng pane) — giống bố cục các panel sát nhau của IDE (Explorer/Editor/Agent liền khối, chỉ có đường kẻ mỏng phân cách). *(Cập nhật 2026-10-02: đổi từ card có viền/bo góc/khoảng cách 12px theo yêu cầu người dùng, tham chiếu Antigravity IDE.)* Văn bản bên trong pane SHALL NOT vẽ thêm viền của riêng nó.
- Tên pane, số liệu và trạng thái lưu SHALL nằm trên **một hàng**, không phải hai.

Chỉ hai thao tác dùng thường xuyên SHALL đứng thẳng trên thanh (Lưu, và nút bật/tắt Tập trung); các thao tác hiếm ("Thay bản gốc", "Về tác phẩm") SHALL nằm trong một menu tràn ở cuối thanh. Nút trên thanh SHALL cao 28px; nút bên trong pane SHALL cao 24px.

#### Scenario: Chrome không lấn chiều cao của vùng dịch
- **WHEN** người dùng mở một chương ở mode Toàn văn
- **THEN** phía trên hai pane chỉ có hai thanh (42px và 36px), không có khối tiêu đề nhiều dòng và không có hàng nút nào xuống dòng

#### Scenario: Thao tác hiếm nằm trong menu tràn
- **WHEN** người dùng mở menu tràn ở cuối thanh chương
- **THEN** menu có "Thay bản gốc" và "Về tác phẩm"; hai mục này không chiếm chỗ trên thanh khi menu đóng

### Requirement: Live Preview nhẹ cho bản dịch

Pane bản dịch SHALL hiện định dạng ngay khi gõ cho hai cú pháp: một dòng bắt đầu bằng `#`, `##` hoặc `###` theo sau một khoảng trắng SHALL hiện phần chữ sau tiền tố với cỡ chữ lớn hơn và đậm hơn văn bản thường (cỡ giảm dần theo số `#`), và một đoạn `**chữ**` SHALL hiện phần chữ ở giữa đậm. Ký tự cú pháp (`#`, khoảng trắng sau nó, và từng cặp `**`) SHALL vẫn hiện trên màn hình, chỉ mờ đi, không bị ẩn hay thay bằng phần tử khác; định dạng SHALL áp dụng bằng cách tô lên đúng ký tự đã có trong văn bản (không chèn phần tử mới vào dòng), để không ảnh hưởng tới bộ gõ IME. Live Preview SHALL chỉ áp dụng cho pane bản dịch, không áp dụng cho pane bản gốc hay Reading view. Đổi nội dung SHALL cập nhật định dạng ngay, kể cả khi chỉ một phần văn bản đang hiện trên màn hình.

#### Scenario: Gõ tiêu đề
- **WHEN** người dùng gõ "# Tên chương" vào đầu một dòng trống trong pane bản dịch
- **THEN** chữ "Tên chương" hiện lớn và đậm hơn văn bản thường ngay khi gõ xong, còn "#" và khoảng trắng sau nó vẫn hiện nhưng mờ hơn

#### Scenario: Gõ chữ đậm
- **WHEN** người dùng gõ "Một câu có **từ quan trọng** ở giữa"
- **THEN** "từ quan trọng" hiện đậm, hai cặp "**" hai bên vẫn hiện trên màn hình nhưng mờ hơn phần chữ thường

#### Scenario: Không ảnh hưởng bản gốc
- **WHEN** bản gốc có một dòng tình cờ bắt đầu bằng "#"
- **THEN** pane bản gốc hiện nguyên văn, không đổi cỡ chữ hay độ đậm

### Requirement: Xem trước Ngữ cảnh trong màn chương

Hàng điều khiển mode SHALL hiện thêm ba nhãn tĩnh "Thuật ngữ", "Xưng hô", "Văn phong" cạnh hai tab "Toàn văn"/"Từng câu", kèm **một** badge "Sắp có" nhìn thấy được dùng chung cho cả ba (không phải một badge mỗi nhãn), vì cả hàng phải nằm gọn trong một thanh cao 36px. Ba nhãn này SHALL NOT bấm được và SHALL NOT dẫn tới màn hay hộp thoại nào; chúng chỉ cho thấy trước nội dung của khu vực "Ngữ cảnh" đã có ở cấp tác phẩm, không phải một điều hướng mới và không trùng lặp với tab "Ngữ cảnh" đó.

#### Scenario: Hiện nhãn xem trước
- **WHEN** người dùng mở một chương ở mode Toàn văn
- **THEN** ba nhãn "Thuật ngữ", "Xưng hô", "Văn phong" hiện cạnh tab mode, theo sau là một badge "Sắp có" cho cả nhóm

#### Scenario: Bấm vào nhãn không làm gì
- **WHEN** người dùng bấm vào nhãn "Thuật ngữ" trong màn chương
- **THEN** không có gì thay đổi: không mở màn hay hộp thoại nào, không điều hướng đi đâu

### Requirement: "Hỏi AI" minh họa trong mode Toàn văn

Mode Toàn văn SHALL có một nút "Hỏi AI" và phím tắt Ctrl+K (Cmd+K trên macOS) mở một panel chiếm một cột cạnh hai pane bản gốc/bản dịch — hai pane SHALL co lại nhường chỗ cho panel, panel SHALL NOT che hay nổi đè lên nội dung hai pane. Panel SHALL mang nhãn "Sắp có" nhìn thấy được, hiện một thẻ nêu đang hỏi về chương/đoạn nào kèm trích một câu mẫu, bốn nút hành động nhanh, một lượt hỏi/đáp mẫu và một ô nhập — toàn bộ nội dung này SHALL là dữ liệu mẫu cố định, không đổi theo chương đang mở (trừ tên chương trong thẻ ngữ cảnh). Panel và các nút trong đó SHALL NOT gọi AI thật, đọc tệp, gọi IPC hay ghi dữ liệu. Đóng panel bằng nút đóng, phím Esc, hoặc bấm ra ngoài panel SHALL đưa hai pane về đúng chiều rộng trước đó mà không mất nội dung đang sửa. Nút "Hỏi AI" và phím tắt SHALL chỉ có tác dụng ở mode Toàn văn; chuyển sang mode Từng câu khi panel đang mở SHALL đóng panel.

#### Scenario: Mở panel
- **WHEN** người dùng bấm "Hỏi AI" hoặc Ctrl+K khi đang ở mode Toàn văn
- **THEN** panel hiện thành cột thứ ba, hai pane bản gốc/bản dịch co lại, nội dung hai pane không đổi

#### Scenario: Đóng panel
- **WHEN** panel đang mở và người dùng bấm Esc
- **THEN** panel đóng lại, hai pane trở về chiều rộng ban đầu, chữ đang gõ trong bản dịch vẫn còn nguyên

#### Scenario: Chuyển sang Từng câu khi panel đang mở
- **WHEN** panel "Hỏi AI" đang mở và người dùng chuyển sang mode Từng câu
- **THEN** panel đóng lại; nút "Hỏi AI" không hiện ở mode Từng câu
