import { describe, expect, it } from 'vitest'

describe('basic tests', () => {
  it('should pass', () => {
    expect(true).toBe(true)
  })

  it('basic math works', () => {
    expect(2 + 2).toBe(4)
  })
})
