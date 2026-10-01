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

// Ca biên trong các hàng: câu rất dài, câu chưa dịch, câu AI dịch chờ soát, câu cần kiểm tra.
export const ROWS = [
  {
    n: 112,
    src: 'in Barchester there was no longer any; so the bishop, dean, and',
    vi: 'ở Barchester không còn nữa; vì vậy giám mục, viện trưởng và',
    state: 'check'
  },
  {
    n: 113,
    src: 'warden, who took it in turn to put in the old men, generally',
    vi: 'người quản lý, người thay phiên nhận vào những người già, thường là',
    state: 'reviewed'
  },
  {
    n: 114,
    src: 'appointed some hangers-on of their own; worn-out gardeners, decrepit',
    vi: 'bổ nhiệm một số người thân tín của riêng mình; những người làm vườn già yếu, tiều tụy',
    state: 'ai',
    active: true
  },
  {
    n: 115,
    src: 'grave-diggers, or octogenarian sextons, who thankfully received',
    vi: 'những người đào mộ, hoặc những thủ từ đã ngoài tám mươi tuổi, vốn vui mừng nhận được',
    state: 'reviewed'
  },
  {
    n: 116,
    src: 'comfortable lodging and one shilling and fourpence a day, such being',
    vi: '',
    state: 'untranslated'
  },
  {
    n: 117,
    src: 'the stipend to which, under the will of John Hiram, they were declared to be entitled by the founder, a sum which has not been altered since the day the charity was first endowed',
    vi: 'khoản trợ cấp mà theo di chúc của John Hiram, họ đã được chỉ định là',
    state: 'ai'
  }
]

export const ROW_STATES = {
  untranslated: { label: 'Chưa dịch', dot: 'bg-ink-muted' },
  ai: { label: 'AI đã dịch', dot: 'bg-info' },
  check: { label: 'Cần kiểm tra', dot: 'bg-warning' },
  reviewed: { label: 'Đã soát', dot: 'bg-success' }
}

export const COUNTS = [
  ['untranslated', 'Chưa dịch', 18],
  ['ai', 'AI đã dịch', 46],
  ['check', 'Cần kiểm tra', 7],
  ['reviewed', 'Đã soát', 166]
]
