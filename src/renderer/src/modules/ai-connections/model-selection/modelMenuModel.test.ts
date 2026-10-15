import { describe, expect, it } from 'vitest'
import type { ConnectionView, ModelInfoView } from '../../../../../shared/contracts/aiConnections'
import { addableModels, buildMenuRows, favoriteKey, stepModelRow } from './modelMenuModel'

const entry = (id: string, name = id): ConnectionView['models'][number] =>
  ({
    id,
    name,
    model: name,
    settings: {},
    capability: { thinkingLevels: [], temperature: true, structuredOutput: false }
  }) as ConnectionView['models'][number]

const connection = (id: string, models: string[], enabled = true): ConnectionView =>
  ({
    id,
    name: id === 'g' ? 'Gemini' : 'OpenRouter',
    baseUrl: 'http://x',
    enabled,
    authKind: 'api_key',
    oauthProvider: null,
    apiMode: 'auto',
    account: null,
    providerId: null,
    defaultEntryId: null,
    checkedAt: null,
    keys: [],
    models: models.map((name) => entry(id + '-' + name, name))
  }) as ConnectionView

const connections = [
  connection('g', ['gemini-2.5-flash', 'gemini-2.5-pro']),
  connection('o', ['deepseek/deepseek-v4', 'google/gemini-3-flash'])
]
const none = new Set<string>()

const names = (rows: ReturnType<typeof buildMenuRows>): string[] =>
  rows.map((row) =>
    row.type === 'header'
      ? '# ' + row.label
      : row.type === 'suggest'
        ? '+ ' + row.model
        : row.entry.name
  )

describe('model menu rows', () => {
  it('groups models under their connection', () => {
    expect(names(buildMenuRows(connections, '', none, none))).toEqual([
      '# Gemini',
      'gemini-2.5-flash',
      'gemini-2.5-pro',
      '# OpenRouter',
      'deepseek/deepseek-v4',
      'google/gemini-3-flash'
    ])
  })

  it('finds models across connections, ignoring case', () => {
    expect(names(buildMenuRows(connections, 'FLASH', none, none))).toEqual([
      '# Gemini',
      'gemini-2.5-flash',
      '# OpenRouter',
      'google/gemini-3-flash'
    ])
  })

  it('puts favorites in their own group first, and keeps them in their connection too', () => {
    const favorites = new Set([favoriteKey('o', 'o-deepseek/deepseek-v4')])
    const rows = buildMenuRows(connections, '', favorites, none)
    expect(names(rows).slice(0, 2)).toEqual(['# Yêu thích', 'deepseek/deepseek-v4'])
    expect(names(rows).filter((name) => name === 'deepseek/deepseek-v4')).toHaveLength(2)
  })

  it('folds a collapsed group, but a search still shows what it found there', () => {
    const collapsed = new Set(['g'])
    expect(names(buildMenuRows(connections, '', none, collapsed)).slice(0, 2)).toEqual([
      '# Gemini',
      '# OpenRouter'
    ])
    expect(names(buildMenuRows(connections, 'pro', none, collapsed))).toEqual([
      '# Gemini',
      'gemini-2.5-pro'
    ])
  })

  it('leaves out a disabled connection', () => {
    expect(names(buildMenuRows([connection('g', ['a'], false)], '', none, none))).toEqual([])
  })

  it('steps over headers with the arrow keys and stays put at the ends', () => {
    const rows = buildMenuRows(connections, '', none, none)
    expect(stepModelRow(rows, 2, 1)).toBe(4)
    expect(stepModelRow(rows, 1, -1)).toBe(1)
    expect(stepModelRow(rows, -1, 1)).toBe(1)
  })
})

const listed = (...ids: string[]): ModelInfoView[] => ids.map((id) => ({ id, name: id }))

describe('addable models', () => {
  const gemini = connection('g', ['gemini-2.5-flash'])

  it('drops what the connection already has, newest first', () => {
    expect(
      addableModels(listed('gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-3.5-flash'), gemini)
    ).toEqual(['gemini-3.5-flash', 'gemini-2.5-pro'])
  })

  it('drops models that are not for chat, and deprecated ones', () => {
    const models = [
      ...listed(
        'gemini-embedding-001',
        'text-embedding-004',
        'gemini-2.5-flash-preview-tts',
        'gemini-2.5-flash-image',
        'imagen-4.0-generate-001',
        'veo-3.0-generate-001',
        'gemini-live-2.5-flash',
        'gpt-image-1',
        'dall-e-3',
        'gemma-4-31b-it'
      ),
      { id: 'gemini-1.5-pro', name: 'x', status: 'deprecated' }
    ]
    expect(addableModels(models, gemini)).toEqual(['gemma-4-31b-it'])
  })

  it('lists a model once even when the endpoint repeats it', () => {
    expect(addableModels(listed('a-1', 'a-1'), gemini)).toEqual(['a-1'])
  })
})

describe('menu suggestions', () => {
  const many = Array.from({ length: 8 }, (_, index) => 'gemini-4.' + index + '-flash')
  const suggestions = new Map([['g', many]])

  it('shows a few under the connection, with the total in the header', () => {
    const rows = names(buildMenuRows(connections, '', none, none, suggestions))
    expect(rows.slice(0, 5)).toEqual([
      '# Gemini',
      'gemini-2.5-flash',
      'gemini-2.5-pro',
      '# Có thể thêm · 8',
      '+ gemini-4.0-flash'
    ])
    expect(rows.filter((row) => row.startsWith('+ '))).toHaveLength(5)
  })

  it('shows every match while searching, even for a connection with no entry matching', () => {
    expect(names(buildMenuRows(connections, '4.7', none, none, suggestions))).toEqual([
      '# Gemini',
      '# Có thể thêm · 1',
      '+ gemini-4.7-flash'
    ])
  })

  it('hides suggestions of a collapsed group until a search', () => {
    expect(
      names(buildMenuRows(connections, '', none, new Set(['g']), suggestions)).some((row) =>
        row.startsWith('+ ')
      )
    ).toBe(false)
  })

  it('lets the arrow keys land on a suggestion', () => {
    const rows = buildMenuRows(connections, '', none, none, suggestions)
    expect(rows[stepModelRow(rows, 2, 1)]?.type).toBe('suggest')
  })
})
