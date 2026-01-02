export interface SpotifyUser {
  id: string
  display_name: string
  email: string
  images: SpotifyImage[]
  product: string
  country: string
}

export interface SpotifyImage {
  url: string
  height: number | null
  width: number | null
}

export interface SpotifyPlaylist {
  id: string
  name: string
  description: string | null
  images: SpotifyImage[]
  owner: {
    id: string
    display_name: string
  }
  tracks: {
    total: number
    href: string
  }
  public: boolean
  collaborative: boolean
  snapshot_id: string
}

export interface SpotifyTrack {
  id: string
  name: string
  artists: SpotifyArtist[]
  album: SpotifyAlbum
  duration_ms: number
  uri: string
  preview_url: string | null
}

export interface SpotifyArtist {
  id: string
  name: string
}

export interface SpotifyAlbum {
  id: string
  name: string
  images: SpotifyImage[]
}

export interface SpotifyPlaylistTrack {
  added_at: string
  track: SpotifyTrack | null
}

export interface SpotifyAudioFeatures {
  id: string
  tempo: number
  key: number
  mode: number
  energy: number
  danceability: number
  valence: number
  time_signature: number
}

export interface SpotifyPaginatedResponse<T> {
  items: T[]
  total: number
  limit: number
  offset: number
  next: string | null
  previous: string | null
}

export interface TrackWithFeatures {
  track: SpotifyTrack
  features: SpotifyAudioFeatures | null
  camelotKey: string | null
  position: number
}

export interface SpotifyTokenResponse {
  access_token: string
  token_type: string
  expires_in: number
  refresh_token: string
  scope: string
}

