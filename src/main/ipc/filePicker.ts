/**
 * Hai hộp thoại hệ thống cần thiết cho sao lưu. Một interface giúp các handler được kiểm thử
 * mà không cần Electron; bản triển khai thật nằm ở electron/registerIpc.ts. Đường dẫn trả về từ lựa chọn
 * của người dùng và không bao giờ nhận trực tiếp từ renderer.
 */
export interface FilePicker {
  /** Trả về đường dẫn đã chọn, hoặc null khi người dùng hủy bỏ. */
  chooseSavePath(suggestedName: string): Promise<string | null>
  chooseOpenPath(): Promise<string | null>
}

/** Sử dụng khi không truyền picker: mọi hộp thoại được coi như bị hủy bỏ. */
export const noFilePicker: FilePicker = {
  chooseSavePath: () => Promise.resolve(null),
  chooseOpenPath: () => Promise.resolve(null)
}
