import type {
  AddressingComplianceReport,
  ParagraphAddressingCheckItem
} from '../../../shared/context/addressingCompliance'
import { evaluateAddressingCompliance } from '../../../shared/context/addressingCompliance'
import type {
  AddressingDyadItem,
  AddressingDyadResolved,
  CharacterItem
} from '../../../shared/contracts/addressing'
import type { ContextStatus } from '../../../shared/contracts/glossary'
import {
  createCharacter,
  deleteCharacter,
  deleteDyad,
  getCharacter,
  getDyad,
  getEffectiveDyadsForChapter,
  listCharacters,
  listDyads,
  setDyad,
  updateCharacter,
  type CreateCharacterParams,
  type SetDyadParams,
  type UpdateCharacterParams
} from '../../infra/storage/addressingEntries'
import type { LibraryStore } from '../library/library'

export class AddressingService {
  constructor(
    private readonly library: LibraryStore,
    private readonly now: () => number = Date.now
  ) {}

  listCharacters(
    workId: string,
    options: { status?: ContextStatus; query?: string } = {}
  ): CharacterItem[] {
    return this.library.withWork(workId, (db) => listCharacters(db, options))
  }

  getCharacter(workId: string, characterId: string): CharacterItem | null {
    return this.library.withWork(workId, (db) => getCharacter(db, characterId))
  }

  createCharacter(workId: string, params: CreateCharacterParams): CharacterItem {
    return this.library.withWork(workId, (db) => createCharacter(db, params, this.now()))
  }

  updateCharacter(
    workId: string,
    characterId: string,
    params: UpdateCharacterParams
  ): CharacterItem {
    return this.library.withWork(workId, (db) =>
      updateCharacter(db, characterId, params, this.now())
    )
  }

  deleteCharacter(workId: string, characterId: string): void {
    this.library.withWork(workId, (db) => deleteCharacter(db, characterId, this.now()))
  }

  listDyads(
    workId: string,
    options: { chapterId?: string; status?: ContextStatus } = {}
  ): AddressingDyadItem[] {
    return this.library.withWork(workId, (db) => listDyads(db, options))
  }

  getDyad(workId: string, dyadId: string): AddressingDyadItem | null {
    return this.library.withWork(workId, (db) => getDyad(db, dyadId))
  }

  setDyad(workId: string, params: SetDyadParams): AddressingDyadItem {
    return this.library.withWork(workId, (db) => setDyad(db, params, this.now()))
  }

  deleteDyad(workId: string, dyadId: string): void {
    this.library.withWork(workId, (db) => deleteDyad(db, dyadId, this.now()))
  }

  getEffectiveDyads(workId: string, chapterId: string): AddressingDyadResolved[] {
    return this.library.withWork(workId, (db) => getEffectiveDyadsForChapter(db, chapterId))
  }

  evaluateCompliance(
    workId: string,
    chapterId: string,
    paragraphs: (string | ParagraphAddressingCheckItem)[]
  ): AddressingComplianceReport {
    const dyads = this.getEffectiveDyads(workId, chapterId)
    return evaluateAddressingCompliance(paragraphs, dyads)
  }
}
