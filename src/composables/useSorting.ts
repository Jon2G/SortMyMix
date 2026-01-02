import type { TrackWithFeatures } from '@/types/spotify'
import { 
  spotifyToCamelot, 
  getCamelotSortValue, 
  getHarmonicCompatibility,
  camelotToString 
} from '@/services/camelot'

interface SortOptions {
  bpmBucketSize: number  // Size of BPM ranges to group tracks
  ascending: boolean     // Sort direction for BPM
}

const DEFAULT_OPTIONS: SortOptions = {
  bpmBucketSize: 5,
  ascending: true
}

export function useSorting() {
  
  // Sort tracks by BPM first, then by Camelot key within BPM groups
  function sortByBpmThenHarmonic(
    tracks: TrackWithFeatures[], 
    options: Partial<SortOptions> = {}
  ): TrackWithFeatures[] {
    const opts = { ...DEFAULT_OPTIONS, ...options }
    
    // Create a copy to avoid mutating the original
    const sortedTracks = [...tracks]
    
    // First pass: sort entirely by BPM
    sortedTracks.sort((a, b) => {
      const bpmA = a.features?.tempo ?? 0
      const bpmB = b.features?.tempo ?? 0
      
      return opts.ascending ? bpmA - bpmB : bpmB - bpmA
    })
    
    // Second pass: within each BPM bucket, sort by Camelot key
    // Group tracks into BPM buckets
    const buckets: Map<number, TrackWithFeatures[]> = new Map()
    
    for (const track of sortedTracks) {
      const bpm = track.features?.tempo ?? 0
      const bucketKey = Math.floor(bpm / opts.bpmBucketSize) * opts.bpmBucketSize
      
      if (!buckets.has(bucketKey)) {
        buckets.set(bucketKey, [])
      }
      buckets.get(bucketKey)!.push(track)
    }
    
    // Sort within each bucket by Camelot position
    for (const bucket of buckets.values()) {
      bucket.sort((a, b) => {
        const keyA = a.features 
          ? spotifyToCamelot(a.features.key, a.features.mode) 
          : null
        const keyB = b.features 
          ? spotifyToCamelot(b.features.key, b.features.mode) 
          : null
        
        const sortValueA = getCamelotSortValue(keyA)
        const sortValueB = getCamelotSortValue(keyB)
        
        return sortValueA - sortValueB
      })
    }
    
    // Optimize transitions between buckets for harmonic compatibility
    const result: TrackWithFeatures[] = []
    const sortedBucketKeys = Array.from(buckets.keys()).sort((a, b) => 
      opts.ascending ? a - b : b - a
    )
    
    let lastTrack: TrackWithFeatures | null = null
    
    for (const bucketKey of sortedBucketKeys) {
      const bucket = buckets.get(bucketKey)!
      
      if (lastTrack && bucket.length > 0) {
        // Find the best starting track in this bucket that harmonically matches the last track
        const lastKey = lastTrack.features 
          ? spotifyToCamelot(lastTrack.features.key, lastTrack.features.mode) 
          : null
        
        let bestIndex = 0
        let bestScore = -1
        
        bucket.forEach((track, index) => {
          const trackKey = track.features 
            ? spotifyToCamelot(track.features.key, track.features.mode) 
            : null
          const score = getHarmonicCompatibility(lastKey, trackKey)
          
          if (score > bestScore) {
            bestScore = score
            bestIndex = index
          }
        })
        
        // Rotate bucket to start with best matching track
        const rotated = [...bucket.slice(bestIndex), ...bucket.slice(0, bestIndex)]
        result.push(...rotated)
        lastTrack = rotated[rotated.length - 1]
      } else {
        result.push(...bucket)
        lastTrack = bucket[bucket.length - 1]
      }
    }
    
    return result
  }
  
  // Add Camelot key to tracks
  function enrichTracksWithCamelot(tracks: TrackWithFeatures[]): TrackWithFeatures[] {
    return tracks.map(track => ({
      ...track,
      camelotKey: track.features 
        ? camelotToString(spotifyToCamelot(track.features.key, track.features.mode))
        : null
    }))
  }
  
  // Calculate statistics about the sorting
  function calculateSortStats(original: TrackWithFeatures[], sorted: TrackWithFeatures[]) {
    let goodTransitions = 0
    let totalTransitions = sorted.length - 1
    
    for (let i = 1; i < sorted.length; i++) {
      const prevTrack = sorted[i - 1]
      const currTrack = sorted[i]
      
      if (prevTrack.features && currTrack.features) {
        const prevKey = spotifyToCamelot(prevTrack.features.key, prevTrack.features.mode)
        const currKey = spotifyToCamelot(currTrack.features.key, currTrack.features.mode)
        const compatibility = getHarmonicCompatibility(prevKey, currKey)
        
        if (compatibility >= 5) {
          goodTransitions++
        }
      }
    }
    
    // Calculate how many tracks moved
    let movedTracks = 0
    const originalPositions = new Map(original.map((t, i) => [t.track.id, i]))
    
    for (let i = 0; i < sorted.length; i++) {
      const originalPos = originalPositions.get(sorted[i].track.id)
      if (originalPos !== i) {
        movedTracks++
      }
    }
    
    // BPM range
    const bpms = sorted
      .map(t => t.features?.tempo ?? 0)
      .filter(bpm => bpm > 0)
    
    const minBpm = Math.min(...bpms)
    const maxBpm = Math.max(...bpms)
    
    return {
      totalTracks: sorted.length,
      goodTransitions,
      totalTransitions,
      harmonicScore: totalTransitions > 0 
        ? Math.round((goodTransitions / totalTransitions) * 100) 
        : 0,
      movedTracks,
      bpmRange: { min: Math.round(minBpm), max: Math.round(maxBpm) }
    }
  }
  
  return {
    sortByBpmThenHarmonic,
    enrichTracksWithCamelot,
    calculateSortStats
  }
}

