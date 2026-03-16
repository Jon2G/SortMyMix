<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { VaIcon } from 'vuestic-ui'
import draggable from 'vuedraggable'
import CamelotBadge from './CamelotBadge.vue'
import { camelotToSpotify, spotifyToCamelot, camelotToString, CAMELOT_OPTIONS } from '@/services/camelot'
import type { TrackWithFeatures } from '@/types/spotify'

const props = defineProps<{
  tracks: TrackWithFeatures[]
  showPosition?: boolean
  /** Track IDs currently loading BPM/key (show skeleton) */
  loadingTrackIds?: string[]
  /** Enable drag-to-reorder (prop named to avoid conflict with vuedraggable component) */
  draggable?: boolean
  /** Track IDs with custom BPM/key set by user */
  customTrackIds?: Set<string> | string[]
}>()

const isLoadingTrack = (trackId: string) =>
  (props.loadingTrackIds?.length ?? 0) > 0 && props.loadingTrackIds!.includes(trackId)

const isCustomTrack = (trackId: string) => {
  const ids = props.customTrackIds
  if (!ids) return false
  return ids instanceof Set ? ids.has(trackId) : ids.includes(trackId)
}

const isDraggable = computed(() => !!props.draggable)

const editingBpm = ref<string | null>(null)
const editingKey = ref<string | null>(null)

const emit = defineEmits<{
  reorder: [tracks: TrackWithFeatures[]]
  customUpdate: [payload: { trackId: string; bpm?: number; key?: number; mode?: number }]
}>()

const list = ref<TrackWithFeatures[]>([...props.tracks])
watch(() => props.tracks, (t) => { list.value = [...t] }, { deep: true })

function onReorder() {
  if (props.draggable && list.value) {
    emit('reorder', [...list.value])
  }
}

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

function startEditBpm(trackId: string) {
  editingBpm.value = trackId
  editingKey.value = null
}

function startEditKey(trackId: string) {
  editingKey.value = trackId
  editingBpm.value = null
}

function saveBpmEdit(trackId: string, value: string) {
  editingBpm.value = null
  const n = parseFloat(value.trim())
  if (!Number.isNaN(n) && n > 0 && n < 300) {
    emit('customUpdate', { trackId, bpm: Math.round(n) })
  }
}

function saveKeyEdit(trackId: string, value: string) {
  editingKey.value = null
  if (!value || value === '—') {
    emit('customUpdate', { trackId, key: -1, mode: 0 })
    return
  }
  const parsed = camelotToSpotify(value)
  if (parsed) {
    emit('customUpdate', { trackId, key: parsed.key, mode: parsed.mode })
  }
}

function camelotFromFeatures(features: TrackWithFeatures['features']): string {
  if (!features || features.key < 0) return '—'
  const c = spotifyToCamelot(features.key, features.mode)
  return c ? camelotToString(c) ?? '—' : '—'
}
</script>

