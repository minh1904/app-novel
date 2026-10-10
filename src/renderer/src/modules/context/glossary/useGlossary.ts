import { useCallback, useEffect, useState } from 'react'
import type {
  ContextEntryItem,
  ContextKind,
  ContextStatus,
  ImportNamesResult
} from '../../../../../shared/contracts/glossary'

export interface UseGlossaryOptions {
  workId: string
  kind?: ContextKind
}

export interface UseGlossaryReturn {
  entries: ContextEntryItem[]
  loading: boolean
  error: string | null
  query: string
  setQuery: (q: string) => void
  statusFilter: 'all' | ContextStatus
  setStatusFilter: (s: 'all' | ContextStatus) => void
  reload: () => Promise<void>
  createEntry: (input: {
    source: string
    target: string
    status?: ContextStatus
    forbidden?: boolean
    fromChapterId?: string | null
    toChapterId?: string | null
    notes?: string | null
    aliases?: string[]
  }) => Promise<ContextEntryItem>
  updateEntry: (
    entryId: string,
    input: {
      source?: string
      target?: string
      status?: ContextStatus
      forbidden?: boolean
      fromChapterId?: string | null
      toChapterId?: string | null
      notes?: string | null
      aliases?: string[]
    }
  ) => Promise<ContextEntryItem>
  deleteEntry: (entryId: string) => Promise<void>
  importNames: (content: string) => Promise<ImportNamesResult>
}

export function useGlossary({ workId, kind = 'term' }: UseGlossaryOptions): UseGlossaryReturn {
  const [entries, setEntries] = useState<ContextEntryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | ContextStatus>('all')

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await window.mira.glossary.list({
        workId,
        kind,
        status: statusFilter === 'all' ? undefined : statusFilter,
        query: query.trim() || undefined
      })
      if (res.ok) {
        setEntries(res.value.entries)
      } else {
        setError(res.error.message)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi khi tải danh sách thuật ngữ')
    } finally {
      setLoading(false)
    }
  }, [workId, kind, statusFilter, query])

  useEffect(() => {
    void reload()
  }, [reload])

  const createEntry = useCallback(
    async (input: {
      source: string
      target: string
      status?: ContextStatus
      forbidden?: boolean
      fromChapterId?: string | null
      toChapterId?: string | null
      notes?: string | null
      aliases?: string[]
    }) => {
      const res = await window.mira.glossary.create({
        workId,
        kind,
        ...input
      })
      if (!res.ok) {
        throw new Error(res.error.message)
      }
      await reload()
      return res.value
    },
    [workId, kind, reload]
  )

  const updateEntry = useCallback(
    async (
      entryId: string,
      input: {
        source?: string
        target?: string
        status?: ContextStatus
        forbidden?: boolean
        fromChapterId?: string | null
        toChapterId?: string | null
        notes?: string | null
        aliases?: string[]
      }
    ) => {
      const res = await window.mira.glossary.update({
        workId,
        entryId,
        ...input
      })
      if (!res.ok) {
        throw new Error(res.error.message)
      }
      await reload()
      return res.value
    },
    [workId, reload]
  )

  const deleteEntry = useCallback(
    async (entryId: string) => {
      const res = await window.mira.glossary.delete({
        workId,
        entryId
      })
      if (!res.ok) {
        throw new Error(res.error.message)
      }
      await reload()
    },
    [workId, reload]
  )

  const importNames = useCallback(
    async (content: string): Promise<ImportNamesResult> => {
      const res = await window.mira.glossary.importNames({
        workId,
        content
      })
      if (!res.ok) {
        throw new Error(res.error.message)
      }
      await reload()
      return res.value
    },
    [workId, reload]
  )

  return {
    entries,
    loading,
    error,
    query,
    setQuery,
    statusFilter,
    setStatusFilter,
    reload,
    createEntry,
    updateEntry,
    deleteEntry,
    importNames
  }
}
