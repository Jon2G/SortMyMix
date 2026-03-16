/**
 * BPM and key search service - orchestrates sources with fallback.
 * Primary: GetSongBPM → Fallback: AcousticBrainz.
 * Uses localStorage cache.
 */

import { getCachedFeatures, setCachedFeatures } from '@/services/bpmCache'
import { searchGetSongBpm, GETSONGBPM_MS_DELAY } from '@/services/getSongBpm'
import {
  getBpmFromAcousticBrainzForTracks,
  type TrackForLookup
} from '@/services/acousticBrainz'
import { stripTrackTitleForSearch } from '@/services/trackTitle'
import type { SpotifyAudioFeatures } from '@/types/spotify'

const AC_MS_DELAY = 1500
const STREAMING_BATCH_SIZE = 3

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

/**
 * Look up BPM and key for tracks: GetSongBPM (primary) + AcousticBrainz (fallback).
 * Uses localStorage cache.
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

  const needFallback: TrackForLookup[] = []

  for (let i = 0; i < uncachedTracks.length; i++) {
    const t = uncachedTracks[i]
    const artist = t.artists?.[0]?.name ?? t.artists?.map(a => a.name).join(', ') ?? ''
    const searchTitle = stripTrackTitleForSearch(t.name ?? '')

    const source = await searchGetSongBpm(artist, searchTitle)
    if (source) {
      const features = buildFeatures(t.id, source)
      if (features) setCachedFeatures(t.id, features)
      results.set(t.id, features)
    } else {
      needFallback.push(t)
    }
    onProgress?.(tracks.length - uncachedTracks.length + i + 1, tracks.length)
    if (i < uncachedTracks.length - 1) await sleep(GETSONGBPM_MS_DELAY)
  }

  if (needFallback.length === 0) return results

  const fallbackResults = await getBpmFromAcousticBrainzForTracks(needFallback)
  for (const t of needFallback) {
    const features = fallbackResults.get(t.id) ?? null
    if (features) setCachedFeatures(t.id, features)
    results.set(t.id, features)
  }

  return results
}

/**
 * Look up BPM and key progressively: GetSongBPM (primary) + AcousticBrainz (fallback).
 * Uses localStorage cache.
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

    const needFallback: TrackForLookup[] = []

    for (let j = 0; j < uncached.length; j++) {
      const t = uncached[j]
      const artist = t.artists?.[0]?.name ?? t.artists?.map(a => a.name).join(', ') ?? ''
      const searchTitle = stripTrackTitleForSearch(t.name ?? '')

      const source = await searchGetSongBpm(artist, searchTitle)
      if (source) {
        const features = buildFeatures(t.id, source)
        if (features) setCachedFeatures(t.id, features)
        onTrackFeatures(t.id, features)
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
        onTrackFeatures(t.id, features)
      }
    }

    if (i + STREAMING_BATCH_SIZE < tracks.length) await sleep(AC_MS_DELAY)
  }
}
