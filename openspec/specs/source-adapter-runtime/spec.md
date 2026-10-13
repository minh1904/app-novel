# source-adapter-runtime Specification

## Purpose
Quy định contract và ranh giới đặc quyền của adapter nguồn để các loại tệp, thư mục và website sau này dùng chung một lõi đồng bộ mà không được tự ý truy cập dữ liệu Mira.

## Requirements

### Requirement: Adapter dùng contract hẹp và có capability khai báo

Mỗi adapter SHALL khai manifest và chỉ cung cấp các operation đã bật trong capability, gồm nhận diện,
metadata, catalog, chapter và kiểm session khi phù hợp. Catalog/chapter SHALL hỗ trợ phân trang hoặc cursor,
hủy và kết quả đã validate. Adapter SHALL không tự ghi database hoặc tạo chapter Mira.

#### Scenario: Adapter chỉ có catalog
- **WHEN** manifest không khai capability lấy chapter
- **THEN** runtime từ chối lời gọi chapter và UI chỉ cho kiểm chương mới

### Requirement: Runtime không trao đặc quyền ứng dụng cho adapter

Adapter SHALL không nhận database handle, filesystem tùy ý, environment, Electron object, process API,
clipboard, cookie hay token dạng rõ. Kết quả adapter SHALL đi qua validation trước khi source service ghi
dữ liệu.

#### Scenario: Adapter trả catalog sai schema
- **WHEN** output thiếu remote chapter identity bắt buộc
- **THEN** runtime từ chối output, run báo `parser_broken` và không ghi snapshot

### Requirement: Adapter builtin tệp và thư mục hoạt động không cần mạng

Change này SHALL cung cấp adapter builtin cho một tệp và một thư mục. Adapter thư mục SHALL quét theo yêu
cầu, xác định thứ tự ổn định từ cấu hình/tên tệp, hỗ trợ `.txt` và `.md`, tạo remote identity ổn định theo
đường dẫn tương đối cùng fingerprint, và cho preview trước khi binding được tạo hoặc cập nhật.

#### Scenario: Quét lại thư mục
- **WHEN** người dùng thêm một tệp chương rồi chủ động kiểm tra lại
- **THEN** adapter giữ identity các tệp cũ và trả một catalog item mới cho tệp vừa thêm

#### Scenario: Tệp bị đổi nội dung
- **WHEN** nội dung một tệp cũ thay đổi nhưng đường dẫn tương đối không đổi
- **THEN** adapter giữ remote chapter ID và trả revision nội dung mới

### Requirement: Adapter mạng sau này chỉ đi qua broker

Contract SHALL dành chỗ cho network broker kiểm origin, redirect, private address, timeout, kích thước,
rate limit, charset, auth handle và log redacted. Không adapter nào SHALL nhận `fetch` toàn quyền. Change
này SHALL không bật adapter mạng production trước khi broker có kiểm thử chính sách tương ứng.

#### Scenario: Redirect ngoài allowlist
- **WHEN** một adapter mạng tương lai nhận redirect tới origin không có trong manifest
- **THEN** broker chặn trước khi gửi credential hoặc đọc response đích

### Requirement: Browser chỉ mở từ hành động của người dùng

Adapter có browser capability SHALL chỉ yêu cầu host mở browser tương tác sau hành động rõ ràng của người
dùng. Bản đầu SHALL không chạy browser ẩn/nền, tự giải CAPTCHA, giả quảng cáo, tự mua nội dung hay tiếp tục
retry khi cần thao tác thủ công.

#### Scenario: Nguồn yêu cầu CAPTCHA
- **WHEN** adapter trả `manual_intervention_required`
- **THEN** job chờ người dùng và UI có thao tác mở browser; Mira không tự giải hoặc lặp request nền

### Requirement: Auth handle bị ràng buộc theo nguồn và tài khoản

Runtime SHALL chỉ thấy opaque auth handle. Host SHALL ràng buộc handle với `sourceId`, auth profile và
origin được phép; renderer và adapter SHALL không nhận secret dạng rõ.

#### Scenario: Adapter dùng handle cho origin khác
- **WHEN** adapter yêu cầu gắn handle vào request ngoài origin đã cấp
- **THEN** broker từ chối request và không phát credential
