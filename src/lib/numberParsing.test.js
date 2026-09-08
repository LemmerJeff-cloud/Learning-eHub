import { describe, it, expect } from 'vitest'
import { parseLocaleNumber } from './numberParsing'

describe('parseLocaleNumber', () => {
  it('treats the point as a thousands separator', () => {
    expect(parseLocaleNumber('12.500')).toBe(12500)
  })
  it('treats the comma as the decimal separator', () => {
    expect(parseLocaleNumber('12,5')).toBe(12.5)
  })
  it('combines thousands points and a decimal comma', () => {
    expect(parseLocaleNumber('1.234,56')).toBe(1234.56)
  })
  it('strips spaces used as thousands separators', () => {
    expect(parseLocaleNumber('1 234,5')).toBe(1234.5)
  })
  it('accepts a leading minus sign', () => {
    expect(parseLocaleNumber('-3,2')).toBe(-3.2)
  })
  it('parses a plain integer', () => {
    expect(parseLocaleNumber('42')).toBe(42)
  })
  it('returns null for an empty string', () => {
    expect(parseLocaleNumber('')).toBeNull()
  })
  it('returns null for null/undefined', () => {
    expect(parseLocaleNumber(null)).toBeNull()
    expect(parseLocaleNumber(undefined)).toBeNull()
  })
  it('returns null for non-numeric text', () => {
    expect(parseLocaleNumber('abc')).toBeNull()
  })
  it('returns null for a trailing comma with no digits', () => {
    expect(parseLocaleNumber('12,')).toBeNull()
  })
})
