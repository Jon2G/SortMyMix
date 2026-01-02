import { SPOTIFY_CONFIG } from '@/config/spotify'
import { useAuthStore } from '@/stores/auth'
import type {
  SpotifyUser,
  SpotifyPlaylist,
  SpotifyPlaylistTrack,
  SpotifyAudioFeatures,
  SpotifyPaginatedResponse
} from '@/types/spotify'

class SpotifyApiService {
  private getAuthHeader(): HeadersInit {
    const authStore = useAuthStore()
    return {
      'Authorization': `Bearer ${authStore.accessToken}`,
      'Content-Type': 'application/json'
    }
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = endpoint.startsWith('http') 
      ? endpoint 
      : `${SPOTIFY_CONFIG.apiBaseUrl}${endpoint}`
    
    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.getAuthHeader(),
        ...options.headers
      }
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }))
      throw new Error(error.error?.message || error.message || `API error: ${response.status}`)
    }

    // Handle empty responses (like 204)
    if (response.status === 204) {
      return {} as T
    }

    return response.json()
  }

  async getCurrentUser(): Promise<SpotifyUser> {
    return this.request<SpotifyUser>('/me')
  }

  async getUserPlaylists(limit = 50, offset = 0): Promise<SpotifyPaginatedResponse<SpotifyPlaylist>> {
    return this.request<SpotifyPaginatedResponse<SpotifyPlaylist>>(
      `/me/playlists?limit=${limit}&offset=${offset}`
    )
  }

  async getAllUserPlaylists(): Promise<SpotifyPlaylist[]> {
    const playlists: SpotifyPlaylist[] = []
    let offset = 0
    const limit = 50
    let hasMore = true

    while (hasMore) {
      const response = await this.getUserPlaylists(limit, offset)
      playlists.push(...response.items)
      
      hasMore = response.next !== null
      offset += limit
    }

    return playlists
  }

  async getPlaylistTracks(
    playlistId: string, 
    limit = 100, 
    offset = 0
  ): Promise<SpotifyPaginatedResponse<SpotifyPlaylistTrack>> {
    return this.request<SpotifyPaginatedResponse<SpotifyPlaylistTrack>>(
      `/playlists/${playlistId}/tracks?limit=${limit}&offset=${offset}&fields=items(added_at,track(id,name,artists,album,duration_ms,uri,preview_url)),total,limit,offset,next`
    )
  }

  async getAllPlaylistTracks(playlistId: string): Promise<SpotifyPlaylistTrack[]> {
    const tracks: SpotifyPlaylistTrack[] = []
    let offset = 0
    const limit = 100
    let hasMore = true

    while (hasMore) {
      const response = await this.getPlaylistTracks(playlistId, limit, offset)
      tracks.push(...response.items)
      
      hasMore = response.next !== null
      offset += limit
    }

    return tracks
  }

  async getAudioFeatures(trackIds: string[]): Promise<(SpotifyAudioFeatures | null)[]> {
    if (trackIds.length === 0) return []
    
    // Spotify API allows max 100 track IDs per request
    const batchSize = 100
    const results: (SpotifyAudioFeatures | null)[] = []

    for (let i = 0; i < trackIds.length; i += batchSize) {
      const batch = trackIds.slice(i, i + batchSize)
      const response = await this.request<{ audio_features: (SpotifyAudioFeatures | null)[] }>(
        `/audio-features?ids=${batch.join(',')}`
      )
      results.push(...response.audio_features)
    }

    return results
  }

  async getPlaylist(playlistId: string): Promise<SpotifyPlaylist> {
    return this.request<SpotifyPlaylist>(
      `/playlists/${playlistId}?fields=id,name,description,images,owner,tracks(total),public,collaborative,snapshot_id`
    )
  }

  async reorderPlaylistTracks(
    playlistId: string,
    rangeStart: number,
    insertBefore: number,
    rangeLength = 1,
    snapshotId?: string
  ): Promise<{ snapshot_id: string }> {
    const body: Record<string, unknown> = {
      range_start: rangeStart,
      insert_before: insertBefore,
      range_length: rangeLength
    }

    if (snapshotId) {
      body.snapshot_id = snapshotId
    }

    return this.request<{ snapshot_id: string }>(
      `/playlists/${playlistId}/tracks`,
      {
        method: 'PUT',
        body: JSON.stringify(body)
      }
    )
  }

  // Reorder playlist to match a new order of URIs
  async reorderPlaylistToMatch(
    playlistId: string,
    originalUris: string[],
    sortedUris: string[]
  ): Promise<void> {
    // Create a mapping of URI to current position
    const currentPositions = new Map<string, number>()
    originalUris.forEach((uri, index) => {
      currentPositions.set(uri, index)
    })

    // Work with a copy of current positions
    const workingOrder = [...originalUris]
    let snapshotId: string | undefined

    // For each position in the sorted order
    for (let targetPos = 0; targetPos < sortedUris.length; targetPos++) {
      const targetUri = sortedUris[targetPos]
      const currentPos = workingOrder.indexOf(targetUri)

      // If the track is not in the right position, move it
      if (currentPos !== targetPos) {
        const result = await this.reorderPlaylistTracks(
          playlistId,
          currentPos,
          targetPos,
          1,
          snapshotId
        )
        snapshotId = result.snapshot_id

        // Update our working order to reflect the move
        workingOrder.splice(currentPos, 1)
        workingOrder.splice(targetPos, 0, targetUri)
      }
    }
  }
}

export const spotifyApi = new SpotifyApiService()

