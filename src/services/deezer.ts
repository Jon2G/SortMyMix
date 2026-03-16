/**
 * Deezer API - BPM lookup fallback when AcousticBrainz has no data.
 * Uses the official Deezer JavaScript SDK (avoids CORS).
 * No key data from Deezer.
 */
/// <reference types="deezer-sdk" />

/** Be respectful: delay between fallback lookups (used by caller) */
export const DEEZER_MS_DELAY = 300

interface DeezerSearchResponse {
  data?: Array<{ id: number }>
  error?: { message: string }
}

interface DeezerTrackResponse {
  bpm?: number
  error?: { message: string }
}

function getDZ(): DeezerSdk.DZ | undefined {
  return typeof window !== 'undefined' ? (window as Window & { DZ?: DeezerSdk.DZ }).DZ : undefined
}

function deezerReady(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve()
    const dz = getDZ()
    const done = () => {
      const d = getDZ()
      if (d) d.ready(() => resolve())
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

function deezerApi<T>(path: string): Promise<T> {
  return new Promise((resolve) => {
    const dz = getDZ()
    if (typeof window === 'undefined' || !dz) {
      resolve({} as T)
      return
    }
    dz.api(path, (response: T) => resolve(response))
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
    if (!getDZ()) {
      console.error('[Deezer] Deezer SDK not ready')
      return null
    }

    const query = `artist:"${artist.replace(/"/g, '')}" track:"${title.replace(/"/g, '')}"`
    const searchPath = `/search?q=${encodeURIComponent(query)}&limit=1`
    const searchData = await deezerApi<DeezerSearchResponse>(searchPath)
    if (searchData.error) {
      console.error('[Deezer] Error searching for BPM:', searchData.error.message)
      return null
    }

    const trackId = searchData.data?.[0]?.id
    if (!trackId) {
      console.error('[Deezer] No track found for BPM')
      return null
    }

    const track = await deezerApi<DeezerTrackResponse>(`/track/${trackId}`)
    if (track.error) {
      console.error('[Deezer] Error getting track for BPM:', track.error.message)
      return null
    }

    const bpm = track.bpm
    if (typeof bpm === 'number' && bpm > 0 && bpm < 300) return bpm
    {
      console.error('[Deezer] Invalid BPM:', bpm)
      return null
    }
  } catch (err) {
    console.error('[Deezer] Error searching for BPM:', err)
    return null
  }
}
