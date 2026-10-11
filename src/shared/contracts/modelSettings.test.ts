import * as v from 'valibot'
import { describe, expect, it } from 'vitest'
import {
  FORBIDDEN_BODY_FIELDS,
  FORBIDDEN_HEADERS,
  SETTINGS_LIMITS,
  THINKING_LEVELS,
  applySettingsPatch,
  entryModelSchema,
  entryNameSchema,
  modelSettingsPatchSchema,
  modelSettingsSchema,
  readModelSettings,
  settingsKeySchema,
  taskLimit,
  type ModelSettings
} from './modelSettings'

/** Trả về thông báo lỗi đầu tiên khi giá trị không hợp lệ, hoặc `null` nếu hợp lệ. */
function rejection(input: unknown): string | null {
  const result = v.safeParse(modelSettingsSchema, input)
  return result.success ? null : (result.issues[0]?.message ?? null)
}

describe('modelSettingsSchema', () => {
  it('accepts an entry with nothing set', () => {
    expect(rejection({})).toBeNull()
  })

  it('accepts every field at once', () => {
    expect(
      rejection({
        thinking: 'low',
        inputTokenLimit: 800,
        outputTokenLimit: 4000,
        concurrencyLimit: 2,
        rpmLimit: 30,
        temperature: { enabled: true, value: 0.3 },
        topP: { enabled: false, value: 0.9 },
        extraHeaders: { enabled: true, value: { 'HTTP-Referer': 'https://mira.app' } },
        extraBody: { enabled: true, value: { top_k: 40 } }
      })
    ).toBeNull()
  })

  it('rejects a field it does not know, so a typo is not silently ignored on write', () => {
    expect(rejection({ temprature: { enabled: true, value: 0.3 } })).not.toBeNull()
  })

  describe('limits are rejected, never clamped', () => {
    it('temperature: 0 and 2 are in, 5 and -0.1 are out, and the message names the range', () => {
      expect(rejection({ temperature: { enabled: true, value: 0 } })).toBeNull()
      expect(rejection({ temperature: { enabled: true, value: 2 } })).toBeNull()
      expect(rejection({ temperature: { enabled: true, value: 5 } })).toMatch(/0 đến 2/)
      expect(rejection({ temperature: { enabled: true, value: -0.1 } })).not.toBeNull()
    })

    it('top_p: 0 and 1 are in, 1.01 is out', () => {
      expect(rejection({ topP: { enabled: true, value: 0 } })).toBeNull()
      expect(rejection({ topP: { enabled: true, value: 1 } })).toBeNull()
      expect(rejection({ topP: { enabled: true, value: 1.01 } })).toMatch(/0 đến 1/)
    })

    it('a value that is not a number is rejected, including NaN', () => {
      expect(rejection({ temperature: { enabled: true, value: '0.3' } })).not.toBeNull()
      expect(rejection({ temperature: { enabled: true, value: Number.NaN } })).not.toBeNull()
    })

    it('token limits: 0 means automatic and is valid; the maximum is valid; one more is not', () => {
      for (const field of ['inputTokenLimit', 'outputTokenLimit']) {
        expect(rejection({ [field]: 0 })).toBeNull()
        expect(rejection({ [field]: SETTINGS_LIMITS.tokens.max })).toBeNull()
        expect(rejection({ [field]: SETTINGS_LIMITS.tokens.max + 1 })).not.toBeNull()
        expect(rejection({ [field]: -1 })).not.toBeNull()
        expect(rejection({ [field]: 1.5 })).not.toBeNull()
      }
    })

    it('concurrency: 64 is in, 65 is out', () => {
      expect(rejection({ concurrencyLimit: 64 })).toBeNull()
      expect(rejection({ concurrencyLimit: 65 })).toMatch(/đồng thời/i)
    })

    it('RPM: 10,000 is in, 10,001 is out', () => {
      expect(rejection({ rpmLimit: 10_000 })).toBeNull()
      expect(rejection({ rpmLimit: 10_001 })).toMatch(/RPM/)
    })

    it('a thinking level it does not have is rejected', () => {
      expect(rejection({ thinking: 'ludicrous' })).not.toBeNull()
      for (const level of THINKING_LEVELS) expect(rejection({ thinking: level })).toBeNull()
    })

    it('a switch has to be a real boolean', () => {
      expect(rejection({ temperature: { enabled: 'yes', value: 0.3 } })).not.toBeNull()
    })
  })

  describe('extra_body', () => {
    it('takes a vendor field', () => {
      expect(
        rejection({ extraBody: { enabled: true, value: { top_k: 40, nested: { a: [1] } } } })
      ).toBeNull()
    })

    it.each(FORBIDDEN_BODY_FIELDS)('rejects %s and names it', (field) => {
      const message = rejection({ extraBody: { enabled: true, value: { [field]: 1 } } })
      expect(message).toContain('“' + field + '”')
    })

    it('names every forbidden field it finds, not only the first', () => {
      const message = rejection({
        extraBody: { enabled: true, value: { stream: true, tools: [] } }
      })
      expect(message).toContain('“stream”')
      expect(message).toContain('“tools”')
    })

    it('rejects it even when the switch is off, so it cannot be saved and switched on later', () => {
      expect(rejection({ extraBody: { enabled: false, value: { stream: true } } })).not.toBeNull()
    })

    it('rejects more than 4 KB, counted in bytes rather than characters', () => {
      const at = SETTINGS_LIMITS.jsonBytes
      // `{"a":"…"}` chiếm 8 byte khung; điền phần còn lại bằng ASCII để đạt đúng giới hạn.
      const fits = { a: 'x'.repeat(at - 8) }
      const over = { a: 'x'.repeat(at - 7) }
      expect(rejection({ extraBody: { enabled: true, value: fits } })).toBeNull()
      expect(rejection({ extraBody: { enabled: true, value: over } })).toMatch(/4 KB/)
      // Ký tự 2 byte: 2.100 ký tự tương đương 4.200 byte.
      expect(rejection({ extraBody: { enabled: true, value: { a: 'đ'.repeat(2100) } } })).toMatch(
        /4 KB/
      )
    })

    it('rejects something that is not an object', () => {
      expect(rejection({ extraBody: { enabled: true, value: 'x' } })).not.toBeNull()
      expect(rejection({ extraBody: { enabled: true, value: null } })).not.toBeNull()
    })

    it('rejects an array, which a record schema alone would take as an object with keys "0", "1"', () => {
      expect(rejection({ extraBody: { enabled: true, value: [1] } })).toMatch(/mảng/)
      expect(rejection({ extraBody: { enabled: true, value: [] } })).toMatch(/mảng/)
    })
  })

  describe('extra headers', () => {
    it('takes a custom header', () => {
      expect(
        rejection({
          extraHeaders: { enabled: true, value: { 'X-Title': 'Mira', 'HTTP-Referer': 'a' } }
        })
      ).toBeNull()
    })

    it.each(FORBIDDEN_HEADERS)('rejects %s and names it', (header) => {
      const message = rejection({ extraHeaders: { enabled: true, value: { [header]: 'x' } } })
      expect(message).toContain('“' + header + '”')
    })

    it('rejects the authentication header in any letter case', () => {
      for (const header of ['Authorization', 'AUTHORIZATION', 'aUtHoRiZaTiOn', 'X-Goog-Api-Key']) {
        const message = rejection({
          extraHeaders: { enabled: true, value: { [header]: 'Bearer x' } }
        })
        expect(message, header).toContain('“' + header + '”')
      }
    })

    it('rejects a value that is not a string', () => {
      expect(rejection({ extraHeaders: { enabled: true, value: { 'X-A': 1 } } })).not.toBeNull()
    })

    it('rejects an array of headers', () => {
      expect(rejection({ extraHeaders: { enabled: true, value: ['X-A: 1'] } })).not.toBeNull()
    })

    it('rejects a header name fetch would throw on, and a value that carries a line break', () => {
      expect(rejection({ extraHeaders: { enabled: true, value: { 'bad name': 'x' } } })).toMatch(
        /bad name/
      )
      expect(
        rejection({ extraHeaders: { enabled: true, value: { 'X-A': 'one\r\nX-B: two' } } })
      ).toMatch(/X-A/)
    })

    it('allows a tab inside a value', () => {
      expect(rejection({ extraHeaders: { enabled: true, value: { 'X-A': 'a\tb' } } })).toBeNull()
    })

    it('rejects more than 4 KB', () => {
      const over = { 'X-A': 'x'.repeat(SETTINGS_LIMITS.jsonBytes) }
      expect(rejection({ extraHeaders: { enabled: true, value: over } })).toMatch(/4 KB/)
    })
  })
})

