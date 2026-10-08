import { useState, type JSX } from 'react'
import type {
  ExportFormat,
  ExportPageSize,
  ExportParagraphSpacing,
  ExportWorkMode
} from '../../../../shared/contracts/export'
import { Banner } from '../../components/Banner'
import { Button } from '../../components/Button'
import { Dialog } from '../../components/Dialog'
import { Select, type SelectOption } from '../../components/Select'
import { Switch } from '../../components/Switch'

export interface ExportDialogProps {
  open: boolean
  onOpenChange(open: boolean): void
  workId: string
  workTitle: string
  chapterId?: string
  chapterTitle?: string
  chapterNumber?: number
}

const FORMAT_OPTIONS: SelectOption<ExportFormat>[] = [
  { value: 'docx', label: 'Microsoft Word (.docx) — Bản thảo' },
  { value: 'pdf', label: 'PDF (.pdf) — Sách điện tử Novel Ebook' },
  { value: 'txt', label: 'Văn bản thuần (.txt) — UTF-8' },
  { value: 'md', label: 'Markdown (.md) — Giữ nguyên định dạng' }
]

const PAGE_SIZE_OPTIONS: SelectOption<ExportPageSize>[] = [
  { value: 'A5', label: 'Khổ A5 (Khổ tiểu thuyết tiêu chuẩn)' },
  { value: 'A4', label: 'Khổ A4 (Khổ tài liệu thông thường)' }
]

const SPACING_OPTIONS: SelectOption<ExportParagraphSpacing>[] = [
  { value: 'indent', label: 'Thụt lề đầu dòng (Chuẩn sách văn học)' },
  { value: 'spacing', label: 'Dòng trống cách đoạn' }
]

const WORK_MODE_OPTIONS: SelectOption<ExportWorkMode>[] = [
  { value: 'combined', label: 'Gộp toàn bộ vào 1 tệp duy nhất' },
  { value: 'separate', label: 'Xuất từng chương thành các tệp riêng trong thư mục' }
]

export function ExportDialog({
  open,
  onOpenChange,
  workId,
  workTitle,
  chapterId,
  chapterTitle,
  chapterNumber
}: ExportDialogProps): JSX.Element {
  const isSingleChapter = Boolean(chapterId)

  const [format, setFormat] = useState<ExportFormat>('docx')
  const [workMode, setWorkMode] = useState<ExportWorkMode>('combined')
  const [pageSize, setPageSize] = useState<ExportPageSize>('A5')
  const [paragraphSpacing, setParagraphSpacing] = useState<ExportParagraphSpacing>('indent')
  const [includeTitle, setIncludeTitle] = useState(true)
  const [includeDescription, setIncludeDescription] = useState(true)

  const [isExporting, setIsExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const handleExport = async (): Promise<void> => {
    setIsExporting(true)
    setError(null)
    setSuccessMsg(null)

    try {
      const options = {
        includeTitle,
        includeAuthor: true,
        includeDescription,
        paragraphSpacing,
        pageSize
      }

      if (isSingleChapter && chapterId) {
        const result = await window.mira.export.exportChapter({
          workId,
          chapterId,
          format,
          options
        })

        if (!result.ok) {
          setError(result.error.message)
        } else if (result.value.canceled) {
          // User canceled save dialog
        } else if (!result.value.success) {
          setError(result.value.error ?? 'Xuất tệp thất bại.')
        } else {
          setSuccessMsg(`Đã xuất thành công: ${result.value.filePath}`)
          setTimeout(() => {
            onOpenChange(false)
          }, 1500)
        }
      } else {
        const result = await window.mira.export.exportWork({
          workId,
          format,
          mode: workMode,
          options
        })

        if (!result.ok) {
          setError(result.error.message)
        } else if (result.value.canceled) {
          // User canceled
        } else if (!result.value.success) {
          setError(result.value.error ?? 'Xuất tác phẩm thất bại.')
        } else {
          setSuccessMsg(
            `Đã xuất thành công ${result.value.count ?? 0} chương vào: ${result.value.filePath}`
          )
          setTimeout(() => {
            onOpenChange(false)
          }, 1500)
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setIsExporting(false)
    }
  }

  const dialogTitle = isSingleChapter
    ? `Xuất Chương ${chapterNumber ?? ''}: ${chapterTitle ?? ''}`
    : `Xuất tác phẩm: ${workTitle}`

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      size="form"
      title={dialogTitle}
      description="Xuất bản dịch tiểu thuyết theo chuẩn format ebook để lưu trữ, đọc hoặc nộp bản thảo."
    >
      <div className="flex flex-col gap-4 py-2">
        {error && (
          <Banner tone="error" onDismiss={() => setError(null)}>
            {error}
          </Banner>
        )}
        {successMsg && (
          <Banner tone="success" onDismiss={() => setSuccessMsg(null)}>
            {successMsg}
          </Banner>
        )}

        <div className="flex flex-col gap-1.5">
          <Select
            label="Định dạng tệp"
            value={format}
            onChange={(val) => setFormat(val)}
            options={FORMAT_OPTIONS}
          />
        </div>

        {!isSingleChapter && (
          <div className="flex flex-col gap-1.5">
            <Select
              label="Quy cách lưu"
              value={workMode}
              onChange={(val) => setWorkMode(val)}
              options={WORK_MODE_OPTIONS}
            />
          </div>
        )}

        {format === 'pdf' && (
          <div className="flex flex-col gap-1.5">
            <Select
              label="Khổ trang PDF"
              value={pageSize}
              onChange={(val) => setPageSize(val)}
              options={PAGE_SIZE_OPTIONS}
            />
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <Select
            label="Kiểu trình bày đoạn văn"
            value={paragraphSpacing}
            onChange={(val) => setParagraphSpacing(val)}
            options={SPACING_OPTIONS}
          />
        </div>

        <div className="mt-2 flex flex-col gap-3 rounded-lg border border-border-subtle p-3">
          <div className="flex items-center justify-between">
            <span className="text-ui-sm text-ink">Bao gồm tên sách và tác giả</span>
            <Switch checked={includeTitle} onCheckedChange={setIncludeTitle} />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-ui-sm text-ink">Bao gồm lời giới thiệu tác phẩm</span>
            <Switch checked={includeDescription} onCheckedChange={setIncludeDescription} />
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={isExporting}>
            Đóng
          </Button>
          <Button variant="default" onClick={() => void handleExport()} disabled={isExporting}>
            {isExporting ? 'Đang xuất…' : 'Xuất tệp'}
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
