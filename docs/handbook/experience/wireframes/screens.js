// Mỗi màn có ba phương án. Phương án mang tag "Nhịp D" dùng đúng nhịp đã chốt ở màn chương
// (thanh 42px/36px, chữ 12–13px, nút h-7/h-6); hai phương án còn lại đổi bố cục để so sánh.
// Nội dung lấy từ data.js nên ba phương án cùng chữ, chỉ khác cách bày.
import { CHAPTERS, COUNTS, ROWS, ROW_STATES, WORKS } from './data.js'

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const icon = (name, cls = 'size-3.5') => `<i data-lucide="${name}" class="${cls}"></i>`

/** Nút theo đúng thang size của components/Button.tsx, để wireframe không đẻ cỡ mới. */
const BTN = {
  xxs: 'h-[18px] px-1.5 text-[11px]',
  xs: 'h-[22px] px-2 text-[12px]',
  sm: 'h-6 px-2 text-[12px]',
  md: 'h-7 px-2.5 text-xs',
  lg: 'h-[34px] px-3.5 text-[13px]'
}
const V = {
  primary: 'border-transparent bg-primary text-primary-foreground',
  outline: 'border-line-strong bg-transparent text-ink',
  secondary: 'border-transparent bg-control text-ink',
  ghost: 'border-transparent bg-transparent text-ink-muted'
}
const btn = (label, { size = 'md', variant = 'secondary', ico, cls = '' } = {}) =>
  `<button type="button" class="inline-flex shrink-0 cursor-pointer items-center justify-center gap-1 rounded-control border font-medium whitespace-nowrap ${V[variant]} ${BTN[size]} ${cls}">${ico ? icon(ico, size === 'lg' ? 'size-3.5' : 'size-3') : ''}${esc(label)}</button>`
const iconBtn = (name, label, { size = 'size-7', variant = 'ghost' } = {}) =>
  `<button type="button" aria-label="${esc(label)}" title="${esc(label)}" class="inline-flex shrink-0 cursor-pointer items-center justify-center rounded-control border ${V[variant]} ${size} p-0">${icon(name, 'size-3.5')}</button>`
const soon = (cls = '') =>
  `<span class="shrink-0 rounded-[5px] bg-selected px-1.5 py-px text-[11px] text-ink ${cls}">Sắp có</span>`
const dot = (cls) => `<span class="size-1.5 shrink-0 rounded-full ${cls}"></span>`

/** Bìa tác phẩm: ảnh thật nếu có, không thì chữ đại diện ngôn ngữ như WorkCover trong app. */
const cover = (work, cls, text) =>
  work.cover
    ? `<img src="${work.cover}" alt="" class="${cls} shrink-0 rounded-[8px] object-cover" />`
    : `<span class="${cls} grid shrink-0 place-items-center rounded-[8px] bg-control ${text} text-ink-muted">${esc(work.mark)}</span>`

const STATUS_PILL = {
  'in-progress': 'bg-info/12 text-info',
  paused: 'bg-warning/14 text-warning',
  'not-started': 'bg-control text-ink'
}
const pill = (work) =>
  `<span class="inline-flex h-[22px] shrink-0 items-center rounded-full px-2 text-[11px] font-semibold ${STATUS_PILL[work.status]}">${esc(work.statusLabel)}</span>`

/** Khung rỗng/đang tải/lỗi dùng chung, để mọi màn nói cùng một giọng. */
const loading = (text) =>
  `<div class="flex min-h-0 flex-1 items-center justify-center p-6"><p role="status" class="text-[13px] text-ink-muted">${esc(text)}</p></div>`
const failed = (text, retry = 'Thử lại') =>
  `<div class="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
     <p role="alert" class="max-w-[460px] text-[13px] leading-[1.6] text-ink-muted">${esc(text)}</p>
     <div class="flex gap-2">${btn(retry, { size: 'md', variant: 'secondary' })}</div>
   </div>`
const empty = (ico, title, body, actions = '') =>
  `<div class="m-3 flex min-h-0 flex-1 flex-col items-center justify-center gap-3 rounded-panel border border-dashed border-line-strong px-6 py-10 text-center">
     ${icon(ico, 'size-7 text-ink-muted')}
     <p class="text-[14px] font-semibold">${esc(title)}</p>
     <p class="max-w-[460px] text-xs leading-[1.6] text-ink-muted">${esc(body)}</p>
     ${actions ? `<div class="flex flex-wrap justify-center gap-2 pt-1">${actions}</div>` : ''}
   </div>`

// ===================================================================
// MÀN 1 — THƯ VIỆN
// ===================================================================

const libToolbarD = `
<div data-wf-block="2" class="flex h-[42px] shrink-0 items-center gap-2 border-b border-line bg-chrome px-2.5">
  <h2 class="shrink-0 text-[12.5px] font-semibold">Thư viện tác phẩm <span class="font-normal text-ink-muted">· 4 tác phẩm</span></h2>
  <label class="ml-2 flex h-7 min-w-[180px] flex-1 items-center gap-1.5 rounded-control border border-line-strong px-2">
    ${icon('search', 'size-3.5 shrink-0 text-ink-muted')}
    <input class="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-ink-muted" placeholder="Tìm tác phẩm…" />
    <kbd class="shrink-0 rounded-[4px] bg-control px-1 font-mono text-[10px] text-ink-muted">Ctrl F</kbd>
  </label>
  <div class="flex shrink-0 items-center gap-1">
    ${btn('Mọi trạng thái', { ico: 'filter' })}
    ${btn('Cập nhật gần đây', { ico: 'arrow-up-down' })}
    ${btn('Mở tác phẩm có sẵn', { variant: 'outline', ico: 'folder-open' })}
    ${btn('Tạo tác phẩm', { variant: 'primary', ico: 'plus' })}
  </div>
</div>`

const libRowD = (work) => `
<li class="grid grid-cols-[32px_minmax(0,1fr)_72px_96px_88px_auto] items-center gap-3 border-b border-line px-2.5 py-1.5 hover:bg-control/60">
  ${cover(work, 'h-8 w-6', 'text-[12px]')}
  <div class="min-w-0">
    <p class="truncate text-[12.5px] font-semibold">${esc(work.title)}</p>
    <p class="truncate text-[11px] text-ink-muted">${esc(work.short)} → Việt${work.author ? ' · ' + esc(work.author) : ''}${work.original ? ' · ' + esc(work.original) : ''}</p>
  </div>
  <p class="text-right text-[11px] text-ink-muted">${work.chapters} chương</p>
  <div class="flex items-center gap-1.5">${pill(work)}</div>
  <p class="text-[11px] text-ink-muted">${esc(work.day)}<span class="block text-ink-muted/70">${esc(work.time)}</span></p>
  <div class="flex items-center gap-1">
    ${btn('Mở', { size: 'sm', variant: 'outline' })}
    ${iconBtn('more-horizontal', 'Thao tác khác cho ' + work.title, { size: 'size-6' })}
  </div>
</li>`

const libCard = (work) => `
<li class="flex flex-col gap-2 rounded-panel border border-line bg-sidebar p-2.5">
  <div class="relative aspect-[2/3] w-full overflow-hidden rounded-control bg-control">
    ${work.cover ? `<img src="${work.cover}" alt="" class="size-full object-cover" />` : `<span class="grid size-full place-items-center text-[32px] text-ink-muted">${esc(work.mark)}</span>`}
    <span class="absolute top-1.5 left-1.5">${pill(work)}</span>
  </div>
  <p class="line-clamp-2 text-[12.5px] leading-[1.35] font-semibold">${esc(work.title)}</p>
  <p class="truncate text-[11px] text-ink-muted">${esc(work.short)} → Việt · ${work.chapters} chương</p>
  <div class="mt-auto flex items-center gap-1">
    ${work.lastChapter ? btn('Tiếp tục · Ch.' + work.lastChapter, { size: 'sm', variant: 'primary', cls: 'flex-1' }) : btn('Thêm chương', { size: 'sm', variant: 'outline', cls: 'flex-1' })}
    ${iconBtn('more-horizontal', 'Thao tác khác cho ' + work.title, { size: 'size-6' })}
  </div>
</li>`

