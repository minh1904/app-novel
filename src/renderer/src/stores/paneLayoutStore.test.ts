import { beforeEach, describe, expect, it } from 'vitest'
import { resetAllStores } from './resetStores'
import { MAX_SOURCE_RATIO, MIN_SOURCE_RATIO, usePaneLayoutStore } from './paneLayoutStore'

describe('paneLayoutStore', () => {
  beforeEach(() => {
    resetAllStores()
  })

  it('opens with both panes side by side, half each, scrolling together', () => {
    const state = usePaneLayoutStore.getState()
    expect(state.sourceCollapsed).toBe(false)
    expect(state.sourceRatio).toBe(0.5)
    expect(state.syncScroll).toBe(true)
  })

  it('folds each pane on its own, both at once included', () => {
    usePaneLayoutStore.getState().setSourceCollapsed(true)
    usePaneLayoutStore.getState().setTargetCollapsed(true)
    expect(usePaneLayoutStore.getState()).toMatchObject({
      sourceCollapsed: true,
      targetCollapsed: true
    })
  })

  it('keeps the source pane between the limits however far the line is dragged', () => {
    usePaneLayoutStore.getState().setSourceRatio(-1)
    expect(usePaneLayoutStore.getState().sourceRatio).toBe(MIN_SOURCE_RATIO)
    usePaneLayoutStore.getState().setSourceRatio(2)
    expect(usePaneLayoutStore.getState().sourceRatio).toBe(MAX_SOURCE_RATIO)
  })
})
