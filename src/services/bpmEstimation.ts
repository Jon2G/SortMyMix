import { analyze } from 'web-audio-beat-detector'
import type { SpotifyAudioFeatures } from '@/types/spotify'

const CONCURRENCY = 3

/**
 * Estimate BPM from Spotify preview URL (30-second clip).
 * Estimates BPM from 30s preview URLs using Web Audio API.
 */
export async function estimateBpmFromPreview(
  previewUrl: string | null,
  trackId: string
): Promise<SpotifyAudioFeatures | null> {
  if (!previewUrl) {
    console.log('[BPM] estimateBpmFromPreview:', trackId, 'no preview_url')
    return null
  }

  try {
    console.log('[BPM] estimateBpmFromPreview:', trackId, 'fetching...')
    const response = await fetch(previewUrl)
    if (!response.ok) {
      console.log('[BPM] estimateBpmFromPreview:', trackId, 'fetch failed status=', response.status)
      return null
    }

    const arrayBuffer = await response.arrayBuffer()
    const audioContext = new AudioContext()
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0))
    await audioContext.close()

    const tempo = await analyze(audioBuffer, 0, Math.min(25, audioBuffer.duration), {
      minTempo: 60,
      maxTempo: 200
    })

    if (!tempo || tempo < 1) {
      console.log('[BPM] estimateBpmFromPreview:', trackId, 'analyze returned invalid tempo=', tempo)
      return null
    }

    console.log('[BPM] estimateBpmFromPreview:', trackId, 'success tempo=', Math.round(tempo))
    return {
      id: trackId,
      tempo,
      key: -1,
      mode: 0,
      energy: 0,
      danceability: 0,
      valence: 0,
      time_signature: 4
    }
  } catch (err) {
    console.log('[BPM] estimateBpmFromPreview:', trackId, 'error:', err)
    return null
  }
}

/**
 * Estimate BPM for multiple tracks from preview URLs, with concurrency limit.
 */
export async function estimateBpmForTracks(
  tracks: Array<{ id: string; preview_url: string | null }>,
  onProgress?: (done: number, total: number) => void
): Promise<Map<string, SpotifyAudioFeatures | null>> {
  const results = new Map<string, SpotifyAudioFeatures | null>()
  let done = 0
  const withPreview = tracks.filter(t => t.preview_url).length
  console.log('[BPM] estimateBpmForTracks: start total=', tracks.length, 'withPreview=', withPreview)

  for (let i = 0; i < tracks.length; i += CONCURRENCY) {
    const batch = tracks.slice(i, i + CONCURRENCY)
    const batchResults = await Promise.all(
      batch.map(async (t) => {
        const features = await estimateBpmFromPreview(t.preview_url, t.id)
        done++
        onProgress?.(done, tracks.length)
        return { id: t.id, features }
      })
    )
    batchResults.forEach(({ id, features }) => results.set(id, features))
  }

  const successCount = [...results.values()].filter(Boolean).length
  console.log('[BPM] estimateBpmForTracks: complete successCount=', successCount)
  return results
}
