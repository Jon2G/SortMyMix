import { SPOTIFY_CONFIG } from '@/config/spotify'
import { useAuthStore } from '@/stores/auth'
import type { SpotifyTokenResponse, SpotifyUser } from '@/types/spotify'

const CODE_VERIFIER_KEY = 'spotify_code_verifier'

function generateRandomString(length: number): string {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  const values = crypto.getRandomValues(new Uint8Array(length))
  return values.reduce((acc, x) => acc + possible[x % possible.length], '')
}

async function sha256(plain: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder()
  const data = encoder.encode(plain)
  return crypto.subtle.digest('SHA-256', data)
}

function base64urlEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const hash = await sha256(verifier)
  return base64urlEncode(hash)
}

export function useSpotifyAuth() {
  const authStore = useAuthStore()

  async function login(): Promise<void> {
    const codeVerifier = generateRandomString(64)
    const codeChallenge = await generateCodeChallenge(codeVerifier)
    
    // Store the verifier for later use in the callback
    sessionStorage.setItem(CODE_VERIFIER_KEY, codeVerifier)
    
    const params = new URLSearchParams({
      client_id: SPOTIFY_CONFIG.clientId,
      response_type: 'code',
      redirect_uri: SPOTIFY_CONFIG.redirectUri,
      code_challenge_method: 'S256',
      code_challenge: codeChallenge,
      scope: SPOTIFY_CONFIG.scopes,
      show_dialog: 'false'
    })
    
    window.location.href = `${SPOTIFY_CONFIG.authEndpoint}?${params.toString()}`
  }

  async function handleCallback(code: string): Promise<boolean> {
    const codeVerifier = sessionStorage.getItem(CODE_VERIFIER_KEY)
    
    if (!codeVerifier) {
      console.error('No code verifier found')
      return false
    }
    
    try {
      const response = await fetch(SPOTIFY_CONFIG.tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          client_id: SPOTIFY_CONFIG.clientId,
          grant_type: 'authorization_code',
          code,
          redirect_uri: SPOTIFY_CONFIG.redirectUri,
          code_verifier: codeVerifier
        })
      })
      
      if (!response.ok) {
        const error = await response.json()
        console.error('Token exchange failed:', error)
        return false
      }
      
      const tokenData: SpotifyTokenResponse = await response.json()
      authStore.setTokens(tokenData)
      
      // Clean up
      sessionStorage.removeItem(CODE_VERIFIER_KEY)
      
      // Fetch user profile
      await fetchUserProfile()
      
      return true
    } catch (error) {
      console.error('Token exchange error:', error)
      return false
    }
  }

  async function refreshToken(): Promise<boolean> {
    const currentRefreshToken = authStore.refreshToken
    
    if (!currentRefreshToken) {
      return false
    }
    
    try {
      const response = await fetch(SPOTIFY_CONFIG.tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          client_id: SPOTIFY_CONFIG.clientId,
          grant_type: 'refresh_token',
          refresh_token: currentRefreshToken
        })
      })
      
      if (!response.ok) {
        console.error('Token refresh failed')
        authStore.logout()
        return false
      }
      
      const tokenData: SpotifyTokenResponse = await response.json()
      authStore.setTokens(tokenData)
      
      return true
    } catch (error) {
      console.error('Token refresh error:', error)
      authStore.logout()
      return false
    }
  }

  async function fetchUserProfile(): Promise<void> {
    const token = authStore.accessToken
    
    if (!token) return
    
    try {
      const response = await fetch(`${SPOTIFY_CONFIG.apiBaseUrl}/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const user: SpotifyUser = await response.json()
        authStore.setUser(user)
      }
    } catch (error) {
      console.error('Failed to fetch user profile:', error)
    }
  }

  async function ensureValidToken(): Promise<string | null> {
    if (!authStore.accessToken) {
      return null
    }
    
    if (authStore.isTokenExpired) {
      const refreshed = await refreshToken()
      if (!refreshed) {
        return null
      }
    }
    
    return authStore.accessToken
  }

  function logout(): void {
    authStore.logout()
  }

  return {
    login,
    handleCallback,
    refreshToken,
    ensureValidToken,
    logout,
    isAuthenticated: authStore.isAuthenticated,
    user: authStore.user
  }
}

