import { afterEach, describe, expect, it } from 'vitest'
import { insertConnection } from '../../infra/storage/connections'
import { SecretStore } from '../../infra/storage/secretStore'
import { createTempDirs } from '../../testing/testing'
import { LibraryStore } from '../library/library'
import { ConnectionService } from './connectionService'

const tempDir = createTempDirs()
const stores: LibraryStore[] = []
afterEach(() => {
  for (const store of stores.splice(0)) store.close()
})

describe('a Codex connection uses the account ladder, not the catalog', () => {
  it('offers the ladder on each entry and refuses a level outside it when saving', () => {
    const library = LibraryStore.open({ dataDir: tempDir() })
    stores.push(library)
    let counter = 0
    const service = new ConnectionService({
      db: library.appDb,
      secrets: new SecretStore({
        isEncryptionAvailable: () => true,
        encrypt: async (plain) => new TextEncoder().encode(plain),
        decrypt: async (cipher) => ({
          value: new TextDecoder().decode(cipher),
          shouldReEncrypt: false
        })
      }),
      now: () => 1,
      newId: () => '00000000-0000-4000-8000-' + String(++counter).padStart(12, '0')
    })
    const codex = insertConnection(
      library.appDb,
      'c-codex',
      {
        name: 'ChatGPT / Codex',
        baseUrl: 'https://chatgpt.com/backend-api/codex',
        authKind: 'oauth',
        oauthProvider: 'codex'
      },
      1
    )
    const view = service.addModels(codex.id, [{ model: 'gpt-5.5' }, { model: 'gpt-5.6-sol' }])
    const [legacy, gen56] = view.models
    expect(legacy!.capability.thinkingLevels).toEqual(['off', 'low', 'medium', 'high', 'xhigh'])
    expect(gen56!.capability.thinkingLevels).toContain('max')

    expect(() => service.updateEntry(legacy!.id, { settings: { thinking: 'minimal' } })).toThrow(
      /minimal/
    )
    expect(() => service.updateEntry(legacy!.id, { settings: { thinking: 'max' } })).toThrow()
    expect(
      service.updateEntry(gen56!.id, { settings: { thinking: 'max' } }).models[1]!.settings.thinking
    ).toBe('max')
  })
})
