import type { JSX } from 'react'
import { Button } from './Button'
import { Dialog } from './Dialog'

/** Dữ liệu yêu cầu xác nhận: câu hỏi, mô tả kết quả và nhãn nút bấm thực hiện hành động. */
export interface ConfirmRequest {
  title: string
  description?: string
  confirmLabel: string
  onConfirm(): void
}

/**
 * Hộp thoại xác nhận trước thao tác không thể hoàn tác. Nút hủy là lựa chọn an toàn; nút hành
 * động là nút nguy hiểm (danger) với nhãn cụ thể ("Xóa", "Ngắt"). Giá trị `request` là null khi đóng.
 */
export function ConfirmDialog({
  request,
  onClose
}: {
  request: ConfirmRequest | null
  onClose(): void
}): JSX.Element {
  return (
    <Dialog
      open={request !== null}
      onOpenChange={(open) => !open && onClose()}
      size="sm"
      title={request?.title ?? ''}
      description={request?.description}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Giữ
          </Button>
          <Button
            color="danger"
            variant="solid"
            onClick={() => {
              request?.onConfirm()
              onClose()
            }}
          >
            {request?.confirmLabel}
          </Button>
        </>
      }
    />
  )
}
