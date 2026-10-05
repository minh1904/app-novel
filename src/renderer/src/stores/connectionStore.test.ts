import { beforeEach, describe, expect, it, vi } from 'vitest'
import { resetAllStores } from './resetStores'
import { useConnectionStore } from './connectionStore'
import type { ConnectionView } from '../../../shared/contracts/aiConnections'

const mockConnection: ConnectionView = {
  id: 'conn-1',
  name: 'OpenAI',
  baseUrl: 'https://api.openai.com/v1',
  enabled: true,
  providerId: null,
  defaultEntryId: null,
  checkedAt: null,
  keys: [{ id: 'k-1', tail: '1234', state: 'ok', frozenUntil: null, frozenScope: null }],
  models: []
}

describe('connectionStore', () => {
  beforeEach(() => {
    resetAllStores()
    vi.restoreAllMocks()
    ;(globalThis as unknown as { window: unknown }).window = {
      mira: {
        ai: {
          list: vi.fn(),
          create: vi.fn(),
          update: vi.fn(),
          delete: vi.fn(),
          addKey: vi.fn(),
          removeKey: vi.fn(),
          test: vi.fn(),
          models: {
            add: vi.fn(),
            update: vi.fn(),
            duplicate: vi.fn(),
            delete: vi.fn(),
            reorder: vi.fn(),
            test: vi.fn()
          }
        }
      }
    }
  })

  it('initializes with default values', () => {
    const state = useConnectionStore.getState()
    expect(state.load).toBe('loading')
    expect(state.connections).toEqual([])
    expect(state.notice).toBeNull()
  })

  it('reloads connections successfully', async () => {
    window.mira.ai.list = vi.fn().mockResolvedValue({
      ok: true,
      value: { connections: [mockConnection] }
    })

    await useConnectionStore.getState().reload()

    const state = useConnectionStore.getState()
    expect(state.load).toBe('ready')
    expect(state.connections).toEqual([mockConnection])
  })

  it('creates connection and appends to store', async () => {
    window.mira.ai.create = vi.fn().mockResolvedValue({
      ok: true,
      value: mockConnection
    })

    await useConnectionStore.getState().create({
      name: 'OpenAI',
      baseUrl: 'https://api.openai.com/v1',
      providerId: null
    })

    expect(useConnectionStore.getState().connections).toEqual([mockConnection])
  })

  it('removes connection and updates list', async () => {
    useConnectionStore.setState({ connections: [mockConnection] })

    window.mira.ai.delete = vi.fn().mockResolvedValue({
      ok: true,
      value: { connections: [] }
    })

    await useConnectionStore.getState().remove('conn-1')

    expect(useConnectionStore.getState().connections).toEqual([])
  })
})
