// Camelot Wheel System for Harmonic Mixing
// The Camelot Wheel maps musical keys to a numbered system (1-12) with A (minor) and B (major) designations

// Spotify key values: 0=C, 1=C#/Db, 2=D, 3=D#/Eb, 4=E, 5=F, 6=F#/Gb, 7=G, 8=G#/Ab, 9=A, 10=A#/Bb, 11=B
// Spotify mode values: 0=minor, 1=major

// Camelot notation mapping
// Major keys (B):
// 1B = G#/Ab, 2B = D#/Eb, 3B = A#/Bb, 4B = F, 5B = C, 6B = G, 7B = D, 8B = A, 9B = E, 10B = B, 11B = F#/Gb, 12B = C#/Db
// Minor keys (A):
// 1A = Fm, 2A = Cm, 3A = Gm, 4A = Dm, 5A = Am, 6A = Em, 7A = Bm, 8A = F#m, 9A = C#m, 10A = G#m, 11A = D#m, 12A = A#m

interface CamelotKey {
  number: number  // 1-12
  letter: 'A' | 'B'  // A = minor, B = major
}

// Map Spotify's pitch class (0-11) to Camelot number for major keys
const majorKeyToCamelot: Record<number, number> = {
  8: 1,   // G#/Ab major = 1B
  3: 2,   // D#/Eb major = 2B
  10: 3,  // A#/Bb major = 3B
  5: 4,   // F major = 4B
  0: 5,   // C major = 5B
  7: 6,   // G major = 6B
  2: 7,   // D major = 7B
  9: 8,   // A major = 8B
  4: 9,   // E major = 9B
  11: 10, // B major = 10B
  6: 11,  // F#/Gb major = 11B
  1: 12   // C#/Db major = 12B
}

// Map Spotify's pitch class (0-11) to Camelot number for minor keys
const minorKeyToCamelot: Record<number, number> = {
  5: 1,   // F minor = 1A
  0: 2,   // C minor = 2A
  7: 3,   // G minor = 3A
  2: 4,   // D minor = 4A
  9: 5,   // A minor = 5A
  4: 6,   // E minor = 6A
  11: 7,  // B minor = 7A
  6: 8,   // F# minor = 8A
  1: 9,   // C# minor = 9A
  8: 10,  // G# minor = 10A
  3: 11,  // D# minor = 11A
  10: 12  // A# minor = 12A
}

// Convert Spotify key/mode to Camelot notation
export function spotifyToCamelot(key: number, mode: number): CamelotKey | null {
  // Key -1 means no key detected
  if (key < 0 || key > 11) return null
  
  const isMinor = mode === 0
  const camelotNumber = isMinor ? minorKeyToCamelot[key] : majorKeyToCamelot[key]
  
  return {
    number: camelotNumber,
    letter: isMinor ? 'A' : 'B'
  }
}

// Convert Camelot key to string notation (e.g., "8B", "5A")
export function camelotToString(key: CamelotKey | null): string | null {
  if (!key) return null
  return `${key.number}${key.letter}`
}

// Get the numeric value for sorting (0-23, where A keys are 0-11 and B keys are 12-23)
export function getCamelotSortValue(key: CamelotKey | null): number {
  if (!key) return -1
  // Minor keys (A) come first (0-11), then major keys (B) (12-23)
  const baseValue = key.letter === 'A' ? 0 : 12
  return baseValue + (key.number - 1)
}

// Calculate harmonic compatibility score between two Camelot keys
// Higher score = more compatible
export function getHarmonicCompatibility(key1: CamelotKey | null, key2: CamelotKey | null): number {
  if (!key1 || !key2) return 0
  
  const num1 = key1.number
  const num2 = key2.number
  const letter1 = key1.letter
  const letter2 = key2.letter
  
  // Same key = perfect match
  if (num1 === num2 && letter1 === letter2) {
    return 10
  }
  
  // Same number, different letter (relative major/minor) - mood shift
  if (num1 === num2 && letter1 !== letter2) {
    return 8
  }
  
  // Adjacent numbers on the wheel (energy shift)
  const numDiff = Math.abs(num1 - num2)
  const isAdjacent = numDiff === 1 || numDiff === 11 // 11 handles wraparound (12 to 1)
  
  if (isAdjacent && letter1 === letter2) {
    return 7
  }
  
  // Adjacent numbers with different letter
  if (isAdjacent && letter1 !== letter2) {
    return 5
  }
  
  // Two positions away
  const isTwoAway = numDiff === 2 || numDiff === 10
  if (isTwoAway && letter1 === letter2) {
    return 3
  }
  
  // Everything else - not harmonically compatible
  return 1
}

// Get all harmonically compatible keys (for display purposes)
export function getCompatibleKeys(key: CamelotKey): CamelotKey[] {
  const compatible: CamelotKey[] = []
  
  // Same key
  compatible.push({ ...key })
  
  // Relative major/minor
  compatible.push({ 
    number: key.number, 
    letter: key.letter === 'A' ? 'B' : 'A' 
  })
  
  // One step up (wrap 12 -> 1)
  const upNumber = key.number === 12 ? 1 : key.number + 1
  compatible.push({ number: upNumber, letter: key.letter })
  
  // One step down (wrap 1 -> 12)
  const downNumber = key.number === 1 ? 12 : key.number - 1
  compatible.push({ number: downNumber, letter: key.letter })
  
  return compatible
}

// Color mapping for Camelot keys (for visual representation)
export function getCamelotColor(key: CamelotKey | null): string {
  if (!key) return '#666666'
  
  // Colors roughly follow the circle of fifths / color wheel
  const colors: Record<number, string> = {
    1: '#FF6B6B',   // Red
    2: '#FF8E53',   // Orange-red
    3: '#FFB347',   // Orange
    4: '#FFD93D',   // Yellow
    5: '#6BCB77',   // Green
    6: '#4ECDC4',   // Teal
    7: '#45B7D1',   // Cyan
    8: '#4A90D9',   // Blue
    9: '#7B68EE',   // Purple-blue
    10: '#9B59B6',  // Purple
    11: '#E056FD',  // Magenta
    12: '#FF6B9D'   // Pink
  }
  
  return colors[key.number] || '#666666'
}

// Get key name for display
export function getKeyName(spotifyKey: number, spotifyMode: number): string {
  const keyNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
  
  if (spotifyKey < 0 || spotifyKey > 11) return 'Unknown'
  
  const keyName = keyNames[spotifyKey]
  const modeName = spotifyMode === 1 ? 'Major' : 'Minor'
  
  return `${keyName} ${modeName}`
}

