import { describe, expect, it } from 'vitest'
import { fitWithin } from './coverImage'

describe('fitWithin', () => {
  it('shrinks a large portrait image to fit the box, keeping its ratio', () => {
    expect(fitWithin(1200, 1800, 600, 900)).toEqual({ width: 600, height: 900 })
    expect(fitWithin(3000, 4000, 600, 900)).toEqual({ width: 600, height: 800 })
  })

  it('limits by whichever side is tighter', () => {
    expect(fitWithin(2000, 1000, 600, 900)).toEqual({ width: 600, height: 300 })
    expect(fitWithin(500, 3000, 600, 900)).toEqual({ width: 150, height: 900 })
  })

  it('never scales an image up', () => {
    expect(fitWithin(200, 300, 600, 900)).toEqual({ width: 200, height: 300 })
  })

  it('never returns a zero-sized image', () => {
    expect(fitWithin(1, 100000, 600, 900)).toEqual({ width: 1, height: 900 })
    expect(fitWithin(100000, 1, 600, 900)).toEqual({ width: 600, height: 1 })
  })
})
