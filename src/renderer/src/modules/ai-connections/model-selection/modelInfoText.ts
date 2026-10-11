import type { ModelInfoView } from '../../../../../shared/contracts/aiConnections'

/** Định dạng giá "0,3 / 2,5 $/1M", hoặc thông báo chưa biết giá (không để là 0). */
export function priceOf(model: Pick<ModelInfoView, 'inputCost' | 'outputCost'>): string {
  if (model.inputCost === undefined || model.outputCost === undefined) return 'chưa biết giá'
  return model.inputCost + ' / ' + model.outputCost + ' $/1M'
}

export function contextOf(model: Pick<ModelInfoView, 'contextLimit'>): string | null {
  return model.contextLimit === undefined
    ? null
    : model.contextLimit.toLocaleString('vi-VN') + ' token'
}

/**
 * Lọc danh sách model theo id hoặc tên chứa từ khóa tìm kiếm (không phân biệt chữ hoa thường).
 * Khi chuỗi tìm kiếm rỗng, trả về toàn bộ danh sách theo thứ tự ban đầu.
 */
export function filterModels<T extends Pick<ModelInfoView, 'id' | 'name'>>(
  models: readonly T[],
  query: string
): T[] {
  const needle = query.trim().toLowerCase()
  if (needle === '') return [...models]
  return models.filter(
    (model) => model.id.toLowerCase().includes(needle) || model.name.toLowerCase().includes(needle)
  )
}
