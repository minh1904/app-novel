// Dữ liệu mẫu dùng chung cho mọi màn và mọi phương án, nên hai phương án cạnh nhau
// chỉ khác bố cục chứ không khác nội dung. Cố ý có ca biên (S8): tên tràn hai dòng,
// tác phẩm chưa có chương, chương chưa đặt tên, hàng chưa dịch, số 0, thiếu ảnh bìa.
export const WORKS = [
  {
    title: 'Trùng Sinh Chi Đô Thị Tu Tiên Đại Năng Vương Giả Quy Lai',
    original: '重生之都市修仙大能王者归来',
    author: 'Mặc Vũ',
    genre: 'tiên hiệp, đô thị',
    desc: 'Một tu sĩ bị phản bội ở Đại Hoang quay về thân xác mười tám tuổi, lần này sống cho mình.',
    lang: 'zh-Hans',
    mark: '简',
    short: 'Trung giản thể',
    chapters: 237,
    status: 'in-progress',
    statusLabel: 'Đang dịch',
    lastChapter: 12,
    lastChapterTitle: 'Đôi mắt ẩn sau thư viện',
    day: 'Hôm nay',
    time: '09:14',
    cover: 'https://images.unsplash.com/photo-1532012197267-da84d127e765?w=400&q=80&auto=format&fit=crop'
  },
  {
    title: 'College Girls and Their Assorted Types',
    original: '',
    author: 'Fumiaki Maruto',
    genre: 'thanh xuân',
    desc: 'Itsuki bỏ học năm nhất, và những người còn lại quanh cậu.',
    lang: 'en',
    mark: 'Aa',
    short: 'Anh',
    chapters: 12,
    status: 'in-progress',
    statusLabel: 'Đang dịch',
    lastChapter: 4,
    lastChapterTitle: 'A New Friend Who Talks Entirely Too Much About Trains',
    day: 'Hôm qua',
    time: '22:40',
    cover: 'https://images.unsplash.com/photo-1476275466078-4007374efbbe?w=400&q=80&auto=format&fit=crop'
  },
  {
    // Ca biên: chưa có ảnh bìa, rơi về chữ đại diện ngôn ngữ
    title: 'Kiếm Lai',
    original: '剑来',
    author: 'Phong Hỏa Hí Chư Hầu',
    genre: 'tiên hiệp',
    desc: '',
    lang: 'zh-Hant',
    mark: '繁',
    short: 'Trung phồn thể',
    chapters: 48,
    status: 'paused',
    statusLabel: 'Tạm dừng',
    lastChapter: 31,
    lastChapterTitle: 'Nước chảy qua cầu',
    day: '3 ngày trước',
    time: '08:02',
    cover: ''
  },
  {
    // Ca biên: chưa có chương nào, chưa bắt đầu dịch, không mô tả, không tác giả
    title: 'ようこそ実力至上主義の教室へ',
    original: '',
    author: '',
    genre: '',
    desc: '',
    lang: 'ja',
    mark: 'あ',
    short: 'Nhật',
    chapters: 0,
    status: 'not-started',
    statusLabel: 'Chưa bắt đầu',
    lastChapter: null,
    lastChapterTitle: '',
    day: '5 thg 9, 2026',
    time: '16:27',
    cover: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&q=80&auto=format&fit=crop'
  }
]

export const CHAPTERS = [
  { n: 1, title: 'College Girls and Their Assorted Types', day: 'Hôm nay', done: true },
  { n: 2, title: 'The First Day', day: 'Hôm nay', done: true },
  { n: 3, title: 'Club Activities', day: 'Hôm qua', done: true },
  {
    n: 4,
    title: 'A New Friend Who Talks Entirely Too Much About Trains',
    day: 'Hôm qua',
    done: true
  },
  { n: 5, title: 'Summer Break', day: '3 ngày trước', done: true },
  { n: 6, title: 'Confessions', day: '3 ngày trước', done: true },
  { n: 7, title: 'The Festival', day: '5 thg 9, 2026', done: true },
  { n: 8, title: 'The Girlfriend', day: '5 thg 9, 2026', done: true },
  { n: 9, title: 'Winter', day: '5 thg 9, 2026', done: true },
  { n: 10, title: 'The Letter', day: '4 thg 9, 2026', done: false },
  // Ca biên: chương chưa đặt tên, hiện "Chương 11" màu mờ
  { n: 11, title: '', day: '4 thg 9, 2026', done: false },
  { n: 12, title: 'Đôi mắt ẩn sau thư viện', day: '2 thg 9, 2026', done: false, active: true }
]

