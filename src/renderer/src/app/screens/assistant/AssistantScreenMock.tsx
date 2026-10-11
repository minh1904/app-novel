import type { JSX } from 'react'
import {
  AddIcon,
  ArrowUpIcon,
  ChecklistMinimalisticIcon,
  MinimalisticMagnifierIcon
} from '@renderer/components/ui/reicon'

import { TopBarTitle } from '../../../components/ui/TopBarActions'
import { Badge } from '../../../components/ui/Badge'
import { Button } from '../../../components/ui/Button'
import { CompactButton } from '../../../components/ui/CompactButton'
import { ICON } from '../../../components/ui/icon'
import { NavItem } from '../../../components/ui/NavItem'
import { Textarea } from '../../../components/ui/Textarea'
import { SOON_LABEL } from '../../../lib/mockFeatures'

/** Dữ liệu mẫu cố định: danh sách các cuộc trò chuyện trước đó không gắn với chương cụ thể nào. */
const CHATS = [
  { title: 'Cách dịch 道友 ở 3 truyện', time: '10:12' },
  { title: 'Điển cố “nhất nhật bất kiến như cách tam thu”', time: 'Hôm qua' },
  { title: 'Gợi ý tên Việt cho 4 pháp bảo', time: '02/10' },
  { title: 'Kiểm xưng hô Hàn Lập – Nam Cung Uyển', time: '29/09' }
]

const ROWS = [
  { work: 'Phàm Nhân Tu Tiên', how: 'đạo hữu', count: '1.180' },
  { work: 'Kiếm Lai', how: 'đạo hữu · bạn (9)', count: '61', odd: true },
  { work: 'Đạo Quỷ Dị Tiên', how: 'chưa dịch', count: '6' }
]

/**
 * Giao diện mẫu của trợ lý AI ngoài phạm vi chương: hỗ trợ tra cứu toàn bộ thư viện, so sánh cách dịch,
 * giải thích điển cố và tạo đề xuất chỉnh sửa.
 * Hiện hiển thị giao diện minh họa và chưa gửi dữ liệu đến mô hình AI.
 */
export function AssistantScreenMock(): JSX.Element {
  return (
    <div className="flex h-full min-h-0">
      <TopBarTitle
        note={
          <span className="inline-flex items-center gap-xs">
            <Badge color="accent">{SOON_LABEL}</Badge>Không gắn với chương nào
          </span>
        }
      >
        Trợ lý AI
      </TopBarTitle>
      <nav
        aria-label="Cuộc trò chuyện"
        className="flex w-[260px] shrink-0 flex-col gap-2xs border-r border-default bg-surface p-xs"
      >
        <Button disabled leftIcon={<AddIcon size={ICON.sm} />}>
          Cuộc trò chuyện mới
        </Button>
        <div className="h-xs" />
        {CHATS.map((chat, index) => (
          <NavItem
            key={chat.title}
            active={index === 0}
            disabled={index !== 0}
            trailing={<span className="text-label-xs text-muted">{chat.time}</span>}
          >
            {chat.title}
          </NavItem>
        ))}
      </nav>

      <div className="flex min-w-0 flex-1 flex-col bg-default">
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto flex w-full max-w-[720px] flex-col gap-lg px-xl py-xl">
            <div className="self-end rounded-lg bg-muted px-sm py-xs text-body-sm">
              Ở 3 truyện tu tiên mình dịch 道友 thế nào? Có chỗ nào không thống nhất không?
            </div>
            <div className="flex flex-col gap-sm">
              <div className="flex items-center gap-xs text-body-xs text-muted">
                <MinimalisticMagnifierIcon size={ICON.xs} aria-hidden="true" />
                Tìm 道友 trong Phàm Nhân Tu Tiên, Kiếm Lai, Đạo Quỷ Dị Tiên · 1.247 chỗ
              </div>
              <p className="m-0 text-body-sm">
                Phần lớn bạn dịch là <b>đạo hữu</b>. Kiếm Lai có 9 chỗ dịch là <b>bạn</b>, đều ở
                chương 40–52, có lẽ trước khi bạn thêm 道友 vào Tu tiên chung.
              </p>
              <table className="w-full border-separate border-spacing-0 overflow-hidden rounded-md border border-default bg-surface text-left text-body-sm">
                <thead className="bg-subtle">
                  <tr>
                    <th className="px-sm py-2xs text-label-xs text-subtle">Tác phẩm</th>
                    <th className="px-sm py-2xs text-label-xs text-subtle">Cách dịch</th>
                    <th className="px-sm py-2xs text-right text-label-xs text-subtle">Số chỗ</th>
                  </tr>
                </thead>
                <tbody>
                  {ROWS.map((row) => (
                    <tr key={row.work}>
                      <td className="border-t border-subtle px-sm py-2xs">{row.work}</td>
                      <td
                        className={
                          row.odd
                            ? 'border-t border-subtle px-sm py-2xs text-warning'
                            : 'border-t border-subtle px-sm py-2xs'
                        }
                      >
                        {row.how}
                      </td>
                      <td className="border-t border-subtle px-sm py-2xs text-right tabular-nums">
                        {row.count}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex items-center gap-sm rounded-md border border-default bg-surface px-sm py-xs">
                <span className="text-warning">
                  <ChecklistMinimalisticIcon size={ICON.sm} aria-hidden="true" />
                </span>
                <span className="flex-1 text-body-sm">
                  9 đề xuất sửa “bạn” thành “đạo hữu” ở Kiếm Lai
                </span>
                <Button disabled>Xem 9 đề xuất</Button>
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto w-full max-w-[720px] px-xl pb-lg">
          <div className="flex flex-col gap-xs rounded-lg border border-input bg-surface p-xs shadow-xs">
            <Textarea
              disabled
              rows={2}
              className="min-h-0 resize-none border-0"
              placeholder="Hỏi về điển cố, so sánh cách dịch giữa các truyện, nhờ tìm và sửa…"
            />
            <div className="flex items-center gap-xs">
              <Badge>Phạm vi: cả thư viện</Badge>
              <Badge>gemini-3.5-flash</Badge>
              <div className="flex-1" />
              <CompactButton
                disabled
                variant="dark"
                aria-label="Gửi"
                icon={<ArrowUpIcon size={ICON.sm} />}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
