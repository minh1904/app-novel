import type { ModelInfoView } from '../../../../../shared/contracts/aiConnections'

/** "0,3 / 2,5 $/1M", or the plain fact that the price is not known. Never "0": unknown is not free. */
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
 * The models whose id or name contains what was typed, ignoring case and surrounding spaces. An empty
 * box shows everything. Order is the endpoint's, so the list does not jump while someone types.
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
