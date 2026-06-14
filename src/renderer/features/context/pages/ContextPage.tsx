import { Icon } from '@iconify/react';
import { useState } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import { cn } from '@/lib/cn';
import { useNovelStore } from '@/store/novel-store';
import { GlossaryTab } from '../components/GlossaryTab';
import { CharactersTab } from '../components/CharactersTab';
import { AddressTab } from '../components/AddressTab';
import { WorldTab } from '../components/WorldTab';
import { StyleTab } from '../components/StyleTab';

type TabId = 'glossary' | 'characters' | 'address' | 'world' | 'style';

const TABS: { id: TabId; label: string }[] = [
  { id: 'glossary', label: 'Thuật ngữ' },
  { id: 'characters', label: 'Nhân vật' },
  { id: 'address', label: 'Xưng hô' },
  { id: 'world', label: 'Thế giới' },
  { id: 'style', label: 'Phong cách' },
];

export function ContextPage() {
  const { novelId } = useParams({ from: '/novel/$novelId/context' });
  const navigate = useNavigate();
  const novel = useNovelStore((s) => s.novels.find((n) => n.id === novelId));
  const [activeTab, setActiveTab] = useState<TabId>('glossary');

  if (!novel) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
        Truyện không tồn tại
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background">
      {/* Header */}
      <div className="flex shrink-0 items-center gap-3 border-border border-b px-4 py-2.5">
        <button
          type="button"
          onClick={() => navigate({ to: '/novel/$novelId/translate', params: { novelId } })}
          className="flex items-center gap-1.5 text-muted-foreground text-xs transition-colors hover:text-foreground"
        >
          <Icon icon="solar:alt-arrow-left-linear" width={13} />
          Dịch
        </button>
        <span className="text-border text-xs">/</span>
        <span className="font-medium text-foreground text-sm truncate">{novel.title}</span>
        <span className="ml-auto text-muted-foreground text-xs">Ngữ cảnh</span>
      </div>

      {/* Tab bar */}
      <div className="flex shrink-0 gap-0.5 border-border border-b bg-muted/30 px-3 pt-2">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'px-3 py-1.5 text-sm font-medium rounded-t-md transition-colors',
              activeTab === tab.id
                ? 'bg-background text-foreground border border-border border-b-background -mb-px'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {activeTab === 'glossary' && <GlossaryTab novelId={novelId} />}
        {activeTab === 'characters' && <CharactersTab novelId={novelId} />}
        {activeTab === 'address' && <AddressTab novelId={novelId} />}
        {activeTab === 'world' && <WorldTab novelId={novelId} />}
        {activeTab === 'style' && <StyleTab novelId={novelId} />}
      </div>
    </div>
  );
}