describe('what may not be overridden', () => {
  // Liệt kê rõ ràng để đảm bảo các trường cấm không bị vô tình gỡ bỏ.
  it('keeps the body fields Mira reads the answer by', () => {
    expect([...FORBIDDEN_BODY_FIELDS]).toEqual([
      'model',
      'messages',
      'stream',
      'stream_options',
      'tools'
    ])
  })

  it('keeps the headers that carry the key or describe the body', () => {
    expect([...FORBIDDEN_HEADERS]).toEqual([
      'authorization',
      'x-api-key',
      'x-goog-api-key',
      'api-key',
      'host',
      'accept',
      'content-type',
      'content-length'
    ])
  })
})

describe('entry name and model', () => {
  it('trims, and rejects blank and too long', () => {
    expect(v.parse(entryNameSchema, '  Flash nhanh ')).toBe('Flash nhanh')
    expect(v.safeParse(entryNameSchema, '   ').success).toBe(false)
    expect(v.safeParse(entryNameSchema, 'x'.repeat(81)).success).toBe(false)
    expect(v.parse(entryModelSchema, ' gemini-2.5-flash ')).toBe('gemini-2.5-flash')
    expect(v.safeParse(entryModelSchema, '').success).toBe(false)
  })
})

describe('taskLimit', () => {
  it('reads zero and absent as the same thing: use the default', () => {
    expect(taskLimit(undefined)).toBeUndefined()
    expect(taskLimit(0)).toBeUndefined()
    expect(taskLimit(1500)).toBe(1500)
  })
})

