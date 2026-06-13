import { create } from 'zustand';
import type { StreamingStatus } from '@/types/translator';

// Mock translations for chapter 4 "Bái sư" — paragraph IDs p1..p6
const MOCK_TRANSLATIONS: Record<string, string> = {
  p1: 'Sáng sớm hôm sau, màn sương mỏng bao phủ trang viên họ Tiêu, Tiêu Viêm theo đúng hẹn đến bên tảng đá lớn ở núi sau. Dược Lão trong nhẫn đã chờ từ lâu, bóng hình ảo ảnh lơ lửng trong làn sương sớm, tựa như tiên nhân đắc đạo.',
  p2: '"Ngươi đã thực sự quyết rồi?" Giọng Dược Lão vang ra từ trong nhẫn, mang theo chút trầm nặng. "Một khi bái ta làm sư phụ, phải nghiêm túc tuân thủ môn quy, con đường tu luyện tuyệt nhiên không bằng phẳng, ngươi đã nghĩ rõ chưa?"',
  p3: 'Tiêu Viêm hít một hơi dài, ánh mắt kiên quyết. Hắn nhớ lại khuôn mặt lạnh lùng đó, giọng nói tuyên bố hủy hôn ước đó, và nỗi thất vọng mà phụ thân không giấu nổi trong mắt. Tất cả những điều này hóa thành ý chí chiến đấu bùng cháy trong lòng hắn.',
  p4: '"Đệ tử đã nghĩ rõ rồi." Tiêu Viêm hai gối quỳ xuống đất, cúi đầu trịnh trọng, giọng nói trầm mà đầy sức mạnh: "Đệ tử Tiêu Viêm, bái kiến sư phụ!"',
  p5: 'Sau một hồi im lặng dài, Dược Lão thở dài, bóng hình ảo ảnh khẽ rung, giọng nói trở nên mềm mại hơn đôi phần: "Đứng lên đi, từ hôm nay trở đi, ngươi chính là truyền nhân duy nhất của lão phu. Chỉ là… hãy nhớ lấy, trên con đường tu luyện, biển khổ vô bờ, quay đầu là bờ."',
  p6: 'Tiêu Viêm ngẩng đầu lên, khóe miệng thoáng nở nụ cười: "Đệ tử sẽ không quay đầu." Trong mắt lấp lánh ánh sáng kiên định. Khoảnh khắc đó, hắn biết rằng, bánh xe số phận của mình đã bắt đầu lặng lẽ chuyển động.',
};

interface StreamingStore {
  status: StreamingStatus;
  currentParagraphIndex: number;
  targetParagraphIndex: number;
  streamAll: boolean;
  _intervalId: ReturnType<typeof setInterval> | null;
  _tokenBuffer: string[];
  _tokenIndex: number;

  startStream: (paragraphIndex: number, novelId: string, chapterId: string, paragraphId: string, streamAll?: boolean) => void;
  stopStream: () => void;
  resumeStream: () => void;
  markDone: () => void;
  reset: () => void;

  // Callback set by consumer to receive tokens
  onToken: ((paragraphId: string, token: string) => void) | null;
  onParagraphDone: ((paragraphId: string) => void) | null;
  onAllDone: (() => void) | null;
  setCallbacks: (
    onToken: (paragraphId: string, token: string) => void,
    onParagraphDone: (paragraphId: string) => void,
    onAllDone: () => void,
  ) => void;
}

function getTokensForParagraph(paragraphId: string): string[] {
  const text = MOCK_TRANSLATIONS[paragraphId] ?? MOCK_TRANSLATIONS['p1'] ?? '';
  // Split into word-level tokens (2-4 words per chunk) to simulate realistic LLM streaming
  const words = text.split(' ');
  const tokens: string[] = [];
  let i = 0;
  while (i < words.length) {
    const size = (i % 3 === 0 ? 2 : i % 3 === 1 ? 3 : 1);
    const chunk = words.slice(i, i + size).join(' ');
    tokens.push(i + size < words.length ? chunk + ' ' : chunk);
    i += size;
  }
  return tokens;
}

