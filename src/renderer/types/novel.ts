export type NovelStatus = 'active' | 'done' | 'paused';

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
}
