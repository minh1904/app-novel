import { useCallback, useEffect, useState } from 'react'
import type {
  AddressingDyadItem,
  CharacterGender,
  CharacterItem
} from '../../../../shared/contracts/addressing'
import type { ContextStatus } from '../../../../shared/contracts/glossary'

export interface UseAddressingOptions {
  workId: string
}

export interface UseAddressingReturn {
  characters: CharacterItem[]
  dyads: AddressingDyadItem[]
  loading: boolean
  error: string | null
  query: string
  setQuery: (q: string) => void
  statusFilter: 'all' | ContextStatus
  setStatusFilter: (s: 'all' | ContextStatus) => void
  chapterFilter: string | 'all'
  setChapterFilter: (c: string | 'all') => void
  reload: () => Promise<void>
  createCharacter: (input: {
    source: string
    target: string
    gender?: CharacterGender
    role?: string | null
    status?: ContextStatus
    notes?: string | null
    aliases?: string[]
  }) => Promise<CharacterItem>
  updateCharacter: (
    characterId: string,
    input: {
      source?: string
      target?: string
      gender?: CharacterGender
      role?: string | null
      status?: ContextStatus
      notes?: string | null
      aliases?: string[]
    }
  ) => Promise<CharacterItem>
  deleteCharacter: (characterId: string) => Promise<void>
  setDyad: (input: {
    dyadId?: string
    sourceCharacterId: string
    targetCharacterId: string
    speakerPronoun: string
    recipientPronoun: string
    formality?: string | null
    fromChapterId?: string | null
    toChapterId?: string | null
    status?: ContextStatus
    notes?: string | null
  }) => Promise<AddressingDyadItem>
  deleteDyad: (dyadId: string) => Promise<void>
}

export function useAddressing({ workId }: UseAddressingOptions): UseAddressingReturn {
  const [characters, setCharacters] = useState<CharacterItem[]>([])
  const [dyads, setDyads] = useState<AddressingDyadItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | ContextStatus>('all')
  const [chapterFilter, setChapterFilter] = useState<string | 'all'>('all')

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [charsRes, dyadsRes] = await Promise.all([
        window.mira.addressing.characters.list({
          workId,
          status: statusFilter === 'all' ? undefined : statusFilter,
          query: query.trim() || undefined
        }),
        window.mira.addressing.dyads.list({
          workId,
          chapterId: chapterFilter === 'all' ? undefined : chapterFilter,
          status: statusFilter === 'all' ? undefined : statusFilter
        })
      ])

      if (charsRes.ok && dyadsRes.ok) {
        setCharacters(charsRes.value.characters)
        setDyads(dyadsRes.value.dyads)
      } else {
        const errMsg = !charsRes.ok
          ? charsRes.error.message
          : !dyadsRes.ok
            ? dyadsRes.error.message
            : 'Lỗi tải dữ liệu'
        setError(errMsg)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi khi tải dữ liệu xưng hô')
    } finally {
      setLoading(false)
    }
  }, [workId, statusFilter, query, chapterFilter])

  useEffect(() => {
    void reload()
  }, [reload])

  const createCharacter = useCallback(
    async (input: {
      source: string
      target: string
      gender?: CharacterGender
      role?: string | null
      status?: ContextStatus
      notes?: string | null
      aliases?: string[]
    }) => {
      const res = await window.mira.addressing.characters.create({
        workId,
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

  const updateCharacter = useCallback(
    async (
      characterId: string,
      input: {
        source?: string
        target?: string
        gender?: CharacterGender
        role?: string | null
        status?: ContextStatus
        notes?: string | null
        aliases?: string[]
      }
    ) => {
      const res = await window.mira.addressing.characters.update({
        workId,
        characterId,
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

  const deleteCharacter = useCallback(
    async (characterId: string) => {
      const res = await window.mira.addressing.characters.delete({
        workId,
        characterId
      })
      if (!res.ok) {
        throw new Error(res.error.message)
      }
      await reload()
    },
    [workId, reload]
  )

  const setDyad = useCallback(
    async (input: {
      dyadId?: string
      sourceCharacterId: string
      targetCharacterId: string
      speakerPronoun: string
      recipientPronoun: string
      formality?: string | null
      fromChapterId?: string | null
      toChapterId?: string | null
      status?: ContextStatus
      notes?: string | null
    }) => {
      const res = await window.mira.addressing.dyads.set({
        workId,
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

  const deleteDyad = useCallback(
    async (dyadId: string) => {
      const res = await window.mira.addressing.dyads.delete({
        workId,
        dyadId
      })
      if (!res.ok) {
        throw new Error(res.error.message)
      }
      await reload()
    },
    [workId, reload]
  )

  return {
    characters,
    dyads,
    loading,
    error,
    query,
    setQuery,
    statusFilter,
    setStatusFilter,
    chapterFilter,
    setChapterFilter,
    reload,
    createCharacter,
    updateCharacter,
    deleteCharacter,
    setDyad,
    deleteDyad
  }
}
