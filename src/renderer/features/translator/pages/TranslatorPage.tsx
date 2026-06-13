import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from '@tanstack/react-router';
import { useNovelStore } from '@/store/novel-store';
import { useChapterStore } from '@/store/chapter-store';
import { useStreamingStore } from '@/store/streaming-store';
import { useContextStore } from '@/store/context-store';
import { ChapterSidebar, type ChapterSidebarRef } from '../components/ChapterSidebar';
import { TranslatorTopBar } from '../components/TranslatorTopBar';
import { SplitPane } from '../components/SplitPane';
import { TranslateButton } from '../components/TranslateButton';
import { ContextPanel } from '../components/ContextPanel';
import { useTranslatorKeyboard } from '../hooks/useTranslatorKeyboard';

export function TranslatorPage() {
  const { novelId } = useParams({ from: '/novel/$novelId/translate' });
  const [contextOpen, setContextOpen] = useState(true);
  const sidebarRef = useRef<ChapterSidebarRef>(null);

  const novel = useNovelStore((s) => s.novels.find((n) => n.id === novelId));
  const {
    getChapters,
    getActiveChapter,
    setActiveChapter,
    setChapterStatus,
    updateParagraph,
    appendStreamedText,
  } = useChapterStore();
  const { getChapterTerms } = useContextStore();

  const chapters = getChapters(novelId);
  const activeChapter = getActiveChapter(novelId);
  const { status: streamStatus, startStream, stopStream, resumeStream, reset: resetStream, setCallbacks } = useStreamingStore();

  // Wire streaming callbacks to chapter store
  useEffect(() => {
    setCallbacks(
      (paragraphId, token) => {
        if (!activeChapter) return;
        appendStreamedText(novelId, activeChapter.id, paragraphId, token);
      },
      (paragraphId) => {
        if (!activeChapter) return;
        const p = activeChapter.paragraphs.find((p) => p.id === paragraphId);
        if (p) updateParagraph(novelId, activeChapter.id, paragraphId, p.translatedText, false);
      },
      () => {
        // all done — streaming store handles status transition to 'done'
      },
    );
  }, [activeChapter, novelId, appendStreamedText, updateParagraph, setCallbacks]);

  // Reset streaming when chapter changes
  useEffect(() => {
    resetStream();
  }, [activeChapter?.id, resetStream]);

  function handleTranslateNext() {
    if (!activeChapter) return;
    if (streamStatus === 'paused') {
      resumeStream();
      return;
    }
    const untranslatedIdx = activeChapter.paragraphs.findIndex((p) => !p.translatedText);
    const idx = untranslatedIdx === -1 ? 0 : untranslatedIdx;
    const paragraph = activeChapter.paragraphs[idx];
    if (!paragraph) return;
    startStream(idx, novelId, activeChapter.id, paragraph.id, false);
  }

  function handleTranslateAll() {
    if (!activeChapter) return;
    const untranslatedIdx = activeChapter.paragraphs.findIndex((p) => !p.translatedText);
    const idx = untranslatedIdx === -1 ? 0 : untranslatedIdx;
    const paragraph = activeChapter.paragraphs[idx];
    if (!paragraph) return;
    startStream(idx, novelId, activeChapter.id, paragraph.id, true);
  }

  function handleDone() {
    if (!activeChapter) return;
    setChapterStatus(activeChapter.id, novelId, 'done');
    const nextChapter = chapters.find((c) => c.number === (activeChapter.number + 1));
    if (nextChapter) {
      setActiveChapter(nextChapter.id);
      setChapterStatus(nextChapter.id, novelId, 'active');
    }
    resetStream();
  }

  function handlePrevChapter() {
    if (!activeChapter) return;
    const prev = chapters.find((c) => c.number === activeChapter.number - 1);
    if (prev) setActiveChapter(prev.id);
  }

  function handleNextChapter() {
    if (!activeChapter) return;
    const next = chapters.find((c) => c.number === activeChapter.number + 1);
    if (next) setActiveChapter(next.id);
  }

  const toggleContext = useCallback(() => setContextOpen((v) => !v), []);
  const focusFilter = useCallback(() => sidebarRef.current?.focusFilter(), []);

  const handleTranslateToggle = useCallback(() => {
    if (streamStatus === 'streaming') stopStream();
    else handleTranslateNext();
  }, [streamStatus, stopStream, handleTranslateNext]);

  useTranslatorKeyboard({
    onTranslateToggle: handleTranslateToggle,
    onDone: handleDone,
    onPrevChapter: handlePrevChapter,
    onNextChapter: handleNextChapter,
    onToggleContext: toggleContext,
    onFocusFilter: focusFilter,
  });

  const resumeChapter = chapters.find((c) => c.status === 'active') ?? chapters.find((c) => c.status === 'review');
  const doneCount = chapters.filter((c) => c.status === 'done').length;
  const nextChapter = activeChapter ? chapters.find((c) => c.number === activeChapter.number + 1) : undefined;

  const rawContent = activeChapter?.paragraphs.map((p) => p.rawText).join('\n') ?? '';
  const glossaryTerms = getChapterTerms(novelId, rawContent);

  if (!novel) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
        Truyện không tồn tại
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Main area */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Chapter sidebar */}
        <ChapterSidebar
          ref={sidebarRef}
          novelId={novelId}
          chapters={chapters}
          activeChapterId={activeChapter?.id ?? null}
          resumeChapter={resumeChapter}
          novelTitle={novel.title}
          doneCount={doneCount}
          totalCount={chapters.length}
        />

        {/* Center: topbar + panes + action bar */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {activeChapter ? (
            <>
              <TranslatorTopBar
                chapter={activeChapter}
                totalChapters={chapters.length}
                contextPanelOpen={contextOpen}
                onPrevChapter={handlePrevChapter}
                onNextChapter={handleNextChapter}
                onToggleContext={toggleContext}
              />

              <SplitPane
                paragraphs={activeChapter.paragraphs}
                glossaryTerms={glossaryTerms}
                isStreaming={streamStatus === 'streaming'}
                onParagraphEdit={(paragraphId, text) => {
                  updateParagraph(novelId, activeChapter.id, paragraphId, text, true);
                }}
              />

              {/* Action bar */}
              <div className="flex shrink-0 items-center justify-between border-border border-t bg-background px-4 py-2.5">
                <TranslateButton
                  status={streamStatus}
                  nextChapterNumber={nextChapter?.number}
                  onTranslateNext={handleTranslateNext}
                  onStop={stopStream}
                  onDone={handleDone}
                  onRetry={handleTranslateNext}
                  onTranslateAll={handleTranslateAll}
                />
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center text-muted-foreground text-sm">
              Chọn chương để bắt đầu
            </div>
          )}
        </div>

        {/* Context panel + collapsed tab */}
        <ContextPanel
          open={contextOpen}
          novelId={novelId}
          chapterNumber={activeChapter?.number ?? 1}
          chapterRawContent={rawContent}
          onToggle={toggleContext}
        />
        {!contextOpen && (
          <button
            type="button"
            onClick={toggleContext}
            title="Mở ngữ cảnh (Ctrl+.)"
            className="flex shrink-0 flex-col items-center justify-center gap-1.5 border-border border-l bg-sidebar px-1.5 text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
          >
            <span className="[writing-mode:vertical-rl] rotate-180 font-medium text-[10px] uppercase tracking-wider select-none">
              Ngữ cảnh
            </span>
          </button>
        )}
      </div>

      {/* Status bar */}
      <div className="flex h-6 shrink-0 items-center gap-3 border-border border-t bg-muted/40 px-3">
        <span className="text-muted-foreground text-[10px] truncate">
          {novel.title}
        </span>
        {activeChapter && (
          <>
            <span className="text-muted-foreground/50 text-[10px]">•</span>
            <span className="text-muted-foreground text-[10px] tabular-nums">
              Chương {activeChapter.number}/{chapters.length}
            </span>
            <span className="text-muted-foreground/50 text-[10px]">•</span>
            <span className="text-muted-foreground text-[10px] tabular-nums">
              ✓ {doneCount}/{chapters.length} đã dịch
            </span>
          </>
        )}
        <span className="ml-auto text-muted-foreground/50 text-[10px]">AI: claude-opus-4-7</span>
      </div>
    </div>
  );
}
