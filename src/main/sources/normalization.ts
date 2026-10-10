import { createHash } from 'node:crypto'
import path from 'node:path'

export interface ContentIdentity {
  text: string
  contentHash: string
  payloadHash: string
  normalizationVersion: 1
}

function sha256(value: string | Uint8Array): string {
  return createHash('sha256').update(value).digest('hex')
}

export function normalizeSourceText(text: string): string {
  return text.replace(/\r\n?/g, '\n').normalize('NFC')
}

export function contentIdentity(payload: Uint8Array): ContentIdentity {
  const text = normalizeSourceText(new TextDecoder('utf-8', { fatal: true }).decode(payload))
  return {
    text,
    contentHash: sha256(text),
    payloadHash: sha256(payload),
    normalizationVersion: 1
  }
}

export function relativePathIdentity(relativePath: string): string {
  if (path.posix.isAbsolute(relativePath) || path.win32.isAbsolute(relativePath)) {
    throw new Error('source identity must use a relative path')
  }
  const normalized = path.posix
    .normalize(relativePath.replaceAll('\\', '/'))
    .replace(/^\.\//, '')
    .normalize('NFC')
  if (normalized === '..' || normalized.startsWith('../')) {
    throw new Error('source path is outside the selected root')
  }
  if (normalized === '.' || normalized.length === 0) throw new Error('source path is empty')
  return normalized
}

export function stablePathHash(value: string): string {
  return sha256(value.normalize('NFC'))
}