describe('readModelSettings', () => {
  it('reads a valid object as it is', () => {
    const stored = { thinking: 'off', temperature: { enabled: true, value: 0.3 }, rpmLimit: 6 }
    expect(readModelSettings(stored)).toEqual({ settings: stored, dropped: [] })
  })

  it('reads a JSON string the way the store holds it', () => {
    const read = readModelSettings('{"thinking":"low","outputTokenLimit":0}')
    expect(read.settings).toEqual({ thinking: 'low', outputTokenLimit: 0 })
  })

  it('ignores a field a later version added, without reporting it as damage', () => {
    const read = readModelSettings({ thinking: 'low', fromTheFuture: { a: 1 } })
    expect(read.settings).toEqual({ thinking: 'low' })
    expect(read.dropped).toEqual([])
  })

  it('gives {} for JSON that is broken, and does not throw', () => {
    expect(readModelSettings('{not json')).toEqual({
      settings: {},
      dropped: ['(toàn bộ: JSON hỏng)']
    })
  })

  it('gives {} for empty, null, undefined and things that are not objects', () => {
    expect(readModelSettings('')).toEqual({ settings: {}, dropped: [] })
    expect(readModelSettings(null)).toEqual({ settings: {}, dropped: [] })
    expect(readModelSettings(undefined)).toEqual({ settings: {}, dropped: [] })
    expect(readModelSettings('[1,2]').settings).toEqual({})
    expect(readModelSettings(7).settings).toEqual({})
  })

  it('drops only the damaged field and says which one, so the rest of the settings survive', () => {
    const read = readModelSettings({
      thinking: 'low',
      temperature: { enabled: true, value: 9 },
      rpmLimit: 12
    })
    expect(read.settings).toEqual({ thinking: 'low', rpmLimit: 12 })
    expect(read.dropped).toEqual(['temperature'])
  })

  it('never lets a forbidden extra_body field or header through, even from stored data', () => {
    const read = readModelSettings({
      extraBody: { enabled: true, value: { stream: false } },
      extraHeaders: { enabled: true, value: { Authorization: 'x' } }
    })
    expect(read.settings).toEqual({})
    expect(read.dropped).toEqual(['extraHeaders', 'extraBody'])
  })
})

