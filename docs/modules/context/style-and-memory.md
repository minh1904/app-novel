# Văn phong, thế giới và ký ức

Cập nhật: 2026-10-04 · Trạng thái: tổng hợp nghiên cứu; cơ chế sử dụng là đề xuất.
Chủ trì: nghiên cứu/người dịch. Câu hỏi: học từ mẫu nào và mang thông tin gì qua các chương?

## Corpus người dịch là một nguồn riêng

Yêu cầu hiện tại: học từ bản dịch **do người dịch thực hiện**, không lấy bản dịch AI làm mẫu. Repo công khai, có chữ “golden” hoặc có người bấm duyệt không đủ chứng minh nguồn gốc người dịch.

Mỗi mẫu cần ghi tác phẩm/phiên bản Nhật, bản Việt tương ứng, dịch giả/nhóm/hiệu đính, vị trí hai phía, ngữ cảnh đủ hiểu cảnh, đường dẫn, quyền sử dụng và tình trạng đối chiếu. Credit giúp xác định tác giả, không chứng minh bản dịch đúng mọi chi tiết hay cấp quyền tái phát hành chương truyện.

Tách rõ:

- **Tập quan sát phong cách:** nhận diện lựa chọn của người dịch và phạm vi áp dụng; chưa là đáp án gold.
- **Tập đánh giá:** đã đối chiếu Nhật–Việt và được người đủ năng lực xác nhận các tiêu chí cần chấm.
- **Ca tự soạn:** kiểm logic phần mềm; không đưa vào bằng chứng về thực hành người dịch.
- **Output AI/AI đã được sửa:** lưu provenance riêng nếu ứng dụng cần; không tự nhập vào corpus người dịch trong đợt nghiên cứu này.

Không chép nguyên chương vào repo chỉ vì đọc được công khai. Dùng metadata, ghi chú và trích đoạn ngắn cần thiết; muốn đóng corpus phải kiểm quyền trước.

## Hướng dẫn văn phong

Đề xuất tách quy ước có thể kiểm rõ (giữ hậu tố, cách viết tên, trình bày thoại) khỏi mục tiêu cần người đọc đánh giá (tự nhiên, giọng kể, khẩu khí). Gắn quy ước với tác phẩm/nhân vật/cảnh thay vì buộc một giọng cho tất cả.

Mẫu truy hồi nên khớp **hiện tượng cần xử lý** — thoại thân mật, người thứ ba, giọng kể — không chỉ giống từ khóa. Có thể bắt đầu bằng tìm kiếm lexical/BM25 và n-gram phù hợp Nhật; chỉ thêm embedding nếu phép đo cho thấy lợi ích. Số mẫu, độ dài và trọng số chưa chốt.

Học từ lịch sử sửa của người dùng là hướng ứng dụng khác, chưa phải corpus nghiên cứu. Nếu làm, phải tách sửa bản AI khỏi bản người viết độc lập, có lựa chọn tham gia và hàng duyệt style note. Chấp nhận một đề xuất không tự xác nhận nguyên tắc văn phong lâu dài. Chỉ tạo cặp nguồn–đích khi biết chính xác hai phiên bản tương ứng; không đoán cặp từ vị trí sau khi người dùng ghép/tách đoạn.

## Thế giới và tóm tắt

Lưu sự kiện thế giới, địa danh, tổ chức và tóm tắt có ích cho biên tập, nhưng không mặc định gửi toàn bộ. Bản context-core cũ đề xuất world/summary mặc định không gửi; giữ đây là phương án riêng tư để chốt lại, không mô tả là setting đã có.

Tóm tắt cần nguồn, phạm vi và khả năng sửa. Tóm tắt sinh chỉ từ output có thể biến lỗi dịch thành “ký ức” rồi lặp sang chương sau. Hướng đề xuất: neo nhận định vào nguyên tác; phần giải thích/bản dịch chưa duyệt không tự trở thành sự thật.

Trích xuất một lần mỗi chương, tóm tắt song ngữ hoặc quy trình hai lượt là các phương án khảo sát, không phải số lượt AI đã chốt. Cần đo chất lượng, độ bao phủ, công duyệt, token và thời gian.

## Bốn mốc không được gộp

1. Sự kiện xảy ra lúc nào trong truyện.
2. Người đọc/nhân vật được biết lúc nào.
3. Bằng chứng nằm ở đâu trong văn bản.
4. Người dịch tạo/sửa quyết định ở phiên bản nào.

Một `fromChapter` không diễn tả đủ hồi tưởng, người kể không đáng tin hoặc tiết lộ muộn. Mốc gửi AI phải bảo toàn điều được phép biết tại cảnh. Tiết lộ chương sau có thể giúp người biên tập rà lại nhưng không tự xuất hiện trong lời kể chương trước.

## Đoạn lân cận và lịch sử chat

Đoạn nguồn trước/sau giúp giải quy chiếu; bản dịch trước giúp giữ giọng nhưng cũng có thể truyền lỗi. Phải ghi rõ lấy phiên bản nào. Khi chạy song song, không dùng “bản trước vừa xong thì lấy” vì kết quả phụ thuộc lịch chạy. Chọn trước giữa snapshot chỉ nguồn, snapshot bản dịch đã tồn tại, hoặc chạy tuần tự khi thật sự phụ thuộc đầu ra trước.

Lịch sử chat không thay kho quyết định: ý kiến tạm thời, trích dẫn và lời model trong lịch sử không tự thành glossary đã duyệt. Khi người dùng đổi quy ước, lưu quyết định có nguồn thay vì chỉ hy vọng model nhớ lượt chat cũ.

Nguồn: [R01–R08 trong bản đồ nguồn](evidence.md). Chưa có phép đo Mira xác nhận truy hồi mẫu hay memory luôn làm bản dịch tốt hơn.

[Về mục lục](README.md)
