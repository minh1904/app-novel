import { describe, expect, it } from 'vitest'
import type { ModelCapabilityView, ModelSettings } from '../../../../shared/contracts/modelSettings'
import {
  advancedFormOf,
  entryLabel,
  formatSlider,
  jsonPatch,
  parseJsonField,
  parseTaskField,
  roundSlider,
  sliderPatch,
  staleThinkingNotice,
  taskFormOf,
  taskPatch,
  thinkingChoiceOf,
  thinkingLabelOf,
  thinkingOptions,
  thinkingPatch,
  type TaskField
} from './modelSettingsForm'

const flash: ModelCapabilityView = {
  thinkingLevels: ['off', 'low', 'medium', 'high'],
  temperature: true
}
const pro: ModelCapabilityView = { thinkingLevels: ['low', 'medium', 'high'], temperature: true }
const unknown: ModelCapabilityView = { thinkingLevels: [], temperature: true }

describe('thinkingOptions', () => {
  const values = (
    capability: ModelCapabilityView,
    current?: Parameters<typeof thinkingOptions>[1]
  ): string[] => thinkingOptions(capability, current).map((option) => option.value)

  it('offers a model that can be switched off the off level, the levels, and the default last', () => {
    expect(values(flash)).toEqual(['off', 'low', 'medium', 'high', 'default'])
  })

  it('does not offer "off" to a model that cannot be switched off', () => {
    expect(values(pro)).toEqual(['low', 'medium', 'high', 'default'])
  })

  it('offers a model nobody knows only the default, so a level it rejects is never offered', () => {
    expect(values(unknown)).toEqual(['default'])
  })

  it('always ends with the default, which carries its explanation', () => {
    const last = thinkingOptions(flash).at(-1)!
    expect(last).toMatchObject({ value: 'default', label: 'Mặc định' })
    expect(last.hint).toMatch(/không gửi gì/i)
  })

  it('names the levels in Vietnamese', () => {
    expect(thinkingOptions(flash).map((option) => option.label)).toEqual([
      'Tắt',
      'Thấp',
      'Vừa',
      'Cao',
      'Mặc định'
    ])
  })

  it('keeps a saved level the model no longer supports in the list, marked, so the screen is honest', () => {
    const options = thinkingOptions(pro, 'off')
    expect(options.map((option) => option.value)).toEqual([
      'low',
      'medium',
      'high',
      'off',
      'default'
    ])
    expect(options.find((option) => option.value === 'off')!.label).toContain('không hỗ trợ')
  })

  it('does not add a saved level that the model does support', () => {
    expect(values(flash, 'low')).toEqual(['off', 'low', 'medium', 'high', 'default'])
  })
})

describe('thinking choice and patch', () => {
  it('reads an unset level as "default", and a level as itself', () => {
    expect(thinkingChoiceOf({})).toBe('default')
    expect(thinkingChoiceOf({ thinking: 'off' })).toBe('off')
  })

  it('stores a level and clears the field for "default", which is not a value', () => {
    expect(thinkingPatch('low')).toEqual({ thinking: 'low' })
    expect(thinkingPatch('off')).toEqual({ thinking: 'off' })
    expect(thinkingPatch('default')).toEqual({ thinking: null })
  })

  it('labels the absence of a level as the default', () => {
    expect(thinkingLabelOf(undefined)).toBe('Mặc định')
    expect(thinkingLabelOf('off')).toBe('Tắt')
  })

  it('shows an entry as its name and its level', () => {
    expect(entryLabel({ name: 'Flash nhanh', settings: { thinking: 'off' } })).toBe(
      'Flash nhanh · Tắt'
    )
    expect(entryLabel({ name: 'Flash', settings: {} })).toBe('Flash · Mặc định')
  })
})

