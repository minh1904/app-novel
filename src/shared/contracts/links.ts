/**
 * Liên kết giữa các đoạn nguồn và đoạn dịch. Mỗi liên kết nối ít nhất một đoạn từ mỗi phía (quan hệ n:m);
 * trạng thái biểu thị xem liên kết có cần kiểm tra lại hay không.
 */
export type LinkKind = 'ai' | 'user'
export type LinkStatus = 'ok' | 'needs_review' | 'broken'

export interface LinkRecord {
  id: string
  chapterId: string
  kind: LinkKind
  confidence: number | null
  status: LinkStatus
  /** Danh sách ID đoạn văn bản của cả hai phía theo thứ tự lưu trữ. */
  members: string[]
  createdAt: number
  /** Thời điểm xác nhận liên kết, hoặc null nếu chưa có. */
  reviewedAt: number | null
}
