# Rà flow Kết nối AI so với Hermes

Cập nhật: 2026-10-09 · Trạng thái: **Quan sát** (phần 1–2, đọc mã Hermes `apps/desktop/src` và mã Mira trên
cây làm việc ngày 2026-10-09), **Đã chốt** (phần 3–4, chủ sản phẩm chốt ngày 2026-10-09). Chủ trì: chủ sản phẩm.

**Quyết định ngày 2026-10-09:**

- Làm toàn bộ flow đích ở phần 3, theo thứ tự ở cuối chương.
- Danh sách model chuyển sang trang Model › Danh sách model.
- Giữ pool khóa, nhưng danh sách khóa chỉ hiện khi có từ hai khóa trở lên.

## Câu hỏi chương này trả lời

Chủ sản phẩm muốn toàn bộ feature Kết nối AI có flow UX giống Hermes. Hermes dẫn người dùng từ lần mở đầu
tiên tới lúc chat ra sao, Mira đang lệch ở đâu, và nên sửa theo thứ tự nào?

Đường dẫn Hermes tính từ `apps/desktop/src`, đường dẫn Mira tính từ `src/renderer/src`.

## 1. Flow của Hermes (quan sát)

**Một nguyên tắc xuyên suốt: thẻ provider chỉ lo khóa, còn model nằm ở nhóm Model.**

| Bước | Hermes làm gì |
| --- | --- |
| Lần mở đầu | Một overlay (`components/onboarding`) có danh sách provider, nút "I have an API key" và "I'll choose a provider later". Kết nối xong, Hermes **tự chọn model mặc định** của provider rồi hiện màn "X connected · Default model · Change · Begin". |
| Chưa có provider mà bấm Gửi | Mở lại chính overlay đó và giữ nguyên bản nháp. Không có thẻ trống riêng trong ô chat. |
| Cài đặt › Providers › Accounts | Bản sao của bảng chọn trong overlay: nhóm "Connected" có thùng rác (hỏi xác nhận), và nút "Connect another provider". |
| Cài đặt › Providers › API keys | Mỗi provider là một thẻ lưới hai cột: tên và ô khóa. Ô khóa lúc nghỉ trông như chữ thường; bấm vào thì sửa tại chỗ, có Save và Remove (hỏi xác nhận). Mở thẻ ra chỉ có mô tả, các trường phụ (base URL…) và "Get a key ↗". **Không có model, bật/tắt, kiểm tra hay xóa kết nối trong thẻ.** |
| Cài đặt › Providers › Custom endpoints | Một danh sách gọn: tên, nhãn ✓Active, URL, model, đuôi khóa, cùng nút Use và thùng rác. Bấm vào một dòng thì nó nạp vào form bên dưới để sửa. Form có tên, URL, API Mode (rộng hết hàng), model mặc định (combobox lấy từ kết quả dò), context, khóa, và các nút Test / Save / New endpoint. |
| Cài đặt › Model › Main | Chọn provider, chọn model, rồi bấm Apply. Provider chưa có khóa thì ô chọn model biến thành ô dán khóa kèm nút Activate; Activate lưu khóa và tự chọn sẵn model đề xuất. Mức suy luận và tốc độ ở đây là mặc định của cả profile. |
| Cài đặt › Model › Fallback và Auxiliary | Fallback là một chuỗi provider/model có thứ tự, tự lưu. Auxiliary chọn model riêng cho từng việc phụ, mặc định đi theo model chính. |
| Menu model trong ô chat | Gồm tìm kiếm, Yêu thích, rồi các nhóm provider (kèm chip trạng thái). Rê chuột lên một model thì hiện submenu chỉnh suy luận của riêng model đó. Chân menu có Use Settings default, Refresh, Add custom model, Edit models… (hộp ẩn/hiện model). Provider chưa cấu hình không hiện trong menu. |
| Lỗi lúc chạy | Thẻ lỗi dưới tin nhắn, nút theo loại lỗi: khóa sai có **[Update API key]** mở thẳng thẻ khóa của provider đó; bị giới hạn tốc độ có [Retry], giờ hạn mức hồi lại và [Switch provider]; OAuth hết hạn có [Sign in again]. Khi Hermes tự chuyển sang model dự phòng, transcript có thêm một dòng hệ thống báo việc đó. |
| Phản hồi | Lưu, xóa và lỗi đều có toast. Mọi lần xóa đều hỏi xác nhận. Hermes không kiểm khóa khi lưu: khóa sai sẽ lộ ra lúc chat, và thẻ lỗi lúc đó dẫn về đúng thẻ khóa. |

