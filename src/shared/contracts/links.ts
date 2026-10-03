/**
 * Links between source and translated segments, as the renderer sees them. A link joins at least
 * one segment from each side (n:m); the status says whether anyone has to look at it again.
 */
export type LinkKind = 'ai' | 'user'
export type LinkStatus = 'ok' | 'needs_review' | 'broken'

export interface LinkRecord {
  id: string
  chapterId: string
  kind: LinkKind
  confidence: number | null
  status: LinkStatus
  /** Segment ids, both sides, in the order the link keeps them. */
  members: string[]
  createdAt: number
  /** When someone confirmed the link, or null if nobody has. */
  reviewedAt: number | null
}
