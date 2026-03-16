/**
 * Track title normalization for search.
 * Strips common suffixes (e.g. "Go West - Radio Edit" → "Go West").
 */

/** Common suffixes to strip for search */
const TITLE_SUFFIXES = [
  'Radio Edit',
  'Radio Mix',
  'Extended Mix',
  'Extended Version',
  'Original Mix',
  'Album Version',
  'Single Version',
  'Clean',
  'Explicit',
  'Instrumental',
  'Acoustic',
  'Live',
  'Deluxe',
  'Remastered',
  'Remaster'
]

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Strip common suffixes from a track title for better search matching.
 * E.g. "Go West - Radio Edit" → "Go West"
 */
export function stripTrackTitleForSearch(title: string): string {
  let s = title.trim()
  for (const suffix of TITLE_SUFFIXES) {
    const escaped = escapeRegex(suffix)
    const dashRe = new RegExp(`\\s*[-–—]\\s*${escaped}\\s*$`, 'i')
    s = s.replace(dashRe, '')
    const parenRe = new RegExp(`\\s*\\([^)]*${escaped}[^)]*\\)\\s*$`, 'i')
    s = s.replace(parenRe, '')
  }
  return s.trim() || title.trim()
}
