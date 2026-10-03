import {
  addConnectionKeySchema,
  addModelEntriesSchema,
  connectionRefSchema,
  createConnectionSchema,
  modelEntryRefSchema,
  removeConnectionKeySchema,
  reorderModelEntriesSchema,
  updateConnectionSchema,
  updateModelEntrySchema
} from '../../../shared/contracts/aiConnections'
import { translateBatchSchema, translatePlanSchema } from '../../../shared/contracts/aiTranslate'
import { CHANNELS } from '../../../shared/contracts/channels'
import { createAsyncHandler, createHandler } from '../handler'
import { connectionsOf, translatorOf, type AreaHandlers, type HandlerDeps } from './deps'

/** Kết nối AI (khóa), mục model của chúng, và dịch chương bằng AI. */
export function aiHandlers(
  deps: HandlerDeps
): AreaHandlers<'ai:connections' | 'ai:models' | 'ai:translate'> {
  return {
    [CHANNELS.aiConnectionsList]: createHandler(null, () => connectionsOf(deps).list()),
    [CHANNELS.aiConnectionsCreate]: createHandler(createConnectionSchema, (input) =>
      connectionsOf(deps).create(input)
    ),
    [CHANNELS.aiConnectionsUpdate]: createHandler(updateConnectionSchema, (input) =>
      connectionsOf(deps).update(input)
    ),
    [CHANNELS.aiConnectionsDelete]: createHandler(connectionRefSchema, ({ id }) =>
      connectionsOf(deps).delete(id)
    ),
    [CHANNELS.aiConnectionsTest]: createAsyncHandler(connectionRefSchema, ({ id }) =>
      connectionsOf(deps).test(id)
    ),
    [CHANNELS.aiKeysAdd]: createAsyncHandler(addConnectionKeySchema, ({ id, secret }) =>
      connectionsOf(deps).addApiKey(id, secret)
    ),
    [CHANNELS.aiKeysRemove]: createHandler(removeConnectionKeySchema, ({ id, keyId }) =>
      connectionsOf(deps).removeApiKey(id, keyId)
    ),
    [CHANNELS.aiModelsAdd]: createHandler(addModelEntriesSchema, ({ connectionId, items }) =>
      connectionsOf(deps).addModels(connectionId, items)
    ),
    [CHANNELS.aiModelsUpdate]: createHandler(updateModelEntrySchema, ({ entryId, patch }) =>
      connectionsOf(deps).updateEntry(entryId, patch)
    ),
    [CHANNELS.aiModelsDuplicate]: createHandler(modelEntryRefSchema, ({ entryId }) =>
      connectionsOf(deps).duplicateEntry(entryId)
    ),
    [CHANNELS.aiModelsDelete]: createHandler(modelEntryRefSchema, ({ entryId }) =>
      connectionsOf(deps).deleteEntry(entryId)
    ),
    [CHANNELS.aiModelsReorder]: createHandler(reorderModelEntriesSchema, ({ connectionId, ids }) =>
      connectionsOf(deps).reorderEntries(connectionId, ids)
    ),
    [CHANNELS.aiModelsTest]: createAsyncHandler(modelEntryRefSchema, ({ entryId }) =>
      connectionsOf(deps).testEntry(entryId)
    ),
    [CHANNELS.aiTranslatePlan]: createHandler(translatePlanSchema, (input) =>
      translatorOf(deps).plan(input)
    ),
    [CHANNELS.aiTranslateBatch]: createAsyncHandler(translateBatchSchema, (input) =>
      translatorOf(deps).runBatch(input)
    )
  }
}
