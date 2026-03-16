import { SPOTIFY_CONFIG } from '@/config/spotify'
import { useAuthStore } from '@/stores/auth'
import type {
  SpotifyUser,
  SpotifyPlaylist,
  SpotifyPlaylistTrack,
  SpotifyPlaylistTrackRaw,
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
    limit = 50, 
    offset = 0
  ): Promise<SpotifyPaginatedResponse<SpotifyPlaylistTrack>> {
    // Feb 2026: /tracks deprecated, use /items; response uses item not track
    try {
      const raw = await this.request<SpotifyPaginatedResponse<SpotifyPlaylistTrackRaw>>(
        `/playlists/${playlistId}/items?limit=${limit}&offset=${offset}&market=from_token&fields=items(added_at,item(id,name,artists,album,duration_ms,uri,preview_url)),total,limit,offset,next`
      )
      // Normalize item → track (Feb 2026 rename); support both for compatibility
      return {
        ...raw,
        items: raw.items.map(({ added_at, item, track }) => ({
          added_at,
          track: item ?? track ?? null
        }))
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes('403') || msg.includes('Forbidden')) {
        throw new Error('Forbidden: Cannot access playlist tracks. Ensure you own or collaborate on this playlist.')
      }
      throw err
    }
  }

  async getAllPlaylistTracks(playlistId: string): Promise<SpotifyPlaylistTrack[]> {
    const tracks: SpotifyPlaylistTrack[] = []
    let offset = 0
    const limit = 50
    let hasMore = true

    while (hasMore) {
      const response = await this.getPlaylistTracks(playlistId, limit, offset)
      tracks.push(...response.items)
      
      hasMore = response.next !== null
      offset += limit
    }

    return tracks
  }

  /**
   * Fetch full track details including preview_url.
   * Playlist items return simplified tracks without preview_url; this endpoint returns full Track objects.
   * Returns empty map on 403 (GET /tracks restricted in Development Mode per Feb 2026 migration).
   */
  async getTracks(trackIds: string[]): Promise<Map<string, { preview_url: string | null }>> {
    const result = new Map<string, { preview_url: string | null }>()
    if (trackIds.length === 0) return result

    try {
      const batchSize = 50
      for (let i = 0; i < trackIds.length; i += batchSize) {
        const batch = trackIds.slice(i, i + batchSize)
        const response = await this.request<{ tracks: Array<{ id: string; preview_url: string | null } | null> }>(
          `/tracks?ids=${batch.join(',')}&market=from_token`
        )
        response.tracks.forEach((track, idx) => {
          const id = batch[idx]
          if (track && id) {
            result.set(id, { preview_url: track.preview_url })
          }
        })
      }
    } catch (err) {
      // GET /tracks returns 403 in Development Mode (batch endpoint removed Feb 2026)
      console.warn('[Spotify] getTracks unavailable (403 in Dev Mode):', err)
    }
    return result
  }

  async getPlaylist(playlistId: string): Promise<SpotifyPlaylist> {
    // Feb 2026: tracks → items
    return this.request<SpotifyPlaylist>(
      `/playlists/${playlistId}?fields=id,name,description,images,owner,items(total),public,collaborative,snapshot_id`
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
      `/playlists/${playlistId}/items`,
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


