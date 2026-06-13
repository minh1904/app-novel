import { create } from 'zustand';
import type { Chapter, ChapterStatus } from '@/types/translator';

const MOCK_CHAPTERS_NOVEL_1: Chapter[] = [
  {
    id: 'c1-001', novelId: '1', number: 1, title: 'Thiên tài hay phế vật',
    volumeTitle: 'QUYỂN 1 · PHẾ VẬT TRỖI DẬY', status: 'done',
    paragraphs: [
      { id: 'p1', rawText: '萧炎静默地坐在石头上，望着远处连绵不绝的群山，脑海中不断浮现着那个让他感到绝望的场景。', translatedText: 'Tiêu Viêm ngồi yên lặng trên phiến đá, nhìn về phía dãy núi trùng điệp ở phía xa, trong đầu không ngừng hiện lên cảnh tượng tuyệt vọng đó.', aiGenerated: false, reviewed: true },
      { id: 'p2', rawText: '曾经的天才，如今的废材。三年前，他还是萧家中最耀眼的存在，斗气八段的实力让无数同龄人望尘莫及。', translatedText: 'Từng là thiên tài, nay trở thành phế vật. Ba năm trước, hắn còn là sự tồn tại sáng chói nhất trong Tiêu gia, thực lực đấu khí bát đoạn khiến vô số người đồng trang lứa phải ngưỡng mộ.', aiGenerated: false, reviewed: true },
      { id: 'p3', rawText: '然而，在一次偶然的机会中，他遇见了那个神秘的戒指，戒指中沉睡着药老的灵魂…', translatedText: 'Thế nhưng, trong một lần tình cờ, hắn đã gặp chiếc nhẫn bí ẩn đó, trong nhẫn ngủ say linh hồn của Dược Lão…', aiGenerated: false, reviewed: true },
    ],
  },
  {
    id: 'c1-002', novelId: '1', number: 2, title: 'Hủy hôn ước',
    volumeTitle: 'QUYỂN 1 · PHẾ VẬT TRỖI DẬY', status: 'done',
    paragraphs: [
      { id: 'p1', rawText: '比武台上，纳兰嫣然一身红衣，宛如火焰般耀眼，她的目光扫过台下，最终停在了萧炎身上。', translatedText: 'Trên đài tỷ võ, Nạp Lan Yên Nhiên mặc y phục đỏ, rực rỡ như ngọn lửa, ánh mắt nàng quét qua phía dưới đài, cuối cùng dừng lại trên người Tiêu Viêm.', aiGenerated: false, reviewed: true },
      { id: 'p2', rawText: '"萧炎，我纳兰嫣然在此宣布，正式解除我们之间的婚约。"她的声音清冷，却在寂静的广场上回荡，让每一个人都听得清清楚楚。', translatedText: '"Tiêu Viêm, ta — Nạp Lan Yên Nhiên — tại đây tuyên bố chính thức hủy bỏ hôn ước giữa chúng ta." Giọng nàng lạnh lẽo, vang vọng trên quảng trường yên tĩnh, khiến ai nấy đều nghe rõ mồn một.', aiGenerated: false, reviewed: true },
      { id: 'p3', rawText: '萧炎的脸色没有丝毫变化，他缓缓点头，心中却涌起一丝苦涩。曾几何时，眼前这个女子是他最骄傲的未婚妻。', translatedText: 'Sắc mặt Tiêu Viêm không hề thay đổi, hắn từ từ gật đầu, nhưng trong lòng trào lên chút đắng cay. Có lúc nào đó, người con gái trước mắt là hôn thê mà hắn từng tự hào nhất.', aiGenerated: false, reviewed: true },
    ],
  },
  {
    id: 'c1-003', novelId: '1', number: 3, title: 'Dược Lão xuất hiện',
    volumeTitle: 'QUYỂN 1 · PHẾ VẬT TRỖI DẬY', status: 'review',
    paragraphs: [
      { id: 'p1', rawText: '深夜，萧炎独坐于房内，手中把玩着那枚黑色戒指，心中思绪万千。突然，戒指微微颤动，一道苍老的声音在他脑海中响起。', translatedText: 'Đêm khuya, Tiêu Viêm ngồi một mình trong phòng, tay mân mê chiếc nhẫn đen, lòng suy nghĩ vạn mối. Đột nhiên, chiếc nhẫn rung nhẹ, một giọng nói già nua vang lên trong đầu hắn.', aiGenerated: true, reviewed: false },
      { id: 'p2', rawText: '"小娃娃，有些年没有人打扰老夫了，你倒是第一个。"那声音带着几分慵懒，却隐隐透着一股不怒自威的气势。', translatedText: '"Tiểu quỷ, đã mấy năm rồi không có ai quấy rầy lão phu, ngươi lại là người đầu tiên." Giọng nói đó mang vẻ lười biếng, nhưng ẩn chứa thứ khí thế uy nghiêm tự nhiên.', aiGenerated: true, reviewed: false },
      { id: 'p3', rawText: '萧炎瞪大了眼睛，难以置信地望着空中那道虚幻的身影。那是一个鹤发童颜的老人，虽然只是虚影，却给人一种山岳般的压迫感。', translatedText: 'Tiêu Viêm trợn mắt, nhìn chằm chằm vào bóng hình mờ ảo trong không trung với vẻ khó tin. Đó là một lão nhân tóc bạc mặt trẻ, tuy chỉ là ảo ảnh, nhưng lại cho người ta cảm giác áp chế như núi non.', aiGenerated: true, reviewed: false },
    ],
  },
  {
    id: 'c1-004', novelId: '1', number: 4, title: 'Bái sư',
    volumeTitle: 'QUYỂN 1 · PHẾ VẬT TRỖI DẬY', status: 'active',
    paragraphs: [
      {
        id: 'p1',
        rawText: '翌日清晨，薄雾笼罩着萧家山庄，萧炎按照约定来到了后山那块巨石旁。戒指中的药老早已等候多时，虚幻的身影飘荡在晨雾之中，宛如得道的仙人。',
        translatedText: '',
        aiGenerated: false,
        reviewed: false,
      },
      {
        id: 'p2',
        rawText: '"你真的决定了？"药老的声音从戒指中传出，带着一丝凝重，"一旦拜我为师，便要严格遵守门规，修炼之路，绝非坦途，你可想清楚了？"',
        translatedText: '',
        aiGenerated: false,
        reviewed: false,
      },
      {
        id: 'p3',
        rawText: '萧炎深吸一口气，目光坚定。他想起了那张冷漠的脸，那道宣布解除婚约的声音，还有父亲眼中掩藏不住的失望。这一切，都化作他心中熊熊燃烧的斗志。',
        translatedText: '',
        aiGenerated: false,
        reviewed: false,
      },
      {
        id: 'p4',
        rawText: '"弟子想清楚了。"萧炎双膝跪地，郑重地叩首，声音低沉却充满力量，"弟子萧炎，拜见师父！"',
        translatedText: '',
        aiGenerated: false,
        reviewed: false,
      },
      {
        id: 'p5',
        rawText: '良久的沉默之后，药老叹了口气，虚幻的身影微微颤动，声音变得柔和了几分："起来吧，从今日起，你便是老夫唯一的传人。只是……你要记住，修炼一途，苦海无边，回头是岸。"',
        translatedText: '',
        aiGenerated: false,
        reviewed: false,
      },
      {
        id: 'p6',
        rawText: '萧炎抬起头，嘴角浮现出一丝微笑："弟子不会回头。"眼中闪烁着坚定的光芒，那一刻，他知道，自己命运的齿轮已经开始悄然转动。',
        translatedText: '',
        aiGenerated: false,
        reviewed: false,
      },
    ],
  },
  {
    id: 'c1-005', novelId: '1', number: 5, title: 'Đấu khí tái hiện',
    volumeTitle: 'QUYỂN 1 · PHẾ VẬT TRỖI DẬY', status: 'todo',
    paragraphs: [
      { id: 'p1', rawText: '在药老的指导下，萧炎开始了艰苦的修炼。每日天不亮便起身，在后山密林中打坐吐纳，感受着天地间微弱的斗气流动。', translatedText: '', aiGenerated: false, reviewed: false },
      { id: 'p2', rawText: '三个月后的某一天，萧炎正在修炼之时，忽然感到丹田处一阵温热，一缕细如游丝的斗气，竟然重新在体内流转起来。', translatedText: '', aiGenerated: false, reviewed: false },
      { id: 'p3', rawText: '"药老！我……我的斗气回来了！"萧炎猛地睁开双眼，难以置信地望着自己的双掌，掌心之上，淡淡的金色光芒若隐若现。', translatedText: '', aiGenerated: false, reviewed: false },
      { id: 'p4', rawText: '戒指中传来药老欣慰的笑声："不错，仅用三个月便摸到了门道，你的资质，比老夫预料的还要好上几分。"', translatedText: '', aiGenerated: false, reviewed: false },
    ],
  },
  {
    id: 'c1-006', novelId: '1', number: 6, title: 'Rời gia tộc',
    volumeTitle: 'QUYỂN 1 · PHẾ VẬT TRỖI DẬY', status: 'todo',
    paragraphs: [
      { id: 'p1', rawText: '萧炎站在萧家大门前，身后是简单的行囊，面前是宽阔的官道。父亲萧战送他到此，沉默良久，最终只是拍了拍他的肩膀。', translatedText: '', aiGenerated: false, reviewed: false },
      { id: 'p2', rawText: '"炎儿，此去江湖，凶险万分。记住，无论何时，你永远是萧家的子弟。"萧战的声音有些沙哑，他转过身，不让儿子看见自己湿润的眼眶。', translatedText: '', aiGenerated: false, reviewed: false },
      { id: 'p3', rawText: '萧炎深深地鞠了一躬，而后毅然转身，大步踏上了那条通往未知的道路。耳畔是药老懒散的声音："小娃娃，准备好了吗？真正的修炼，这才刚刚开始。"', translatedText: '', aiGenerated: false, reviewed: false },
    ],
  },
  ...(['Ma Thú sơn mạch', 'Tụ Khí Tán', 'Đan phương'] as const).map((title, i) => ({
    id: `c1-00${i + 7}`, novelId: '1', number: i + 7,
    title,
    volumeTitle: 'QUYỂN 1 · PHẾ VẬT TRỖI DẬY',
    status: 'todo' as ChapterStatus,
    paragraphs: [],
  })),
  ...Array.from({ length: 100 }, (_, i): Chapter => ({
    id: `c1-${String(i + 10).padStart(3, '0')}`, novelId: '1', number: i + 10,
    title: `Chương ${i + 10}`,
    volumeTitle: i < 50 ? 'QUYỂN 1 · PHẾ VẬT TRỖI DẬY' : 'QUYỂN 2 · CON ĐƯỜNG TRỖI DẬY',
    status: 'todo' as ChapterStatus,
    paragraphs: [],
  })),
];

