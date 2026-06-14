import { create } from 'zustand';
import { nanoid } from 'nanoid';
import type { AddressForm, AddressFormFull, Character, GlossaryTerm } from '@/types/translator';

interface NovelContext {
  glossary: GlossaryTerm[];
  characters: Character[];
  addressForms: AddressForm[];
  addressFormsFull: AddressFormFull[];
  world: string;
  style: string;
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
    addressFormsFull: [
      {
        id: 'aff1',
        a: 'char1',
        b: 'char2',
        kind: 'sư môn',
        phases: [
          {
            from: 3,
            rel: 'Đệ tử – Sư phụ',
            aToB: { call: 'Sư phụ', self: 'đệ tử' },
            bToA: { call: 'Tiêu Viêm', self: 'lão phu' },
          },
        ],
      },
      {
        id: 'aff2',
        a: 'char1',
        b: 'char3',
        kind: 'tình cảm',
        phases: [
          {
            from: 1,
            rel: 'Hôn ước',
            aToB: { call: 'Nạp Lan', self: 'ta' },
            bToA: { call: 'Tiêu Viêm', self: 'ta' },
          },
          {
            from: 8,
            rel: 'Cựu hôn ước (đã hủy)',
            note: 'Nạp Lan hủy hôn từ ch.8',
            aToB: { call: 'Nạp Lan tiểu thư', self: 'ta' },
            bToA: { call: 'Tiêu Viêm', self: 'ta' },
          },
        ],
      },
    ],
    world: 'Đấu Khí đại lục — hệ thống cấp bậc: Đấu Giả → Đấu Sư → Đại Đấu Sư → Đấu Linh → Đấu Vương → Đấu Hoàng → Đấu Tông → Đấu Tôn → Đấu Thánh → Đấu Đế',
    style: 'Xưng hô: hắn/nàng (không dùng anh/em). Văn phong: cổ điển, trang trọng. Giữ tên Hán Việt nguyên bản.',
  },
};

interface ContextState {
  contexts: Record<string, NovelContext>;

  // Read
  getContext: (novelId: string) => NovelContext;
  getChapterTerms: (novelId: string, rawContent: string) => GlossaryTerm[];
  getActiveAddressForms: (novelId: string, chapterNumber: number) => AddressForm[];

  // Glossary CRUD
  addTerm: (novelId: string, term: Omit<GlossaryTerm, 'id'>) => void;
  updateTerm: (novelId: string, id: string, patch: Partial<Omit<GlossaryTerm, 'id'>>) => void;
  deleteTerm: (novelId: string, id: string) => void;

  // Character CRUD
  addCharacter: (novelId: string, char: Omit<Character, 'id'>) => void;
  updateCharacter: (novelId: string, id: string, patch: Partial<Omit<Character, 'id'>>) => void;
  deleteCharacter: (novelId: string, id: string) => void;

  // AddressFormFull CRUD
  addForm: (novelId: string, form: Omit<AddressFormFull, 'id'>) => void;
  updateForm: (novelId: string, id: string, patch: Partial<Omit<AddressFormFull, 'id'>>) => void;
  deleteForm: (novelId: string, id: string) => void;

  // World & Style
  updateWorld: (novelId: string, world: string) => void;
  updateStyle: (novelId: string, style: string) => void;
}

function ensureContext(contexts: Record<string, NovelContext>, novelId: string): NovelContext {
  if (!contexts[novelId]) {
    contexts[novelId] = { glossary: [], characters: [], addressForms: [], addressFormsFull: [], world: '', style: '' };
  }
  return contexts[novelId];
}

export const useContextStore = create<ContextState>((set, get) => ({
  contexts: MOCK_CONTEXT,

  getContext: (novelId) =>
    get().contexts[novelId] ?? { glossary: [], characters: [], addressForms: [], addressFormsFull: [], world: '', style: '' },

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

  addTerm: (novelId, term) =>
    set((s) => {
      const contexts = { ...s.contexts };
      const ctx = { ...ensureContext(contexts, novelId) };
      ctx.glossary = [...ctx.glossary, { id: nanoid(), ...term }];
      contexts[novelId] = ctx;
      return { contexts };
    }),

  updateTerm: (novelId, id, patch) =>
    set((s) => {
      const contexts = { ...s.contexts };
      const ctx = { ...ensureContext(contexts, novelId) };
      ctx.glossary = ctx.glossary.map((t) => (t.id === id ? { ...t, ...patch } : t));
      contexts[novelId] = ctx;
      return { contexts };
    }),

  deleteTerm: (novelId, id) =>
    set((s) => {
      const contexts = { ...s.contexts };
      const ctx = { ...ensureContext(contexts, novelId) };
      ctx.glossary = ctx.glossary.filter((t) => t.id !== id);
      contexts[novelId] = ctx;
      return { contexts };
    }),

  addCharacter: (novelId, char) =>
    set((s) => {
      const contexts = { ...s.contexts };
      const ctx = { ...ensureContext(contexts, novelId) };
      ctx.characters = [...ctx.characters, { id: nanoid(), ...char }];
      contexts[novelId] = ctx;
      return { contexts };
    }),

  updateCharacter: (novelId, id, patch) =>
    set((s) => {
      const contexts = { ...s.contexts };
      const ctx = { ...ensureContext(contexts, novelId) };
      ctx.characters = ctx.characters.map((c) => (c.id === id ? { ...c, ...patch } : c));
      contexts[novelId] = ctx;
      return { contexts };
    }),

  deleteCharacter: (novelId, id) =>
    set((s) => {
      const contexts = { ...s.contexts };
      const ctx = { ...ensureContext(contexts, novelId) };
      ctx.characters = ctx.characters.filter((c) => c.id !== id);
      contexts[novelId] = ctx;
      return { contexts };
    }),

  addForm: (novelId, form) =>
    set((s) => {
      const contexts = { ...s.contexts };
      const ctx = { ...ensureContext(contexts, novelId) };
      ctx.addressFormsFull = [...ctx.addressFormsFull, { id: nanoid(), ...form }];
      contexts[novelId] = ctx;
      return { contexts };
    }),

  updateForm: (novelId, id, patch) =>
    set((s) => {
      const contexts = { ...s.contexts };
      const ctx = { ...ensureContext(contexts, novelId) };
      ctx.addressFormsFull = ctx.addressFormsFull.map((f) => (f.id === id ? { ...f, ...patch } : f));
      contexts[novelId] = ctx;
      return { contexts };
    }),

  deleteForm: (novelId, id) =>
    set((s) => {
      const contexts = { ...s.contexts };
      const ctx = { ...ensureContext(contexts, novelId) };
      ctx.addressFormsFull = ctx.addressFormsFull.filter((f) => f.id !== id);
      contexts[novelId] = ctx;
      return { contexts };
    }),

  updateWorld: (novelId, world) =>
    set((s) => {
      const contexts = { ...s.contexts };
      const ctx = { ...ensureContext(contexts, novelId) };
      ctx.world = world;
      contexts[novelId] = ctx;
      return { contexts };
    }),

  updateStyle: (novelId, style) =>
    set((s) => {
      const contexts = { ...s.contexts };
      const ctx = { ...ensureContext(contexts, novelId) };
      ctx.style = style;
      contexts[novelId] = ctx;
      return { contexts };
    }),
}));
