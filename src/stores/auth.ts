import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { SpotifyUser, SpotifyTokenResponse } from '@/types/spotify'

const TOKEN_KEY = 'spotify_token'
const REFRESH_TOKEN_KEY = 'spotify_refresh_token'
const EXPIRY_KEY = 'spotify_token_expiry'
const USER_KEY = 'spotify_user'

export const useAuthStore = defineStore('auth', () => {
  const accessToken = ref<string | null>(localStorage.getItem(TOKEN_KEY))
  const refreshToken = ref<string | null>(localStorage.getItem(REFRESH_TOKEN_KEY))
  const tokenExpiry = ref<number | null>(
    localStorage.getItem(EXPIRY_KEY) ? parseInt(localStorage.getItem(EXPIRY_KEY)!) : null
  )
  const user = ref<SpotifyUser | null>(
    localStorage.getItem(USER_KEY) ? JSON.parse(localStorage.getItem(USER_KEY)!) : null
  )

  const isAuthenticated = computed(() => {
    if (!accessToken.value || !tokenExpiry.value) return false
    return Date.now() < tokenExpiry.value
  })

  const isTokenExpired = computed(() => {
    if (!tokenExpiry.value) return true
    return Date.now() >= tokenExpiry.value
  })

  function setTokens(tokenResponse: SpotifyTokenResponse) {
    accessToken.value = tokenResponse.access_token
    refreshToken.value = tokenResponse.refresh_token
    tokenExpiry.value = Date.now() + tokenResponse.expires_in * 1000

    localStorage.setItem(TOKEN_KEY, tokenResponse.access_token)
    localStorage.setItem(REFRESH_TOKEN_KEY, tokenResponse.refresh_token)
    localStorage.setItem(EXPIRY_KEY, tokenExpiry.value.toString())
  }

  function setUser(userData: SpotifyUser) {
    user.value = userData
    localStorage.setItem(USER_KEY, JSON.stringify(userData))
  }

  function logout() {
    accessToken.value = null
    refreshToken.value = null
    tokenExpiry.value = null
    user.value = null

    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
    localStorage.removeItem(EXPIRY_KEY)
    localStorage.removeItem(USER_KEY)
  }

  return {
    accessToken,
    refreshToken,
    tokenExpiry,
    user,
    isAuthenticated,
    isTokenExpired,
    setTokens,
    setUser,
    logout
  }
})

