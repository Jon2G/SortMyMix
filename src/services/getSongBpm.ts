/**
 * GetSongBPM API - dedicated BPM and key source.
 * Requires VITE_GETSONGBPM_API_KEY.
 */

import { GETSONGBPM_CONFIG } from '@/config/getSongBpm'
import { camelotToSpotify, keyOfToSpotify } from '@/services/camelot'
import { stripTrackTitleForSearch } from '@/services/trackTitle'

/** Rate limit: GetSongBPM 3000 req/hour → ~1.2s between requests */
export const GETSONGBPM_MS_DELAY = 1200

interface GetSongBpmSearchResult {
  tempo?: number | string
  key_of?: string
  camelot?: string
  artist?: Array<{ name?: string }> | { name?: string }
}

interface GetSongBpmSearchResponse {
  search?: GetSongBpmSearchResult[]
  error?: string
}

/**
 * Search GetSongBPM by artist and title.
 * Returns BPM and key (Spotify format) or null.
 */
export async function searchGetSongBpm(
  artist: string,
  title: string
): Promise<{ bpm: number; key: number; mode: number } | null> {
  if (!GETSONGBPM_CONFIG.apiKey) {
    console.error('[GetSongBPM] No API key')
    return null
  }
  const searchTitle = stripTrackTitleForSearch(title ?? '')
  if (!artist?.trim() || !searchTitle) {
    console.error('[GetSongBPM] No artist or title')
    return null
  }

  const lookup = `song:${searchTitle.replace(/"/g, '')} artist:${artist.replace(/"/g, '')}`
  const params = new URLSearchParams({
    type: 'both',
    lookup,
    limit: '1',
    api_key: GETSONGBPM_CONFIG.apiKey
  })
  const targetUrl = `${GETSONGBPM_CONFIG.baseUrl}/search/?${params.toString()}`
  const proxyParams: Record<string, string> = { url: targetUrl }
  if (GETSONGBPM_CONFIG.corsproxyApiKey) {
    proxyParams.key = GETSONGBPM_CONFIG.corsproxyApiKey
  }
  const url = `https://corsproxy.io/?${new URLSearchParams(proxyParams).toString()}`

  try {
    const res = await fetch(url)
    if (!res.ok) {
      console.error('[GetSongBPM] Error searching for BPM:', res.statusText)
      return null
    }

    const data = (await res.json()) as GetSongBpmSearchResponse
    if (data.error) {
      console.error('[GetSongBPM] Error searching for BPM:', data.error)
      return null
    }

    const first = data.search?.[0]
    if (!first) {
      console.error('[GetSongBPM] No results found', searchTitle, artist)
      return null
    }

    const bpmRaw = first.tempo
    const bpm = typeof bpmRaw === 'number' ? bpmRaw : parseFloat(String(bpmRaw ?? ''))
    if (Number.isNaN(bpm) || bpm <= 0 || bpm >= 300) {
      console.error('[GetSongBPM] Invalid BPM:', bpmRaw)
      return null
    }

    let key = -1
    let mode = 0

    const camelot = first.camelot?.trim()
    const keyOf = first.key_of?.trim()
    const parsed = camelot ? camelotToSpotify(camelot) : keyOf ? keyOfToSpotify(keyOf) : null
    if (parsed) {
      key = parsed.key
      mode = parsed.mode
    }

    return { bpm, key, mode }
  } catch (err) {
    console.error('[GetSongBPM] Error searching for BPM:', err)
    return null
  }
}
