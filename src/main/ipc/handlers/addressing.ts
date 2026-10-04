import * as v from 'valibot'
import { CHANNELS } from '../../../shared/contracts/channels'
import {
  createCharacterSchema,
  deleteCharacterSchema,
  deleteDyadSchema,
  listCharactersSchema,
  listDyadsSchema,
  setDyadSchema,
  updateCharacterSchema
} from '../../../shared/contracts/addressing'
import { idSchema } from '../../../shared/contracts/library'
import { StorageError } from '../../infra/storage/errors'
import { createHandler } from '../handler'
import { addressingOf, type AreaHandlers, type HandlerDeps } from './deps'

export function addressingHandlers(deps: HandlerDeps): AreaHandlers<'addressing'> {
  const addressing = addressingOf(deps)
  return {
    [CHANNELS.addressingCharactersList]: createHandler(listCharactersSchema, (input) => ({
      characters: addressing.listCharacters(input.workId, {
        status: input.status,
        query: input.query
      })
    })),
    [CHANNELS.addressingCharactersGet]: createHandler(
      v.strictObject({ workId: idSchema, characterId: idSchema }),
      (input) => {
        const char = addressing.getCharacter(input.workId, input.characterId)
        if (!char) throw new StorageError('not_found', 'Không tìm thấy nhân vật.')
        return char
      }
    ),
    [CHANNELS.addressingCharactersCreate]: createHandler(createCharacterSchema, (input) =>
      addressing.createCharacter(input.workId, input)
    ),
    [CHANNELS.addressingCharactersUpdate]: createHandler(updateCharacterSchema, (input) =>
      addressing.updateCharacter(input.workId, input.characterId, input)
    ),
    [CHANNELS.addressingCharactersDelete]: createHandler(deleteCharacterSchema, (input) => {
      addressing.deleteCharacter(input.workId, input.characterId)
    }),
    [CHANNELS.addressingDyadsList]: createHandler(listDyadsSchema, (input) => ({
      dyads: addressing.listDyads(input.workId, {
        chapterId: input.chapterId,
        status: input.status
      })
    })),
    [CHANNELS.addressingDyadsGet]: createHandler(
      v.strictObject({ workId: idSchema, dyadId: idSchema }),
      (input) => {
        const dyad = addressing.getDyad(input.workId, input.dyadId)
        if (!dyad) throw new StorageError('not_found', 'Không tìm thấy quan hệ xưng hô.')
        return dyad
      }
    ),
    [CHANNELS.addressingDyadsSet]: createHandler(setDyadSchema, (input) =>
      addressing.setDyad(input.workId, input)
    ),
    [CHANNELS.addressingDyadsDelete]: createHandler(deleteDyadSchema, (input) => {
      addressing.deleteDyad(input.workId, input.dyadId)
    }),
    [CHANNELS.addressingDyadsEffective]: createHandler(
      v.strictObject({
        workId: idSchema,
        chapterId: v.pipe(v.string(), v.uuid())
      }),
      (input) => ({
        dyads: addressing.getEffectiveDyads(input.workId, input.chapterId)
      })
    ),
    [CHANNELS.addressingCheckCompliance]: createHandler(
      v.strictObject({
        workId: idSchema,
        chapterId: v.pipe(v.string(), v.uuid()),
        paragraphs: v.array(
          v.union([
            v.string(),
            v.strictObject({
              paragraphIndex: v.optional(v.number()),
              text: v.string(),
              speakerCharacterId: v.optional(v.string()),
              recipientCharacterId: v.optional(v.string())
            })
          ])
        )
      }),
      (input) =>
        addressing.evaluateCompliance(input.workId, input.chapterId, input.paragraphs)
    )
  }
}
