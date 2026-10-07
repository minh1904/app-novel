import { describe, expect, it } from 'vitest'
import type { ConnectionView } from '../../../../shared/contracts/aiConnections'
import { buildMenuRows, favoriteKey, stepModelRow } from './modelMenuModel'

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
  rows.map((row) => (row.type === 'header' ? '# ' + row.label : row.entry.name))

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
