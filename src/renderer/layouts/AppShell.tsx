import { AnimatePresence, motion } from 'motion/react';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { useRouterState } from '@tanstack/react-router';
import { ActivityBar } from './ActivityBar';
import { Sidebar } from './Sidebar';
import { TitleBar } from './TitleBar';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isTranslator = pathname.includes('/translate');

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
      <TitleBar {...(!isTranslator && { onToggleSidebar: () => setSidebarOpen((v) => !v) })} />
      <div className="flex flex-1 overflow-hidden">
        {!isTranslator && <ActivityBar />}
        {!isTranslator && (
          <AnimatePresence initial={false}>
            {sidebarOpen && (
              <motion.div
                key="sidebar"
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 'var(--sidebar-w)', opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.15, ease: 'easeInOut' }}
                style={{ overflow: 'hidden', flexShrink: 0, display: 'flex' }}
              >
                <Sidebar />
              </motion.div>
            )}
          </AnimatePresence>
        )}
        <main className="flex-1 overflow-hidden bg-background">{children}</main>
      </div>
    </div>
  );
}
