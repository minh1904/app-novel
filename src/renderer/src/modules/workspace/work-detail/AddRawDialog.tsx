import { useState, type JSX } from 'react'
import { FolderIcon } from '@solar-icons/react/linear/folder'
import { DocumentIcon } from '@solar-icons/react/linear/document'
import { CheckCircleIcon } from '@solar-icons/react/linear/check-circle'
import { DangerTriangleIcon } from '@solar-icons/react/linear/danger-triangle'
import { Dialog } from '../../../components/ui/Dialog'
import { Button } from '../../../components/ui/Button'
import { TextField } from '../../../components/ui/Field'
import { Select } from '../../../components/ui/Select'
import { ICON } from '../../../components/ui/icon'
import type { SourceBinding } from '../../../../../shared/contracts/sources'

export interface AddRawDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  workId: string
  defaultLanguageTag?: string
  onBindingCreated: (binding: SourceBinding) => void
}

type SourceKind = 'file' | 'folder'

const SOURCE_KINDS = [
  {
    kind: 'folder' as SourceKind,
    title: 'Theo dõi thư mục',
    description: 'Quét toàn bộ tệp chương .txt, .md trong thư mục theo thứ tự xác định',
    icon: <FolderIcon size={ICON.md} />
  },
  {
    kind: 'file' as SourceKind,
    title: 'Tệp văn bản đơn',
    description: 'Nhập nội dung từ một tệp văn bản .txt hoặc .md',
    icon: <DocumentIcon size={ICON.md} />
  }
]

const LANGUAGE_OPTIONS = [
  { value: 'ja', label: 'Tiếng Nhật (ja)' },
  { value: 'ko', label: 'Tiếng Hàn (ko)' },
  { value: 'zh-Hans', label: 'Trung giản thể (zh-Hans)' },
  { value: 'zh-Hant', label: 'Trung phồn thể (zh-Hant)' },
  { value: 'en', label: 'Tiếng Anh (en)' },
  { value: 'vi', label: 'Tiếng Việt (vi)' }
]

const ROLE_OPTIONS = [
  { value: 'primary', label: 'Bản chính (Mặc định dùng để dịch)' },
  { value: 'reference', label: 'Bản đối chiếu (Tham khảo song song)' }
]