const libRowWide = (work) => `
<li class="grid grid-cols-[48px_minmax(0,1fr)_76px_100px_92px_auto] items-center gap-3 border-b border-line px-3 py-2.5 hover:bg-control/60">
  ${cover(work, 'h-16 w-12', 'text-[17px]')}
  <div class="min-w-0 flex flex-col gap-0.5">
    <p class="line-clamp-2 text-[13px] leading-[1.35] font-semibold">${esc(work.title)}</p>
    <p class="truncate text-[12px] text-ink-muted">${esc(work.short)} → Việt${work.original ? ' · ' + esc(work.original) : ''}</p>
    ${work.author || work.genre ? `<p class="truncate text-[12px] text-ink-muted">${esc([work.author, work.genre].filter(Boolean).join(' · '))}</p>` : ''}
    ${work.desc ? `<p class="truncate text-[12px] text-ink-muted">${esc(work.desc)}</p>` : ''}
  </div>
  <p class="text-right text-xs text-ink-muted">${work.chapters} chương</p>
  <div class="flex flex-col items-start gap-1">${pill(work)}${work.lastChapter ? `<span class="text-[12px] text-ink-muted">Chương ${work.lastChapter}</span>` : ''}</div>
  <p class="text-xs text-ink-muted">${esc(work.day)}<span class="block text-[12px] text-ink-muted/70">${esc(work.time)}</span></p>
  <div class="flex w-[152px] items-center justify-end gap-1">
    ${btn('Mở tác phẩm', { variant: 'outline', ico: 'folder-open' })}
    ${iconBtn('more-horizontal', 'Thao tác khác cho ' + work.title)}
  </div>
</li>`

const LIB_EMPTY = empty(
  'library',
  'Bắt đầu tác phẩm đầu tiên',
  'Tạo chỗ để giữ các chương, bản gốc và bản dịch của một tác phẩm trên máy này.',
  btn('Tạo tác phẩm', { size: 'lg', variant: 'primary', ico: 'plus' }) +
    btn('Mở tác phẩm có sẵn', { size: 'lg', variant: 'ghost', ico: 'folder-open' })
)
const LIB_LOADING = loading('Đang mở thư viện…')
const LIB_FAILED = failed(
  'Không mở được thư viện. Dữ liệu bị hỏng; tệp không bị xóa, các tác phẩm khác vẫn dùng bình thường.'
)

const libShell = (toolbar, body, block = 3) => `
<div class="grid h-full min-h-0 grid-cols-[216px_minmax(0,1fr)] overflow-hidden">
  ${libSidebar()}
  <div class="flex min-h-0 min-w-0 flex-col bg-canvas">
    ${toolbar}
    <div data-wf-block="${block}" class="flex min-h-0 flex-1 flex-col overflow-hidden">${body}</div>
  </div>
</div>`

const libSidebar = () => `
<aside data-wf-block="1" class="flex min-h-0 flex-col border-r border-line bg-sidebar">
  <div class="flex h-[44px] shrink-0 items-center justify-between gap-2 px-2.5">
    <span class="text-[13px] font-semibold">Thư viện</span>
    ${btn('Tạo tác phẩm', { size: 'sm', variant: 'outline', ico: 'plus' })}
  </div>
  <nav class="flex flex-col gap-px px-1.5" aria-label="Thư viện">
    ${[
      ['library', 'Tất cả tác phẩm', true],
      ['clock', 'Gần đây', false],
      ['archive', 'Lưu trữ', false]
    ]
      .map(
        ([ic, label, on]) =>
          `<a href="#" class="flex h-[30px] items-center gap-2 rounded-control px-2 text-[12.5px] font-medium ${on ? 'bg-selected text-ink' : 'text-ink-muted hover:bg-selected/60 hover:text-ink'}">${icon(ic, 'size-4 shrink-0')}${esc(label)}</a>`
      )
      .join('')}
  </nav>
  <div class="mt-3 flex min-h-0 flex-1 flex-col gap-1 border-t border-line px-1.5 pt-3">
    <span class="px-2 text-[11px] font-medium text-ink-muted">Tác phẩm gần đây</span>
    ${WORKS.slice(0, 4)
      .map(
        (w) => `<a href="#" class="flex items-center gap-2 rounded-control px-2 py-1 hover:bg-selected/60">
        ${cover(w, 'h-7 w-[22px]', 'text-[10px]')}
        <span class="min-w-0 flex-1">
          <span class="block truncate text-[12px] font-medium text-ink">${esc(w.title)}</span>
          <span class="block truncate text-[11px] text-ink-muted">${w.lastChapter ? esc(w.statusLabel) + ' · Chương ' + w.lastChapter : esc(w.statusLabel)}</span>
        </span>
      </a>`
      )
      .join('')}
  </div>
  <span class="border-t border-line px-3 py-2.5 text-[11px] text-ink-muted">Mira 0.3.1</span>
</aside>`

const THU_VIEN = {
  name: 'Thư viện',
  short: 'Thư viện',
  states: ['du-lieu', 'dang-tai', 'rong', 'loi'],
  variants: {
    a: {
      name: 'A · Bảng gọn theo nhịp D',
      tag: 'Nhịp D',
      why: 'Cùng nhịp với màn chương: một thanh 42px gom tiêu đề, tìm, lọc và nút; hàng cao 44px nên nhìn được gấp đôi số tác phẩm.',
      uu: [
        'Thấy ~12 tác phẩm cùng lúc thay vì ~6, không phải cuộn với thư viện lớn',
        'Thư viện và màn chương cùng một nhịp, chuyển qua lại không thấy hụt'
      ],
      nhuoc: [
        'Bìa chỉ còn 24×32px — gần như chỉ còn là chấm nhận diện, không nhìn ra tranh bìa',
        'Mô tả và thể loại bị cắt khỏi hàng, chỉ còn tên + tác giả'
      ],
      hopkhi: 'Người dịch có từ 10 tác phẩm trở lên và tìm theo tên, không tìm theo bìa.',
      render: (tt) =>
        libShell(
          libToolbarD,
          tt === 'dang-tai'
            ? LIB_LOADING
            : tt === 'loi'
              ? LIB_FAILED
              : tt === 'rong'
                ? LIB_EMPTY
                : `<ul class="min-h-0 flex-1 overflow-y-auto" aria-label="Danh sách tác phẩm">
              <li class="sticky top-0 z-10 grid grid-cols-[32px_minmax(0,1fr)_72px_96px_88px_auto] gap-3 border-b border-line bg-canvas px-2.5 py-1.5 text-[11px] text-ink-muted"><span></span><span>Tác phẩm</span><span class="text-right">Chương</span><span>Tiến độ</span><span>Cập nhật</span><span class="w-[92px]"></span></li>
              ${WORKS.map(libRowD).join('')}${WORKS.map(libRowD).join('')}
            </ul>`
        )
    },
    b: {
      name: 'B · Lưới thẻ bìa',
      tag: '',
      why: 'Tác phẩm nhận ra bằng tranh bìa chứ không bằng tên dài; lưới thẻ cho bìa đủ lớn để nhìn lướt là thấy.',
      uu: [
        'Nhận ra tác phẩm bằng bìa, nhanh hơn đọc tên dài tiếng Trung/Nhật',
        'Nút "Tiếp tục · Ch.N" nằm ngay trên thẻ, không cần mở tác phẩm trước'
      ],
      nhuoc: [
        'Mỗi màn chỉ ~8 thẻ; thư viện 30 tác phẩm là phải cuộn nhiều',
        'Tác phẩm chưa có bìa thành ô chữ to, trông lệch hẳn so với thẻ có bìa',
        'Không so sánh được cột Chương / Cập nhật giữa các tác phẩm'
      ],
      hopkhi: 'Thư viện dưới ~15 tác phẩm, và người dịch có đặt ảnh bìa.',
      render: (tt) =>
        libShell(
          libToolbarD,
          tt === 'dang-tai'
            ? LIB_LOADING
            : tt === 'loi'
              ? LIB_FAILED
              : tt === 'rong'
                ? LIB_EMPTY
                : `<ul class="grid min-h-0 flex-1 grid-cols-[repeat(auto-fill,minmax(168px,1fr))] content-start gap-3 overflow-y-auto p-3" aria-label="Danh sách tác phẩm">
              ${WORKS.map(libCard).join('')}${WORKS.map(libCard).join('')}
            </ul>`
        )
    },
    c: {
      name: 'C · Hàng rộng (như hiện tại)',
      tag: 'Đang chạy',
      why: 'Giữ nguyên bố cục đang có: hàng cao, bìa 48×64, mỗi hàng nói đủ tên gốc, tác giả, thể loại và mô tả.',
      uu: [
        'Một hàng trả lời được gần hết câu hỏi về tác phẩm, không phải mở ra xem',
        'Không phải dựng lại gì, không có rủi ro đổi thói quen'
      ],
      nhuoc: [
        'Hàng cao ~84px nên chỉ thấy ~6 tác phẩm, cuộn nhiều khi thư viện lớn',
        'Nhịp rộng hơn hẳn màn chương vừa dựng — hai màn trông như hai app'
      ],
      hopkhi: 'Thư viện ít tác phẩm nhưng mỗi tác phẩm có nhiều thông tin cần đọc.',
      render: (tt) =>
        libShell(
          `<div data-wf-block="2" class="flex shrink-0 flex-col gap-3 border-b border-line bg-chrome px-4 py-3">
             <div class="flex flex-wrap items-end justify-between gap-2">
               <div>
                 <h2 class="text-[24px] leading-[1.2] font-semibold tracking-[-0.045em]">Thư viện tác phẩm</h2>
                 <p class="text-[13px] text-ink-muted">Quản lý những tác phẩm bạn đang dịch.</p>
               </div>
               <div class="flex gap-2">${btn('Mở tác phẩm có sẵn', { size: 'lg', variant: 'outline', ico: 'folder-open' })}${btn('Tạo tác phẩm', { size: 'lg', variant: 'primary', ico: 'plus' })}</div>
             </div>
             <div class="flex flex-wrap gap-2">
               <label class="flex h-[34px] min-w-[220px] flex-1 items-center gap-1.5 rounded-control border border-line-strong px-2.5">
                 ${icon('search', 'size-3.5 shrink-0 text-ink-muted')}
                 <input class="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-ink-muted" placeholder="Tìm tác phẩm…" />
                 <kbd class="shrink-0 rounded-[4px] bg-control px-1 font-mono text-[10px] text-ink-muted">Ctrl F</kbd>
               </label>
               ${btn('Mọi trạng thái', { size: 'lg', variant: 'outline', ico: 'filter' })}
               ${btn('Cập nhật gần đây', { size: 'lg', variant: 'outline', ico: 'arrow-up-down' })}
             </div>
           </div>`,
          tt === 'dang-tai'
            ? LIB_LOADING
            : tt === 'loi'
              ? LIB_FAILED
              : tt === 'rong'
                ? LIB_EMPTY
                : `<ul class="min-h-0 flex-1 overflow-y-auto px-4" aria-label="Danh sách tác phẩm">
              <li class="sticky top-0 z-10 grid h-8 grid-cols-[48px_minmax(0,1fr)_76px_100px_92px_auto] items-center gap-3 border-b border-line bg-canvas text-[12px] text-ink-muted"><span></span><span>Tác phẩm</span><span class="text-right">Chương</span><span>Tiến độ dịch</span><span>Cập nhật</span><span class="w-[152px] text-right">Thao tác</span></li>
              ${WORKS.map(libRowWide).join('')}${WORKS.map(libRowWide).join('')}
            </ul>`
        )
    }
  }
}

