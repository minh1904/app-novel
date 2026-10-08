import type { TextApi } from '../contracts/desktopApi'
import type { SourceLanguage } from '../contracts/library'
import {
  countReplacements,
  decodeRaw,
  detectEncoding,
  normalizeRaw,
  type DetectionReason,
  type EncodingId,
  type NormalizeChange
} from './rawText'
import { segment, longSegments, type SegmentRange } from '../segmentation/segmenter'
import type { Result } from '../contracts/result'
import { SEGMENTS_MAX, TEXT_MAX_UNITS, type TextRecord } from '../contracts/text'

/** Largest file taken in; bigger is almost certainly the wrong file. */
export const FILE_MAX_BYTES = 8 * 1024 * 1024

export type ImportSource =
  | { kind: 'paste'; text: string }
  | { kind: 'file'; name: string; bytes: Uint8Array }

export interface ImportPlan {
  fileName: string | null
  /** Null for pasted text, which is already text and has no encoding. */
  encoding: { id: EncodingId; reason: DetectionReason | 'chosen'; replacements: number } | null
  /** The text that will be stored: normalised, with the changes listed in `changes`. */
  text: string
  changes: NormalizeChange[]
  segments: SegmentRange[]
  /** Indices of segments flagged as unusually long. */
  longSegments: number[]
  warnings: string[]
}

export type PrepareResult = { ok: true; plan: ImportPlan } | { ok: false; message: string }

const refuse = (message: string): PrepareResult => ({ ok: false, message })

/**
 * Everything the preview shows and the save needs, from pasted text or file bytes: encoding,
 * normalisation, segments, and the reasons to refuse. Pure, so every refusal is easy to test.
 * `encoding` overrides the detected one (the user picked another in the preview).
 */
export function prepareImport(
  source: ImportSource,
  sourceLang: SourceLanguage,
  encoding?: EncodingId
): PrepareResult {
  let raw: string
  let plannedEncoding: ImportPlan['encoding'] = null
  let fileName: string | null = null

  if (source.kind === 'file') {
    fileName = source.name
    if (source.bytes.length === 0) return refuse('Tệp này không có nội dung.')
    if (source.bytes.length > FILE_MAX_BYTES) {
      return refuse(
        'Tệp lớn ' +
          (source.bytes.length / 1024 / 1024).toFixed(1) +
          ' MB, vượt giới hạn ' +
          FILE_MAX_BYTES / 1024 / 1024 +
          ' MB. Hãy chọn đúng tệp của một chương.'
      )
    }
    const detected = encoding
      ? { encoding, reason: 'chosen' as const }
      : detectEncoding(source.bytes, sourceLang)
    const decoded = decodeRaw(source.bytes, detected.encoding)
    raw = decoded.text
    plannedEncoding = {
      id: detected.encoding,
      reason: detected.reason,
      replacements: decoded.replacements
    }
  } else {
    raw = source.text
  }

  const { text, changes } = normalizeRaw(raw)
  if (text === '') return refuse('Không có chữ nào để nhập.')
  if (text.length > TEXT_MAX_UNITS) {
    return refuse(
      'Văn bản dài ' +
        text.length.toLocaleString('vi') +
        ' ký tự, vượt giới hạn ' +
        TEXT_MAX_UNITS.toLocaleString('vi') +
        ' của một chương. Hãy tách thành nhiều chương.'
    )
  }

  const segments = segment(text, sourceLang)
  if (segments.length === 0) return refuse('Không có chữ nào để nhập.')
  if (segments.length > SEGMENTS_MAX) {
    return refuse(
      'Văn bản chia ra ' +
        segments.length.toLocaleString('vi') +
        ' segment, vượt giới hạn ' +
        SEGMENTS_MAX.toLocaleString('vi') +
        ' của một chương.'
    )
  }

  const warnings: string[] = []
  const replacements = plannedEncoding?.replacements ?? countReplacements(text)
  if (replacements > 0) {
    warnings.push(
      'Có ' +
        replacements.toLocaleString('vi') +
        ' ký tự thay thế (�): có thể bảng mã chưa đúng. Thử chọn bảng mã khác.'
    )
  }
  const flagged = longSegments(segments)
  if (flagged.length > 0) {
    warnings.push(
      flagged.length +
        ' segment dài bất thường (trên 1.000 ký tự), thường do thiếu dấu kết câu. Vẫn nhập được.'
    )
  }

  return {
    ok: true,
    plan: {
      fileName,
      encoding: plannedEncoding,
      text,
      changes,
      segments,
      longSegments: flagged,
      warnings
    }
  }
}

/**
 * Stores a prepared source in a chapter: text and segments in one save, conditional on the revision
 * the user was looking at. Segments carry no ids, so a replaced source gets new segments and the
 * store flags any link that used the old ones; the translation side is never touched.
 */
export async function saveImport(
  api: Pick<TextApi, 'save'>,
  ref: { workId: string; chapterId: string },
  baseRev: number,
  plan: ImportPlan
): Promise<Result<TextRecord>> {
  return api.save(
    ref.workId,
    ref.chapterId,
    'source',
    plan.text,
    baseRev,
    plan.segments.map(({ start, end }) => ({ start, end }))
  )
}

/** What to tell the user when a save failed, by the error the store gave. */
export function describeSaveFailure(error: { code: string; message: string }): string {
  switch (error.code) {
    case 'conflict':
      return 'Bản gốc của chương đã đổi ở nơi khác kể từ lúc bạn mở hộp thoại này. Hãy đóng lại, xem bản mới rồi nhập lại nếu vẫn cần.'
    case 'validation':
      return error.message
    case 'not_found':
      return 'Không tìm thấy chương này; có thể tác phẩm đã bị xóa hoặc di chuyển.'
    case 'io':
    case 'corrupt':
      return 'Không ghi được vào tệp tác phẩm. ' + error.message
    default:
      return error.message
  }
}
