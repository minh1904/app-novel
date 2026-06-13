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
  },
];

interface NovelState {
  novels: Novel[];
  search: string;
  activeNovelId: string | null;
  setSearch: (q: string) => void;
  setActiveNovelId: (id: string | null) => void;
}

export const useNovelStore = create<NovelState>((set) => ({
  novels: MOCK_NOVELS,
  search: '',
  activeNovelId: null,
  setSearch: (search) => set({ search }),
  setActiveNovelId: (id) => set({ activeNovelId: id }),
}));