describe('the Tác vụ boxes', () => {
  it('shows an unset field as an empty box and 0 as "0"', () => {
    expect(taskFormOf({})).toEqual({
      inputTokenLimit: '',
      outputTokenLimit: '',
      concurrencyLimit: '',
      rpmLimit: ''
    })
    expect(taskFormOf({ inputTokenLimit: 0, rpmLimit: 6 })).toMatchObject({
      inputTokenLimit: '0',
      rpmLimit: '6',
      outputTokenLimit: ''
    })
  })

  it('reads an empty box as "not set", which clears the field', () => {
    expect(parseTaskField('rpmLimit', '')).toEqual({ ok: true, value: null })
    expect(parseTaskField('rpmLimit', '   ')).toEqual({ ok: true, value: null })
  })

  it('reads "0" as the value 0, not as empty', () => {
    expect(parseTaskField('rpmLimit', '0')).toEqual({ ok: true, value: 0 })
    expect(taskPatch('rpmLimit', 0)).toEqual({ rpmLimit: 0 })
    expect(taskPatch('rpmLimit', null)).toEqual({ rpmLimit: null })
  })

  it('reads the digits as the number, trimming spaces', () => {
    expect(parseTaskField('inputTokenLimit', ' 1500 ')).toEqual({ ok: true, value: 1500 })
  })

  it.each(['abc', '1.5', '-3', '1,5', '1 500', '1e3', '٣'])(
    'refuses "%s" and says what is wanted',
    (text) => {
      const result = parseTaskField('inputTokenLimit', text)
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.message).toMatch(/số nguyên/)
    }
  )

  it.each<[TaskField, string, RegExp]>([
    ['concurrencyLimit', '65', /đồng thời/i],
    ['rpmLimit', '10001', /RPM/],
    ['inputTokenLimit', '2000001', /token đầu vào/i],
    ['outputTokenLimit', '2000001', /token đầu ra/i]
  ])('refuses %s = %s with the range, and does not clamp it', (field, text, message) => {
    const result = parseTaskField(field, text)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.message).toMatch(message)
  })

  it('takes the largest value each limit allows', () => {
    expect(parseTaskField('concurrencyLimit', '64')).toEqual({ ok: true, value: 64 })
    expect(parseTaskField('rpmLimit', '10000')).toEqual({ ok: true, value: 10000 })
    expect(parseTaskField('outputTokenLimit', '2000000')).toEqual({ ok: true, value: 2000000 })
  })
})

describe('the Nâng cao form', () => {
  it('starts every parameter switched off, with a value ready for the first time it is switched on', () => {
    expect(advancedFormOf({})).toEqual({
      temperature: { enabled: false, value: 1 },
      topP: { enabled: false, value: 1 },
      extraHeaders: { enabled: false, text: '' },
      extraBody: { enabled: false, text: '' }
    })
  })

  it('keeps the value of a switch that is off, so switching it back on finds it', () => {
    const form = advancedFormOf({
      temperature: { enabled: false, value: 0.3 },
      extraBody: { enabled: false, value: { top_k: 40 } }
    })
    expect(form.temperature).toEqual({ enabled: false, value: 0.3 })
    expect(form.extraBody.enabled).toBe(false)
    expect(JSON.parse(form.extraBody.text)).toEqual({ top_k: 40 })
  })

  it('shows an empty object as an empty box', () => {
    expect(advancedFormOf({ extraHeaders: { enabled: true, value: {} } }).extraHeaders).toEqual({
      enabled: true,
      text: ''
    })
  })

  it('turns a slider position into a patch that keeps the switch', () => {
    expect(sliderPatch('temperature', { enabled: true, value: 0.3 })).toEqual({
      temperature: { enabled: true, value: 0.3 }
    })
    expect(sliderPatch('topP', { enabled: false, value: 0.9 })).toEqual({
      topP: { enabled: false, value: 0.9 }
    })
  })

  it('removes the floating-point tail a slider step leaves', () => {
    expect(roundSlider(0.1 + 0.2)).toBe(0.3)
    expect(roundSlider(0.35000000000000003)).toBe(0.35)
    expect(sliderPatch('temperature', { enabled: true, value: 0.1 + 0.2 })).toEqual({
      temperature: { enabled: true, value: 0.3 }
    })
  })

  it('shows a slider value with two decimals and a decimal comma', () => {
    expect(formatSlider(0.3)).toBe('0,30')
    expect(formatSlider(2)).toBe('2,00')
  })
})