// ===================================================================
// MÀN 2 — TẠO TÁC PHẨM
// ===================================================================

const FIELDS = [
  ['Tên tác phẩm', '', 'Trùng Sinh Chi Đô Thị Tu Tiên Đại Năng Vương Giả Quy Lai', true],
  ['Ngôn ngữ gốc', 'Ngôn ngữ đích luôn là tiếng Việt.', 'Tiếng Trung giản thể', true, 'select'],
  ['Tên gốc (tùy chọn)', '', '重生之都市修仙大能王者归来', false],
  ['Tác giả (tùy chọn)', '', 'Mặc Vũ', false],
  [
    'Thể loại / bối cảnh (tùy chọn)',
    'Ví dụ: tiên hiệp, cổ đại. Giúp AI chọn xưng hô và giọng văn.',
    'tiên hiệp, đô thị',
    false
  ],
  ['Mô tả (tùy chọn)', '', '', false, 'area']
]

const field = (
  [label, hint, value, required, kind],
  { h = 'h-7', text = 'text-xs', err = false } = {}
) => `
<div class="flex flex-col gap-1">
  <span class="text-[12px] font-semibold">${esc(label)}${required ? '' : ''}</span>
  ${
    kind === 'area'
      ? `<textarea rows="3" class="resize-y rounded-control border ${err ? 'border-error' : 'border-line-strong'} bg-canvas px-[11px] py-2 ${text} outline-none"></textarea>`
      : kind === 'select'
        ? `<button type="button" class="flex ${h} items-center justify-between rounded-control border border-line-strong bg-canvas pr-2 pl-[11px] ${text}">${esc(value)}${icon('chevron-down', 'size-3.5 text-ink-muted')}</button>`
        : `<input value="${esc(value)}" class="${h} rounded-control border ${err ? 'border-error' : 'border-line-strong'} bg-canvas px-[11px] ${text} outline-none" />`
  }
  ${err ? `<p role="alert" class="text-[12px] text-error">Nhập tên tác phẩm.</p>` : hint ? `<p class="text-[12px] text-ink-muted">${esc(hint)}</p>` : ''}
</div>`

const coverPicker = (w) => `
<div class="flex w-[${w}px] shrink-0 flex-col gap-1.5">
  <span class="text-[12px] font-semibold">Ảnh bìa (tùy chọn)</span>
  <button type="button" class="flex aspect-[2/3] w-full cursor-pointer flex-col items-center justify-center gap-1.5 rounded-control border border-dashed border-line-strong px-3 text-center">
    ${icon('image-plus', 'size-6 text-ink-muted')}
    <span class="text-[12px] leading-[1.4] text-ink-muted">Bấm để chọn hoặc kéo ảnh vào đây</span>
  </button>
  <p class="text-[12px] leading-[1.4] text-ink-muted">JPEG, PNG hoặc WebP. Ảnh được thu nhỏ khi lưu.</p>
</div>`

const createShell = (body, footer) => `
<div class="grid h-full min-h-0 grid-cols-[216px_minmax(0,1fr)] overflow-hidden">
  ${libSidebar()}
  <div class="flex min-h-0 min-w-0 flex-col bg-canvas">
    <div data-wf-block="2" class="flex h-[42px] shrink-0 items-center gap-2 border-b border-line bg-chrome px-2.5">
      <nav class="flex min-w-0 items-center gap-1.5 text-[12.5px]">
        <a href="#" class="text-ink-muted hover:text-ink">Thư viện</a>
        ${icon('chevron-right', 'size-3 text-ink-muted')}
        <span class="font-semibold">Tạo tác phẩm</span>
      </nav>
    </div>
    <div data-wf-block="3" class="min-h-0 flex-1 overflow-y-auto">${body}</div>
    ${footer}
  </div>
</div>`

const createFooter = (busy) => `
<div data-wf-block="4" class="flex h-[48px] shrink-0 items-center justify-end gap-2 border-t border-line bg-chrome px-3">
  ${busy ? `<p role="status" class="mr-auto text-xs text-ink-muted">Đang tạo tác phẩm…</p>` : ''}
  ${btn('Hủy', { variant: 'secondary' })}
  ${btn(busy ? 'Đang tạo…' : 'Tạo tác phẩm', { variant: 'primary' })}
</div>`

