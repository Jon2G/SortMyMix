<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useSpotifyAuth } from '@/composables/useSpotifyAuth'
import { VaProgressCircle } from 'vuestic-ui'

const router = useRouter()
const route = useRoute()
const { handleCallback } = useSpotifyAuth()

const error = ref<string | null>(null)
const isProcessing = ref(true)

onMounted(async () => {
  const code = route.query.code as string
  const errorParam = route.query.error as string
  
  if (errorParam) {
    error.value = `Authorization failed: ${errorParam}`
    isProcessing.value = false
    return
  }
  
  if (!code) {
    error.value = 'No authorization code received'
    isProcessing.value = false
    return
  }
  
  const success = await handleCallback(code)
  
  if (success) {
    router.replace({ name: 'playlists' })
  } else {
    error.value = 'Failed to authenticate with Spotify'
    isProcessing.value = false
  }
})
</script>

<template>
  <div class="callback">
    <div class="callback-content">
      <template v-if="isProcessing">
        <VaProgressCircle indeterminate size="large" color="primary" />
        <p class="callback-text">Connecting to Spotify...</p>
      </template>
      <template v-else-if="error">
        <div class="error-icon">!</div>
        <p class="error-text">{{ error }}</p>
        <router-link to="/" class="back-link">
          Back to Home
        </router-link>
      </template>
    </div>
  </div>
</template>

<style scoped>
.callback {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: linear-gradient(135deg, var(--color-bg-primary) 0%, #1a1a2e 100%);
}

.callback-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
  text-align: center;
}

.callback-text {
  color: var(--color-text-secondary);
  font-size: 1.125rem;
}

.error-icon {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: rgba(233, 20, 41, 0.2);
  color: #E91429;
  font-size: 2rem;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
}

.error-text {
  color: var(--color-text-primary);
  font-size: 1.125rem;
  max-width: 400px;
}

.back-link {
  color: var(--color-spotify-green);
  font-weight: 600;
  text-decoration: none;
  padding: 12px 24px;
  border: 2px solid var(--color-spotify-green);
  border-radius: var(--radius-lg);
  transition: all 0.2s ease;
}

.back-link:hover {
  background: var(--color-spotify-green);
  color: var(--color-bg-primary);
}
</style>