Hermes **không có** giao diện cho nhiều khóa trên một provider. Pool khóa chỉ hiện trạng thái, chỉ đọc, ở
chip trong menu model.

## 2. Mira đang lệch ở đâu (quan sát, 2026-10-09)

**Thẻ provider làm quá nhiều việc.** Mở thẻ Khóa API ra là thấy: mô tả, Bật kết nối, Tên, danh sách khóa, danh
sách mục model (mỗi mục có menu 8 lệnh và 3 hộp thoại), Kiểm tra, Xóa. Mỗi kết nối của provider lặp lại cả
khối đó. Màn nhìn rối chủ yếu vì vậy.

**Cùng một việc nhưng làm ở nhiều chỗ, mỗi chỗ một kiểu.**

- **Thêm khóa ở 6 chỗ:** đầu thẻ Khóa API, ô "Thêm khóa" trong `ConnectionDetails`, Kích hoạt ở Model chính,
  hai form của Onboarding, form Thêm endpoint. Phản hồi mỗi chỗ một khác: toast, lỗi tại chỗ, hoặc không gì cả.
- **Dán khóa trong Cài đặt cho ra một kết nối không có model nào.** Kết nối đó không hiện trong menu model,
  trong khi Onboarding thì tự thêm model đầu tiên.
- **Mức suy luận chỉnh được ở 4 chỗ:** Model chính, hộp thoại Cơ bản, flyout của menu, màn xác nhận của
  Onboarding.
- **Có 3 khái niệm "mặc định":** mục mặc định của từng kết nối, Model chính, và lựa chọn riêng của một phiên
  chat.
- **Thiếu kết nối thì đi 3 đường:** nút "Mở Cài đặt" trong chat và dịch mở trang gần nhất; nút "Thêm nhà cung
  cấp" trong menu mở Onboarding; nút "Thêm kết nối" ở Model chính mở trang Khóa API.

**Thiếu phản hồi và thiếu an toàn.**

- `connectionStore.notice` không được hiện ở trang Cài đặt nào. Vì vậy đổi tên, đổi URL, bật/tắt hay xóa
  mà lỗi thì người dùng không thấy gì.
- Xóa kết nối và xóa khóa không hỏi xác nhận. Ngắt tài khoản và xóa mục model thì có hỏi.
- Lúc dịch hay chat mà khóa sai hoặc hết hạn mức, thẻ lỗi **không có nút dẫn tới thẻ khóa**. Lỗi khóa sai
  cũng chưa có câu tiếng Việt.

**Endpoint tùy chỉnh khác Hermes.**

- Endpoint hiện dưới dạng thẻ mở rộng chứa toàn bộ `ConnectionDetails`, không phải danh sách gọn có form sửa.
- Lưu xong thì không đổi được Chế độ API nữa.
- Nút Lưu không đòi phải có model.

**Còn sót.**

- Trên trang Tài khoản, ghi chú điều khoản hiện hai lần.
- Kết nối tài khoản không có chỗ quản lý model, nên lệnh "Sửa danh sách model…" cho Codex/Copilot mở ra một
  trang không có danh sách model.
- Nhánh `support: 'soon'` và hàm `connectionBadge` không còn ai dùng.

Đã sửa trên cây làm việc ngày 2026-10-09, chưa commit:

