/**
 * Deezer API - BPM lookup fallback when AcousticBrainz has no data.
 * No key data from Deezer.
 * Uses CORS proxy because Deezer API blocks direct browser requests.
 */

const DEEZER_BASE = 'https://api.deezer.com'
/** CORS proxy - Deezer blocks direct fetch from browser origins */
const CORS_PROXY = 'https://corsproxy.io/'

/** Be respectful: delay between fallback lookups (used by caller) */
export const DEEZER_MS_DELAY = 300

function proxiedUrl(url: string): string {
  return `${CORS_PROXY}?url=${encodeURIComponent(url)}`
}

/**
 * Search Deezer by artist + title, fetch track for BPM.
 * Returns BPM or null.
 */
export async function searchDeezerForBpm(
  artist: string,
  title: string
): Promise<number | null> {
  if (!artist?.trim() || !title?.trim()) return null

  try {
    const query = `artist:"${artist.replace(/"/g, '')}" track:"${title.replace(/"/g, '')}"`
    const searchUrl = `${DEEZER_BASE}/search?q=${encodeURIComponent(query)}&limit=1`
    const searchRes = await fetch(proxiedUrl(searchUrl))
    if (!searchRes.ok) return null

    const searchData = await searchRes.json()
    const trackId = searchData.data?.[0]?.id
    if (!trackId) return null

    const trackUrl = `${DEEZER_BASE}/track/${trackId}`
    const trackRes = await fetch(proxiedUrl(trackUrl))
    if (!trackRes.ok) return null

    const track = await trackRes.json()
    const bpm = track.bpm
    if (typeof bpm === 'number' && bpm > 0 && bpm < 300) return bpm
    return null
  } catch {
    return null
  }
}
