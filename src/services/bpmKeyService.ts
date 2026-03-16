/**
 * BPM and key service - facade for GetSongBPM + AcousticBrainz lookup.
 * Handles streaming lookup and Camelot key conversion.
 */

import { getBpmForTracksStreaming } from '@/services/bpmKeySearch'
import { spotifyToCamelot, camelotToString } from '@/services/camelot'
import type { SpotifyAudioFeatures } from '@/types/spotify'

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

/**
 * Load BPM and key for tracks progressively.
 * Uses GetSongBPM (primary) + AcousticBrainz (fallback).
 * Calls onTrackUpdate for each track as data becomes available.
 */
export function loadBpmKeyForTracks(
  tracks: TrackForBpmLookup[],
  onTrackUpdate: (trackId: string, update: BpmKeyUpdate) => void
): Promise<void> {
  return getBpmForTracksStreaming(tracks, (trackId, features) => {
    const camelotKey =
      features && features.key >= 0
        ? camelotToString(spotifyToCamelot(features.key, features.mode))
        : null
    onTrackUpdate(trackId, { features, camelotKey })
  })
}
