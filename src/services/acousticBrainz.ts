/**
 * BPM and key lookup via MusicBrainz + AcousticBrainz.
 * Fallback when Spotify audio-features are unavailable (Dev Mode).
 */

import { getCachedFeatures, setCachedFeatures } from '@/services/bpmCache'
import { searchDeezerForBpm, DEEZER_MS_DELAY } from '@/services/deezer'
import { stripTrackTitleForSearch } from '@/services/trackTitle'
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
 * Returns up to 5 MBIDs, ordered by best duration match (AcousticBrainz may have one release but not another).
 */
export async function searchMusicBrainz(
  artist: string,
  title: string,
  durationMs?: number
): Promise<string[]> {
  const searchTitle = stripTrackTitleForSearch(title ?? '')
  if (!artist?.trim() || !searchTitle) return []

  const q = `recording:"${escapeLucene(searchTitle)}" AND artistname:"${escapeLucene(artist)}"`
  const url = `${MUSICBRAINZ_BASE}/recording/?query=${encodeURIComponent(q)}&fmt=json&limit=5`

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT }
    })
    if (!res.ok) return []

    const data = await res.json()
    const recordings = data.recordings as Array<{ id: string; length?: number }>
    if (!recordings?.length) return []

    // Sort by duration match (best first), then take up to 5
    const sorted = [...recordings].sort((a, b) => {
      if (!durationMs) return 0
      const diffA = a.length ? Math.abs(a.length - durationMs) : Infinity
      const diffB = b.length ? Math.abs(b.length - durationMs) : Infinity
      return diffA - diffB
    })
    return sorted.slice(0, 5).map((r) => r.id)
  } catch {
    return []
  }
}

/** AcousticBrainz key string to Spotify pitch class (0-11). Spotify: 0=C, 1=C#, 2=D, ..., 11=B */
const KEY_TO_PITCH: Record<string, number> = {
  C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6,
  G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11
}

function parseAcousticBrainzKey(
  keyKey: unknown,
  keyScale: unknown
): { key: number; mode: number } | null {
  const keyStr = typeof keyKey === 'string' ? keyKey.trim() : ''
  const scaleStr = typeof keyScale === 'string' ? keyScale.toLowerCase() : ''
  const pitch = KEY_TO_PITCH[keyStr]
  if (pitch === undefined || pitch < 0 || pitch > 11) return null
  const mode = scaleStr === 'minor' ? 0 : scaleStr === 'major' ? 1 : -1
  if (mode < 0) return null
  return { key: pitch, mode }
}

export interface AcousticBrainzFeatures {
  bpm: number
  key: number
  mode: number
}

/**
 * Get BPM and key from AcousticBrainz for MusicBrainz recording IDs.
 * Uses bulk endpoint (supports up to 25 MBIDs) for efficiency.
 */
