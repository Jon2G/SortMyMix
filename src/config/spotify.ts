// Spotify API Configuration
// Users need to set their Client ID here or via environment variable
export const SPOTIFY_CONFIG = {
  clientId: import.meta.env.VITE_SPOTIFY_CLIENT_ID || 'YOUR_CLIENT_ID_HERE',
  redirectUri: import.meta.env.VITE_SPOTIFY_REDIRECT_URI || `${window.location.origin}/SortMyMix/callback`,
  scopes: [
    'playlist-read-private',
    'playlist-read-collaborative',
    'playlist-modify-public',
    'playlist-modify-private',
    'user-read-private',
    'user-read-email'
  ].join(' '),
  authEndpoint: 'https://accounts.spotify.com/authorize',
  tokenEndpoint: 'https://accounts.spotify.com/api/token',
  apiBaseUrl: 'https://api.spotify.com/v1'
}

