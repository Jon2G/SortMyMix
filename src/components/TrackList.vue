<script setup lang="ts">
import { VaIcon } from 'vuestic-ui'
import CamelotBadge from './CamelotBadge.vue'
import type { TrackWithFeatures } from '@/types/spotify'

const props = defineProps<{
  tracks: TrackWithFeatures[]
  showPosition?: boolean
}>()

function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60000)
  const seconds = Math.floor((ms % 60000) / 1000)
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

function formatBpm(tempo: number | undefined): string {
  if (!tempo) return '—'
  return `${Math.round(tempo)}`
}

const formatArtists = (track: TrackWithFeatures) => {
  return track.track.artists.map(a => a.name).join(', ')
}

const albumImage = (track: TrackWithFeatures) => {
  return track.track.album.images?.[2]?.url || track.track.album.images?.[0]?.url
}
</script>

<template>
  <div class="track-list">
    <div class="track-list-header">
      <span class="col-num">#</span>
      <span class="col-title">Title</span>
      <span class="col-bpm">BPM</span>
      <span class="col-key">Key</span>
      <span class="col-duration">
        <VaIcon name="schedule" />
      </span>
    </div>
    
    <div class="track-list-body">
      <div 
        v-for="(item, index) in tracks" 
        :key="item.track.id + '-' + index"
        class="track-row"
      >
        <span class="col-num">
          {{ showPosition ? item.position + 1 : index + 1 }}
        </span>
        
        <div class="col-title">
          <img 
            v-if="albumImage(item)"
            :src="albumImage(item)" 
            :alt="item.track.album.name"
            class="track-image"
            loading="lazy"
          />
          <div v-else class="track-image-placeholder">
            <VaIcon name="music_note" />
          </div>
          
          <div class="track-info">
            <span class="track-name">{{ item.track.name }}</span>
            <span class="track-artist">{{ formatArtists(item) }}</span>
          </div>
        </div>
        
        <span class="col-bpm">
          {{ formatBpm(item.features?.tempo) }}
        </span>
        
        <span class="col-key">
          <CamelotBadge 
            v-if="item.features"
            :spotify-key="item.features.key"
            :spotify-mode="item.features.mode"
            size="small"
          />
          <span v-else class="unknown-key">—</span>
        </span>
        
        <span class="col-duration">
          {{ formatDuration(item.track.duration_ms) }}
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.track-list {
  background: var(--color-bg-secondary);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.track-list-header {
  display: grid;
  grid-template-columns: 48px 1fr 64px 56px 64px;
  gap: 16px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--color-bg-highlight);
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--color-text-muted);
}

.track-list-body {
  max-height: 500px;
  overflow-y: auto;
}

.track-row {
  display: grid;
  grid-template-columns: 48px 1fr 64px 56px 64px;
  gap: 16px;
  padding: 8px 16px;
  align-items: center;
  transition: background-color 0.15s ease;
}

.track-row:hover {
  background: var(--color-bg-elevated);
}

.col-num {
  color: var(--color-text-muted);
  font-size: 0.875rem;
  text-align: center;
}

.col-title {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.track-image {
  width: 40px;
  height: 40px;
  border-radius: 4px;
  flex-shrink: 0;
}

.track-image-placeholder {
  width: 40px;
  height: 40px;
  border-radius: 4px;
  background: var(--color-bg-highlight);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-muted);
  flex-shrink: 0;
}

.track-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.track-name {
  font-size: 0.9375rem;
  color: var(--color-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.track-artist {
  font-size: 0.8125rem;
  color: var(--color-text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.col-bpm,
.col-duration {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  text-align: center;
}

.col-key {
  display: flex;
  justify-content: center;
}

.unknown-key {
  color: var(--color-text-muted);
}

@media (max-width: 640px) {
  .track-list-header {
    grid-template-columns: 32px 1fr 48px 48px;
    gap: 8px;
    padding: 8px 12px;
  }
  
  .track-row {
    grid-template-columns: 32px 1fr 48px 48px;
    gap: 8px;
    padding: 6px 12px;
  }
  
  .col-duration {
    display: none;
  }
  
  .track-list-header .col-duration {
    display: none;
  }
  
  .track-image {
    width: 32px;
    height: 32px;
  }
  
  .track-image-placeholder {
    width: 32px;
    height: 32px;
  }
  
  .track-name {
    font-size: 0.875rem;
  }
  
  .track-artist {
    font-size: 0.75rem;
  }
}
</style>