const TAO_TAC_PHAM = {
  name: 'Tạo tác phẩm',
  short: 'Tạo',
  states: ['du-lieu', 'loi', 'dang-gui'],
  variants: {
    a: {
      name: 'A · Một cột gọn theo nhịp D',
      tag: 'Nhịp D',
      why: 'Form một cột hẹp, bìa nằm cùng mạch với các trường; nút Tạo/Hủy dính đáy nên không phải cuộn xuống tìm.',
      uu: [
        'Mắt đi một đường thẳng từ trên xuống, không nhảy qua lại giữa hai cột',
        'Nút Tạo luôn nhìn thấy, kể cả khi mô tả dài làm form cao hơn màn hình',
        'Cùng nhịp với màn chương và màn thư viện gọn'
      ],
      nhuoc: [
        'Ảnh bìa đứng trên các trường nên trường đầu tiên bị đẩy xuống dưới nếp gấp',
        'Cột hẹp (560px) làm tên tác phẩm dài phải cuộn ngang trong ô'
      ],
      hopkhi: 'Mặc định — người dùng thường chỉ điền tên và ngôn ngữ rồi bấm Tạo.',
      render: (tt) =>
        createShell(
          `<div class="mx-auto flex max-w-[560px] flex-col gap-4 px-5 py-6">
             <div>
               <h2 class="text-[15px] font-semibold">Tạo tác phẩm</h2>
               <p class="text-xs leading-[1.6] text-ink-muted">Chỉ cần tên và ngôn ngữ gốc. Ảnh bìa, chương, bản gốc và bản dịch thêm sau cũng được.</p>
             </div>
             ${coverPicker(120)}
             ${FIELDS.map((f, i) => field(f, { err: tt === 'loi' && i === 0 })).join('')}
             ${tt === 'loi' ? `<p role="alert" class="text-[12px] text-error">Ảnh bìa phải là ảnh JPEG.</p>` : ''}
           </div>`,
          createFooter(tt === 'dang-gui')
        )
    },
    b: {
      name: 'B · Hai cột, bìa bên trái',
      tag: 'Đang chạy',
      why: 'Giữ bố cục đang có: bìa chiếm cột trái cố định, các trường bên phải, nên trường đầu tiên luôn ở ngay trên cùng.',
      uu: [
        'Trường "Tên tác phẩm" ở ngay đầu màn, gõ được mà không phải cuộn',
        'Ảnh bìa xem trước ở kích thước thật, dễ thấy ảnh bị cắt sai'
      ],
      nhuoc: [
        'Mắt phải nhảy giữa hai cột; cột bìa trống trơn khi người dùng bỏ qua ảnh',
        'Dưới ~600px lại sập về một cột, nên thực tế là phải nuôi hai bố cục'
      ],
      hopkhi: 'Người dịch hay đặt bìa ngay lúc tạo và muốn xem trước to.',
      render: (tt) =>
        createShell(
          `<div class="mx-auto flex max-w-[760px] flex-col gap-4 px-5 py-6">
             <div>
               <h2 class="text-[15px] font-semibold">Tạo tác phẩm</h2>
               <p class="text-xs leading-[1.6] text-ink-muted">Chỉ cần tên và ngôn ngữ gốc. Ảnh bìa, chương, bản gốc và bản dịch thêm sau cũng được.</p>
             </div>
             <div class="flex gap-5">
               ${coverPicker(168)}
               <div class="flex min-w-0 flex-1 flex-col gap-3.5">
                 ${FIELDS.map((f, i) => field(f, { err: tt === 'loi' && i === 0 })).join('')}
                 ${tt === 'loi' ? `<p role="alert" class="text-[12px] text-error">Ảnh bìa phải là ảnh JPEG.</p>` : ''}
               </div>
             </div>
           </div>`,
          createFooter(tt === 'dang-gui')
        )
    },
    c: {
      name: 'C · Hai bước: bắt buộc rồi tùy chọn',
      tag: '',
      why: 'Bước 1 chỉ hỏi hai thứ bắt buộc (tên, ngôn ngữ) và tạo được ngay; bước 2 là phần tùy chọn, bỏ qua được.',
      uu: [
        'Tạo tác phẩm xong trong hai lần gõ, không phải lướt qua năm trường tùy chọn',
        'Nói thẳng trường nào bắt buộc, không cần dấu sao hay chữ "(tùy chọn)" lặp lại'
      ],
      nhuoc: [
        'Người muốn điền hết phải đi qua hai màn thay vì một',
        'Thêm một khái niệm "bước" chỉ cho một form sáu trường — dễ thành rườm rà',
        'Sửa lại thông tin đã nhập ở bước 1 phải quay lui'
      ],
      hopkhi: 'Nếu thực tế cho thấy hầu hết người dùng bỏ trống phần tùy chọn.',
      render: (tt) =>
        createShell(
          `<div class="mx-auto flex max-w-[560px] flex-col gap-4 px-5 py-6">
             <div class="flex items-center gap-2 text-[12px]">
               <span class="flex items-center gap-1.5 font-semibold"><span class="grid size-5 place-items-center rounded-full bg-primary text-[11px] text-primary-foreground">1</span>Bắt buộc</span>
               <span class="h-px w-6 bg-line-strong"></span>
               <span class="flex items-center gap-1.5 text-ink-muted"><span class="grid size-5 place-items-center rounded-full border border-line-strong text-[11px]">2</span>Tùy chọn</span>
             </div>
             <div>
               <h2 class="text-[15px] font-semibold">Tác phẩm này tên gì?</h2>
               <p class="text-xs leading-[1.6] text-ink-muted">Hai thứ này không đổi được dễ dàng về sau; phần còn lại thêm lúc nào cũng được.</p>
             </div>
             ${field(FIELDS[0], { err: tt === 'loi' })}
             ${field(FIELDS[1])}
             <p class="text-[12px] text-ink-muted">Bước sau: ảnh bìa, tên gốc, tác giả, thể loại, mô tả — bỏ qua được.</p>
           </div>`,
          `<div data-wf-block="4" class="flex h-[48px] shrink-0 items-center justify-end gap-2 border-t border-line bg-chrome px-3">
             ${btn('Hủy', { variant: 'secondary' })}
             ${btn('Tạo và bỏ qua phần còn lại', { variant: 'outline' })}
             ${btn('Tiếp tục', { variant: 'primary' })}
           </div>`
        )
    }
  }
}

// ===================================================================
// MÀN 3 — CHI TIẾT TÁC PHẨM
// ===================================================================

const AREAS = [
  ['Chương', false],
  ['Ngữ cảnh', true],
  ['Nguồn', true],
  ['Tác vụ', true]
]
const W = WORKS[0]

const chapterRowD = (c) => `
<li class="grid grid-cols-[40px_minmax(0,1fr)_96px_28px] items-center gap-2 border-b border-line px-2.5 py-1 text-[12.5px] hover:bg-control/60">
  <span class="text-right text-[11px] text-ink-muted">${c.n}</span>
  <span class="flex min-w-0 items-center gap-2">${dot(c.done ? 'bg-success' : 'bg-warning')}<span class="truncate ${c.title ? '' : 'text-ink-muted'}">${esc(c.title || 'Chương ' + c.n)}</span></span>
  <span class="text-[11px] text-ink-muted">${esc(c.day)}</span>
  ${iconBtn('more-horizontal', 'Thao tác với chương ' + c.n, { size: 'size-6' })}
</li>`

const chapterRowWide = (c) => `
<li class="grid grid-cols-[56px_minmax(0,1fr)_132px_36px] items-center gap-2 border-b border-line px-1 py-1 hover:bg-control/60">
  <span class="px-2 text-xs text-ink-muted">${c.n}</span>
  <span class="truncate px-2 py-1.5 text-[13px] ${c.title ? '' : 'text-ink-muted'}">${esc(c.title || 'Chương ' + c.n)}</span>
  <span class="text-xs text-ink-muted">${esc(c.day)}</span>
  ${iconBtn('more-horizontal', 'Thao tác với chương ' + c.n)}
</li>`

const chapterToolbarD = `
<div class="flex h-[36px] shrink-0 items-center gap-2 border-b border-line px-2.5">
  <span class="shrink-0 text-[12px] font-medium">Chương <span class="font-normal text-ink-muted">(12)</span></span>
  <label class="ml-1 flex h-6 min-w-[160px] flex-1 items-center gap-1.5 rounded-control border border-line-strong px-2">
    ${icon('search', 'size-3 shrink-0 text-ink-muted')}
    <input class="min-w-0 flex-1 bg-transparent text-[12px] outline-none placeholder:text-ink-muted" placeholder="Tìm chương hoặc nhập số…" />
  </label>
  <span class="flex shrink-0 items-center gap-1">${btn('Nhập từ .txt', { size: 'sm', variant: 'secondary', ico: 'import' })}${soon()}</span>
  ${btn('Thêm chương', { size: 'sm', variant: 'primary', ico: 'plus' })}
</div>`

const pager = (unit, from, to, total) => `
<nav class="flex h-[36px] shrink-0 items-center justify-between gap-2 border-t border-line px-2.5" aria-label="Phân trang ${unit}">
  <p role="status" class="text-[11px] text-ink-muted">${total === 0 ? 'Không có ' + unit : `${from}–${to} trong ${total} ${unit}`}</p>
  <div class="flex items-center gap-1">
    ${iconBtn('chevron-left', 'Trang trước', { size: 'size-6', variant: 'outline' })}
    ${btn('1', { size: 'sm', variant: 'secondary' })}${btn('2', { size: 'sm', variant: 'outline' })}${btn('3', { size: 'sm', variant: 'outline' })}
    ${iconBtn('chevron-right', 'Trang sau', { size: 'size-6', variant: 'outline' })}
  </div>
</nav>`

const CH_EMPTY = empty(
  'file-text',
  'Chưa có chương nào',
  'Thêm chương đầu tiên để bắt đầu. Văn bản gốc và bản dịch của mỗi chương sẽ nằm ở đây.',
  btn('Thêm chương', { variant: 'primary', ico: 'plus' }) +
    btn('Nhập từ .txt', { variant: 'outline', ico: 'import' }) +
    soon('self-center')
)
const CH_LOADING = loading('Đang tải danh sách chương…')
const CH_FAILED = failed('Không tải được danh sách chương. Không đọc được tệp tác phẩm.')

const chapterBody = (tt, row, toolbar) =>
  tt === 'dang-tai'
    ? CH_LOADING
    : tt === 'loi'
      ? CH_FAILED
      : tt === 'rong'
        ? CH_EMPTY
        : `${toolbar}<ul class="min-h-0 flex-1 overflow-y-auto">${CHAPTERS.map(row).join('')}</ul>${pager('chương', 1, 12, 12)}`

