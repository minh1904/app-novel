## Why

Một lượt dịch chương gồm nhiều lô, nhưng `ParagraphTranslator.runBatch` đọc lại glossary, cặp xưng hô và
nhân vật đã duyệt **ở mỗi lô**. Người dịch sửa glossary giữa lúc đang chạy thì các lô trong cùng chương
dùng các phiên bản ngữ cảnh khác nhau, mà trace không cho biết lô nào dùng bản nào. Trace hiện chỉ lưu
mục glossary/xưng hô đã khớp và hash request; thiếu nhân vật, đoạn liền trước, bộ mặc định và phiên bản
ngữ cảnh, nên không tái dựng được request đã gửi. Lab chạy cùng đường này nên cũng không tái hiện được
một lần đo. Đây là điều kiện để các thí nghiệm sau (đo lặp, báo cáo hai trục, structured output) đáng tin.

## What Changes

- Khi lập kế hoạch một lượt dịch chương, Mira chụp **một lần** ngữ cảnh tác phẩm đã duyệt áp cho chương:
  glossary hiệu lực, cặp xưng hô hiệu lực, nhân vật đã duyệt, cùng bộ mặc định suy ra từ tác phẩm.
  Bản chụp được lưu bền trong tệp `.mira` của tác phẩm, gắn với `runId`.
- Mọi lời gọi thuộc lượt đó — lượt chính của từng lô, chia lô khi bị lọc, gửi lại không kèm ngữ cảnh,
  hỏi lại ID thiếu, chạy lại các đoạn lỗi với cùng kế hoạch — dựng prompt từ bản chụp, không đọc lại kho.
- Người dùng sửa ngữ cảnh giữa lượt: lượt vẫn chạy bằng bản chụp cũ, kết quả lô báo rõ ngữ cảnh đã đổi
  sau khi bắt đầu, và giao diện nói cách áp dụng bản mới (lập kế hoạch lại).
- Trace của đề xuất tham chiếu bản chụp bất biến (định danh + hash nội dung) và ghi các phần riêng của lô
  (mục đã lọc, đoạn liền trước, phiên bản prompt), đủ để dựng lại đúng request đã gửi bằng bộ dựng prompt.
- Lab ghi hash bản chụp vào mỗi bản ghi lần chạy và lưu nội dung bản chụp cạnh dữ liệu lần chạy.
- Kế hoạch tạo trước khi nâng cấp (không có bản chụp) bị từ chối với lỗi `conflict` “Hãy lập kế hoạch
  lại”, như các xung đột kế hoạch hiện có.

## Capabilities

### New Capabilities
- `translation-context-snapshot`: bản chụp ngữ cảnh tác phẩm cho một lượt dịch chương — lúc chụp, phạm vi
  dùng, hành vi khi ngữ cảnh đổi giữa lượt, khả năng tái dựng request từ trace và cách Lab ghi lại.

### Modified Capabilities
<!-- Chưa có main spec trong openspec/specs/; hành vi dịch theo đoạn hiện chỉ nằm trong change đã archive. -->

## Impact

- Mã nguồn: `src/main/services/ai/paragraphTranslation.ts` (plan/runBatch), `src/main/infra/storage/workSchema.ts`
  (migration v9: bảng bản chụp), module storage mới cho bản chụp, `src/shared/contracts/aiTranslateProposals.ts`
  (kế hoạch và kết quả lô mang thông tin bản chụp), `useParagraphTranslate.ts` và nơi hiện thông báo lô.
- Lab: `scripts/lab/cli.ts` (ghi hash và tệp bản chụp theo lần chạy), sổ đăng ký lần chạy.
- Dữ liệu: tệp `.mira` lên schema v9; tệp cũ được migrate tự động, không mất dữ liệu. Đề xuất cũ giữ trace cũ.
- Không đổi: nội dung prompt, `translationCore` (vẫn nhận `TranslatePromptContext`), chat, `ChapterTranslator`.
