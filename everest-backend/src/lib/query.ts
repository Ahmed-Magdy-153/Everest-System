/**
 * Safe Express query-param helpers.
 * req.query values are typed as string | string[] | ParsedQs | ... in Express 5.
 * These helpers extract a plain string or number, ignoring arrays/objects.
 */

export function str(val: unknown): string | undefined {
  if (typeof val === 'string') return val
  if (Array.isArray(val) && typeof val[0] === 'string') return val[0]
  return undefined
}

export function num(val: unknown): number | undefined {
  const s = str(val)
  if (!s) return undefined
  const n = parseInt(s, 10)
  return isNaN(n) ? undefined : n
}
