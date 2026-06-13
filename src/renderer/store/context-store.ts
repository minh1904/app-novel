import { create } from 'zustand';
import type { AddressForm, Character, GlossaryTerm } from '@/types/translator';

interface NovelContext {
  glossary: GlossaryTerm[];
  characters: Character[];
  addressForms: AddressForm[];
}

const MOCK_CONTEXT: Record<string, NovelContext> = {
  '1': {
    glossary: [
      { id: 'g1', rawText: '萧炎', translatedText: 'Tiêu Viêm', note: 'Nhân vật chính' },
      { id: 'g2', rawText: '斗气', translatedText: 'Đấu khí', note: 'Hệ thống sức mạnh' },
      { id: 'g3', rawText: '萧家', translatedText: 'Tiêu gia', note: 'Gia tộc chính' },
      { id: 'g4', rawText: '戒指', translatedText: 'Nhẫn', note: 'Vật phẩm quan trọng' },
      { id: 'g5', rawText: '药老', translatedText: 'Dược Lão', note: 'Linh hồn trong nhẫn, sư phụ' },
      { id: 'g6', rawText: '纳兰嫣然', translatedText: 'Nạp Lan Yên Nhiên', note: 'Hôn ước cũ' },
      { id: 'g7', rawText: '丹道', translatedText: 'Đan đạo', note: 'Nghệ thuật luyện đan' },
      { id: 'g8', rawText: '天才', translatedText: 'Thiên tài', note: 'Từ miêu tả' },
      { id: 'g9', rawText: '废材', translatedText: 'Phế vật', note: 'Từ miêu tả' },
    ],
    characters: [
      { id: 'char1', name: 'Tiêu Viêm', rawName: '萧炎', selfAddress: 'ta', role: 'Nhân vật chính' },
      { id: 'char2', name: 'Dược Lão', rawName: '药老', selfAddress: 'lão phu', role: 'Sư phụ' },
      { id: 'char3', name: 'Nạp Lan Yên Nhiên', rawName: '纳兰嫣然', selfAddress: 'ta', role: 'Hôn ước cũ' },
      { id: 'char4', name: 'Tiêu Chiến', rawName: '萧战', selfAddress: 'ta', role: 'Phụ thân' },
      { id: 'char5', name: 'Tiêu Huấn Nhi', rawName: '萧训儿', selfAddress: 'nhân gia', role: 'Thanh mai trúc mã' },
      { id: 'char6', name: 'Tiểu Y Tiên', rawName: '小医仙', selfAddress: 'bổn tọa', role: 'Đạo lữ' },
      { id: 'char7', name: 'Hàn Phong', rawName: '寒枫', selfAddress: 'bản thiếu', role: 'Phản diện phụ' },
      { id: 'char8', name: 'Tiêu Vũ', rawName: '萧武', selfAddress: 'ta', role: 'Tộc nhân' },
    ],
    addressForms: [
      { id: 'af1', fromCharacterId: 'char1', toCharacterId: 'char2', address: 'Sư phụ', fromChapter: 3 },
      { id: 'af2', fromCharacterId: 'char2', toCharacterId: 'char1', address: 'Đệ tử', fromChapter: 3 },
      { id: 'af3', fromCharacterId: 'char1', toCharacterId: 'char4', address: 'Phụ thân', fromChapter: 1 },
    ],
  },
};

interface ContextState {
  contexts: Record<string, NovelContext>;
  getContext: (novelId: string) => NovelContext;
  getChapterTerms: (novelId: string, rawContent: string) => GlossaryTerm[];
  getActiveAddressForms: (novelId: string, chapterNumber: number) => AddressForm[];
}

export const useContextStore = create<ContextState>((_, get) => ({
  contexts: MOCK_CONTEXT,

  getContext: (novelId) =>
    get().contexts[novelId] ?? { glossary: [], characters: [], addressForms: [] },

  getChapterTerms: (novelId, rawContent) => {
    const ctx = get().getContext(novelId);
    return ctx.glossary.filter((term) => rawContent.includes(term.rawText));
  },

  getActiveAddressForms: (novelId, chapterNumber) => {
    const ctx = get().getContext(novelId);
    const grouped = new Map<string, AddressForm>();
    for (const form of ctx.addressForms) {
      if (form.fromChapter <= chapterNumber) {
        const key = `${form.fromCharacterId}-${form.toCharacterId}`;
        const existing = grouped.get(key);
        if (!existing || form.fromChapter > existing.fromChapter) {
          grouped.set(key, form);
        }
      }
    }
    return Array.from(grouped.values());
  },
}));
