# Nguồn và cập nhật

Cập nhật: 2026-10-09 · Trạng thái: **nghiên cứu và mock, chưa có quyết định triển khai** · Chủ trì: chủ sản phẩm.

Module này trả lời chương gốc của một tác phẩm đến từ đâu (dán, tệp .txt, trang web, API), làm sao biết
có chương mới hay raw đã bị sửa, và trang **Cập nhật** trên thanh bên hiển thị những gì.

## Hiện trạng

- Mira đã cho phép tạo chương rồi dán hoặc nhập `.txt`/`.md` cho từng chương. Luồng nhập một tệp rồi tự
  chia thành nhiều chương vẫn là mock (`MOCK_FEATURES.importTxt`).
- Kho hiện lưu metadata chương, nội dung nguồn/bản dịch, revision và cờ có nội dung; chưa lưu danh tính
  nguồn, URL/ID chương ở nguồn, hash raw, lần kiểm hoặc trạng thái phát hiện/gỡ.
- Mira chưa có tác vụ tải hoặc kiểm chương qua mạng.
- Trang **Cập nhật** là màn minh hoạ ([`UpdatesScreenMock`](../../../src/renderer/src/features/updates/UpdatesScreenMock.tsx)),
  nằm trong [lộ trình tính năng toàn app](../workspace/app-level-features.md#7-lộ-trình-biến-màn-minh-hoạ-thành-tính-năng).
- Khu vực **Nguồn** trong màn tác phẩm (mock) đang mang nghĩa khác: nhiều bản raw của cùng một truyện
  (S3.1 trong [scope cũ](https://github.com/minh1904/app-novel/blob/501be2a/docs/handbook/product/scope.md)).

## Tài liệu

- [Cập nhật chương mới: đối thủ làm gì, Mira nên làm gì](updates-research.md): Mihon, Legado, LNReader,
  Kotatsu, FanFicFare, Readwise; nơi có raw và pháp lý; năm cách làm xếp theo rủi ro; bộ so khác dùng
  chung; 15 tính năng của trang Cập nhật; câu hỏi cần chốt.

---

[Mục lục module](../README.md)
