/**
 * Dữ liệu phục vụ bộ tách câu, tách biệt khỏi mã logic để việc thêm từ viết tắt mới chỉ cần sửa một dòng
 * kèm ca kiểm thử hồi quy tương ứng. Các từ viết tắt được ghi kèm dấu chấm kết thúc.
 */

/** Các dấu mở ngoặc và mở kép. Dấu xuất hiện ở cuối câu sẽ thuộc về câu tiếp theo. */
export const OPENERS = '「『（〈《【〔［｛“‘(['

/**
 * Các từ viết tắt mà dấu chấm phía sau không bao giờ là kết thúc câu: chức danh hoặc danh xưng luôn đi liền với tên riêng theo sau.
 */
export const ABBREVIATIONS_ALWAYS: Record<'en' | 'vi', readonly string[]> = {
  en: ['Mr.', 'Mrs.', 'Ms.', 'Dr.', 'Prof.', 'Sr.', 'Jr.', 'St.', 'vs.'],
  vi: ['TP.', 'Th.S.', 'ThS.', 'TS.', 'PGS.', 'GS.']
}

/**
 * Các từ viết tắt có thể đứng ở cuối câu ("He lived in the U.S. Then he left.").
 * Dấu chấm chỉ không được tính là kết thúc câu khi từ tiếp theo bắt đầu bằng chữ thường hoặc chữ số.
 */
export const ABBREVIATIONS_UNLESS_CAPITAL: Record<'en' | 'vi', readonly string[]> = {
  en: ['U.S.', 'U.K.', 'U.N.'],
  vi: []
}

/** Segment dài hơn mức này (tính theo đơn vị UTF-16) sẽ bị cảnh báo: thường do thiếu dấu kết câu. */
export const LONG_SEGMENT_UNITS = 1000
