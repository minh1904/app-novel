/** IPC channel names. Kept free of runtime imports so the sandboxed preload can bundle it. */
export const CHANNELS = {
  worksList: 'works:list',
  worksGet: 'works:get',
  worksCreate: 'works:create',
  worksUpdate: 'works:update',
  worksCoverGet: 'works:cover:get',
  worksCoverSet: 'works:cover:set',
  chaptersList: 'chapters:list',
  chaptersCreate: 'chapters:create',
  chaptersRename: 'chapters:rename',
  chaptersMove: 'chapters:move',
  chaptersDelete: 'chapters:delete',
  chaptersOpen: 'chapters:open',
  textGet: 'text:get',
  textSave: 'text:save',
  linksList: 'links:list',
  rowSave: 'rows:save',
  rowReview: 'rows:review',
  rowsAutoPair: 'rows:autopair',
  backupExport: 'backup:export',
  backupRestore: 'backup:restore',
  imagesPut: 'images:put',
  imagesGet: 'images:get',
  imagesDelete: 'images:delete',
  aiConnectionsList: 'ai:connections:list',
  aiConnectionsCreate: 'ai:connections:create',
  aiConnectionsUpdate: 'ai:connections:update',
  aiConnectionsDelete: 'ai:connections:delete',
  aiConnectionsTest: 'ai:connections:test',
  aiKeysAdd: 'ai:connections:keys:add',
  aiKeysRemove: 'ai:connections:keys:remove',
  aiModelsAdd: 'ai:models:add',
  aiModelsUpdate: 'ai:models:update',
  aiModelsDuplicate: 'ai:models:duplicate',
  aiModelsDelete: 'ai:models:delete',
  aiModelsReorder: 'ai:models:reorder',
  aiModelsTest: 'ai:models:test',
  aiTranslatePlan: 'ai:translate:plan',
  aiTranslateBatch: 'ai:translate:batch',
  aiChatSend: 'ai:chat:send',
  aiChatCancel: 'ai:chat:cancel',
  glossaryList: 'glossary:list',
  glossaryGet: 'glossary:get',
  glossaryCreate: 'glossary:create',
  glossaryUpdate: 'glossary:update',
  glossaryDelete: 'glossary:delete',
  glossaryImportNames: 'glossary:importNames',
  glossaryCheckCompliance: 'glossary:checkCompliance'
} as const

export type Channel = (typeof CHANNELS)[keyof typeof CHANNELS]

/**
 * Kênh đi **main → renderer**, tách khỏi `CHANNELS` có chủ ý.
 *
 * `CHANNELS` là tập kênh `invoke`: main lặp qua từng giá trị của nó để gọi `ipcMain.handle`, và map
 * handler khai kiểu `Record<Channel, …>` nên quên một kênh là lỗi biên dịch. Một kênh sự kiện
 * **không có** handler `invoke`, nên để nó trong `CHANNELS` sẽ vừa đăng ký một handler vô nghĩa vừa
 * phá đúng cái bảo đảm đang có giá trị. Hai nhóm, hai kiểu, cả hai vẫn đầy đủ.
 */
export const EVENT_CHANNELS = {
  /** Từng phần câu trả lời của một lượt chat. Preload đóng cứng tên này (D9 của `ai-chat`). */
  aiChatChunk: 'ai:chat:chunk'
} as const

export type EventChannel = (typeof EVENT_CHANNELS)[keyof typeof EVENT_CHANNELS]
