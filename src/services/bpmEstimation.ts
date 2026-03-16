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
  if (!previewUrl) return null

  try {
    const response = await fetch(previewUrl)
    if (!response.ok) return null

    const arrayBuffer = await response.arrayBuffer()
    const audioContext = new AudioContext()
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0))
    await audioContext.close()

    const tempo = await analyze(audioBuffer, 0, Math.min(25, audioBuffer.duration), {
      minTempo: 60,
      maxTempo: 200
    })

    if (!tempo || tempo < 1) return null

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
  } catch {
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

  return results
}
