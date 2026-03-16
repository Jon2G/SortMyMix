/**
 * Custom BPM/key overrides set by the user.
 * Persisted to localStorage, keyed by Spotify track ID.
 */

import { ref, computed } from 'vue'
import type { SpotifyAudioFeatures } from '@/types/spotify'

const STORAGE_KEY = 'sortmymix:custom_bpm_key'

export interface CustomBpmKey {
  bpm?: number
  key?: number
  mode?: number
}

function loadFromStorage(): Record<string, CustomBpmKey> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, CustomBpmKey>
    return typeof parsed === 'object' && parsed !== null ? parsed : {}
  } catch {
    return {}
  }
}

function saveToStorage(data: Record<string, CustomBpmKey>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    // Quota exceeded or disabled
  }
}

export function useCustomBpmKey() {
  const overrides = ref<Record<string, CustomBpmKey>>(loadFromStorage())

  const customTrackIds = computed(() => new Set(Object.keys(overrides.value)))

  function hasCustom(trackId: string): boolean {
    return trackId in overrides.value
  }

  function getCustom(trackId: string): CustomBpmKey | undefined {
    return overrides.value[trackId]
  }

  function setCustom(trackId: string, data: CustomBpmKey): void {
    const next = { ...overrides.value }
    const merged = { ...next[trackId], ...data }
    // Remove undefined keys
    const cleaned: CustomBpmKey = {}
    if (merged.bpm !== undefined) cleaned.bpm = merged.bpm
    if (merged.key !== undefined) cleaned.key = merged.key
    if (merged.mode !== undefined) cleaned.mode = merged.mode
    if (Object.keys(cleaned).length === 0) {
      delete next[trackId]
    } else {
      next[trackId] = cleaned
    }
    overrides.value = next
    saveToStorage(next)
  }

  function clearCustom(trackId: string): void {
    const next = { ...overrides.value }
    delete next[trackId]
    overrides.value = next
    saveToStorage(next)
  }

  /**
   * Merge custom overrides with base features.
   * Custom values take precedence when present.
   */
  function mergeFeatures(
    trackId: string,
    base: SpotifyAudioFeatures | null
  ): SpotifyAudioFeatures | null {
    const custom = overrides.value[trackId]
    if (!custom && !base) return null
    const baseTempo = base?.tempo ?? 0
    const baseKey = base?.key ?? -1
    const baseMode = base?.mode ?? 0
    const tempo = custom?.bpm ?? baseTempo
    const key = custom?.key ?? baseKey
    const mode = custom?.mode ?? baseMode
    if (tempo <= 0 && key < 0) return null
    return {
      id: trackId,
      tempo,
      key,
      mode,
      energy: base?.energy ?? 0,
      danceability: base?.danceability ?? 0,
      valence: base?.valence ?? 0,
      time_signature: base?.time_signature ?? 4
    }
  }

  return {
    overrides,
    customTrackIds,
    hasCustom,
    getCustom,
    setCustom,
    clearCustom,
    mergeFeatures
  }
}
