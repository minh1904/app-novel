import { useEffect } from 'react'
import { describe } from './describeError'
import {
  useLibraryStore,
  type LibraryLoad,
  type LibraryState as LibraryStoreState
} from '../../stores/libraryStore'

export type { LibraryLoad }
export type LibraryState = LibraryStoreState
export type LibraryController = LibraryStoreState

export function useLibrary(): LibraryController {
  const store = useLibraryStore()

  useEffect(() => {
    if (store.load === 'loading') {
      void store.reload()
    }
  }, [store.load, store.reload])

  return store
}

export { describe }
