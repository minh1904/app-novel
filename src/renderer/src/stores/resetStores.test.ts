import { describe, expect, it, vi } from 'vitest'
import { registerStoreReset, resetAllStores } from './resetStores'

describe('resetStores', () => {
  it('calls all registered reset callbacks on resetAllStores', () => {
    const fn1 = vi.fn()
    const fn2 = vi.fn()

    const unreg1 = registerStoreReset(fn1)
    const unreg2 = registerStoreReset(fn2)

    resetAllStores()

    expect(fn1).toHaveBeenCalledTimes(1)
    expect(fn2).toHaveBeenCalledTimes(1)

    unreg1()
    resetAllStores()

    expect(fn1).toHaveBeenCalledTimes(1)
    expect(fn2).toHaveBeenCalledTimes(2)

    unreg2()
  })
})
