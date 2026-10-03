import { createContext } from 'react'

/**
 * The element in the top bar where a screen puts the controls that belong to it (ask AI, save, the
 * chapter menu). `null` until the shell has mounted it, and for anything rendered outside the shell.
 */
export const TopBarSlotContext = createContext<HTMLElement | null>(null)