const CHI_TIET = {
  name: 'Chi tiết tác phẩm',
  short: 'Chi tiết',
  states: ['du-lieu', 'dang-tai', 'rong', 'loi'],
  variants: {
    a: {
      name: 'A · Thanh gọn theo nhịp D',
      tag: 'Nhịp D',
      why: 'Header tác phẩm thu thành thanh 42px, khu vực thành thanh 36px; phần còn lại của màn là danh sách chương.',
      uu: [
        'Thấy ~18 chương cùng lúc thay vì ~6 — màn này tồn tại để mở chương',
        'Đúng nhịp của màn chương, nên vào ra một chương không thấy màn nhảy'
      ],
      nhuoc: [
        'Mất ảnh bìa lớn, mô tả và dòng meta — phải mở "Sửa thông tin" mới xem được',
        'Tên tác phẩm dài bị cắt một dòng, chỉ còn tooltip'
      ],
      hopkhi: 'Tác phẩm nhiều chương, và người dịch vào đây để chọn chương chứ không để đọc thông tin.',
      render: (tt) => `
<div class="grid h-full min-h-0 grid-cols-[216px_minmax(0,1fr)] overflow-hidden">
  ${libSidebar()}
  <div class="flex min-h-0 min-w-0 flex-col bg-canvas">
    <div data-wf-block="2" class="flex h-[42px] shrink-0 items-center gap-2 border-b border-line bg-chrome px-2.5">
      ${cover(W, 'h-7 w-[22px]', 'text-[10px]')}
      <h2 class="min-w-0 truncate text-[12.5px] font-semibold">${esc(W.title)}
        <span class="font-normal text-ink-muted">· ${esc(W.short)} → Việt · ${W.chapters} chương · Sửa ${esc(W.day.toLowerCase())} · ${esc(W.time)}</span>
      </h2>
      ${pill(W)}
      <div class="ml-auto flex shrink-0 items-center gap-1">
        ${btn('Tiếp tục · Ch.' + W.lastChapter, { variant: 'primary', ico: 'play' })}
        ${iconBtn('pencil', 'Sửa thông tin', { variant: 'outline' })}
        ${iconBtn('more-horizontal', 'Thao tác khác với tác phẩm')}
      </div>
    </div>
    <div data-wf-block="3" class="flex h-[36px] shrink-0 items-center gap-3 border-b border-line px-2.5">
      <div class="inline-flex items-center gap-[2px] rounded-tab bg-control p-[2px]">
        ${AREAS.map(([label, isSoon], i) => `<span class="flex h-[22px] items-center gap-1 rounded-[7px] px-2.5 text-[12px] ${i === 0 ? 'bg-selected text-ink' : 'text-ink-muted'}">${esc(label)}${isSoon ? `<span class="rounded-[4px] bg-selected px-1 text-[10px]">Sắp có</span>` : ''}</span>`).join('')}
      </div>
    </div>
    <div data-wf-block="4" class="flex min-h-0 flex-1 flex-col overflow-hidden">${chapterBody(tt, chapterRowD, chapterToolbarD)}</div>
  </div>
</div>`
    },
    b: {
      name: 'B · Header đầy đủ + tab (như hiện tại)',
      tag: 'Đang chạy',
      why: 'Giữ bố cục đang có: bìa 120×180, tiêu đề 24px, dòng meta, mô tả, rồi dải tab khu vực và danh sách chương bên dưới.',
      uu: [
        'Mở tác phẩm ra là thấy ngay nó là tác phẩm nào, thuộc thể loại gì',
        'Mô tả và tên gốc đọc được mà không phải mở hộp thoại nào'
      ],
      nhuoc: [
        'Header ăn ~260px chiều cao: danh sách chương bắt đầu gần nửa màn, chỉ thấy ~6 chương',
        'Thông tin tác phẩm gần như không đổi, nhưng chiếm chỗ ở mọi lần mở'
      ],
      hopkhi: 'Tác phẩm ít chương, hoặc người dịch quản nhiều tác phẩm và hay nhầm.',
      render: (tt) => `
<div class="grid h-full min-h-0 grid-cols-[216px_minmax(0,1fr)] overflow-hidden">
  ${libSidebar()}
  <div class="flex min-h-0 min-w-0 flex-col overflow-y-auto bg-canvas">
    <div class="mx-auto flex w-full max-w-[960px] flex-col gap-5 px-5 py-6">
      <header data-wf-block="2" class="flex gap-5">
        ${cover(W, 'h-[180px] w-[120px]', 'text-[44px]')}
        <div class="flex min-w-0 flex-1 flex-col gap-1.5">
          <h2 class="text-[24px] leading-[1.2] font-semibold tracking-[-0.045em]">${esc(W.title)}</h2>
          <p class="text-[14px] text-ink-muted">${esc(W.original)}</p>
          <p class="text-[13px] text-ink-muted">${esc(W.author)} · ${esc(W.genre)}</p>
          <p class="flex flex-wrap items-center gap-1.5 text-xs text-ink-muted">${pill(W)} ${esc(W.short)} → Việt · ${W.chapters} chương · Sửa ${esc(W.day.toLowerCase())} · ${esc(W.time)}</p>
          <p class="max-w-[68ch] text-[13px] leading-[1.6] text-ink-muted">${esc(W.desc)}</p>
          <div class="flex flex-wrap items-center gap-2 pt-1.5">
            ${btn('Tiếp tục · Chương ' + W.lastChapter, { size: 'lg', variant: 'primary', ico: 'play' })}
            ${btn('Sửa thông tin', { size: 'lg', variant: 'outline', ico: 'pencil' })}
            ${iconBtn('more-horizontal', 'Thao tác khác với tác phẩm', { size: 'size-[34px]', variant: 'outline' })}
          </div>
        </div>
      </header>
      <div data-wf-block="3" class="inline-flex w-fit items-center gap-[3px] rounded-tab bg-control p-[3px]">
        ${AREAS.map(([label, isSoon], i) => `<span class="flex h-[27px] items-center gap-1.5 rounded-[8px] px-3 text-[12px] ${i === 0 ? 'bg-selected text-ink' : 'text-ink-muted'}">${esc(label)}${isSoon ? `<span class="rounded-[5px] bg-selected px-1 py-px text-[11px]">Sắp có</span>` : ''}</span>`).join('')}
      </div>
      <div data-wf-block="4" class="flex min-h-[320px] flex-col overflow-hidden rounded-panel border border-line">
        ${chapterBody(tt, chapterRowWide, `<div class="flex flex-wrap items-center gap-3 border-b border-line px-3 py-2.5"><span class="text-[15px] font-semibold tracking-[-0.02em]">Chương <span class="font-normal text-ink-muted">(12)</span></span><label class="flex h-[34px] min-w-[200px] flex-1 items-center gap-1.5 rounded-control border border-line-strong px-2.5">${icon('search', 'size-3.5 shrink-0 text-ink-muted')}<input class="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-ink-muted" placeholder="Tìm chương hoặc nhập số…" /></label><span class="flex items-center gap-1.5">${btn('Nhập từ .txt', { size: 'lg', variant: 'secondary', ico: 'import' })}${soon()}</span>${btn('Thêm chương', { size: 'lg', variant: 'primary', ico: 'plus' })}</div>`)}
      </div>
    </div>
  </div>
</div>`
    },
    c: {
      name: 'C · Khu vực thành cột bên trái',
      tag: '',
      why: 'Bốn khu vực chuyển từ tab ngang thành danh sách dọc trong thanh bên, trả lại toàn bộ chiều cao cho nội dung khu vực.',
      uu: [
        'Khu vực thứ năm, thứ sáu thêm vào không làm tab tràn ngang',
        'Thấy cả bốn khu vực cùng lúc kèm số đếm, không phải bấm từng tab mới biết có gì',
        'Nội dung khu vực được trọn chiều cao, không mất một hàng tab'
      ],
      nhuoc: [
        'Mất ~200px bề ngang cho một danh sách bốn mục mà ba mục đang là "Sắp có"',
        'Thành hai tầng thanh bên (thư viện + khu vực) — dễ lẫn đang ở cấp nào',
        'Khác hẳn màn chương (thanh bên là danh sách chương), nên hai màn không soi gương nhau'
      ],
      hopkhi: 'Khi ba khu vực mock đã làm thật và mỗi khu vực có nội dung đáng kể.',
      render: (tt) => `
<div class="grid h-full min-h-0 grid-cols-[216px_minmax(0,1fr)] overflow-hidden">
  ${libSidebar()}
  <div class="grid min-h-0 min-w-0 grid-cols-[196px_minmax(0,1fr)] bg-canvas">
    <aside data-wf-block="2" class="flex min-h-0 flex-col border-r border-line bg-sidebar">
      <div class="flex h-[42px] shrink-0 items-center gap-2 border-b border-line px-2.5">
        ${cover(W, 'h-6 w-[18px]', 'text-[9px]')}
        <span class="min-w-0 truncate text-[12.5px] font-semibold">${esc(W.title)}</span>
      </div>
      <nav class="flex flex-col gap-px p-1.5" aria-label="Khu vực của tác phẩm">
        ${AREAS.map(([label, isSoon], i) => `<a href="#" class="flex h-[30px] items-center gap-2 rounded-control px-2 text-[12.5px] ${i === 0 ? 'bg-selected text-ink' : 'text-ink-muted'}">${esc(label)}${isSoon ? soon('ml-auto') : `<span class="ml-auto text-[11px] text-ink-muted">12</span>`}</a>`).join('')}
      </nav>
      <div class="mt-auto flex flex-col gap-1 border-t border-line p-2">
        ${btn('Tiếp tục · Ch.' + W.lastChapter, { variant: 'primary', ico: 'play', cls: 'w-full' })}
        ${btn('Sửa thông tin', { variant: 'outline', ico: 'pencil', cls: 'w-full' })}
      </div>
    </aside>
    <div data-wf-block="3" class="flex min-h-0 flex-col overflow-hidden">${chapterBody(tt, chapterRowD, chapterToolbarD)}</div>
  </div>
</div>`
    }
  }
}