export function AddRawDialog({
  open,
  onOpenChange,
  workId,
  defaultLanguageTag = 'ja',
  onBindingCreated
}: AddRawDialogProps): JSX.Element {
  const [kind, setKind] = useState<SourceKind>('folder')
  const [pathValue, setPathValue] = useState('')
  const [label, setLabel] = useState('')
  const [languageTag, setLanguageTag] = useState(defaultLanguageTag)
  const [role, setRole] = useState<'primary' | 'reference'>('primary')

  // Step state
  const [step, setStep] = useState<'select' | 'preview' | 'config'>('select')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Preview result
  const [previewResult, setPreviewResult] = useState<{
    previewId: string
    totalCount: number
    matchedCount: number
    unmatchedCount: number
    errorCount: number
  } | null>(null)

  const reset = (): void => {
    setKind('folder')
    setPathValue('')
    setLabel('')
    setLanguageTag(defaultLanguageTag)
    setRole('primary')
    setStep('select')
    setLoading(false)
    setError(null)
    setPreviewResult(null)
  }

  const handleClose = (): void => {
    reset()
    onOpenChange(false)
  }

  const sourceId = kind === 'folder' ? 'mira.folder' : 'mira.single-file'
  const remoteWorkId = kind === 'folder' ? `folder:${pathValue.trim()}` : `file:${pathValue.trim()}`

  // Step 1 -> Step 2 (Preview)
  const handlePreview = async (): Promise<void> => {
    if (!pathValue.trim()) {
      setError('Vui lòng nhập đường dẫn tệp hoặc thư mục')
      return
    }
    setError(null)
    setLoading(true)

    try {
      if (typeof window !== 'undefined' && window.mira?.sources?.bindings) {
        const res = await window.mira.sources.bindings.previewCreate({
          workId,
          sourceId,
          remoteWorkId
        })
        if (res.ok) {
          const val = res.value as any
          setPreviewResult({
            previewId: val.previewId ?? 'preview-1',
            totalCount: val.totalCount ?? 0,
            matchedCount: val.matchedCount ?? 0,
            unmatchedCount: val.unmatchedCount ?? 0,
            errorCount: val.errorCount ?? 0
          })
          if (!label) {
            const defaultLabel = kind === 'folder' ? 'Bản Raw Thư mục' : 'Bản Raw Tệp'
            setLabel(defaultLabel)
          }
          setStep('preview')
        } else {
          setError(res.error.message || 'Không thể đọc bản raw từ đường dẫn này')
        }
      } else {
        // Fallback for test / dev environment
        setPreviewResult({
          previewId: 'mock-preview-id',
          totalCount: 10,
          matchedCount: 10,
          unmatchedCount: 0,
          errorCount: 0
        })
        if (!label) {
          setLabel(kind === 'folder' ? 'Bản Raw Thư mục' : 'Bản Raw Tệp')
        }
        setStep('preview')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi khi kiểm tra đường dẫn')
    } finally {
      setLoading(false)
    }
  }

  // Step 2 -> Step 3 (Config)
  const handleProceedToConfig = (): void => {
    setStep('config')
  }

  // Confirm and Create
  const handleConfirm = async (): Promise<void> => {
    setError(null)
    setLoading(true)

    try {
      if (typeof window !== 'undefined' && window.mira?.sources?.bindings) {
        const res = await window.mira.sources.bindings.create({
          workId,
          sourceId,
          remoteWorkId,
          languageTag,
          label: label.trim() || (kind === 'folder' ? 'Bản Raw Thư mục' : 'Bản Raw Tệp'),
          role,
          expectedPreviewId: previewResult?.previewId ?? 'preview-1'
        })
        if (res.ok) {
          onBindingCreated(res.value)
          handleClose()
        } else {
          setError(res.error.message || 'Không thể tạo bản raw')
        }
      } else {
        // Mock success
        onBindingCreated({
          id: 'mock-binding-' + Date.now(),
          workId,
          sourceId,
          adapterVersion: '1.0.0',
          remoteWorkId,
          canonicalUrl: null,
          countryCode: null,
          languageTag,
          label: label.trim() || 'Bản Raw',
          role,
          authProfileId: null,
          enabled: true,
          checkpoint: null,
          createdAt: Date.now(),
          updatedAt: Date.now()
        })
        handleClose()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi tạo bản raw')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => !val && handleClose()}
      title="Thêm Bản raw"
      description="Gắn nguồn nội dung vào tác phẩm để theo dõi chương và dịch thuật"
      size="md"
      footer={
        <div className="flex items-center justify-end gap-xs">
          <Button variant="ghost" onClick={handleClose}>
            Hủy
          </Button>
          {step === 'select' && (
            <Button variant="solid" onClick={() => void handlePreview()} disabled={loading}>
              {loading ? 'Đang đọc…' : 'Tiếp tục'}
            </Button>
          )}
          {step === 'preview' && (
            <>
              <Button variant="outline" onClick={() => setStep('select')}>
                Quay lại
              </Button>
              <Button variant="solid" onClick={handleProceedToConfig}>
                Cấu hình vai trò
              </Button>
            </>
          )}
          {step === 'config' && (
            <>
              <Button variant="outline" onClick={() => setStep('preview')}>
                Quay lại
              </Button>
              <Button variant="solid" onClick={() => void handleConfirm()} disabled={loading}>
                {loading ? 'Đang thêm…' : 'Xác nhận tạo'}
              </Button>
            </>
          )}
        </div>
      }
    >
      <div className="flex flex-col gap-lg px-lg py-md">
        {error && (
          <div
            role="alert"
            className="flex items-center gap-xs rounded-xs border border-error bg-error/10 p-sm text-body-xs text-error"
          >
            <DangerTriangleIcon size={ICON.sm} />
            <span>{error}</span>
          </div>
        )}

        {/* STEP 1: SELECT KIND & PATH */}
        {step === 'select' && (
          <div className="flex flex-col gap-md">
            <div className="flex flex-col gap-xs">
              <span className="text-label-sm font-medium text-default">Phương thức nhập</span>
              <div className="grid grid-cols-2 gap-sm">
                {SOURCE_KINDS.map((opt) => (
                  <div
                    key={opt.kind}
                    onClick={() => setKind(opt.kind)}
                    className={`flex cursor-pointer flex-col gap-2xs rounded-md border p-md transition-colors ${
                      kind === opt.kind
                        ? 'border-selected bg-selected/10'
                        : 'border-default bg-surface hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center gap-xs">
                      <span className="text-subtle">{opt.icon}</span>
                      <span className="text-label-md font-semibold text-default">{opt.title}</span>
                    </div>
                    <p className="m-0 text-body-xs text-subtle">{opt.description}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-xs">
              <TextField
                label={
                  kind === 'folder' ? 'Đường dẫn thư mục chương' : 'Đường dẫn tệp .txt hoặc .md'
                }
                value={pathValue}
                onChange={(e) => setPathValue(e.target.value)}
                placeholder={kind === 'folder' ? 'D:\\Novels\\MyNovel\\raw' : 'D:\\Novels\\raw.txt'}
              />
              <span className="text-body-xs text-muted">
                Mira sẽ đọc theo yêu cầu và không chỉnh sửa tệp gốc trên máy tính của bạn.
              </span>
            </div>
          </div>
        )}

        {/* STEP 2: PREVIEW MATCHING */}
        {step === 'preview' && previewResult && (
          <div className="flex flex-col gap-md">
            <div className="flex items-center gap-xs text-success">
              <CheckCircleIcon size={ICON.md} />
              <span className="text-label-md font-medium text-default">
                Đã quét thông tin nguồn thành công
              </span>
            </div>

            <div className="grid grid-cols-2 gap-sm rounded-md border border-default bg-muted p-md">
              <div className="flex flex-col gap-3xs">
                <span className="text-body-xs text-muted">Tổng số mục / chương:</span>
                <span className="text-heading font-semibold text-default">
                  {previewResult.totalCount}
                </span>
              </div>
              <div className="flex flex-col gap-3xs">
                <span className="text-body-xs text-muted">Chương ghép được:</span>
                <span className="text-heading font-semibold text-success">
                  {previewResult.matchedCount}
                </span>
              </div>
              <div className="flex flex-col gap-3xs">
                <span className="text-body-xs text-muted">Chưa ghép:</span>
                <span className="text-body-md font-medium text-default">
                  {previewResult.unmatchedCount}
                </span>
              </div>
              <div className="flex flex-col gap-3xs">
                <span className="text-body-xs text-muted">Không đọc được:</span>
                <span className="text-body-md font-medium text-muted">
                  {previewResult.errorCount}
                </span>
              </div>
            </div>

            <p className="m-0 text-body-xs text-subtle">
              Việc xem trước không thay đổi cơ sở dữ liệu tác phẩm. Xác nhận ở bước tiếp theo để tạo
              Bản raw chính thức.
            </p>
          </div>
        )}

        {/* STEP 3: CONFIGURE LABEL, LANGUAGE, ROLE */}
        {step === 'config' && (
          <div className="flex flex-col gap-md">
            <TextField
              label="Tên / Nhãn Bản raw"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Ví dụ: Bản Raw Thư mục, Bản Qidian..."
            />

            <Select
              label="Ngôn ngữ bản raw"
              value={languageTag}
              options={LANGUAGE_OPTIONS}
              onChange={(val) => setLanguageTag(val)}
            />

            <Select
              label="Vai trò bản raw"
              value={role}
              options={ROLE_OPTIONS}
              onChange={(val) => setRole(val as any)}
            />

            <div className="rounded-xs border border-default bg-muted p-sm text-body-xs text-subtle">
              {role === 'primary' ? (
                <span>
                  <strong>Bản chính:</strong> Các chương trong tác phẩm sẽ mặc định lấy nội dung từ
                  bản này để dịch.
                </span>
              ) : (
                <span>
                  <strong>Bản đối chiếu:</strong> Dùng để tham khảo câu chữ đối chiếu song song khi
                  dịch, không ghi đè bản dịch.
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </Dialog>
  )
}
