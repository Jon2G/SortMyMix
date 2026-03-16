/**
 * BPM and key service - orchestration for SortView.
 * Flow: cache → getSongBpm (primary) → acousticBrainz (fallback) → Camelot conversion.
 */

import { getCachedFeatures, setCachedFeatures } from '@/services/bpmCache'
import { searchGetSongBpm, GETSONGBPM_MS_DELAY } from '@/services/getSongBpm'
import {
  getBpmFromAcousticBrainzForTracks,
  type TrackForLookup
} from '@/services/acousticBrainz'
import { stripTrackTitleForSearch } from '@/services/trackTitle'
import { spotifyToCamelot, camelotToString } from '@/services/camelot'
import type { SpotifyAudioFeatures } from '@/types/spotify'

const AC_MS_DELAY = 1500
const STREAMING_BATCH_SIZE = 3

export interface TrackForBpmLookup {
  id: string
  name: string
  artists: Array<{ name: string }>
  duration_ms?: number
}

export interface BpmKeyUpdate {
  features: SpotifyAudioFeatures | null
  camelotKey: string | null
}

function buildFeatures(
  trackId: string,
  source: { bpm: number; key: number; mode: number } | null
): SpotifyAudioFeatures | null {
  if (!source) return null
  return {
    id: trackId,
    tempo: source.bpm,
    key: source.key,
    mode: source.mode,
    energy: 0,
    danceability: 0,
    valence: 0,
    time_signature: 4
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function toCamelotKey(features: SpotifyAudioFeatures | null): string | null {
  if (!features || features.key < 0) return null
  const camelot = spotifyToCamelot(features.key, features.mode)
  return camelot ? camelotToString(camelot) : null
}

/**
 * Load BPM and key for tracks progressively.
 * Primary: GetSongBPM → Fallback: AcousticBrainz.
 * Uses localStorage cache.
 */
export function loadBpmKeyForTracks(
  tracks: TrackForBpmLookup[],
  onTrackUpdate: (trackId: string, update: BpmKeyUpdate) => void
): Promise<void> {
  const tracksForLookup: TrackForLookup[] = tracks.map(
    (t) => ({ id: t.id, name: t.name, artists: t.artists, duration_ms: t.duration_ms })
  )

  return (async () => {
    for (let i = 0; i < tracksForLookup.length; i += STREAMING_BATCH_SIZE) {
      const batch = tracksForLookup.slice(i, i + STREAMING_BATCH_SIZE)
      const uncached: TrackForLookup[] = []

      for (const t of batch) {
        const cached = getCachedFeatures(t.id)
        if (cached !== undefined) {
          onTrackUpdate(t.id, {
            features: cached,
            camelotKey: toCamelotKey(cached)
          })
        } else {
          uncached.push(t)
        }
      }

      if (uncached.length === 0) {
        if (i + STREAMING_BATCH_SIZE < tracksForLookup.length) await sleep(AC_MS_DELAY)
        continue
      }

      const needFallback: TrackForLookup[] = []
      const updatedIds = new Set<string>()

      try {
        for (let j = 0; j < uncached.length; j++) {
          const t = uncached[j]
          const artist = t.artists?.[0]?.name ?? t.artists?.map(a => a.name).join(', ') ?? ''
          const searchTitle = stripTrackTitleForSearch(t.name ?? '')

          const source = await searchGetSongBpm(artist, searchTitle)
          if (source) {
            const features = buildFeatures(t.id, source)
            setCachedFeatures(t.id, features)
            onTrackUpdate(t.id, {
              features,
              camelotKey: toCamelotKey(features)
            })
            updatedIds.add(t.id)
          } else {
            needFallback.push(t)
          }
          if (j < uncached.length - 1) await sleep(GETSONGBPM_MS_DELAY)
        }

        if (needFallback.length > 0) {
          const fallbackResults = await getBpmFromAcousticBrainzForTracks(needFallback)
          for (const t of needFallback) {
            const features = fallbackResults.get(t.id) ?? null
            if (features) setCachedFeatures(t.id, features)
            onTrackUpdate(t.id, {
              features,
              camelotKey: toCamelotKey(features)
            })
            updatedIds.add(t.id)
          }
        }
      } catch (err) {
        console.error('[bpmKeyService] Lookup error:', err)
        for (const t of uncached) {
          if (!updatedIds.has(t.id)) {
            onTrackUpdate(t.id, { features: null, camelotKey: null })
          }
        }
      }

      if (i + STREAMING_BATCH_SIZE < tracksForLookup.length) await sleep(AC_MS_DELAY)
    }
  })()
}
