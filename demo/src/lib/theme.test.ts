import { describe, expect, it } from 'vitest'
import { applyTheme } from './theme'

describe('applyTheme', () => {
  it('sets the data-theme attribute on the document element', () => {
    applyTheme('dark')
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    applyTheme('light')
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
  })
})
