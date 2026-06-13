import { AnimatePresence, motion } from 'motion/react';
import type { ReactNode } from 'react';
import { useState } from 'react';
import type { ActivitySection } from './ActivityBar';
import { ActivityBar } from './ActivityBar';
import { Sidebar } from './Sidebar';
import { TitleBar } from './TitleBar';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeSection, setActiveSection] = useState<ActivitySection>('library');

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
      <TitleBar onToggleSidebar={() => setSidebarOpen((v) => !v)} />
      <div className="flex flex-1 overflow-hidden">
        <ActivityBar active={activeSection} onChange={setActiveSection} />
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
              <Sidebar activeSection={activeSection} />
            </motion.div>
          )}
        </AnimatePresence>
        <main className="flex-1 overflow-auto bg-background">{children}</main>
      </div>
    </div>
  );
}