- Ô nhập trong `SettingRow` bị bóp về 0 vì khung control co theo nội dung; nay khung luôn rộng hết cột.
- Form Thêm endpoint dựng theo Hermes.
- Thẻ Khóa API dùng lưới hai cột với ô khóa sửa tại chỗ như Hermes, và bỏ ô khóa thứ hai trong thân thẻ.

## 3. Flow đích (đã chốt)

1. **Thẻ provider chỉ lo khóa.** Mở thẻ ra chỉ còn mô tả, "Lấy khóa ↗", base URL (nếu provider có), và danh
   sách khóa dự phòng khi có từ hai khóa trở lên. Bật/tắt, tên và xóa kết nối chuyển sang một menu "…" ở đầu
   thẻ, giống nút thùng rác của Hermes. Xóa khóa và xóa kết nối đều hỏi xác nhận.
2. **Danh sách model rời khỏi thẻ provider.** `ModelEntries` chuyển sang một trang **Model › Danh sách model**,
   nhóm theo kết nối. Trang này đóng vai hộp "Edit models…" của Hermes, và lệnh "Sửa danh sách model…" trong
   menu mở thẳng nó. Ba hộp thoại Cơ bản / Tác vụ / Nâng cao giữ nguyên, vì giới hạn token và số luồng là
   phần riêng của Mira, phục vụ dịch hàng loạt.
3. **Lưu khóa là dùng được ngay.** Lưu khóa xong thì Mira tự thêm model đề xuất của provider làm mục mặc định
   (theo preset, hoặc model đầu tiên dò được), y như Onboarding và Activate của Hermes. Nếu chưa có Model
   chính thì đặt luôn model này làm Model chính.
4. **Thiếu kết nối thì đi một đường:** mở overlay Onboarding. Điều này áp dụng cho nút "Mở Cài đặt" trong chat
   và dịch, nút "Thêm nhà cung cấp", và cả khi bấm Gửi lúc chưa có kết nối (giữ bản nháp).
5. **Thẻ lỗi có lối sửa.** Khóa sai thì hiện "X từ chối khóa API" kèm nút [Cập nhật khóa], mở thẳng thẻ khóa.
   Hết hạn mức thì hiện giờ hồi kèm [Thử bằng Y]. Thẻ lỗi trong hộp thoại Dịch cũng có các nút này.
6. **Endpoint tùy chỉnh theo Hermes:** danh sách gọn có Dùng / Xóa; bấm vào một dòng để nạp vào form sửa (sửa
   được cả Chế độ API); có nút "Endpoint mới". Lưu cần có tên, URL và model.
7. **Mức suy luận còn hai chỗ:** mặc định ở Model chính, và flyout theo từng model trong menu. Bỏ ô này khỏi
   hộp thoại Cơ bản và khỏi màn xác nhận của Onboarding (màn đó chỉ còn "Đổi model").
8. **Phản hồi đồng nhất:** mọi thao tác ghi đều có toast khi lỗi (hiện `notice`); ô văn bản tự lưu khi rời ô;
   khóa và Model chính giữ nút bấm rõ ràng như Hermes.
9. **Dọn dẹp:** bỏ ghi chú điều khoản lặp lại, bỏ nhánh `soon` và `connectionBadge`. Các hàng trong
   `SettingsSection` không kẻ đường, như `ListRow` của Hermes. Cập nhật mục 3–4 của README và bảng ở mục 3
   của [chương Hermes](hermes-settings-and-adapters.md), vì cả hai đã cũ.

## Trạng thái triển khai (2026-10-09)

