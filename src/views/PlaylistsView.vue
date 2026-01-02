<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { VaInput, VaIcon, VaProgressCircle } from 'vuestic-ui'
import AppHeader from '@/components/AppHeader.vue'
import PlaylistCard from '@/components/PlaylistCard.vue'
import { spotifyApi } from '@/services/spotify'
import type { SpotifyPlaylist } from '@/types/spotify'

const router = useRouter()

const playlists = ref<SpotifyPlaylist[]>([])
const isLoading = ref(true)
const error = ref<string | null>(null)
const searchQuery = ref('')

const filteredPlaylists = computed(() => {
  if (!searchQuery.value.trim()) {
    return playlists.value
  }
  
  const query = searchQuery.value.toLowerCase()
  return playlists.value.filter(playlist => 
    playlist.name.toLowerCase().includes(query) ||
    playlist.owner?.display_name?.toLowerCase().includes(query)
  )
})

async function loadPlaylists() {
  isLoading.value = true
  error.value = null
  
  try {
    playlists.value = await spotifyApi.getAllUserPlaylists()
  } catch (err) {
    console.error('Failed to load playlists:', err)
    error.value = err instanceof Error ? err.message : 'Failed to load playlists'
  } finally {
    isLoading.value = false
  }
}

function handlePlaylistSelect(playlist: SpotifyPlaylist) {
  router.push({ name: 'sort', params: { playlistId: playlist.id } })
}

onMounted(() => {
  loadPlaylists()
})
</script>

<template>
  <div class="playlists-page">
    <AppHeader />
    
    <main class="main-content">
      <div class="container">
        <div class="page-header">
          <h1 class="page-title">Your Playlists</h1>
          <p class="page-subtitle">
            Select a playlist to sort by BPM and harmonic key
          </p>
        </div>
        
        <div class="search-bar">
          <VaInput
            v-model="searchQuery"
            placeholder="Search playlists..."
            class="search-input"
          >
            <template #prependInner>
              <VaIcon name="search" color="secondary" />
            </template>
          </VaInput>
        </div>
        
        <div v-if="isLoading" class="loading-state">
          <VaProgressCircle indeterminate size="large" color="primary" />
          <p>Loading your playlists...</p>
        </div>
        
        <div v-else-if="error" class="error-state">
          <VaIcon name="error_outline" class="error-icon" />
          <p>{{ error }}</p>
          <button class="retry-button" @click="loadPlaylists">
            Try Again
          </button>
        </div>
        
        <div v-else-if="filteredPlaylists.length === 0" class="empty-state">
          <VaIcon name="library_music" class="empty-icon" />
          <p v-if="searchQuery">No playlists match your search</p>
          <p v-else>No playlists found in your library</p>
        </div>
        
        <div v-else class="playlists-grid">
          <PlaylistCard
            v-for="playlist in filteredPlaylists"
            :key="playlist.id"
            :playlist="playlist"
            @select="handlePlaylistSelect"
          />
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.playlists-page {
  min-height: 100vh;
  background: var(--color-bg-primary);
}

.main-content {
  padding: 40px 24px 80px;
}

.container {
  max-width: 1400px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 32px;
}

.page-title {
  font-family: var(--font-display);
  font-size: 2.5rem;
  color: var(--color-text-primary);
  margin-bottom: 8px;
}

.page-subtitle {
  color: var(--color-text-secondary);
  font-size: 1rem;
}

.search-bar {
  margin-bottom: 32px;
  max-width: 400px;
}

.search-input {
  --va-input-wrapper-background: var(--color-bg-elevated);
  --va-input-wrapper-border-color: transparent;
}

.loading-state,
.error-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 24px;
  text-align: center;
  gap: 16px;
}

.loading-state p,
.error-state p,
.empty-state p {
  color: var(--color-text-secondary);
  font-size: 1.125rem;
}

.error-icon {
  font-size: 48px;
  color: #E91429;
}

.empty-icon {
  font-size: 64px;
  color: var(--color-text-muted);
}

.retry-button {
  margin-top: 8px;
  padding: 12px 24px;
  background: var(--color-spotify-green);
  color: var(--color-bg-primary);
  border: none;
  border-radius: var(--radius-lg);
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s ease;
}

.retry-button:hover {
  opacity: 0.9;
}

.playlists-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 24px;
}

@media (min-width: 640px) {
  .playlists-grid {
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  }
}

@media (max-width: 640px) {
  .page-title {
    font-size: 1.75rem;
  }
  
  .playlists-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
  }
}
</style>
