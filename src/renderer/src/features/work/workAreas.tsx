import { ChaptersArea } from './ChaptersArea'
import { MockAreaPanel } from './MockAreaPanel'
import { MOCK_FEATURES } from './mockFeatures'
import type { WorkArea } from './workArea'

/**
 * The areas of the work detail screen, in the fixed order of the work-area-navigation change.
 * Chapters is real. The other three are pictures marked "Sắp có" so the finished layout can be
 * seen; each has a row in delivery/backlog.md and becomes real by dropping `soon` and swapping its
 * `render` for the real screen.
 */
export const chaptersArea: WorkArea = {
  id: 'chapters',
  label: 'Chương',
  render: (props) => <ChaptersArea {...props} />
}

export const contextArea: WorkArea = {
  id: MOCK_FEATURES.contextArea.id,
  label: MOCK_FEATURES.contextArea.label,
  soon: true,
  render: () => (
    <MockAreaPanel
      title="Ngữ cảnh dịch"
      summary="Những thứ giúp AI dịch nhất quán trong cả tác phẩm. Chúng sẽ được gom ở đây thay vì tách thành nhiều tab."
      items={[
        {
          name: 'Thuật ngữ',
          detail: 'Tên người, địa danh, chiêu thức: bản gốc, bản dịch và ghi chú.'
        },
        {
          name: 'Xưng hô',
          detail: 'Ai gọi ai là gì, từ chương nào; AI đề xuất cập nhật để bạn duyệt.'
        },
        { name: 'Văn phong', detail: 'Học giọng văn từ bản dịch cũ của bạn.' }
      ]}
    />
  )
}

export const sourcesArea: WorkArea = {
  id: MOCK_FEATURES.sourcesArea.id,
  label: MOCK_FEATURES.sourcesArea.label,
  soon: true,
  render: () => (
    <MockAreaPanel
      title="Nguồn raw"
      summary="Quản lý các bản raw của tác phẩm và chọn nguồn chính để dịch."
      items={[
        { name: 'Nhiều nguồn', detail: 'Bản gốc, bản tiếng Anh hoặc Nhật cho cùng một chương.' },
        { name: 'Nguồn chính', detail: 'Chọn bản nào làm gốc; các bản còn lại để đối chiếu.' },
        { name: 'Nhập raw', detail: 'Dán văn bản hoặc nhập tệp TXT, Markdown cho nhiều chương.' }
      ]}
    />
  )
}

export const jobsArea: WorkArea = {
  id: MOCK_FEATURES.jobsArea.id,
  label: MOCK_FEATURES.jobsArea.label,
  soon: true,
  render: () => (
    <MockAreaPanel
      title="Tác vụ dịch"
      summary="Theo dõi các lượt AI dịch của tác phẩm."
      items={[
        { name: 'Đang chạy', detail: 'Chương nào đang dịch, đã xong bao nhiêu đoạn.' },
        {
          name: 'Lỗi và chạy lại',
          detail: 'Lượt bị lỗi mạng hoặc hết hạn mức, chạy lại từ chỗ dừng.'
        },
        { name: 'Lịch sử', detail: 'Nhà cung cấp, mô hình và chi phí của từng lượt.' }
      ]}
    />
  )
}

export const workAreas: ReadonlyArray<WorkArea> = [chaptersArea, contextArea, sourcesArea, jobsArea]
