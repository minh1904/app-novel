import { requestAddressingFilter, requestGlossaryFilter } from '../../context/public'
import { useWorkspaceStore } from '../store/workspaceStore'
import { MOCK_FEATURES } from '../../../lib/mockFeatures'

/** "Xem và duyệt": the work's Context area, Glossary and Addressing on pending entries. */
export async function openGlossaryReview(workId: string): Promise<void> {
  requestGlossaryFilter(workId, 'pending')
  requestAddressingFilter(workId, 'pending')
  const store = useWorkspaceStore.getState()
  if (await store.navigate({ name: 'work', workId }))
    store.setWorkArea(workId, MOCK_FEATURES.contextArea.id)
}