| Mục | Trạng thái |
| --- | --- |
| 1. Thẻ provider chỉ lo khóa | **Đã làm.** Mở thẻ ra còn: mô tả, "Lấy khóa ↗", danh sách khóa (khi có từ hai khóa), dòng "Danh sách model ›", và một hàng gồm bật/tắt, Kiểm tra, Xóa kết nối. Khác đề xuất: không dùng menu "…", vì một hàng ba thao tác đã đủ gọn và mỗi thao tác chỉ cần một lần bấm. |
| 2. Danh sách model rời khỏi thẻ | **Đã làm.** Có trang Model › Danh sách model. Lệnh "Sửa danh sách model…" mở thẳng phần của kết nối đang chọn. Kết nối tài khoản cũng có danh sách model ở đây. |
| 3. Lưu khóa là dùng được ngay | **Đã làm** bằng `connectKey`: kiểm khóa, gỡ khóa bị từ chối, thêm model đầu tiên dò được. Lỗi mạng thì vẫn giữ khóa và hiện cảnh báo. Khác đề xuất: không tự đặt Model chính, vì khi chưa đặt, Mira đã tự dùng mục mặc định của kết nối bật đầu tiên. Onboarding vẫn giữ luồng riêng, gỡ khóa với mọi lỗi. |
| 4. Thiếu kết nối thì đi một đường | **Chưa làm.** Phải sửa chuỗi prop `onOpenSettings` từ `App.tsx` xuống khung chat và hộp thoại Dịch, mà một session khác đang sửa dở `App.tsx`. Làm sau khi phần đó đã vào main. |
| 5. Thẻ lỗi có lối sửa | **Đã làm** trong chat và hộp thoại Dịch, cho lỗi `auth` và `quota`. Lỗi `auth` lúc chạy vẫn hiện câu gốc của nhà cung cấp dưới dòng tiêu đề tiếng Việt. |
| 6. Endpoint theo Hermes | **Đã làm**, trừ nút "Dùng": Mira không có "endpoint đang dùng"; model chính chọn ở trang Model. |
| 7. Mức suy luận còn hai chỗ | **Đổi:** vẫn giữ ô này trong hộp thoại Cơ bản. Hộp thoại đó giờ là chỗ sửa từng model của trang Danh sách model, giống submenu chỉnh model của Hermes, và chỉ nó báo khi mức đã lưu không còn hợp lệ. Màn xác nhận của Onboarding chỉ chỉnh qua menu, như đề xuất. |
| 8. Phản hồi đồng nhất | **Đã làm:** `notice` hiện thành toast trên các trang Cài đặt; xóa khóa, xóa kết nối và xóa endpoint đều hỏi xác nhận. |
| 9. Dọn dẹp | **Đã làm:** bỏ ghi chú điều khoản lặp lại, bỏ trạng thái `soon` và `connectionBadge`, bỏ đường kẻ giữa các hàng, đánh dấu các mục cũ của README và chương Hermes. |

Chưa kiểm bằng mắt trên app chạy thật. Mới chỉ qua typecheck, test và Biome.

## 4. Không lấy (đã chốt)

- **Model phụ theo từng việc (Auxiliary):** Mira chưa có việc phụ nào cần model riêng.
- **Bỏ giao diện nhiều khóa:** pool khóa là thế mạnh của Mira với hạn mức miễn phí của Gemini, nên giữ lại,
  nhưng chỉ hiện khi có từ hai khóa.
- **Không kiểm khóa khi lưu như Hermes:** Mira giữ bước kiểm nhẹ, vì lỗi khóa giữa một đợt dịch hàng loạt
  tốn hơn lỗi trong chat.

## Thứ tự làm

1. Mục 3 và 8: lưu khóa là dùng được ngay; toast khi lỗi; hỏi xác nhận khi xóa. Lợi nhiều, sửa ít.
2. Mục 5: thẻ lỗi có lối sửa.
3. Mục 1, 2 và 7: dựng lại thẻ provider và tách trang Danh sách model. Đây là việc lớn nhất.
4. Mục 6 và 4: endpoint dạng danh sách cùng form; một đường duy nhất khi thiếu kết nối.
5. Mục 9: dọn dẹp.

---

[Kết nối AI](README.md) · [Cài đặt và lớp provider của Hermes](hermes-settings-and-adapters.md) ·
[Mục lục module](../README.md)