interface ChapterState {
  chapters: Record<string, Chapter[]>;
  activeChapterId: string | null;
  collapsedVolumes: Set<string>;
  selectedChapterIds: string[];
  lastSelectedChapterId: string | null;
  getChapters: (novelId: string) => Chapter[];
  getActiveChapter: (novelId: string) => Chapter | undefined;
  setActiveChapter: (chapterId: string) => void;
  setChapterStatus: (chapterId: string, novelId: string, status: ChapterStatus) => void;
  updateParagraph: (novelId: string, chapterId: string, paragraphId: string, translatedText: string, reviewed: boolean) => void;
  appendStreamedText: (novelId: string, chapterId: string, paragraphId: string, token: string) => void;
  toggleVolume: (volumeTitle: string) => void;
  expandVolume: (volumeTitle: string) => void;
  selectChapter: (novelId: string, chapterId: string, mode: 'single' | 'ctrl' | 'shift') => void;
  clearSelection: () => void;
  reorderChapter: (novelId: string, activeId: string, overId: string) => void;
  moveChapterToVolume: (novelId: string, chapterId: string, targetVolume: string) => void;
  renameChapter: (novelId: string, chapterId: string, newTitle: string) => void;
  renameVolume: (novelId: string, oldTitle: string, newTitle: string) => void;
  deleteChapters: (novelId: string, ids: string[]) => void;
  duplicateChapter: (novelId: string, chapterId: string) => void;
  changeChapterStatus: (novelId: string, ids: string[], status: ChapterStatus) => void;
  addChapterAfter: (novelId: string, afterChapterId: string | null, volumeTitle: string) => void;
}

