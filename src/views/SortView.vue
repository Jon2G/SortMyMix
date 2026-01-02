<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { VaButton, VaIcon, VaProgressCircle, VaTabs, VaTab } from 'vuestic-ui'
import AppHeader from '@/components/AppHeader.vue'
import TrackList from '@/components/TrackList.vue'
import SortPreview from '@/components/SortPreview.vue'
import { spotifyApi } from '@/services/spotify'
import { useSorting } from '@/composables/useSorting'
import { spotifyToCamelot, camelotToString } from '@/services/camelot'
import type { SpotifyPlaylist, TrackWithFeatures, SpotifyPlaylistTrack, SpotifyAudioFeatures } from '@/types/spotify'

const route = useRoute()
const router = useRouter()
const { sortByBpmThenHarmonic, calculateSortStats } = useSorting()

const playlistId = computed(() => route.params.playlistId as string)

const playlist = ref<SpotifyPlaylist | null>(null)
const originalTracks = ref<TrackWithFeatures[]>([])
const sortedTracks = ref<TrackWithFeatures[]>([])

const isLoading = ref(true)
const isSorting = ref(false)
const isSaving = ref(false)
const error = ref<string | null>(null)
const activeTab = ref(0)
const hasSorted = ref(false)

const sortStats = computed(() => {
  if (!hasSorted.value || sortedTracks.value.length === 0) return null
  return calculateSortStats(originalTracks.value, sortedTracks.value)
})

const displayTracks = computed(() => {
  return activeTab.value === 0 ? originalTracks.value : sortedTracks.value
})

async function loadPlaylistData() {
  isLoading.value = true
  error.value = null
  
  try {
    // Load playlist info
    playlist.value = await spotifyApi.getPlaylist(playlistId.value)
    
    // Load all tracks
    const playlistTracks = await spotifyApi.getAllPlaylistTracks(playlistId.value)
    
    // Filter out null tracks and get track IDs
    const validTracks = playlistTracks.filter(
      (t): t is SpotifyPlaylistTrack & { track: NonNullable<SpotifyPlaylistTrack['track']> } => 
        t.track !== null
    )
    
    const trackIds = validTracks.map(t => t.track.id)
    
    // Load audio features
    const audioFeatures = await spotifyApi.getAudioFeatures(trackIds)
    
    // Create a map of track ID to audio features
    const featuresMap = new Map<string, SpotifyAudioFeatures | null>()
    trackIds.forEach((id, index) => {
      featuresMap.set(id, audioFeatures[index])
    })
    
    // Combine tracks with their features
    originalTracks.value = validTracks.map((t, index) => {
      const features = featuresMap.get(t.track.id) || null
      return {
        track: t.track,
        features,
        camelotKey: features 
          ? camelotToString(spotifyToCamelot(features.key, features.mode))
          : null,
        position: index
      }
    })
    
    sortedTracks.value = [...originalTracks.value]
    
  } catch (err) {
    console.error('Failed to load playlist:', err)
    error.value = err instanceof Error ? err.message : 'Failed to load playlist'
  } finally {
    isLoading.value = false
  }
}

function performSort() {
  isSorting.value = true
  
  // Use setTimeout to allow UI to update
  setTimeout(() => {
    sortedTracks.value = sortByBpmThenHarmonic(originalTracks.value)
    hasSorted.value = true
    activeTab.value = 1 // Switch to sorted view
    isSorting.value = false
  }, 100)
}

async function saveSort() {
  if (!playlist.value || sortedTracks.value.length === 0) return
  
  isSaving.value = true
  error.value = null
  
  try {
    const originalUris = originalTracks.value.map(t => t.track.uri)
    const sortedUris = sortedTracks.value.map(t => t.track.uri)
    
    await spotifyApi.reorderPlaylistToMatch(playlistId.value, originalUris, sortedUris)
    
    // Update original tracks to match sorted order
    originalTracks.value = sortedTracks.value.map((t, i) => ({ ...t, position: i }))
    
    // Show success (could use a toast notification)
    alert('Playlist sorted successfully!')
    
    // Navigate back to playlists
    router.push({ name: 'playlists' })
  } catch (err) {
    console.error('Failed to save sort:', err)
    error.value = err instanceof Error ? err.message : 'Failed to save playlist order'
  } finally {
    isSaving.value = false
  }
}

function goBack() {
  router.push({ name: 'playlists' })
}

onMounted(() => {
  loadPlaylistData()
})

watch(playlistId, () => {
  loadPlaylistData()
})
</script>