// Mẫu cho màn Hỏi AI. Cùng chương với PREVIEW_ROWS trong screens.js (College Girls…, Ch.12)
// nên hai màn nói về cùng một bản ghi (S6). Câu đang bàn là segment 88 — câu máy dịch còn cứng,
// đúng nỗi đau của người hậu biên tập bản AI (ADR-002).
export const AI_CHAT = {
  segment: 88,
  ctxLabel: 'Ch.12 · Đoạn 9 · segment 88',
  source:
    'Her flashy looks made her popular throughout grade school, but she had yet to enjoy a steady boyfriend.',
  current:
    'Vẻ ngoài hào nhoáng của cô ấy đã làm cho cô ấy trở nên nổi tiếng trong suốt trường tiểu học, nhưng cô ấy vẫn chưa được hưởng một người bạn trai ổn định.',
  question: 'Dịch tự nhiên hơn, bớt cứng nhé',
  lead: 'Chỗ cứng nhất là “trong suốt trường tiểu học” và “được hưởng”. Bản gọn hơn:',
  proposal:
    'Nhờ ngoại hình nổi bật, cô được nhiều người để ý suốt những năm đi học, nhưng chưa từng yêu ai lâu dài.',
  note: '“grade school” ở đây là quãng học phổ thông, không phải cấp một; Thuật ngữ của tác phẩm đã chốt “những năm đi học”.',
  // Mô tả bước nói công cụ đã làm gì, không nói trước kết quả (components/chat.md)
  steps: [
    { label: 'Tra Thuật ngữ của tác phẩm', detail: 'Đối chiếu 14 mục đã chốt cho Ch.1–11', state: 'done' },
    { label: 'Tra ma trận Xưng hô', detail: 'Lấy cách gọi Miyako Shirakawa ở 3 chương gần nhất', state: 'done' },
    { label: 'Đọc ví dụ Văn phong', detail: '4 đoạn đã đánh dấu “giọng tự nhiên” trong bản dịch cũ', state: 'done' }
  ],
  running: { label: 'Đọc ví dụ Văn phong', detail: '4 đoạn đã đánh dấu “giọng tự nhiên” trong bản dịch cũ' },
  failedStep: { label: 'Đọc ví dụ Văn phong', detail: 'Không mở được tệp văn phong của tác phẩm', state: 'error' },
  // Chữ đang chạy ra: cắt giữa câu, cuối có khối con trỏ nhạt
  partial: 'Nhờ ngoại hình nổi bật, cô được nhiều người để ý',
  suggestions: ['“grade school” nên dịch thế nào?', 'Viết lại cả đoạn theo giọng này'],
  openers: ['Dịch tự nhiên hơn, bớt cứng', 'Câu này xưng hô đã đúng chưa?', 'Tra nghĩa “grade school”'],
  errorReason: 'Khóa API Gemini đã hết hạn mức hôm nay. Đổi provider trong Cài đặt, hoặc thử lại sau.',
  // Ca biên (S8): câu hỏi rất dài, đường dẫn liền một chuỗi không có chỗ ngắt, câu trả lời dài
  longQuestion:
    'Cả đoạn này mình dịch từ bản tiếng Anh nhưng bản Nhật gốc dùng 幼なじみ cho Miyako, mà chương 3 mình đã dịch là “bạn từ nhỏ” rồi, giờ ở đây lại thành “người quen cũ” thì có lệch không, hay để nguyên và ghi chú lại ở Thuật ngữ?',
  longUrl: 'https://dictionary.goo.ne.jp/word/en/osananajimi/#:~:text=childhood-friend',
  longAnswer:
    'Lệch, và nên sửa ở chương 3 chứ không phải ở đây. 幼なじみ là bạn từ nhỏ theo nghĩa lớn lên cùng nhau, còn “người quen cũ” chỉ nói là biết nhau từ trước — đọc tới chương 12 thì người đọc đã mất mối liên hệ giữa hai nhân vật. Mình đã thêm 幼なじみ → “bạn từ nhỏ” vào Thuật ngữ để các chương sau không lệch nữa; ba chỗ còn lại ở Ch.3 và Ch.7 cần sửa tay, Mira không tự ghi đè phần bạn đã soát.'
}

// Danh sách model cho box chọn model. Lấy từ research/ai-provider-integration.md (đọc 2026-10-02):
// ba adapter openai-compatible / anthropic / gemini, cộng runtime local Ollama :11434.
// GIÁ LÀ SỐ MẪU, doc đó ghi rõ phải đọc lại trang giá chính chủ trước khi đưa vào UI thật.
export const AI_MODELS = [
  {
    group: 'Anthropic',
    items: [
      { name: 'Claude Sonnet 5', meta: '3 / 15 · 1M', current: true },
      { name: 'Claude Haiku 4.5', meta: '1 / 5 · 200K' }
    ]
  },
  {
    group: 'Google',
    items: [{ name: 'Gemini Flash-Lite', meta: '0,30 / 2,50', badge: 'có bậc miễn phí' }]
  },
  { group: 'DeepSeek', items: [{ name: 'DeepSeek Chat', meta: '0,30 / 1,20' }] },
  { group: 'OpenRouter', items: [{ name: 'Tự chọn trong 300+ model', meta: 'một khóa' }] },
  {
    group: 'Máy này',
    items: [{ name: 'Qwen3 8B', meta: 'Ollama :11434', badge: 'ngoại tuyến' }]
  }
]

// Hai chế độ của Mira theo research/ai-provider-integration.md. KHÔNG có Agent: doc ghi rõ
// "không có nhu cầu nào trong scope cần AI tự chạy nhiều bước trên dữ liệu người dùng".
export const AI_MODES = [
  { id: 'hoi', label: 'Hỏi', hint: 'Chỉ đọc, không sửa bản dịch' },
  { id: 'sua', label: 'Sửa', hint: 'Trả đề xuất có nút Áp dụng' }
]

// Ngữ cảnh đang gửi kèm, hiện thành chip trong ô soạn như @-mention của Cursor.
export const AI_CONTEXT_CHIPS = [
  { label: 'segment 88', icon: 'file-text', fixed: true },
  { label: 'Thuật ngữ', icon: 'book-open' },
  { label: 'Xưng hô', icon: 'users' }
]
