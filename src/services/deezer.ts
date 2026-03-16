/**
 * Deezer API - BPM lookup fallback when AcousticBrainz has no data.
 * Uses the official Deezer JavaScript SDK (avoids CORS).
 * No key data from Deezer.
 */

/** Be respectful: delay between fallback lookups (used by caller) */
export const DEEZER_MS_DELAY = 300

interface DeezerApiResponse {
  data?: Array<{ id: number }>
  bpm?: number
  error?: { message: string }
}

interface DeezerSDK {
  ready: (callback: () => void) => void
  api: (path: string, callback: (response: DeezerApiResponse) => void) => void
}

function getDZ(): DeezerSDK | undefined {
  return typeof window !== 'undefined' ? (window as unknown as { DZ?: DeezerSDK }).DZ : undefined
}

function deezerReady(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve()
    const dz = getDZ()
    const done = () => {
      const d = getDZ()
      if (d) d.ready(resolve)
      else resolve()
    }
    if (dz) return done()
    let attempts = 0
    const id = setInterval(() => {
      if (getDZ() || ++attempts > 60) {
        clearInterval(id)
        done()
      }
    }, 50)
  })
}

function deezerApi(path: string): Promise<DeezerApiResponse> {
  return new Promise((resolve) => {
    const dz = getDZ()
    if (typeof window === 'undefined' || !dz) {
      resolve({})
      return
    }
    dz.api(path, (response) => resolve(response))
  })
}

/**
 * Search Deezer by artist + title, fetch track for BPM.
 * Uses the official Deezer JavaScript SDK.
 * Returns BPM or null.
 */
export async function searchDeezerForBpm(
  artist: string,
  title: string
): Promise<number | null> {
  if (!artist?.trim() || !title?.trim()) return null

  try {
    await deezerReady()
    if (!getDZ()) return null

    const query = `artist:"${artist.replace(/"/g, '')}" track:"${title.replace(/"/g, '')}"`
    const searchPath = `/search?q=${encodeURIComponent(query)}&limit=1`
    const searchData = await deezerApi(searchPath)
    if (searchData.error) return null

    const trackId = searchData.data?.[0]?.id
    if (!trackId) return null

    const track = await deezerApi(`/track/${trackId}`)
    if (track.error) return null

    const bpm = track.bpm
    if (typeof bpm === 'number' && bpm > 0 && bpm < 300) return bpm
    return null
  } catch {
    return null
  }
}
