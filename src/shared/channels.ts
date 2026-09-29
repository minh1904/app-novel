/** IPC channel names. Kept free of runtime imports so the sandboxed preload can bundle it. */
export const CHANNELS = {
  worksList: 'works:list',
  worksGet: 'works:get',
  worksCreate: 'works:create',
  worksUpdate: 'works:update'
} as const

export type Channel = (typeof CHANNELS)[keyof typeof CHANNELS]
