export type ChapterStatus = 'todo' | 'active' | 'review' | 'done';

export interface GlossaryTerm {
  id: string;
  rawText: string;
  translatedText: string;
  note?: string;
}

export interface Character {
  id: string;
  name: string;
  rawName: string;
  selfAddress: string;
  role?: string;
}

export interface AddressForm {
  id: string;
  fromCharacterId: string;
  toCharacterId: string;
  address: string;
  fromChapter: number;
}

export interface TranslationParagraph {
  id: string;
  rawText: string;
  translatedText: string;
  aiGenerated: boolean;
  reviewed: boolean;
}

export interface Chapter {
  id: string;
  novelId: string;
  number: number;
  title: string;
  volumeTitle?: string;
  status: ChapterStatus;
  paragraphs: TranslationParagraph[];
  translationMd: string;
}

export type StreamingStatus = 'idle' | 'streaming' | 'paused' | 'done' | 'error';

export interface StreamingState {
  status: StreamingStatus;
  currentParagraphIndex: number;
  buffer: string;
  errorMessage?: string;
}
