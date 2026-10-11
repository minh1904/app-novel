#!/usr/bin/env node
// Live smoke test cho adapter Kakuyomu (Task 8.2).
// Lệnh này HOÀN TOÀN TÙY CHỌN (opt-in ngoài CI), chỉ chạy thủ công khi người dùng muốn kiểm tra
// tính tương thích thực tế với kakuyomu.jp.
// Báo cáo 5 giai đoạn riêng biệt: reachability, identify, metadata, catalog, chapter.
// KHÔNG GHI NỘI DUNG CHƯƠNG VÀO CƠ SỞ DỮ LIỆU HOẶC ĐĨA CỦA MÁY.
//
// Cách chạy:
//   node scripts/smoke-kakuyomu.mjs [URL_TÁC_PHẨM]
import { runKakuyomuSmoke } from '../src/main/sources/kakuyomu/smoke.ts'

const candidateUrl = process.argv[2] || undefined

console.log('=== Mira Kakuyomu Live Smoke Check ===')
if (candidateUrl) {
  console.log(`URL mục tiêu: ${candidateUrl}`)
} else {
  console.log('Sử dụng URL mặc định')
}

const report = await runKakuyomuSmoke({ candidateUrl })

console.log('\n--- Kết quả từng giai đoạn ---')
for (const [stage, res] of Object.entries(report.results)) {
  const padStage = stage.padEnd(14)
  const statusStr = res.status.padEnd(12)
  console.log(`[${statusStr}] ${padStage} : ${res.message}`)
}

console.log('\n------------------------------')
console.log(`Kết quả chung : ${report.overall}`)
console.log(`Thời gian chạy: ${report.durationMs}ms`)
console.log('======================================')

if (report.overall === 'FAIL') {
  process.exit(1)
} else {
  process.exit(0)
}
