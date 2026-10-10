import type { JSX } from 'react'
import { Button } from '../../../components/ui/Button'
import { Dialog } from '../../../components/ui/Dialog'
import { SOON_LABEL } from '../../../lib/mockFeatures'

/** Fixed sample data: what the finished import would show, not anything from the work. */
const SAMPLE_CHAPTERS = [
  'Chương 101: Gặp lại',
  'Chương 102: Cửa núi',
  'Chương 103: Người bán thuốc',
  'Chương 104: Trận mưa đêm',
  'Ngoại truyện: Mùa đông năm ấy'
]

/**
 * Illustration of importing many chapters from one .txt file. It reads no file and writes nothing;
 * the rule shown for splitting chapters is a proposal, still to be confirmed (see the backlog).
 */
export function ImportTxtMockDialog({
  open,
  onOpenChange
}: {
  open: boolean
  onOpenChange(open: boolean): void
}): JSX.Element {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title="Nhập chương từ tệp .txt"
      description="Bản minh họa: luồng này chưa hoạt động và không thay đổi tác phẩm của bạn."
    >
      <div className="flex flex-col gap-4 text-body-xs">
        <p
          role="note"
          className="rounded-sm border border-warning/40 bg-warning/10 px-3 py-2 leading-normal"
        >
          <strong className="font-semibold">{SOON_LABEL}.</strong> Dữ liệu dưới đây là mẫu cố định,
          không phải của tác phẩm này.
        </p>

        <ol className="flex flex-col gap-4">
          <li className="flex flex-col gap-1.5">
            <span className="text-body-xs font-semibold">1. Chọn tệp</span>
            <div className="flex items-center gap-2">
              <span className="min-w-0 flex-1 truncate rounded-sm border border-strong px-3 py-2 text-subtle">
                truyen-mau.txt (mẫu)
              </span>
              <Button variant="light" disabled>
                Chọn tệp…
              </Button>
            </div>
          </li>

          <li className="flex flex-col gap-1.5">
            <span className="text-body-xs font-semibold">2. Cách tách chương</span>
            <p className="leading-normal text-subtle">
              Đề xuất: một dòng bắt đầu bằng <code className="font-mono text-default">***</code> là
              tên của chương mới; phần văn bản dưới nó thuộc chương đó. Quy tắc này chưa chốt.
            </p>
          </li>

          <li className="flex flex-col gap-1.5">
            <span className="text-body-xs font-semibold">3. Xem trước</span>
            <p className="text-subtle">Tìm thấy {SAMPLE_CHAPTERS.length} chương (mẫu)</p>
            <ul className="flex flex-col divide-y divide-default rounded-sm border border-default">
              {SAMPLE_CHAPTERS.map((title, index) => (
                <li key={title} className="flex items-center gap-3 px-3 py-1.5">
                  <span className="w-5 text-right text-subtle">{index + 1}</span>
                  <span className="truncate">{title}</span>
                </li>
              ))}
            </ul>
          </li>
        </ol>

        <div className="flex items-center justify-end gap-3 border-t border-default pt-4">
          <span id="import-txt-reason" className="mr-auto text-body-xs text-subtle">
            Chưa nhập được: tính năng này đang là bản minh họa.
          </span>
          <Button variant="light" onClick={() => onOpenChange(false)}>
            Đóng
          </Button>
          <Button variant="solid" disabled aria-describedby="import-txt-reason">
            Nhập {SAMPLE_CHAPTERS.length} chương
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
