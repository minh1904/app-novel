import { create } from 'zustand';
import ln1 from '@/assets/example/ln-1.jpg';
import ln2 from '@/assets/example/ln-2.jpg';
import ln3 from '@/assets/example/ln-3.jpg';
import ln4 from '@/assets/example/ln-4.jpg';
import ln5 from '@/assets/example/ln-5.jpg';
import ln6 from '@/assets/example/ln-6.jpg';
import type { Novel } from '@/types/novel';

const MOCK_NOVELS: Novel[] = [
  {
    id: '1',
    title: 'Đấu Phá Thương Khung',
    originalTitle: '斗破苍穹',
    author: 'Thiên Tằm Thổ Đậu',
    totalChapters: 1649,
    doneChapters: 342,
    status: 'active',
    resumeChapter: '343',
    coverImage: ln1,
    updatedAt: '2026-06-10T08:30:00Z',
    description:
      'Thiếu niên Tiêu Viêm từng là thiên tài bậc nhất, nhưng sau khi hôn ước tan vỡ, tài năng bỗng biến mất bí ẩn. Ba năm sau, với sự giúp đỡ từ linh hồn cổ xưa ẩn trong chiếc nhẫn ngọc, Tiêu Viêm bắt đầu hành trình chinh phục đỉnh cao cường giả.',
    tags: ['Tiên Hiệp', 'Huyền Huyễn', 'Dị Giới', 'Chiến Đấu', 'Tu Luyện'],
    genre: 'xianxia',
    alternativeTitles: ['Battle Through the Heavens', 'BTTH'],
    sources: ['qidian.com/book/1010400019', 'novelupdates.com/series/battle-through-the-heavens'],
    translator: 'Nhóm dịch NovelFlow',

  },
  {
    id: '2',
    title: 'Võ Luyện Đỉnh Phong',
    originalTitle: '武炼巅峰',
    author: 'Mạc Mặc Thảnh Tiêu',
    totalChapters: 2087,
    doneChapters: 2087,
    status: 'done',
    coverImage: ln2,
    updatedAt: '2026-05-22T14:00:00Z',
    description:
      'Dương Khai, một nhân vật không tên tuổi trong gia tộc, tình cờ nhặt được Quyển Sách Đen kỳ bí. Từ đó, hắn bước lên con đường tu luyện gian nan, vượt qua vô số thử thách để chạm đến đỉnh cao của võ đạo.',
    tags: ['Tu Tiên', 'Mạo Hiểm', 'Dị Giới', 'Hệ Thống', 'Chiến Đấu'],
    genre: 'xianxia',
    alternativeTitles: ['Martial Peak', 'Wu Lian Dian Feng'],
    sources: ['qidian.com/book/1002703484'],
    translator: 'Nhóm dịch NovelFlow',

  },
  {
    id: '3',
    title: 'Phàm Nhân Tu Tiên',
    originalTitle: '凡人修仙传',
    author: 'Vong Ngữ',
    totalChapters: 2400,
    doneChapters: 156,
    status: 'paused',
    resumeChapter: '157',
    coverImage: ln3,
    updatedAt: '2026-04-15T11:20:00Z',
    description:
      'Hàn Lập, một đứa trẻ nghèo bình thường, bước vào con đường tu tiên với xuất thân thấp kém và tư chất bình thường. Hắn dùng sự cẩn trọng và mưu lược để từng bước leo lên bậc thang tiên đạo.',
    tags: ['Tu Tiên', 'Phàm Nhân', 'Kinh Điển', 'Lão Bài', 'Xuyên Không'],
    genre: 'xianxia',
    alternativeTitles: ["A Record of a Mortal's Journey to Immortality", 'RMJI'],
    sources: [
      'qidian.com/book/1004608736',
      'wuxiaworld.com/novel/a-record-of-a-mortals-journey-to-immortality',
    ],
    translator: 'Nhóm dịch NovelFlow',

  },
  {
    id: '4',
    title: 'Đấu La Đại Lục',
    originalTitle: '斗罗大陆',
    author: 'Đường Gia Tam Thiếu',
    totalChapters: 396,
    doneChapters: 128,
    status: 'active',
    resumeChapter: '129',
    coverImage: ln4,
    updatedAt: '2026-06-12T19:45:00Z',
    description:
      'Đường Tam, thiên tài võ thuật của Đường Môn, sau khi chết đi được tái sinh vào thế giới Đấu La — nơi không có phép thuật, không có dị năng, chỉ có võ hồn. Hắn quyết tâm xây dựng Đường Môn huy hoàng trên mảnh đất mới.',
    tags: ['Huyền Huyễn', 'Xuyên Không', 'Võ Hồn', 'Mạo Hiểm', 'Hệ Thống'],
    genre: 'xianxia',
    alternativeTitles: ['Douluo Dalu', 'Soul Land'],
    sources: ['qidian.com/book/1004173230'],
    translator: 'Nhóm dịch NovelFlow',

  },
  {
    id: '5',
    title: 'Hoàn Mỹ Thế Giới',
    originalTitle: '完美世界',
    author: 'Thần Đông',
    totalChapters: 1800,
    doneChapters: 0,
    status: 'paused',
    coverImage: ln5,
    updatedAt: '2026-03-01T09:00:00Z',
    description:
      'Thạch Hạo, con trai của thợ săn bình thường, lớn lên trong ngôi làng nhỏ. Tình cờ thức tỉnh thể chất thần thánh vô cực, hắn bước vào thế giới rộng lớn của tu tiên đầy bí ẩn.',
    tags: ['Tu Tiên', 'Thần Thánh', 'Sử Thi', 'Huyền Huyễn', 'Thần Thoại'],
    genre: 'xianxia',
    alternativeTitles: ['Perfect World', 'Wan Mei Shi Jie'],
    sources: ['qidian.com/book/1010394605'],
    translator: 'Chưa phân công',

  },
  {
    id: '6',
    title: 'Ngã Là Đại Thần Tiên',
    originalTitle: '我是大神仙',
    author: 'Phi Thiên Ngư',
    totalChapters: 1200,
    doneChapters: 890,
    status: 'active',
    resumeChapter: '891',
    coverImage: ln6,
    updatedAt: '2026-06-13T07:15:00Z',
    description:
      'Lâm Tiêu, một thanh niên bình thường thế giới hiện đại, đột nhiên xuyên không đến thế giới tiên hiệp. Với kiến thức hiện đại, hắn tạo ra con đường độc đáo của riêng mình hướng đến cảnh giới Đại Thần Tiên.',
    tags: ['Tiên Hiệp', 'Xuyên Không', 'Hiện Đại', 'Hài Hước', 'Tu Luyện'],
    genre: 'xianxia',
    alternativeTitles: ['I Am a Great Immortal'],
    sources: ['qidian.com/book/1027530685', 'webnovel.com/book/i-am-a-great-immortal'],
    translator: 'Nhóm dịch NovelFlow',

  },
];

interface NovelState {
  novels: Novel[];
  search: string;
  activeNovelId: string | null;
  setSearch: (q: string) => void;
  setActiveNovelId: (id: string | null) => void;
  createNovel: (data: Omit<Novel, 'id' | 'updatedAt' | 'doneChapters' | 'status'>) => void;
  updateNovel: (id: string, data: Partial<Novel>) => void;
}

export const useNovelStore = create<NovelState>((set) => ({
  novels: MOCK_NOVELS,
  search: '',
  activeNovelId: null,
  setSearch: (search) => set({ search }),
  setActiveNovelId: (id) => set({ activeNovelId: id }),
  createNovel: (data) =>
    set((state) => ({
      novels: [
        ...state.novels,
        {
          ...data,
          id: crypto.randomUUID(),
          doneChapters: 0,
          status: 'active' as const,
          updatedAt: new Date().toISOString(),
        },
      ],
    })),
  updateNovel: (id, data) =>
    set((state) => ({
      novels: state.novels.map((n) =>
        n.id === id ? { ...n, ...data, updatedAt: new Date().toISOString() } : n,
      ),
    })),
}));
