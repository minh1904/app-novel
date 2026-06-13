export type NovelStatus = 'active' | 'done' | 'paused';
export type NovelGenre = 'xianxia' | 'manhwa-action' | 'isekai' | 'romance' | 'historical';

export interface Novel {
  id: string;
  title: string;
  originalTitle: string;
  author: string;
  totalChapters: number;
  doneChapters: number;
  status: NovelStatus;
  resumeChapter?: string;
  coverImage?: string;
  updatedAt?: string;
  description?: string;
  tags?: string[];
  genre?: NovelGenre;
  alternativeTitles?: string[];
  sources?: string[];
  translator?: string;

}
