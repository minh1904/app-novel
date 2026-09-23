import { useState, type JSX } from 'react'
import { Button } from '../../components/Button'
import { Panel } from '../../components/Panel'
import { TabsRoot, TabsList, TabsTab, TabsPanel } from '../../components/Tabs'
import { TextField } from '../../components/TextField'
import { Slider } from '../../components/Slider'
import type { Theme } from '../../app/useTheme'

const modeTabs = [
  { id: 'full', label: 'Toàn văn' },
  { id: 'segments', label: 'Từng câu' }
] as const

export function DesignSystemPreview({ theme }: { theme: Theme }): JSX.Element {
  const [mode, setMode] = useState<string>('full')
  const [density, setDensity] = useState(64)

  return (
    <div className="overflow-auto">
      <div className="mx-auto max-w-[1220px] px-14 pt-[46px] pb-[54px] max-[1100px]:px-8 max-md:px-[18px] max-md:py-8">
        <section className="mb-[52px] max-w-[650px]" id="foundation">
          <p className="mb-2.5 text-[10px] font-semibold tracking-[0.11em] text-ink-muted uppercase">
            Miyati / 01
          </p>
          <h1 className="mb-[15px] text-[clamp(30px,3.2vw,42px)] leading-[1.1] font-semibold tracking-[-0.055em]">
            Workspace foundations
          </h1>
          <p className="text-sm leading-[1.65] text-ink-muted">
            Bộ token và component khởi đầu cho editor dịch thuật trên Windows. Màn này chỉ để đối
            chiếu design system trước khi xây các luồng sản phẩm.
          </p>
        </section>

        <section className="mb-10 border-b border-line pb-[42px]" aria-labelledby="color-title">
          <div className="mb-[22px] flex items-end justify-between gap-5">
            <div>
              <p className="mb-2.5 text-[10px] font-semibold tracking-[0.11em] text-ink-muted uppercase">
                Foundation
              </p>
              <h2 className="text-[19px] font-semibold tracking-[-0.035em]" id="color-title">
                Màu &amp; bề mặt
              </h2>
            </div>
            <span className="whitespace-nowrap text-[11px] text-ink-muted">
              {theme === 'dark' ? 'Dark' : 'Light'} theme
            </span>
          </div>
          <div className="grid grid-cols-5 gap-3 max-md:grid-cols-3">
            <div className="flex min-w-0 flex-col gap-0.5 [&_strong]:text-xs [&_strong]:font-semibold [&_small]:text-[11px] [&_small]:text-ink-muted">
              <span className="mb-[7px] block h-[73px] w-full rounded-control border border-line bg-canvas" />
              <strong>Canvas</strong>
              <small>Nền nội dung</small>
            </div>
            <div className="flex min-w-0 flex-col gap-0.5 [&_strong]:text-xs [&_strong]:font-semibold [&_small]:text-[11px] [&_small]:text-ink-muted">
              <span className="mb-[7px] block h-[73px] w-full rounded-control border border-line bg-sidebar" />
              <strong>Surface</strong>
              <small>Sidebar / card</small>
            </div>
            <div className="flex min-w-0 flex-col gap-0.5 [&_strong]:text-xs [&_strong]:font-semibold [&_small]:text-[11px] [&_small]:text-ink-muted">
              <span className="mb-[7px] block h-[73px] w-full rounded-control border border-line bg-control" />
              <strong>Control</strong>
              <small>Thao tác phụ</small>
            </div>
            <div className="flex min-w-0 flex-col gap-0.5 [&_strong]:text-xs [&_strong]:font-semibold [&_small]:text-[11px] [&_small]:text-ink-muted">
              <span className="mb-[7px] block h-[73px] w-full rounded-control border border-line bg-selected" />
              <strong>Selected</strong>
              <small>Trạng thái chọn</small>
            </div>
            <div className="flex min-w-0 flex-col gap-0.5 [&_strong]:text-xs [&_strong]:font-semibold [&_small]:text-[11px] [&_small]:text-ink-muted">
              <span className="mb-[7px] block h-[73px] w-full rounded-control border border-line bg-primary" />
              <strong>Primary</strong>
              <small>Hành động chính</small>
            </div>
          </div>
        </section>

        <section
          className="mb-10 grid grid-cols-2 gap-3.5 border-b border-line pb-[42px] max-[1100px]:grid-cols-1"
          id="components"
          aria-labelledby="component-title"
        >
          <div className="col-span-full mb-2 flex items-end justify-between gap-5">
            <div>
              <p className="mb-2.5 text-[10px] font-semibold tracking-[0.11em] text-ink-muted uppercase">
                Components
              </p>
              <h2 className="text-[19px] font-semibold tracking-[-0.035em]" id="component-title">
                Thành phần cơ bản
              </h2>
            </div>
            <span className="whitespace-nowrap text-[11px] text-ink-muted">
              Solar Icons · Google Sans Flex
            </span>
          </div>
          <Panel title="Buttons">
            <div className="flex flex-wrap items-center gap-2">
              <Button>Tiếp tục dịch</Button>
              <Button variant="outline">Nhập tài liệu</Button>
              <Button variant="secondary">Lưu bản nháp</Button>
              <Button variant="ghost">Tác vụ khác</Button>
              <Button variant="destructive">Xóa</Button>
              <Button variant="link">Xem chi tiết</Button>
            </div>
            <div className="flex flex-wrap items-center gap-2 border-t border-line pt-4">
              <Button size="xs" variant="outline">
                XS
              </Button>
              <Button size="sm" variant="outline">
                SM
              </Button>
              <Button size="default" variant="outline">
                Default
              </Button>
              <Button size="lg" variant="outline">
                Large
              </Button>
            </div>
          </Panel>
          <Panel title="Fields & states">
            <TextField
              label="Tên tác phẩm"
              placeholder="Nhập tên tác phẩm…"
              hint="Tên có thể đổi sau."
            />
            <Slider label="Mật độ editor" value={density} onChange={setDensity} />
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex h-[22px] items-center rounded-full bg-success/12 px-2 text-[10px] font-semibold whitespace-nowrap text-success">
                Đã lưu
              </span>
              <span className="inline-flex h-[22px] items-center rounded-full bg-warning/12 px-2 text-[10px] font-semibold whitespace-nowrap text-warning">
                Cần kiểm tra
              </span>
              <span className="inline-flex h-[22px] items-center rounded-full bg-error/12 px-2 text-[10px] font-semibold whitespace-nowrap text-error">
                Lỗi lưu
              </span>
            </div>
          </Panel>
        </section>

        <section
          className="mb-10 border-b border-line pb-[42px]"
          id="editor"
          aria-labelledby="editor-title"
        >
          <div className="mb-[22px] flex items-end justify-between gap-5">
            <div>
              <p className="mb-2.5 text-[10px] font-semibold tracking-[0.11em] text-ink-muted uppercase">
                Editor states
              </p>
              <h2 className="text-[19px] font-semibold tracking-[-0.035em]" id="editor-title">
                Bề mặt biên tập
              </h2>
            </div>
            <span className="whitespace-nowrap text-[11px] text-ink-muted">
              Mẫu cấu trúc, chưa có dữ liệu thật
            </span>
          </div>
          <TabsRoot
            value={mode}
            onValueChange={(value) => setMode(String(value))}
            className="overflow-hidden rounded-panel border border-line bg-canvas"
          >
            <div className="flex min-h-[52px] items-center justify-between gap-[15px] border-b border-line bg-chrome px-3.5 py-[9px]">
              <TabsList aria-label="Chế độ biên tập mẫu">
                {modeTabs.map((item) => (
                  <TabsTab key={item.id} value={item.id}>
                    {item.label}
                  </TabsTab>
                ))}
              </TabsList>
              <span className="text-[11px] text-ink-muted">
                {mode === 'full' ? 'Toàn văn · Source' : 'Từng câu · Segment'}
              </span>
            </div>
            <TabsPanel value="full">
              <div className="grid grid-cols-2">
                <div className="min-h-[170px] px-5 py-[18px] text-[13px] leading-[1.7] [&_p]:mb-3 [&_p]:max-w-[56ch]">
                  <span className="mb-4 flex justify-between text-[10px] font-semibold tracking-[0.06em] text-ink-muted uppercase [&_em]:font-medium [&_em]:not-italic">
                    Bản gốc <em>EN</em>
                  </span>
                  <p>When she opened the window, the city was still asleep.</p>
                  <p>Only the first light had reached the roofs across the street.</p>
                </div>
                <div className="min-h-[170px] border-l border-line px-5 py-[18px] text-[13px] leading-[1.7] [&_p]:mb-3 [&_p]:max-w-[56ch]">
                  <span className="mb-4 flex justify-between text-[10px] font-semibold tracking-[0.06em] text-ink-muted uppercase [&_em]:font-medium [&_em]:not-italic">
                    Bản dịch <em>VI</em>
                  </span>
                  <p>Khi cô mở cửa sổ, cả thành phố vẫn còn say ngủ.</p>
                  <p>Những tia nắng đầu tiên mới chạm tới mái nhà bên kia phố.</p>
                </div>
              </div>
            </TabsPanel>
            <TabsPanel value="segments">
              <div className="grid min-h-[106px] grid-cols-[1fr_1fr_auto] items-start gap-4 p-5 leading-[1.6] max-md:grid-cols-1">
                <span className="min-w-0">
                  When she opened the window, the city was still asleep.
                </span>
                <span className="border-l border-line pl-4 max-md:border-t max-md:border-l-0 max-md:px-0 max-md:pt-2.5">
                  Khi cô mở cửa sổ, cả thành phố vẫn còn say ngủ.
                </span>
                <span className="inline-flex h-[22px] items-center rounded-full bg-success/12 px-2 text-[10px] font-semibold whitespace-nowrap text-success">
                  Đã dịch
                </span>
              </div>
            </TabsPanel>
          </TabsRoot>
        </section>
        <p className="-mt-3.5 text-[11px] text-ink-muted">
          Palette Solar Docs · bán kính 10 / 11 / 14 px · font đóng gói local.
        </p>
      </div>
    </div>
  )
}
