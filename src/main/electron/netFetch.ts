import { net } from 'electron'
import { asFetch } from '../infra/providers/fetchAdapter'

/**
 * `fetch` mà tầng AI sử dụng bên trong ứng dụng: `net.fetch` của Electron, giúp các yêu cầu tuân theo proxy
 * hệ thống và kho chứng chỉ thay vì gửi trực tiếp như `fetch` mặc định của Node.
 *
 * Tệp này import `electron` nên chỉ chạy trong main process; các bài test truyền `fetch` thông thường cho `createServices`.
 * `net.fetch` chỉ được gọi sau khi ứng dụng đã sẵn sàng (`whenReady`), điều này luôn đảm bảo vì các handler sử dụng
 * nó chỉ được đăng ký sau khi app đã sẵn sàng.
 */
export const electronFetch: typeof fetch = asFetch((url, init) => net.fetch(url, init))
