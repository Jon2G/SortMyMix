/**
 * BPM lookup via MusicBrainz + AcousticBrainz.
 * Fallback when Spotify audio-features and preview_url are unavailable (Dev Mode).
 */

import type { SpotifyAudioFeatures } from '@/types/spotify'

const MUSICBRAINZ_BASE = 'https://musicbrainz.org/ws/2'
const ACOUSTICBRAINZ_BASE = 'https://acousticbrainz.org/api/v1'
const USER_AGENT = 'SortMyMix/1.0 (https://github.com/sortmymix)'

/** Rate limit: AcousticBrainz allows ~10 req/10s. Use 1 req per 1.5s to be safe. */
const AC_MS_DELAY = 1500
/** MusicBrainz: be respectful, ~1 req/s */
const MB_MS_DELAY = 1100

function escapeLucene(str: string): string {
  return str.replace(/[+\-&|!(){}\[\]^"~*?:\\/]/g, '\\$&').trim()
}

/**
 * Search MusicBrainz for a recording by artist and title.
 * Returns the best matching recording's MBID or null.
 */
export async function searchMusicBrainz(
  artist: string,
  title: string,
  durationMs?: number
): Promise<string | null> {
  if (!artist?.trim() || !title?.trim()) return null

  const q = `recording:"${escapeLucene(title)}" AND artistname:"${escapeLucene(artist)}"`
  const url = `${MUSICBRAINZ_BASE}/recording/?query=${encodeURIComponent(q)}&fmt=json&limit=5&dismax=true`

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT }
    })
    if (!res.ok) return null

    const data = await res.json()
    const recordings = data.recordings
    if (!recordings?.length) return null

    if (durationMs && recordings.length > 1) {
      const best = recordings.reduce((a: { id: string; length?: number }, b: { id: string; length?: number }) => {
        const diffA = a.length ? Math.abs(a.length - durationMs) : Infinity
        const diffB = b.length ? Math.abs(b.length - durationMs) : Infinity
        return diffA <= diffB ? a : b
      })
      return best.id ?? recordings[0].id
    }
    return recordings[0].id ?? null
  } catch {
    return null
  }
}

/**
 * Get BPM from AcousticBrainz for a MusicBrainz recording ID.
 * Uses bulk endpoint (supports up to 25 MBIDs) for efficiency.
 */
export async function getBpmFromAcousticBrainzBulk(
  mbids: string[]
): Promise<Map<string, number>> {
  const result = new Map<string, number>()
  if (mbids.length === 0) return result

  const batchSize = 25
  for (let i = 0; i < mbids.length; i += batchSize) {
    const batch = mbids.slice(i, i + batchSize)
    const ids = batch.join(';')
    const url = `${ACOUSTICBRAINZ_BASE}/low-level?recording_ids=${ids}`

    try {
      const res = await fetch(url)
      if (!res.ok) continue

      const data = await res.json()
      for (const mbid of batch) {
        const key = data.mbid_mapping?.[mbid] ?? mbid.toLowerCase()
        const doc = data[key]?.['0']
        const bpm = doc?.rhythm?.bpm
        if (typeof bpm === 'number' && bpm > 0 && bpm < 300) {
          result.set(mbid, bpm)
        }
      }
    } catch {
      // continue
    }
    if (i + batchSize < mbids.length) await sleep(AC_MS_DELAY)
  }
  return result
}

export interface TrackForLookup {
  id: string
  name: string
  artists: Array<{ name: string }>
  duration_ms?: number
}

/**
 * Look up BPM for tracks via MusicBrainz + AcousticBrainz.
 * Returns Map of trackId -> SpotifyAudioFeatures (tempo only, key: -1).
 */
export async function getBpmForTracks(
  tracks: TrackForLookup[],
  onProgress?: (done: number, total: number) => void
): Promise<Map<string, SpotifyAudioFeatures | null>> {
  const results = new Map<string, SpotifyAudioFeatures | null>()
  const trackToMbid = new Map<string, string>()

  // Phase 1: Search MusicBrainz for each track
  for (let i = 0; i < tracks.length; i++) {
    const t = tracks[i]
    const artist = t.artists?.[0]?.name ?? t.artists?.map(a => a.name).join(', ') ?? ''
    const title = t.name ?? ''

    const mbid = await searchMusicBrainz(artist, title, t.duration_ms)
    if (mbid) trackToMbid.set(t.id, mbid)

    onProgress?.(i + 1, tracks.length)
    if (i < tracks.length - 1) await sleep(MB_MS_DELAY)
  }

  // Phase 2: Batch lookup AcousticBrainz
  const mbids = [...trackToMbid.values()]
  const bpmByMbid = await getBpmFromAcousticBrainzBulk(mbids)

  // Phase 3: Build results
  for (const t of tracks) {
    const mbid = trackToMbid.get(t.id)
    const bpm = mbid ? bpmByMbid.get(mbid) : null
    const features: SpotifyAudioFeatures | null = bpm
      ? {
          id: t.id,
          tempo: bpm,
          key: -1,
          mode: 0,
          energy: 0,
          danceability: 0,
          valence: 0,
          time_signature: 4
        }
      : null
    results.set(t.id, features)
  }

  return results
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
