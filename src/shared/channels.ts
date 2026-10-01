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
  backupExport: 'backup:export',
  backupRestore: 'backup:restore'
} as const

export type Channel = (typeof CHANNELS)[keyof typeof CHANNELS]