<template>
  <div class="track-list">
    <div class="track-list-header" :class="{ 'with-drag': isDraggable }">
      <span v-if="isDraggable" class="col-drag"></span>
      <span class="col-num">#</span>
      <span class="col-title">Title</span>
      <span class="col-bpm">BPM</span>
      <span class="col-key">Key</span>
      <span class="col-duration">
        <VaIcon name="schedule" />
      </span>
    </div>

    <div class="track-list-body">
      <draggable v-if="isDraggable" v-model="list" :item-key="(el: TrackWithFeatures) => el.track.id"
        handle=".drag-handle" @end="onReorder" tag="div" class="track-list-draggable">
        <template #item="{ element: item, index }">
          <div class="track-row" :class="{ 'with-drag': isDraggable, 'has-custom': isCustomTrack(item.track.id) }">
            <span v-if="isDraggable" class="col-drag drag-handle" aria-label="Drag to reorder">
              <VaIcon name="drag_indicator" />
            </span>
            <span class="col-num">{{ (index ?? 0) + 1 }}</span>
            <div class="col-title">
              <img v-if="albumImage(item)" :src="albumImage(item)" :alt="item.track.album.name" class="track-image"
                loading="lazy" />
              <div v-else class="track-image-placeholder">
                <VaIcon name="music_note" />
              </div>
              <div class="track-info">
                <span class="track-name">{{ item.track.name }}</span>
                <span class="track-artist">{{ formatArtists(item) }}</span>
                <span v-if="isCustomTrack(item.track.id)" class="custom-badge">CUSTOM</span>
              </div>
            </div>
            <span class="col-bpm editable-cell"
              @dblclick="!isLoadingTrack(item.track.id) && startEditBpm(item.track.id)">
              <span v-if="isLoadingTrack(item.track.id)" class="skeleton skeleton-bpm" />
              <template v-else-if="editingBpm === item.track.id">
                <input ref="bpmInputRef" type="number" :value="item.features?.tempo ?? ''" min="1" max="299"
                  class="edit-input edit-bpm"
                  @blur="saveBpmEdit(item.track.id, ($event.target as HTMLInputElement).value)"
                  @keydown.enter="saveBpmEdit(item.track.id, ($event.target as HTMLInputElement).value); ($event.target as HTMLInputElement).blur()"
                  @keydown.escape="editingBpm = null" />
              </template>
              <template v-else>{{ formatBpm(item.features?.tempo) }}</template>
            </span>
            <span class="col-key editable-cell"
              @dblclick="!isLoadingTrack(item.track.id) && startEditKey(item.track.id)">
              <span v-if="isLoadingTrack(item.track.id)" class="skeleton skeleton-key" />
              <template v-else-if="editingKey === item.track.id">
                <select :value="camelotFromFeatures(item.features)" class="edit-input edit-key"
                  @change="saveKeyEdit(item.track.id, ($event.target as HTMLSelectElement).value); editingKey = null"
                  @blur="editingKey = null" @keydown.escape="editingKey = null">
                  <option value="—">—</option>
                  <option v-for="opt in CAMELOT_OPTIONS" :key="opt" :value="opt">{{ opt }}</option>
                </select>
              </template>
              <CamelotBadge v-else-if="item.features && item.features.key >= 0" :spotify-key="item.features.key"
                :spotify-mode="item.features.mode" size="small" />
              <span v-else class="unknown-key">—</span>
            </span>
            <span class="col-duration">{{ formatDuration(item.track.duration_ms) }}</span>
          </div>
        </template>
      </draggable>

      <template v-else>
        <div v-for="(item, index) in tracks" :key="item.track.id + '-' + index" class="track-row"
          :class="{ 'has-custom': isCustomTrack(item.track.id) }">
          <span class="col-num">{{ showPosition ? item.position + 1 : index + 1 }}</span>
          <div class="col-title">
            <img v-if="albumImage(item)" :src="albumImage(item)" :alt="item.track.album.name" class="track-image"
              loading="lazy" />
            <div v-else class="track-image-placeholder">
              <VaIcon name="music_note" />
            </div>
            <div class="track-info">
              <span class="track-name">{{ item.track.name }}</span>
              <span class="track-artist">{{ formatArtists(item) }}</span>
              <span v-if="isCustomTrack(item.track.id)" class="custom-badge">CUSTOM</span>
            </div>
          </div>
          <span class="col-bpm editable-cell" @dblclick="!isLoadingTrack(item.track.id) && startEditBpm(item.track.id)">
            <span v-if="isLoadingTrack(item.track.id)" class="skeleton skeleton-bpm" />
            <template v-else-if="editingBpm === item.track.id">
              <input type="number" :value="item.features?.tempo ?? ''" min="1" max="299" class="edit-input edit-bpm"
                @blur="saveBpmEdit(item.track.id, ($event.target as HTMLInputElement).value)"
                @keydown.enter="saveBpmEdit(item.track.id, ($event.target as HTMLInputElement).value); ($event.target as HTMLInputElement).blur()"
                @keydown.escape="editingBpm = null" />
            </template>
            <template v-else>{{ formatBpm(item.features?.tempo) }}</template>
          </span>
          <span class="col-key editable-cell" @dblclick="!isLoadingTrack(item.track.id) && startEditKey(item.track.id)">
            <span v-if="isLoadingTrack(item.track.id)" class="skeleton skeleton-key" />
            <template v-else-if="editingKey === item.track.id">
              <select :value="camelotFromFeatures(item.features)" class="edit-input edit-key"
                @change="saveKeyEdit(item.track.id, ($event.target as HTMLSelectElement).value); editingKey = null"
                @blur="editingKey = null" @keydown.escape="editingKey = null">
                <option value="—">—</option>
                <option v-for="opt in CAMELOT_OPTIONS" :key="opt" :value="opt">{{ opt }}</option>
              </select>
            </template>
            <CamelotBadge v-else-if="item.features && item.features.key >= 0" :spotify-key="item.features.key"
              :spotify-mode="item.features.mode" size="small" />
            <span v-else class="unknown-key">—</span>
          </span>
          <span class="col-duration">{{ formatDuration(item.track.duration_ms) }}</span>
        </div>
      </template>
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
}