describe('the JSON boxes', () => {
  it('reads an empty box as an empty object', () => {
    expect(parseJsonField('extraBody', '')).toEqual({ ok: true, value: {} })
    expect(parseJsonField('extraHeaders', '  \n ')).toEqual({ ok: true, value: {} })
  })

  it('reads a JSON object', () => {
    expect(parseJsonField('extraBody', '{"top_k": 40, "nested": {"a": [1]}}')).toEqual({
      ok: true,
      value: { top_k: 40, nested: { a: [1] } }
    })
    expect(parseJsonField('extraHeaders', '{"HTTP-Referer": "https://mira.app"}')).toEqual({
      ok: true,
      value: { 'HTTP-Referer': 'https://mira.app' }
    })
  })

  it('says it cannot read broken JSON', () => {
    for (const text of ['{', '{"a": }', "{'a': 1}", 'khong phai json']) {
      const result = parseJsonField('extraBody', text)
      expect(result.ok, text).toBe(false)
      if (!result.ok) expect(result.message).toMatch(/Không đọc được JSON/)
    }
  })

  it('wants an object, not an array, a string, a number or null', () => {
    for (const text of ['[1]', '"x"', '5', 'null', 'true']) {
      const result = parseJsonField('extraBody', text)
      expect(result.ok, text).toBe(false)
      if (!result.ok) expect(result.message).toMatch(/đối tượng JSON/)
    }
  })

  it('refuses an extra_body that would overwrite a core field, and names it', () => {
    const result = parseJsonField('extraBody', '{"stream": false, "top_k": 5}')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.message).toContain('stream')
  })

  it('refuses a header that would carry the key, in any letter case, and names it', () => {
    for (const name of ['Authorization', 'authorization', 'X-API-KEY']) {
      const result = parseJsonField('extraHeaders', JSON.stringify({ [name]: 'Bearer x' }))
      expect(result.ok, name).toBe(false)
      if (!result.ok) expect(result.message).toContain(name)
    }
  })

  it('refuses a header whose value is not text', () => {
    expect(parseJsonField('extraHeaders', '{"X-A": 1}').ok).toBe(false)
  })

  it('builds the patch with the switch and the parsed value', () => {
    expect(jsonPatch('extraBody', true, { top_k: 5 })).toEqual({
      extraBody: { enabled: true, value: { top_k: 5 } }
    })
    expect(jsonPatch('extraHeaders', false, {})).toEqual({
      extraHeaders: { enabled: false, value: {} }
    })
  })
})

describe('a settings object stays whole through a round trip', () => {
  it('reads back what the form was built from', () => {
    const settings: ModelSettings = {
      thinking: 'low',
      inputTokenLimit: 800,
      rpmLimit: 0,
      temperature: { enabled: false, value: 0.3 },
      extraHeaders: { enabled: true, value: { 'X-Title': 'Mira' } }
    }
    expect(taskFormOf(settings)).toMatchObject({ inputTokenLimit: '800', rpmLimit: '0' })
    const form = advancedFormOf(settings)
    expect(form.temperature).toEqual({ enabled: false, value: 0.3 })
    const reparsed = parseJsonField('extraHeaders', form.extraHeaders.text)
    expect(reparsed).toEqual({ ok: true, value: { 'X-Title': 'Mira' } })
  })
})

describe('staleThinkingNotice', () => {
  it('says nothing about a level the model takes, or no level at all', () => {
    expect(staleThinkingNotice(flash, 'off')).toBeNull()
    expect(staleThinkingNotice(pro, undefined)).toBeNull()
  })

  it('warns about a saved level the model does not take and suggests the nearest', () => {
    const notice = staleThinkingNotice(pro, 'off')
    expect(notice).toContain('“Tắt” đang lưu không hợp lệ')
    expect(notice).toContain('bị chặn')
    expect(notice).toContain('“Thấp”')
  })

  it('points to the default when the model takes no level', () => {
    expect(staleThinkingNotice({ thinkingLevels: [], temperature: true }, 'low')).toContain(
      '“Mặc định”'
    )
  })
})
