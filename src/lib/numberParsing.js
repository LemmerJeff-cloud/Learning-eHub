// Convention comptable lux./frz. : la virgule est le séparateur décimal, le point et
// les espaces (y compris insécables) sont des séparateurs de milliers et sont retirés.
const VALID_NUMBER = /^-?\d+(\.\d+)?$/

export function parseLocaleNumber(raw) {
  if (raw === null || raw === undefined) return null
  const trimmed = String(raw).trim()
  if (!trimmed) return null

  const normalized = trimmed
    .replace(/[\s ]/g, '')
    .replace(/\./g, '')
    .replace(',', '.')

  if (!VALID_NUMBER.test(normalized)) return null
  const value = parseFloat(normalized)
  return Number.isFinite(value) ? value : null
}
