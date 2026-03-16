/**
 * LocalStorage cache for BPM and key data.
 * Keyed by Spotify track ID to avoid repeated lookups.
 */

import type { SpotifyAudioFeatures } from '@/types/spotify'

const CACHE_KEY = 'sortmymix:bpm_cache'

type CacheEntry = SpotifyAudioFeatures | null

function loadCache(): Record<string, CacheEntry> {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, CacheEntry>
    return typeof parsed === 'object' && parsed !== null ? parsed : {}
  } catch {
    return {}
  }
}

function saveCache(cache: Record<string, CacheEntry>): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
  } catch {
    // Quota exceeded or disabled - ignore
  }
}

/**
 * Get cached features for a track.
 * Returns undefined if not cached, or the cached features object.
 */
export function getCachedFeatures(trackId: string): SpotifyAudioFeatures | null | undefined {
  const cache = loadCache()
  if (!(trackId in cache)) return undefined
  if (cache[trackId] == null) return undefined
  return cache[trackId]
}

/**
 * Store features for a track. Only stores when features is non-null.
 * Null/empty results are not cached (will retry lookup on next load).
 */
export function setCachedFeatures(trackId: string, features: SpotifyAudioFeatures | null): void {
  if (features == null) return
  const cache = loadCache()
  cache[trackId] = features
  saveCache(cache)
}