export const useStreamingStore = create<StreamingStore>((set, get) => ({
  status: 'idle',
  currentParagraphIndex: 0,
  targetParagraphIndex: 0,
  streamAll: false,
  _intervalId: null,
  _tokenBuffer: [],
  _tokenIndex: 0,
  onToken: null,
  onParagraphDone: null,
  onAllDone: null,

  setCallbacks: (onToken, onParagraphDone, onAllDone) =>
    set({ onToken, onParagraphDone, onAllDone }),

  startStream: (paragraphIndex, _novelId, _chapterId, paragraphId, doStreamAll = false) => {
    const state = get();
    if (state._intervalId) clearInterval(state._intervalId);

    const tokens = getTokensForParagraph(paragraphId);
    set({
      status: 'streaming',
      currentParagraphIndex: paragraphIndex,
      streamAll: doStreamAll,
      _tokenBuffer: tokens,
      _tokenIndex: 0,
    });

    const maxParagraphs = Object.keys(MOCK_TRANSLATIONS).length;

    function runInterval(pid: string, pIdx: number) {
      const iid = setInterval(() => {
        const s = get();
        if (s.status !== 'streaming') { clearInterval(iid); return; }

        if (s._tokenIndex >= s._tokenBuffer.length) {
          clearInterval(iid);
          set({ _intervalId: null });
          s.onParagraphDone?.(pid);

          const nextIdx = pIdx + 1;
          const nextPid = `p${nextIdx + 1}`;
          if (s.streamAll && nextIdx < maxParagraphs) {
            const nextTokens = getTokensForParagraph(nextPid);
            set({ currentParagraphIndex: nextIdx, _tokenBuffer: nextTokens, _tokenIndex: 0 });
            runInterval(nextPid, nextIdx);
          } else if (nextIdx >= maxParagraphs) {
            set({ status: 'done' });
            s.onAllDone?.();
          } else {
            set({ status: 'idle' });
          }
          return;
        }

        const tok = s._tokenBuffer[s._tokenIndex];
        if (tok !== undefined) s.onToken?.(pid, tok);
        set({ _tokenIndex: s._tokenIndex + 1 });
      }, 50);
      set({ _intervalId: iid });
    }

    runInterval(paragraphId, paragraphIndex);
  },

  stopStream: () => {
    const { _intervalId } = get();
    if (_intervalId) clearInterval(_intervalId);
    set({ status: 'paused', _intervalId: null });
  },

  resumeStream: () => {
    const s = get();
    if (s.status !== 'paused') return;

    const remainingTokens = s._tokenBuffer.slice(s._tokenIndex);
    const paragraphId = `p${s.currentParagraphIndex + 1}`;
    set({ status: 'streaming', _tokenBuffer: remainingTokens, _tokenIndex: 0 });

    const intervalId = setInterval(() => {
      const ns = get();
      if (ns.status !== 'streaming') {
        clearInterval(intervalId);
        return;
      }
      if (ns._tokenIndex >= ns._tokenBuffer.length) {
        clearInterval(intervalId);
        set({ status: 'idle', _intervalId: null });
        ns.onParagraphDone?.(paragraphId);
        return;
      }
      const token = ns._tokenBuffer[ns._tokenIndex];
      if (token !== undefined) ns.onToken?.(paragraphId, token);
      set({ _tokenIndex: ns._tokenIndex + 1 });
    }, 30);

    set({ _intervalId: intervalId });
  },

  markDone: () => set({ status: 'done' }),

  reset: () => {
    const { _intervalId } = get();
    if (_intervalId) clearInterval(_intervalId);
    set({ status: 'idle', currentParagraphIndex: 0, _intervalId: null, _tokenBuffer: [], _tokenIndex: 0 });
  },
}));
