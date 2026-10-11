/**
 * Các thuật toán thống kê cho hệ thống đo đạc (Cohen's Kappa, khoảng tin cậy bootstrap, PRNG có seed).
 * Các hàm thuần túy không phụ thuộc Node/DOM.
 */

/**
 * Bộ sinh số ngẫu nhiên giả (PRNG) sử dụng thuật toán mulberry32 với seed cố định để đảm bảo tính tất định.
 */
export function createPrng(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Tính hệ số Cohen's Kappa giữa hai người chấm trên các phân loại ['A', 'B', 'tie'].
 */
export function computeCohenKappa(
  rater1: Array<'A' | 'B' | 'tie'>,
  rater2: Array<'A' | 'B' | 'tie'>
): { kappa: number; observedAgreement: number; expectedAgreement: number } {
  if (rater1.length !== rater2.length || rater1.length === 0) {
    return { kappa: 0, observedAgreement: 0, expectedAgreement: 0 }
  }

  const n = rater1.length
  let agreeCount = 0

  const counts1: Record<'A' | 'B' | 'tie', number> = { A: 0, B: 0, tie: 0 }
  const counts2: Record<'A' | 'B' | 'tie', number> = { A: 0, B: 0, tie: 0 }

  for (let i = 0; i < n; i++) {
    const v1 = rater1[i]
    const v2 = rater2[i]
    if (v1 === v2) agreeCount++
    counts1[v1]++
    counts2[v2]++
  }

  const pO = agreeCount / n

  // Tỷ lệ đồng thuận kỳ vọng pE
  const pE =
    (counts1.A / n) * (counts2.A / n) +
    (counts1.B / n) * (counts2.B / n) +
    (counts1.tie / n) * (counts2.tie / n)

  if (Math.abs(1 - pE) < 1e-9) {
    return { kappa: 1.0, observedAgreement: pO, expectedAgreement: pE }
  }

  const kappa = (pO - pE) / (1 - pE)
  return {
    kappa: Math.max(-1, Math.min(1, kappa)),
    observedAgreement: pO,
    expectedAgreement: pE
  }
}

/**
 * Khoảng tin cậy bootstrap cho tỷ lệ thắng tái lấy mẫu ở cấp độ chương.
 * Mặc định 2000 lần tái lấy mẫu, seed = 42 để đảm bảo tính tất định.
 */
export function bootstrapWinRateCI(
  chapterStats: Array<{ aWins: number; bWins: number }>,
  options?: { resamples?: number; seed?: number }
): { mean: number; lower: number; upper: number } {
  const numChapters = chapterStats.length
  if (numChapters === 0) {
    return { mean: 0.5, lower: 0.5, upper: 0.5 }
  }

  const resamples = options?.resamples ?? 2000
  const rng = createPrng(options?.seed ?? 42)

  const sampleRates: number[] = []

  for (let b = 0; b < resamples; b++) {
    let totalA = 0
    let totalB = 0

    for (let c = 0; c < numChapters; c++) {
      const idx = Math.floor(rng() * numChapters)
      totalA += chapterStats[idx].aWins
      totalB += chapterStats[idx].bWins
    }

    const totalDecided = totalA + totalB
    if (totalDecided > 0) {
      sampleRates.push(totalA / totalDecided)
    } else {
      sampleRates.push(0.5)
    }
  }

  sampleRates.sort((a, b) => a - b)

  const lowerIdx = Math.floor(resamples * 0.025)
  const upperIdx = Math.floor(resamples * 0.975)
  const mean = sampleRates.reduce((acc, v) => acc + v, 0) / sampleRates.length

  return {
    mean,
    lower: sampleRates[lowerIdx],
    upper: sampleRates[upperIdx]
  }
}
