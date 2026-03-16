<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { VaButton, VaIcon, VaProgressCircle } from 'vuestic-ui'
import AppHeader from '@/components/AppHeader.vue'
import TrackList from '@/components/TrackList.vue'
import SortPreview from '@/components/SortPreview.vue'
import { spotifyApi } from '@/services/spotify'
import { estimateBpmForTracks } from '@/services/bpmEstimation'
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
const estimationProgress = ref<{ done: number; total: number } | null>(null)
const tracksWithPreviewCount = ref(0)
const activeTab = ref(0)
const hasSorted = ref(false)

const sortStats = computed(() => {
  if (!hasSorted.value || sortedTracks.value.length === 0) return null
  return calculateSortStats(originalTracks.value, sortedTracks.value)
})

const hasAudioFeatures = computed(() =>
  originalTracks.value.some(t => t.features !== null)
)

const displayTracks = computed(() => {
  return activeTab.value === 0 ? originalTracks.value : sortedTracks.value
})

// Manual reorder only on Sorted tab, never on Original Order
const isDraggable = computed(() => activeTab.value === 1 && hasSorted.value)

async function loadPlaylistData() {
  isLoading.value = true
  error.value = null
  tracksWithPreviewCount.value = 0

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

    // Estimate BPM from preview URLs (audio-features API not used)
    const featuresMap = new Map<string, SpotifyAudioFeatures | null>()
    const withPreview = validTracks.map(t => ({
      id: t.track.id,
      preview_url: t.track.preview_url
    }))
    const tracksWithPreview = withPreview.filter(t => t.preview_url)
    tracksWithPreviewCount.value = tracksWithPreview.length
    console.log('[BPM] loadPlaylistData: validTracks=', validTracks.length, 'tracksWithPreview=', tracksWithPreview.length, 'sample:', withPreview.slice(0, 3))
    estimationProgress.value = { done: 0, total: withPreview.length }
    const estimated = await estimateBpmForTracks(withPreview, (done, total) => {
      estimationProgress.value = { done, total }
      if (done % 5 === 0 || done === total) console.log('[BPM] progress:', done, '/', total)
    })
    estimationProgress.value = null
    const successCount = [...estimated.values()].filter(Boolean).length
    console.log('[BPM] estimateBpmForTracks done: successCount=', successCount, 'total=', estimated.size, 'sample results:', [...estimated.entries()].slice(0, 5))
    estimated.forEach((features, id) => {
      if (features) featuresMap.set(id, features)
    })

    // Combine tracks with their features
    originalTracks.value = validTracks.map((t, index) => {
      const features = featuresMap.get(t.track.id) || null
      return {
        track: t.track,
        features,
        camelotKey: features && features.key >= 0
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
          <VaProgressCircle :indeterminate="!estimationProgress"
            :model-value="estimationProgress ? (estimationProgress.done / estimationProgress.total) * 100 : 0"
            size="large" color="primary" />
          <p v-if="estimationProgress">
            Estimating BPM from previews... {{ estimationProgress.done }}/{{ estimationProgress.total }}
          </p>
          <p v-else>Loading playlist tracks...</p>
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
            <img v-if="playlist.images?.[0]?.url" :src="playlist.images[0].url" :alt="playlist.name"
              class="playlist-cover" />
            <div v-else class="playlist-cover-placeholder">
              <VaIcon name="music_note" />
            </div>

            <div class="playlist-info">
              <h1 class="playlist-name">{{ playlist.name }}</h1>
              <p class="playlist-meta">
                {{ playlist.items?.total ?? playlist.tracks?.total ?? 0 }} tracks
                <span v-if="playlist.owner">
                  &middot; by {{ playlist.owner.display_name }}
                </span>
              </p>

              <div class="playlist-actions">
                <VaButton color="primary" size="large" :loading="isSorting"
                  :disabled="isSorting || isSaving || originalTracks.length === 0" @click="performSort">
                  <VaIcon name="sort" class="btn-icon" />
                  {{ hasSorted ? 'Re-Sort Playlist' : 'Sort Playlist' }}
                </VaButton>

                <VaButton v-if="hasSorted" preset="secondary" size="large" :loading="isSaving"
                  :disabled="isSorting || isSaving" @click="saveSort">
                  <VaIcon name="save" class="btn-icon" />
                  Apply to Spotify
                </VaButton>
              </div>
            </div>
          </div>

          <div v-if="tracksWithPreviewCount === 0 && originalTracks.length > 0" class="features-unavailable-banner" role="alert">
            <VaIcon name="info" />
            <p>
              No preview URLs available for any track in this playlist. BPM cannot be estimated.
            </p>
          </div>
          <div v-else-if="!hasAudioFeatures && originalTracks.length > 0" class="features-unavailable-banner" role="alert">
            <VaIcon name="info" />
            <p>
              BPM and key data unavailable for tracks without preview URLs.
            </p>
          </div>

          <SortPreview v-if="sortStats && hasAudioFeatures" :stats="sortStats" class="sort-stats" />

          <div class="tracks-section">
            <div class="tracks-tabs">
              <button
                type="button"
                class="tab-btn"
                :class="{ active: activeTab === 0 }"
                @click="activeTab = 0"
              >
                Original Order
              </button>
              <button
                type="button"
                class="tab-btn"
                :class="{ active: activeTab === 1 }"
                :disabled="!hasSorted"
                @click="hasSorted && (activeTab = 1)"
              >
                Sorted Order
              </button>
            </div>

            <TrackList
              :key="'tab-' + activeTab"
              :tracks="displayTracks"
              :show-position="activeTab === 0"
              :draggable="isDraggable"
              @reorder="sortedTracks = $event"
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

.features-unavailable-banner {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  margin-bottom: 24px;
  background: rgba(29, 185, 84, 0.1);
  border: 1px solid rgba(29, 185, 84, 0.3);
  border-radius: var(--radius-lg);
  color: var(--color-text-secondary);
  font-size: 0.875rem;
}

.features-unavailable-banner .va-icon {
  flex-shrink: 0;
  color: var(--color-spotify-green);
}

.features-unavailable-banner a {
  color: var(--color-spotify-green);
  text-decoration: underline;
}

.features-unavailable-banner a:hover {
  opacity: 0.9;
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
  display: flex;
  gap: 0;
  padding: 16px 16px 0;
  border-bottom: 1px solid var(--color-bg-elevated);
}

.tab-btn {
  flex: 1;
  padding: 12px 16px;
  background: none;
  border: none;
  border-bottom: 3px solid transparent;
  margin-bottom: -1px;
  font-size: 0.9375rem;
  font-weight: 500;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: color 0.2s, border-color 0.2s;
}

.tab-btn:hover:not(:disabled) {
  color: var(--color-text-primary);
}

.tab-btn.active {
  color: var(--color-text-primary);
  border-bottom-color: var(--color-primary, #1DB954);
}

.tab-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
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