describe('modelSettingsPatchSchema', () => {
  const accepts = (input: unknown): boolean => v.safeParse(modelSettingsPatchSchema, input).success

  it('takes a patch with only the fields that changed, and an empty one', () => {
    expect(accepts({})).toBe(true)
    expect(accepts({ thinking: 'off' })).toBe(true)
    expect(accepts({ temperature: { enabled: true, value: 0.3 }, rpmLimit: 6 })).toBe(true)
  })

  it('takes null for any field, which means "clear it"', () => {
    for (const field of [
      'thinking',
      'inputTokenLimit',
      'outputTokenLimit',
      'concurrencyLimit',
      'rpmLimit',
      'temperature',
      'topP',
      'extraHeaders',
      'extraBody'
    ]) {
      expect(accepts({ [field]: null }), field).toBe(true)
    }
  })

  it('holds a value to the same limits as a full settings object, so a patch cannot get past them', () => {
    expect(accepts({ temperature: { enabled: true, value: 5 } })).toBe(false)
    expect(accepts({ rpmLimit: 10_001 })).toBe(false)
    expect(accepts({ extraBody: { enabled: true, value: { stream: true } } })).toBe(false)
    expect(accepts({ extraHeaders: { enabled: true, value: { Authorization: 'x' } } })).toBe(false)
    expect(accepts({ thinking: 'ludicrous' })).toBe(false)
  })

  it('refuses a field it does not know', () => {
    expect(accepts({ temprature: null })).toBe(false)
  })
})

describe('applySettingsPatch', () => {
  const current: ModelSettings = {
    thinking: 'low',
    rpmLimit: 6,
    temperature: { enabled: true, value: 0.3 }
  }

  it('replaces what the patch names and keeps what it does not', () => {
    expect(applySettingsPatch(current, { thinking: 'off' })).toEqual({
      thinking: 'off',
      rpmLimit: 6,
      temperature: { enabled: true, value: 0.3 }
    })
  })

  it('removes a field the patch sets to null, so it falls back to the default', () => {
    const next = applySettingsPatch(current, { thinking: null })
    expect(next).toEqual({ rpmLimit: 6, temperature: { enabled: true, value: 0.3 } })
    expect(next).not.toHaveProperty('thinking')
  })

  it('adds a field that was not there', () => {
    expect(applySettingsPatch(current, { topP: { enabled: true, value: 0.9 } })).toMatchObject({
      topP: { enabled: true, value: 0.9 },
      thinking: 'low'
    })
  })

  it('leaves the settings it was given untouched', () => {
    const before = structuredClone(current)
    applySettingsPatch(current, { thinking: null, rpmLimit: 12 })
    expect(current).toEqual(before)
  })

  it('does nothing for an empty patch, and for a field that is undefined', () => {
    expect(applySettingsPatch(current, {})).toEqual(current)
    expect(applySettingsPatch(current, { thinking: undefined })).toEqual(current)
  })

  it('keeps a value that is 0, which is a value and not a removal', () => {
    expect(applySettingsPatch(current, { rpmLimit: 0 })).toMatchObject({ rpmLimit: 0 })
  })
})

describe('settingsKeySchema', () => {
  it('takes a SHA-256 digest in lower-case hex and nothing else', () => {
    expect(v.safeParse(settingsKeySchema, 'a'.repeat(64)).success).toBe(true)
    for (const text of ['', 'a'.repeat(63), 'a'.repeat(65), 'A'.repeat(64), 'g'.repeat(64)]) {
      expect(v.safeParse(settingsKeySchema, text).success).toBe(false)
    }
  })
})