// ===================================================================
// MÀN 4 — CHƯƠNG CHƯA CÓ BẢN GỐC
// ===================================================================

const chapterNav = () => `
<aside data-wf-block="1" class="flex min-h-0 flex-col border-r border-line bg-sidebar">
  <div class="flex h-[44px] shrink-0 items-center gap-2 border-b border-line px-2.5">
    <button type="button" class="flex min-w-0 items-center gap-1 rounded-control px-1.5 py-1 text-ink-muted">
      ${icon('chevron-left', 'size-3.5 shrink-0')}
      <span class="truncate text-[12px] font-semibold text-ink">College Girls…</span>
    </button>
  </div>
  <nav class="min-h-0 flex-1 overflow-y-auto p-1.5" aria-label="Danh sách chương">
    ${CHAPTERS.map((c) => `<a href="#" class="flex items-center gap-2 rounded-control px-2 py-1 text-[12.5px] ${c.active ? 'bg-selected text-ink' : 'text-ink-muted hover:bg-selected/60'}">${dot(c.done ? 'bg-success' : 'bg-warning')}<span class="truncate">${c.n}. ${esc(c.title || 'Chương ' + c.n)}</span></a>`).join('')}
  </nav>
</aside>`

const chapterBar = (right) => `
<div data-wf-block="2" class="flex h-[42px] shrink-0 items-center gap-2 border-b border-line bg-chrome px-2.5">
  <h2 class="min-w-0 truncate text-[12.5px] font-semibold">Ch.12 · Đôi mắt ẩn sau thư viện
    <span class="font-normal text-ink-muted">· College Girls and Their Assorted Types · Anh → Việt</span>
  </h2>
  <div class="ml-auto flex shrink-0 items-center gap-1">${right}</div>
</div>`

const PREVIEW_ROWS = [
  [1, 'Quitting halfway through his freshman year didn’t give Itsuki Hashima the time to make many college friends.'],
  [2, 'He had only one real acquaintance left from that era that he bothered to maintain.'],
  [3, 'That was Miyako Shirakawa, aged twenty and now a sophomore.'],
  ['…', '… 84 segment ở giữa …'],
  [88, 'Her flashy looks made her popular throughout grade school, but she had yet to enjoy a steady boyfriend.']
]
const previewList = () => `
<ol class="divide-y divide-line rounded-control border border-line text-[13px]">
  ${PREVIEW_ROWS.map(([n, text]) => `<li class="grid grid-cols-[32px_minmax(0,1fr)] gap-2 px-2 py-1.5 ${n === '…' ? 'justify-items-center text-ink-muted' : ''}"><span class="text-right text-[11px] text-ink-muted">${n === '…' ? '' : n}</span><span class="${n === '…' ? 'text-center text-[12px]' : ''}">${esc(text)}</span></li>`).join('')}
</ol>`

const CHUONG_RONG = {
  name: 'Chương chưa có bản gốc',
  short: 'Chương rỗng',
  states: ['du-lieu', 'dang-tai', 'loi'],
  variants: {
    a: {
      name: 'A · Khối rỗng gọn theo nhịp D',
      tag: 'Nhịp D',
      why: 'Giữ nguyên hai thanh của màn chương, chỉ thay vùng hai pane bằng một khối rỗng — vào và ra khỏi trạng thái này không thấy màn đổi khung.',
      uu: [
        'Chương có bản gốc và chương chưa có nằm trong cùng một khung, chỉ khác ruột',
        'Thanh bên danh sách chương vẫn còn, nhảy sang chương khác được ngay',
        'Hai nút đưa văn bản vào nằm giữa màn, không lẫn với chrome'
      ],
      nhuoc: [
        'Khối rỗng chiếm cả màn chỉ để nói một câu và đưa hai nút',
        'Phải bấm nút rồi mới thấy hộp thoại dán — thêm một bước so với dán thẳng'
      ],
      hopkhi: 'Mặc định — hợp với luồng đã có (dán hoặc chọn tệp, xem trước rồi mới lưu).',
      render: (tt) => `
<div class="grid h-full min-h-0 grid-cols-[216px_minmax(0,1fr)] overflow-hidden">
  ${chapterNav()}
  <div class="flex min-h-0 min-w-0 flex-col bg-canvas">
    ${chapterBar(iconBtn('minimize-2', 'Tập trung', { variant: 'outline' }) + iconBtn('more-horizontal', 'Thêm thao tác chương'))}
    <div data-wf-block="3" class="flex min-h-0 flex-1 flex-col">
      ${
        tt === 'dang-tai'
          ? loading('Đang mở chương…')
          : tt === 'loi'
            ? failed('Không mở được chương. Không tìm thấy chương này; có thể tác phẩm đã bị xóa hoặc di chuyển.', 'Thử lại')
            : empty(
                'file-text',
                'Chương này chưa có bản gốc',
                'Đưa văn bản gốc của chương vào để Mira chia thành các segment. Bạn sẽ xem lại kết quả trước khi lưu.',
                btn('Dán văn bản', { variant: 'primary', ico: 'clipboard' }) +
                  btn('Chọn tệp .txt / .md', { variant: 'outline', ico: 'file-up' })
              )
      }
    </div>
  </div>
</div>`
    },
    b: {
      name: 'B · Hai lối đi cạnh nhau',
      tag: '',
      why: 'Thay một khối rỗng có hai nút bằng hai thẻ ngang nhau, mỗi thẻ nói rõ lối đó hợp khi nào — người mới không phải đoán nên bấm nút nào.',
      uu: [
        'Người lần đầu đọc ra ngay sự khác nhau giữa dán và nhập tệp',
        'Thẻ "Chọn tệp" nhận kéo-thả cả màn, không phải mở hộp thoại trước'
      ],
      nhuoc: [
        'Hai thẻ cùng cỡ nghĩa là không gợi ý lối nào thường dùng hơn',
        'Nhiều chữ hơn hẳn — người đã quen phải đọc lướt qua mỗi lần thêm chương'
      ],
      hopkhi: 'Nếu thấy người dùng mới hay bấm nhầm hoặc hỏi nên dùng cách nào.',
      render: (tt) => `
<div class="grid h-full min-h-0 grid-cols-[216px_minmax(0,1fr)] overflow-hidden">
  ${chapterNav()}
  <div class="flex min-h-0 min-w-0 flex-col bg-canvas">
    ${chapterBar(iconBtn('minimize-2', 'Tập trung', { variant: 'outline' }) + iconBtn('more-horizontal', 'Thêm thao tác chương'))}
    <div data-wf-block="3" class="flex min-h-0 flex-1 flex-col">
      ${
        tt === 'dang-tai'
          ? loading('Đang mở chương…')
          : tt === 'loi'
            ? failed('Không mở được chương. Không tìm thấy chương này; có thể tác phẩm đã bị xóa hoặc di chuyển.')
            : `<div class="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 p-6">
                 <div class="text-center">
                   <p class="text-[14px] font-semibold">Chương này chưa có bản gốc</p>
                   <p class="mt-1 max-w-[520px] text-xs leading-[1.6] text-ink-muted">Đưa văn bản gốc vào để Mira chia thành các segment. Bạn xem lại kết quả trước khi lưu.</p>
                 </div>
                 <div class="grid w-full max-w-[640px] grid-cols-2 gap-3">
                   <div class="flex flex-col items-start gap-2 rounded-panel border border-line bg-sidebar p-3.5">
                     ${icon('clipboard', 'size-5 text-ink-muted')}
                     <p class="text-[13px] font-semibold">Dán văn bản</p>
                     <p class="text-xs leading-[1.55] text-ink-muted">Chép từ web hoặc tài liệu rồi dán thẳng vào. Hợp khi bạn lấy raw từng chương một.</p>
                     ${btn('Dán văn bản', { variant: 'primary', cls: 'mt-1' })}
                   </div>
                   <div class="flex flex-col items-start gap-2 rounded-panel border border-dashed border-line-strong bg-control/40 p-3.5">
                     ${icon('file-up', 'size-5 text-ink-muted')}
                     <p class="text-[13px] font-semibold">Chọn hoặc kéo tệp vào</p>
                     <p class="text-xs leading-[1.55] text-ink-muted">.txt hoặc .md, tối đa 8 MB. Mira tự nhận bảng mã (UTF-8, GB18030, Big5, Shift_JIS…).</p>
                     ${btn('Chọn tệp…', { variant: 'outline', cls: 'mt-1' })}
                   </div>
                 </div>
               </div>`
      }
    </div>
  </div>
</div>`
    },
    c: {
      name: 'C · Dán ngay tại chỗ, xem trước bên cạnh',
      tag: '',
      why: 'Bỏ hộp thoại: ô dán chiếm pane trái, kết quả chia segment hiện luôn ở pane phải — đúng khung hai pane của màn chương.',
      uu: [
        'Thấy ngay văn bản chia ra bao nhiêu segment trong lúc dán, không phải qua hai bước',
        'Dùng lại đúng khung hai pane nên không phải nuôi thêm một hộp thoại rộng 760px',
        'Sửa bảng mã rồi nhìn kết quả đổi tại chỗ'
      ],
      nhuoc: [
        'Cảnh báo "bản gốc hiện có sẽ bị thay" mất chỗ đứng trang trọng của một hộp thoại',
        'Màn này khác hẳn luồng "Thay bản gốc" (vẫn là hộp thoại) — thành hai cách làm cùng một việc',
        'Dán văn bản rất dài làm pane trái giật khi vừa gõ vừa chia lại segment'
      ],
      hopkhi: 'Nếu nhập bản gốc là việc làm hằng ngày chứ không phải một lần mỗi chương.',
      render: (tt) => `
<div class="grid h-full min-h-0 grid-cols-[216px_minmax(0,1fr)] overflow-hidden">
  ${chapterNav()}
  <div class="flex min-h-0 min-w-0 flex-col bg-canvas">
    ${chapterBar(btn('Lưu bản gốc', { variant: 'primary', ico: 'save' }) + iconBtn('more-horizontal', 'Thêm thao tác chương'))}
    <div class="flex h-[36px] shrink-0 items-center gap-3 border-b border-line px-2.5 text-[12px] text-ink-muted">
      <span class="text-ink">Nhập bản gốc</span>
      <span class="h-4 w-px bg-line"></span>
      <span>Bảng mã: <span class="text-ink">UTF-8</span> · UTF-8 hợp lệ</span>
    </div>
    <div data-wf-block="3" class="grid min-h-0 flex-1 grid-cols-2 gap-3 p-3">
      ${
        tt === 'dang-tai'
          ? loading('Đang mở chương…')
          : tt === 'loi'
            ? failed('Văn bản dài 1.284.900 ký tự, vượt giới hạn 1.000.000 của một chương. Hãy tách thành nhiều chương.', 'Chọn tệp khác')
            : `<section class="flex min-h-0 flex-col gap-2 rounded-panel border border-line bg-sidebar p-3">
                 <div class="flex items-center justify-between gap-2">
                   <h3 class="text-[13px] font-semibold">Văn bản gốc <span class="font-normal text-ink-muted">EN · 1.248 ký tự</span></h3>
                   ${btn('Chọn tệp…', { size: 'sm', variant: 'outline', ico: 'file-up' })}
                 </div>
                 <textarea class="min-h-0 flex-1 resize-none rounded-control bg-transparent text-[14px] leading-[1.75] outline-none" placeholder="Dán nội dung chương vào đây, hoặc kéo tệp .txt / .md vào màn này…">Quitting halfway through his freshman year didn’t give Itsuki Hashima the time to make many college friends. He had only one real acquaintance left from that era that he bothered to maintain.

That was Miyako Shirakawa, aged twenty and now a sophomore.</textarea>
               </section>
               <section class="flex min-h-0 flex-col gap-2 rounded-panel border border-line bg-sidebar p-3">
                 <div class="flex items-center justify-between gap-2">
                   <h3 class="text-[13px] font-semibold">Xem trước segment <span class="font-normal text-ink-muted">88 segment</span></h3>
                   <span class="flex items-center gap-1 rounded-full bg-control px-2 py-0.5 text-[11px] text-ink-muted">${icon('check', 'size-3')}Văn bản được giữ nguyên</span>
                 </div>
                 <div class="min-h-0 flex-1 overflow-y-auto pr-1">
                   <div class="mb-2 flex items-center gap-2 rounded-control border border-warning/40 bg-warning/10 px-2.5 py-1.5 text-[12px] text-warning">
                     ${icon('alert-triangle', 'size-3.5 shrink-0')}3 segment dài bất thường (trên 1.000 ký tự). Vẫn nhập được.
                   </div>
                   ${previewList()}
                 </div>
               </section>`
      }
    </div>
  </div>
</div>`
    }
  }
}