export async function getBpmFromAcousticBrainzBulk(
  mbids: string[]
): Promise<Map<string, AcousticBrainzFeatures>> {
  const result = new Map<string, AcousticBrainzFeatures>()
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
        const tonal = doc?.tonal
        const keyKey = tonal?.key_key ?? tonal?.chords_key
        const keyScale = tonal?.key_scale ?? tonal?.chords_scale
        const parsedKey = parseAcousticBrainzKey(keyKey, keyScale)

        if (typeof bpm === 'number' && bpm > 0 && bpm < 300) {
          result.set(mbid, {
            bpm,
            key: parsedKey?.key ?? -1,
            mode: parsedKey?.mode ?? 0
          })
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

function buildFeatures(
  trackId: string,
  ac: AcousticBrainzFeatures | null,
  bpmOnly?: number
): SpotifyAudioFeatures | null {
  if (ac) {
    return {
      id: trackId,
      tempo: ac.bpm,
      key: ac.key,
      mode: ac.mode,
      energy: 0,
      danceability: 0,
      valence: 0,
      time_signature: 4
    }
  }
  if (typeof bpmOnly === 'number' && bpmOnly > 0) {
    return {
      id: trackId,
      tempo: bpmOnly,
      key: -1,
      mode: 0,
      energy: 0,
      danceability: 0,
      valence: 0,
      time_signature: 4
    }
  }
  return null
}

/**
 * Look up BPM and key for tracks via MusicBrainz + AcousticBrainz.
 * Uses localStorage cache; tries multiple MBIDs per track; falls back to Deezer when AcousticBrainz has no data.
 */
export async function getBpmForTracks(
  tracks: TrackForLookup[],
  onProgress?: (done: number, total: number) => void
): Promise<Map<string, SpotifyAudioFeatures | null>> {
  const results = new Map<string, SpotifyAudioFeatures | null>()
  const uncachedTracks: TrackForLookup[] = []

  for (const t of tracks) {
    const cached = getCachedFeatures(t.id)
    if (cached != null) {
      results.set(t.id, cached)
    } else {
      uncachedTracks.push(t)
    }
  }

  if (uncachedTracks.length === 0) return results

  const trackToMbids = new Map<string, string[]>()
  for (let i = 0; i < uncachedTracks.length; i++) {
    const t = uncachedTracks[i]
    const artist = t.artists?.[0]?.name ?? t.artists?.map(a => a.name).join(', ') ?? ''
    const mbids = await searchMusicBrainz(artist, t.name ?? '', t.duration_ms)
    if (mbids.length) trackToMbids.set(t.id, mbids)
    onProgress?.(tracks.length - uncachedTracks.length + i + 1, tracks.length)
    if (i < uncachedTracks.length - 1) await sleep(MB_MS_DELAY)
  }

  const allMbids = [...new Set([...trackToMbids.values()].flat())]
  const featuresByMbid = await getBpmFromAcousticBrainzBulk(allMbids)

  for (const t of uncachedTracks) {
    const mbids = trackToMbids.get(t.id) ?? []
    let ac: AcousticBrainzFeatures | null = null
    for (const mbid of mbids) {
      const f = featuresByMbid.get(mbid)
      if (f) {
        ac = f
        break
      }
    }

    let features = buildFeatures(t.id, ac)
    if (!features) {
      const artist = t.artists?.[0]?.name ?? t.artists?.map(a => a.name).join(', ') ?? ''
      const searchTitle = stripTrackTitleForSearch(t.name ?? '')
      const bpm = await searchDeezerForBpm(artist, searchTitle)
      features = buildFeatures(t.id, null, bpm ?? undefined)
      await sleep(DEEZER_MS_DELAY)
    }
    if (features) setCachedFeatures(t.id, features)
    results.set(t.id, features)
  }

  return results
}

/** Batch size for streaming (process N tracks, then emit, repeat) */
const STREAMING_BATCH_SIZE = 3

/**
 * Look up BPM and key progressively, calling onTrackFeatures as each batch completes.
 * Uses localStorage cache; tries multiple MBIDs per track; falls back to Deezer when AcousticBrainz has no data.
 */
export async function getBpmForTracksStreaming(
  tracks: TrackForLookup[],
  onTrackFeatures: (trackId: string, features: SpotifyAudioFeatures | null) => void
): Promise<void> {
  for (let i = 0; i < tracks.length; i += STREAMING_BATCH_SIZE) {
    const batch = tracks.slice(i, i + STREAMING_BATCH_SIZE)
    const uncached: TrackForLookup[] = []

    for (const t of batch) {
      const cached = getCachedFeatures(t.id)
      if (cached != null) {
        onTrackFeatures(t.id, cached)
      } else {
        uncached.push(t)
      }
    }

    if (uncached.length === 0) {
      if (i + STREAMING_BATCH_SIZE < tracks.length) await sleep(AC_MS_DELAY)
      continue
    }

    const trackToMbids = new Map<string, string[]>()
    for (let j = 0; j < uncached.length; j++) {
      const t = uncached[j]
      const artist = t.artists?.[0]?.name ?? t.artists?.map(a => a.name).join(', ') ?? ''
      const mbids = await searchMusicBrainz(artist, t.name ?? '', t.duration_ms)
      if (mbids.length) trackToMbids.set(t.id, mbids)
      if (j < uncached.length - 1) await sleep(MB_MS_DELAY)
    }

    const allMbids = [...new Set([...trackToMbids.values()].flat())]
    const featuresByMbid = allMbids.length > 0
      ? await getBpmFromAcousticBrainzBulk(allMbids)
      : new Map<string, AcousticBrainzFeatures>()

    for (const t of uncached) {
      const mbids = trackToMbids.get(t.id) ?? []
      let ac: AcousticBrainzFeatures | null = null
      for (const mbid of mbids) {
        const f = featuresByMbid.get(mbid)
        if (f) {
          ac = f
          break
        }
      }

      let features = buildFeatures(t.id, ac)
      if (!features) {
        const artist = t.artists?.[0]?.name ?? t.artists?.map(a => a.name).join(', ') ?? ''
        const searchTitle = stripTrackTitleForSearch(t.name ?? '')
        const bpm = await searchDeezerForBpm(artist, searchTitle)
        features = buildFeatures(t.id, null, bpm ?? undefined)
        await sleep(DEEZER_MS_DELAY)
      }
      if (features) setCachedFeatures(t.id, features)
      onTrackFeatures(t.id, features)
    }

    if (i + STREAMING_BATCH_SIZE < tracks.length) await sleep(AC_MS_DELAY)
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
