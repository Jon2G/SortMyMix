<script setup lang="ts">
import { computed } from 'vue'
import { VaIcon } from 'vuestic-ui'
import type { SpotifyPlaylist } from '@/types/spotify'

const props = defineProps<{
  playlist: SpotifyPlaylist
}>()

const emit = defineEmits<{
  select: [playlist: SpotifyPlaylist]
}>()

const coverImage = computed(() => {
  return props.playlist.images?.[0]?.url || null
})

const trackCount = computed(() => {
  return props.playlist.tracks.total
})

function handleClick() {
  emit('select', props.playlist)
}
</script>

<template>
  <article class="playlist-card" @click="handleClick">
    <div class="card-image">
      <img 
        v-if="coverImage" 
        :src="coverImage" 
        :alt="playlist.name"
        loading="lazy"
      />
      <div v-else class="placeholder-image">
        <VaIcon name="music_note" />
      </div>
      <div class="card-overlay">
        <button class="play-button" aria-label="Sort playlist">
          <VaIcon name="sort" />
        </button>
      </div>
    </div>
    
    <div class="card-content">
      <h3 class="card-title">{{ playlist.name }}</h3>
      <p class="card-meta">
        <span class="track-count">{{ trackCount }} tracks</span>
        <span v-if="playlist.owner" class="owner">
          by {{ playlist.owner.display_name }}
        </span>
      </p>
    </div>
  </article>
</template>

<style scoped>
.playlist-card {
  background: var(--color-bg-elevated);
  border-radius: var(--radius-lg);
  padding: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.playlist-card:hover {
  background: var(--color-bg-highlight);
  transform: translateY(-4px);
}

.card-image {
  position: relative;
  aspect-ratio: 1;
  border-radius: var(--radius-md);
  overflow: hidden;
  margin-bottom: 16px;
}

.card-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.placeholder-image {
  width: 100%;
  height: 100%;
  background: var(--color-bg-highlight);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 48px;
  color: var(--color-text-muted);
}

.card-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.playlist-card:hover .card-overlay {
  opacity: 1;
}

.play-button {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--color-spotify-green);
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: var(--color-bg-primary);
  transform: translateY(8px);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
}

.playlist-card:hover .play-button {
  transform: translateY(0);
}

.play-button:hover {
  transform: scale(1.1);
}

.card-content {
  min-height: 60px;
}

.card-title {
  font-size: 1rem;
  font-weight: 700;
  color: var(--color-text-primary);
  margin-bottom: 4px;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-meta {
  font-size: 0.875rem;
  color: var(--color-text-muted);
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.track-count {
  color: var(--color-text-secondary);
}

.owner {
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>