// ===================================================================
// MÀN 5 — TỪNG CÂU
// ===================================================================

const counts = (size) => `
<p role="status" aria-label="Số hàng theo trạng thái" class="flex flex-wrap items-center gap-x-3 gap-y-1 ${size}">
  ${COUNTS.map(([k, label, n]) => `<span class="flex items-center gap-1.5 whitespace-nowrap text-ink-muted">${dot(ROW_STATES[k].dot)}${esc(label)} <span class="text-ink">${n}</span></span>`).join('')}
</p>`

const rowD = (r) => `
<li class="grid grid-cols-[36px_minmax(0,1fr)_minmax(0,1fr)] items-start gap-x-3 border-b border-line px-2.5 py-2 ${r.active ? 'bg-control/50' : ''}">
  <span class="pt-0.5 text-right text-[11px] text-ink-muted">${r.n}</span>
  <p lang="en" class="text-[13px] leading-[1.65] break-words">${esc(r.src)}</p>
  <div class="flex flex-col gap-1">
    <div class="min-h-[22px] rounded-control ${r.active ? 'ring-2 ring-focus/40' : ''} text-[13px] leading-[1.65] ${r.vi ? '' : 'text-ink-muted'}">${esc(r.vi || 'Nhập bản dịch…')}</div>
    <p class="flex items-center gap-1.5 text-[11px] text-ink-muted">${dot(ROW_STATES[r.state].dot)}${esc(ROW_STATES[r.state].label)}</p>
  </div>
</li>`

const rowWide = (r) => `
<li class="grid grid-cols-[44px_minmax(0,1fr)_minmax(0,1fr)] items-start gap-x-4 border-b border-line px-3 py-3 ${r.active ? 'bg-control/50' : ''}">
  <span class="pt-0.5 text-right text-xs text-ink-muted">${r.n}</span>
  <p lang="en" class="text-[14px] leading-[1.7] break-words">${esc(r.src)}</p>
  <div class="flex flex-col gap-1.5">
    <div class="min-h-6 rounded-control ${r.active ? 'ring-2 ring-focus/40' : ''} text-[14px] leading-[1.7] ${r.vi ? '' : 'text-ink-muted'}">${esc(r.vi || 'Nhập bản dịch…')}</div>
    <p class="flex items-center gap-1.5 text-xs text-ink-muted">${dot(ROW_STATES[r.state].dot)}${esc(ROW_STATES[r.state].label)}</p>
  </div>
</li>`

const sentenceShell = (bars, body) => `
<div class="grid h-full min-h-0 grid-cols-[216px_minmax(0,1fr)] overflow-hidden">
  ${chapterNav()}
  <div class="flex min-h-0 min-w-0 flex-col bg-canvas">
    ${chapterBar(iconBtn('minimize-2', 'Tập trung', { variant: 'outline' }) + iconBtn('more-horizontal', 'Thêm thao tác chương'))}
    ${bars}
    ${body}
  </div>
</div>`

const modeBar = (extra = '') => `
<div class="flex h-[36px] shrink-0 items-center gap-3 border-b border-line px-2.5">
  <div class="inline-flex items-center gap-[2px] rounded-tab bg-control p-[2px]">
    <span class="rounded-[7px] px-2.5 py-0.5 text-[12px] text-ink-muted">Toàn văn</span>
    <span class="rounded-[7px] bg-selected px-2.5 py-0.5 text-[12px] text-ink">Từng câu</span>
  </div>
  <span class="h-4 w-px shrink-0 bg-line"></span>
  ${extra}
</div>`

const TC_LOADING = loading('Đang đọc các hàng…')
const TC_FAILED = failed('Không đọc được các hàng. Không đọc được tệp tác phẩm.')
const TC_EMPTY = empty(
  'rows-3',
  'Chương này chưa có hàng nào',
  'Hàng được dựng từ các segment của bản gốc. Nhập bản gốc cho chương để bắt đầu soát từng câu.',
  btn('Nhập bản gốc', { variant: 'primary', ico: 'clipboard' })
)