<template>
  <div class="sort-page">
    <AppHeader />
    
    <main class="main-content">
      <div class="container">
        <button class="back-button" @click="goBack">
          <VaIcon name="arrow_back" />
          <span>Back to Playlists</span>
        </button>
        
        <div v-if="isLoading" class="loading-state">
          <VaProgressCircle indeterminate size="large" color="primary" />
          <p>Loading playlist tracks...</p>
        </div>
        
        <div v-else-if="error" class="error-state">
          <VaIcon name="error_outline" class="error-icon" />
          <p>{{ error }}</p>
          <VaButton color="primary" @click="loadPlaylistData">
            Try Again
          </VaButton>
        </div>
        
        <template v-else-if="playlist">
          <div class="playlist-header">
            <img 
              v-if="playlist.images?.[0]?.url"
              :src="playlist.images[0].url" 
              :alt="playlist.name"
              class="playlist-cover"
            />
            <div v-else class="playlist-cover-placeholder">
              <VaIcon name="music_note" />
            </div>
            
            <div class="playlist-info">
              <h1 class="playlist-name">{{ playlist.name }}</h1>
              <p class="playlist-meta">
                {{ playlist.tracks.total }} tracks
                <span v-if="playlist.owner">
                  &middot; by {{ playlist.owner.display_name }}
                </span>
              </p>
              
              <div class="playlist-actions">
                <VaButton 
                  color="primary" 
                  size="large"
                  :loading="isSorting"
                  :disabled="isSorting || isSaving"
                  @click="performSort"
                >
                  <VaIcon name="sort" class="btn-icon" />
                  {{ hasSorted ? 'Re-Sort Playlist' : 'Sort Playlist' }}
                </VaButton>
                
                <VaButton 
                  v-if="hasSorted"
                  preset="secondary"
                  size="large"
                  :loading="isSaving"
                  :disabled="isSorting || isSaving"
                  @click="saveSort"
                >
                  <VaIcon name="save" class="btn-icon" />
                  Apply to Spotify
                </VaButton>
              </div>
            </div>
          </div>
          
          <SortPreview 
            v-if="sortStats" 
            :stats="sortStats" 
            class="sort-stats"
          />
          
          <div class="tracks-section">
            <VaTabs v-model="activeTab" class="tracks-tabs">
              <VaTab>Original Order</VaTab>
              <VaTab :disabled="!hasSorted">Sorted Order</VaTab>
            </VaTabs>
            
            <TrackList 
              :tracks="displayTracks" 
              :show-position="activeTab === 0"
            />
          </div>
        </template>
      </div>
    </main>
  </div>
</template>

<style scoped>
.sort-page {
  min-height: 100vh;
  background: var(--color-bg-primary);
}

.main-content {
  padding: 24px 24px 80px;
}

.container {
  max-width: 1000px;
  margin: 0 auto;
}

.back-button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
  margin-bottom: 24px;
  background: none;
  border: none;
  color: var(--color-text-secondary);
  font-size: 0.875rem;
  cursor: pointer;
  transition: color 0.2s ease;
}

.back-button:hover {
  color: var(--color-text-primary);
}

.loading-state,
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 24px;
  text-align: center;
  gap: 16px;
}

.loading-state p,
.error-state p {
  color: var(--color-text-secondary);
  font-size: 1.125rem;
}

.error-icon {
  font-size: 48px;
  color: #E91429;
}

.playlist-header {
  display: flex;
  gap: 24px;
  margin-bottom: 32px;
  padding: 24px;
  background: linear-gradient(135deg, var(--color-bg-secondary) 0%, var(--color-bg-elevated) 100%);
  border-radius: var(--radius-xl);
}

.playlist-cover {
  width: 180px;
  height: 180px;
  border-radius: var(--radius-lg);
  object-fit: cover;
  box-shadow: var(--shadow-lg);
}

.playlist-cover-placeholder {
  width: 180px;
  height: 180px;
  border-radius: var(--radius-lg);
  background: var(--color-bg-highlight);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 64px;
  color: var(--color-text-muted);
}

.playlist-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.playlist-name {
  font-family: var(--font-display);
  font-size: 2rem;
  color: var(--color-text-primary);
  margin-bottom: 8px;
}

.playlist-meta {
  color: var(--color-text-secondary);
  margin-bottom: 24px;
}

.playlist-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.btn-icon {
  margin-right: 8px;
}

.sort-stats {
  margin-bottom: 32px;
}

.tracks-section {
  background: var(--color-bg-secondary);
  border-radius: var(--radius-xl);
  overflow: hidden;
}

.tracks-tabs {
  padding: 16px 16px 0;
  --va-tabs-wrapper-background: transparent;
}

@media (max-width: 768px) {
  .playlist-header {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }
  
  .playlist-cover,
  .playlist-cover-placeholder {
    width: 160px;
    height: 160px;
  }
  
  .playlist-actions {
    justify-content: center;
  }
  
  .playlist-name {
    font-size: 1.5rem;
  }
}

@media (max-width: 480px) {
  .playlist-actions {
    flex-direction: column;
  }
  
  .playlist-actions :deep(.va-button) {
    width: 100%;
  }
}
</style>