.track-list-header.with-drag {
  grid-template-columns: 36px 48px 1fr 64px 56px 64px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--color-bg-highlight);
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--color-text-muted);
}

.track-list-body {
  max-height: 100vh;
  overflow-y: auto;
}

.track-row {
  display: grid;
  grid-template-columns: 48px 1fr 64px 56px 64px;
  gap: 16px;
}

.track-row.with-drag {
  grid-template-columns: 36px 48px 1fr 64px 56px 64px;
}

.col-drag {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-muted);
  cursor: grab;
}

.col-drag:active {
  cursor: grabbing;
}

.track-list-draggable {
  display: flex;
  flex-direction: column;
}

.track-row:hover {
  background: var(--color-bg-elevated);
}

.col-num {
  color: var(--color-text-muted);
  font-size: 0.875rem;
  text-align: center;
  margin: auto;
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
  margin: auto;
}

.col-key {
  display: flex;
  justify-content: center;
  margin: auto;
}

.unknown-key {
  color: var(--color-text-muted);
}

.custom-badge {
  display: inline-block;
  margin-left: 6px;
  width: max-content;
  padding: 2px 6px;
  font-size: 0.625rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  background: rgba(29, 185, 84, 0.2);
  color: var(--color-spotify-green, #1DB954);
  border-radius: 4px;
}

.track-row.has-custom .track-info {
  position: relative;
}

.editable-cell {
  cursor: pointer;
}

.editable-cell:hover {
  text-decoration: underline;
}

.edit-input {
  width: 100%;
  max-width: 56px;
  padding: 2px 4px;
  font-size: 0.875rem;
  text-align: center;
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-bg-highlight);
  border-radius: 4px;
  color: var(--color-text-primary);
}

.edit-input:focus {
  outline: none;
  border-color: var(--color-primary, #1DB954);
}

.edit-bpm {
  max-width: 48px;
}

.edit-key {
  max-width: 52px;
  cursor: pointer;
}

.skeleton {
  display: inline-block;
  border-radius: 4px;
  background: linear-gradient(90deg,
      var(--color-bg-highlight) 25%,
      var(--color-bg-elevated) 50%,
      var(--color-bg-highlight) 75%);
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.2s ease-in-out infinite;
}

.skeleton-bpm {
  width: 32px;
  height: 1em;
  vertical-align: middle;
}

.skeleton-key {
  width: 36px;
  height: 20px;
  vertical-align: middle;
}

@keyframes skeleton-shimmer {
  0% {
    background-position: 200% 0;
  }

  100% {
    background-position: -200% 0;
  }
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
