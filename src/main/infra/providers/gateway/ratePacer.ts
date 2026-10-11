import { ProviderError } from '../types'
import { abortableSleep } from './retryPolicy'

/**
 * Giãn cách các yêu cầu để đảm bảo khoảng cách giữa hai yêu cầu liên tiếp tuân thủ giới hạn RPM đã cấu hình.
 * Cơ chế này chủ động kiểm soát tốc độ gửi yêu cầu nhằm tránh bị nhà cung cấp trả về lỗi 429.
 *
 * Hoạt động bằng cách đặt trước khung thời gian (time slot) cho từng yêu cầu:
 * Mỗi yêu cầu lấy thời điểm lớn hơn giữa "thời điểm hiện tại" và "thời điểm kết thúc của slot trước đó",
 * sau đó dời mốc kết thúc thêm một khoảng thời gian (`60_000 / rpm`) và chờ đến lượt của mình.
 *
 * Giá trị `0` nghĩa là không giới hạn tốc độ: `wait` trả về ngay lập tức.
 */
export class RatePacer {
  /** Thời điểm sớm nhất yêu cầu tiếp theo được phép bắt đầu (ms epoch). Chỉ có ý nghĩa khi `rpm` > 0. */
  private nextAt = 0

  constructor(
    private rpm: number,
    private readonly now: () => number,
    private readonly sleep: (ms: number, signal?: AbortSignal) => Promise<void> = abortableSleep
  ) {
    RatePacer.check(rpm)
  }

  private static check(rpm: number): void {
    if (!Number.isFinite(rpm) || rpm < 0) {
      throw new RangeError('The RPM must be a number of at least 0.')
    }
  }

  /**
   * Cập nhật giới hạn RPM mới. Áp dụng cho các yêu cầu tiếp theo mà không làm ảnh hưởng các slot đã đặt trước.
   */
  setRpm(rpm: number): void {
    RatePacer.check(rpm)
    this.rpm = rpm
  }

  /** Tốc độ RPM hiện tại đang áp dụng (dùng cho kiểm thử và hiển thị). */
  get current(): number {
    return this.rpm
  }

  /**
   * Chờ đến lượt của yêu cầu theo tốc độ quy định.
   * Ném lỗi `cancelled` nếu tín hiệu bị hủy trước hoặc trong lúc đang chờ.
   * Nếu yêu cầu bị hủy là yêu cầu cuối cùng đặt chỗ, slot đó sẽ được hoàn lại để tránh tạo khoảng trống không cần thiết.
   */
  async wait(signal?: AbortSignal): Promise<void> {
    if (this.rpm === 0) return
    // Kiểm tra hủy ngay cả khi không phải chờ ngủ để tránh gửi yêu cầu đã bị hủy trước đó.
    if (signal?.aborted === true) throw new ProviderError('cancelled', 'Yêu cầu đã bị hủy.')

    const interval = 60_000 / this.rpm
    const now = this.now()
    const previous = this.nextAt
    const slot = Math.max(now, previous)
    this.nextAt = slot + interval

    const delay = slot - now
    if (delay <= 0) return
    try {
      await this.sleep(delay, signal)
    } catch (error) {
      if (this.nextAt === slot + interval) this.nextAt = previous
      throw error
    }
  }
}