export const useChapterStore = create<ChapterState>((set, get) => ({
  chapters: { '1': MOCK_CHAPTERS_NOVEL_1 },
  activeChapterId: 'c1-004',
  collapsedVolumes: new Set<string>(),
  selectedChapterIds: [],
  lastSelectedChapterId: null,

  getChapters: (novelId) => get().chapters[novelId] ?? [],

  getActiveChapter: (novelId) => {
    const { chapters, activeChapterId } = get();
    return (chapters[novelId] ?? []).find((c) => c.id === activeChapterId);
  },

  setActiveChapter: (chapterId) => set({ activeChapterId: chapterId }),

  setChapterStatus: (chapterId, novelId, status) =>
    set((state) => ({
      chapters: {
        ...state.chapters,
        [novelId]: (state.chapters[novelId] ?? []).map((c) =>
          c.id === chapterId ? { ...c, status } : c,
        ),
      },
    })),

  updateParagraph: (novelId, chapterId, paragraphId, translatedText, reviewed) =>
    set((state) => ({
      chapters: {
        ...state.chapters,
        [novelId]: (state.chapters[novelId] ?? []).map((c) =>
          c.id === chapterId
            ? {
                ...c,
                paragraphs: c.paragraphs.map((p) =>
                  p.id === paragraphId ? { ...p, translatedText, reviewed } : p,
                ),
              }
            : c,
        ),
      },
    })),

  appendStreamedText: (novelId, chapterId, paragraphId, token) =>
    set((state) => ({
      chapters: {
        ...state.chapters,
        [novelId]: (state.chapters[novelId] ?? []).map((c) =>
          c.id === chapterId
            ? {
                ...c,
                paragraphs: c.paragraphs.map((p) =>
                  p.id === paragraphId
                    ? { ...p, translatedText: p.translatedText + token, aiGenerated: true, reviewed: false }
                    : p,
                ),
              }
            : c,
        ),
      },
    })),

  toggleVolume: (volumeTitle) =>
    set((state) => {
      const next = new Set(state.collapsedVolumes);
      if (next.has(volumeTitle)) next.delete(volumeTitle);
      else next.add(volumeTitle);
      return { collapsedVolumes: next };
    }),

  expandVolume: (volumeTitle) =>
    set((state) => {
      const next = new Set(state.collapsedVolumes);
      next.delete(volumeTitle);
      return { collapsedVolumes: next };
    }),

  selectChapter: (novelId, chapterId, mode) => {
    const { chapters, selectedChapterIds, lastSelectedChapterId } = get();
    const list = chapters[novelId] ?? [];

    if (mode === 'ctrl') {
      const isSelected = selectedChapterIds.includes(chapterId);
      set({
        selectedChapterIds: isSelected
          ? selectedChapterIds.filter((id) => id !== chapterId)
          : [...selectedChapterIds, chapterId],
        lastSelectedChapterId: chapterId,
      });
    } else if (mode === 'shift' && lastSelectedChapterId) {
      const anchorIdx = list.findIndex((c) => c.id === lastSelectedChapterId);
      const targetIdx = list.findIndex((c) => c.id === chapterId);
      const [from, to] = anchorIdx < targetIdx ? [anchorIdx, targetIdx] : [targetIdx, anchorIdx];
      const range = list.slice(from, to + 1).map((c) => c.id);
      const merged = Array.from(new Set([...selectedChapterIds, ...range]));
      set({ selectedChapterIds: merged });
    } else {
      set({ selectedChapterIds: [], lastSelectedChapterId: chapterId });
    }
  },

  clearSelection: () => set({ selectedChapterIds: [], lastSelectedChapterId: null }),

  reorderChapter: (novelId, activeId, overId) =>
    set((state) => {
      const list = state.chapters[novelId] ?? [];
      const activeIdx = list.findIndex((c) => c.id === activeId);
      const overIdx = list.findIndex((c) => c.id === overId);
      if (activeIdx === -1 || overIdx === -1) return {};
      const active = list[activeIdx];
      const over = list[overIdx];
      if (!active || !over) return {};
      const targetVolume = over.volumeTitle;
      const { volumeTitle: _v, ...baseChapter } = active;
      const movedChapter: Chapter = targetVolume !== undefined
        ? { ...baseChapter, volumeTitle: targetVolume }
        : baseChapter;
      const withoutActive = list.filter((_, i) => i !== activeIdx);
      const insertAt = withoutActive.findIndex((c) => c.id === overId);
      const newList: Chapter[] = [
        ...withoutActive.slice(0, insertAt),
        movedChapter,
        ...withoutActive.slice(insertAt),
      ];
      return { chapters: { ...state.chapters, [novelId]: newList } };
    }),

  moveChapterToVolume: (novelId, chapterId, targetVolume) =>
    set((state) => {
      const list = (state.chapters[novelId] ?? []).map((c) =>
        c.id === chapterId ? { ...c, volumeTitle: targetVolume } : c,
      );
      return { chapters: { ...state.chapters, [novelId]: list } };
    }),

  renameChapter: (novelId, chapterId, newTitle) =>
    set((state) => ({
      chapters: {
        ...state.chapters,
        [novelId]: (state.chapters[novelId] ?? []).map((c) =>
          c.id === chapterId ? { ...c, title: newTitle } : c,
        ),
      },
    })),

  renameVolume: (novelId, oldTitle, newTitle) =>
    set((state) => ({
      chapters: {
        ...state.chapters,
        [novelId]: (state.chapters[novelId] ?? []).map((c) =>
          c.volumeTitle === oldTitle ? { ...c, volumeTitle: newTitle } : c,
        ),
      },
    })),

  deleteChapters: (novelId, ids) =>
    set((state) => ({
      chapters: {
        ...state.chapters,
        [novelId]: (state.chapters[novelId] ?? []).filter((c) => !ids.includes(c.id)),
      },
      selectedChapterIds: state.selectedChapterIds.filter((id) => !ids.includes(id)),
    })),

  duplicateChapter: (novelId, chapterId) =>
    set((state) => {
      const list = [...(state.chapters[novelId] ?? [])];
      const idx = list.findIndex((c) => c.id === chapterId);
      if (idx === -1) return {};
      const original = list[idx]!;
      const newChapter: Chapter = {
        ...original,
        id: `${original.id}-copy-${Date.now()}`,
        title: `${original.title} (copy)`,
        paragraphs: original.paragraphs.map((p) => ({ ...p, id: `${p.id}-copy` })),
      };
      list.splice(idx + 1, 0, newChapter);
      return { chapters: { ...state.chapters, [novelId]: list } };
    }),

  changeChapterStatus: (novelId, ids, status) =>
    set((state) => ({
      chapters: {
        ...state.chapters,
        [novelId]: (state.chapters[novelId] ?? []).map((c) =>
          ids.includes(c.id) ? { ...c, status } : c,
        ),
      },
    })),

  addChapterAfter: (novelId, afterChapterId, volumeTitle) =>
    set((state) => {
      const list = [...(state.chapters[novelId] ?? [])];
      const maxNumber = list.reduce((m, c) => Math.max(m, c.number), 0);
      const newChapter: Chapter = {
        id: `ch-${Date.now()}`,
        novelId,
        number: maxNumber + 1,
        title: `Chương ${maxNumber + 1}`,
        volumeTitle,
        status: 'todo',
        paragraphs: [],
      };
      const insertIdx = afterChapterId
        ? list.findIndex((c) => c.id === afterChapterId) + 1
        : list.length;
      list.splice(insertIdx === 0 ? list.length : insertIdx, 0, newChapter);
      return { chapters: { ...state.chapters, [novelId]: list } };
    }),
}));