const TUNG_CAU = {
  name: 'Từng câu',
  short: 'Từng câu',
  states: ['du-lieu', 'dang-tai', 'rong', 'loi'],
  variants: {
    a: {
      name: 'A · Bảng gọn theo nhịp D',
      tag: 'Nhịp D',
      why: 'Chip đếm và nút nhảy hàng nằm luôn trên thanh mode 36px; hàng co lại còn 13px/py-2 nên thấy nhiều câu hơn trong một màn.',
      uu: [
        'Thấy ~12 hàng cùng lúc thay vì ~7 — soát theo mạch, ít cuộn hơn',
        'Không có thanh công cụ riêng, nên chiều cao chrome bằng đúng mode Toàn văn',
        'Chuyển Toàn văn ↔ Từng câu không thấy khung nhảy'
      ],
      nhuoc: [
        'Chữ 13px cho câu dịch nhỏ hơn 14px của mode Toàn văn — đọc lâu dễ mỏi',
        'Chip đếm chen trên thanh 36px, màn hẹp sẽ phải cắt bớt'
      ],
      hopkhi: 'Soát lại bản AI đã dịch, chủ yếu là đọc và gật — ít gõ lại từ đầu.',
      render: (tt) =>
        sentenceShell(
          modeBar(
            `${counts('text-[11px]')}<div class="ml-auto shrink-0">${btn('Hàng cần xử lý kế tiếp', { size: 'sm', variant: 'secondary', ico: 'arrow-down' })}</div>`
          ),
          `<div data-wf-block="3" class="flex min-h-0 flex-1 flex-col p-3">
             <div class="flex min-h-0 flex-1 flex-col overflow-hidden rounded-panel border border-line bg-sidebar">
               ${tt === 'dang-tai' ? TC_LOADING : tt === 'loi' ? TC_FAILED : tt === 'rong' ? TC_EMPTY : `<ol class="min-h-0 flex-1 overflow-y-auto">${ROWS.map(rowD).join('')}${ROWS.map(rowD).join('')}</ol>${pager('hàng', 101, 150, 237)}`}
             </div>
           </div>`
        )
    },
    b: {
      name: 'B · Hàng rộng (như hiện tại)',
      tag: 'Đang chạy',
      why: 'Giữ nguyên: chip đếm và nút nằm trên một thanh công cụ riêng, hàng 14px/py-3 cùng cỡ chữ với mode Toàn văn.',
      uu: [
        'Câu gốc và câu dịch cùng cỡ 14px với mode Toàn văn — đọc lâu không mỏi',
        'Chip đếm có chỗ rộng rãi, không bị cắt ở màn hẹp',
        'Không phải dựng lại gì'
      ],
      nhuoc: [
        'Thanh công cụ riêng ăn thêm một hàng, chỉ thấy ~7 hàng mỗi màn',
        'Chuyển từ Toàn văn sang là thấy chrome dày thêm một tầng'
      ],
      hopkhi: 'Người dịch gõ lại nhiều câu từ đầu chứ không chỉ soát.',
      render: (tt) =>
        sentenceShell(
          modeBar(
            `<div class="flex items-center gap-3 text-[12px] text-ink-muted"><span>Thuật ngữ</span><span>Xưng hô</span><span>Văn phong</span>${soon()}</div>`
          ) +
            `<div class="flex shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-line px-3 py-2.5">
               ${counts('text-xs')}
               ${btn('Hàng cần xử lý kế tiếp', { size: 'lg', variant: 'secondary', ico: 'arrow-down' })}
             </div>`,
          `<div data-wf-block="3" class="flex min-h-0 flex-1 flex-col p-3">
             <div class="flex min-h-0 flex-1 flex-col overflow-hidden rounded-panel border border-line">
               ${tt === 'dang-tai' ? TC_LOADING : tt === 'loi' ? TC_FAILED : tt === 'rong' ? TC_EMPTY : `<ol class="min-h-0 flex-1 overflow-y-auto">${ROWS.map(rowWide).join('')}${ROWS.map(rowWide).join('')}</ol>${pager('hàng', 101, 150, 237)}`}
             </div>
           </div>`
        )
    },
    c: {
      name: 'C · Có lọc, và panel phụ dưới hàng',
      tag: 'Backlog',
      why: 'Thêm hai thứ đã nằm trong backlog (`sentence-mode-toolbar`, `sentence-mode-side-panels`): tìm/lọc riêng cho gốc và dịch, và panel Gợi ý / Thuật ngữ / Lịch sử / QA của đúng hàng đang chọn.',
      uu: [
        'Lọc được "chỉ hàng cần kiểm tra" thay vì nhảy từng hàng một',
        'Gợi ý từ bản dịch cũ hiện ngay dưới hàng đang sửa, không phải tra tay',
        'Gần với công cụ CAT mà người dịch đã quen (ảnh tham chiếu SmartCat)'
      ],
      nhuoc: [
        'Hai khối mới ăn ~180px: vùng hàng chỉ còn ~5 hàng trên màn 900px',
        'Cả hai khối còn là "Sắp có" — dựng khung trước khi có dữ liệu thì chỉ là chỗ trống có viền',
        'Lọc và panel là hai lát cắt riêng, gộp vào một phương án dễ thành làm nửa vời cả hai'
      ],
      hopkhi: 'Sau khi job dịch AI chạy thật và có bản dịch cũ để lấy gợi ý.',
      render: (tt) =>
        sentenceShell(
          modeBar(
            `${counts('text-[11px]')}<div class="ml-auto shrink-0">${btn('Hàng cần xử lý kế tiếp', { size: 'sm', variant: 'secondary', ico: 'arrow-down' })}</div>`
          ) +
            `<div class="flex h-[36px] shrink-0 items-center gap-1.5 border-b border-line px-2.5">
               <label class="flex h-6 min-w-[120px] flex-1 items-center gap-1.5 rounded-control border border-line-strong px-2">${icon('search', 'size-3 shrink-0 text-ink-muted')}<input class="min-w-0 flex-1 bg-transparent text-[12px] outline-none placeholder:text-ink-muted" placeholder="Tìm trong bản gốc…" /></label>
               <label class="flex h-6 min-w-[120px] flex-1 items-center gap-1.5 rounded-control border border-line-strong px-2">${icon('search', 'size-3 shrink-0 text-ink-muted')}<input class="min-w-0 flex-1 bg-transparent text-[12px] outline-none placeholder:text-ink-muted" placeholder="Tìm trong bản dịch…" /></label>
               ${btn('Mọi trạng thái', { size: 'sm', variant: 'outline', ico: 'filter' })}
               ${btn('Gộp', { size: 'sm', variant: 'outline' })}
               ${btn('Tách', { size: 'sm', variant: 'outline' })}
               ${soon()}
             </div>`,
          `<div data-wf-block="3" class="flex min-h-0 flex-1 flex-col gap-3 p-3">
             <div class="flex min-h-0 flex-1 flex-col overflow-hidden rounded-panel border border-line bg-sidebar">
               ${tt === 'dang-tai' ? TC_LOADING : tt === 'loi' ? TC_FAILED : tt === 'rong' ? TC_EMPTY : `<ol class="min-h-0 flex-1 overflow-y-auto">${ROWS.map(rowD).join('')}${ROWS.map(rowD).join('')}</ol>`}
             </div>
             <div data-wf-block="4" class="flex h-[150px] shrink-0 flex-col gap-2 rounded-panel border border-line bg-sidebar p-2.5">
               <div class="flex items-center gap-3 text-[12px]">
                 <span class="rounded-[7px] bg-selected px-2 py-0.5 text-ink">Gợi ý <span class="text-ink-muted">(1)</span></span>
                 <span class="text-ink-muted">Thuật ngữ <span class="opacity-60">(3)</span></span>
                 <span class="text-ink-muted">Lịch sử</span>
                 <span class="text-ink-muted">QA <span class="opacity-60">(2)</span></span>
                 ${soon('ml-auto')}
               </div>
               <div class="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-start gap-3 overflow-y-auto rounded-control border border-line p-2.5 text-[12px]">
                 <p>also warden of the almshouses, if the bishop in each case approved.</p>
                 <p>cũng là người quản lý nhà tế bần, nếu giám mục trong mỗi trường hợp chấp thuận.</p>
                 <span class="flex items-center gap-2">${btn('Chèn', { size: 'xs', variant: 'outline' })}<span class="text-[11px] text-success">100% khớp</span></span>
               </div>
             </div>
           </div>`
        )
    }
  }
}

export const SCREENS = {
  'thu-vien': THU_VIEN,
  'tao-tac-pham': TAO_TAC_PHAM,
  'chi-tiet': CHI_TIET,
  'chuong-rong': CHUONG_RONG,
  'tung-cau': TUNG_CAU
}

export const STATE_LABELS = {
  'du-lieu': 'Có dữ liệu',
  'dang-tai': 'Đang tải',
  rong: 'Rỗng',
  loi: 'Lỗi',
  'dang-gui': 'Đang gửi'
}
