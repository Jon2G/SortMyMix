<script setup lang="ts">
import { VaIcon } from 'vuestic-ui'

interface SortStats {
  totalTracks: number
  goodTransitions: number
  totalTransitions: number
  harmonicScore: number
  movedTracks: number
  bpmRange: { min: number; max: number }
}

defineProps<{
  stats: SortStats
}>()
</script>

<template>
  <div class="sort-preview">
    <h3 class="preview-title">Sort Preview</h3>
    
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon">
          <VaIcon name="library_music" />
        </div>
        <div class="stat-content">
          <span class="stat-value">{{ stats.totalTracks }}</span>
          <span class="stat-label">Total Tracks</span>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon accent">
          <VaIcon name="speed" />
        </div>
        <div class="stat-content">
          <span class="stat-value">{{ stats.bpmRange.min }} - {{ stats.bpmRange.max }}</span>
          <span class="stat-label">BPM Range</span>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon success">
          <VaIcon name="music_note" />
        </div>
        <div class="stat-content">
          <span class="stat-value">{{ stats.harmonicScore }}%</span>
          <span class="stat-label">Harmonic Score</span>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon warning">
          <VaIcon name="swap_vert" />
        </div>
        <div class="stat-content">
          <span class="stat-value">{{ stats.movedTracks }}</span>
          <span class="stat-label">Tracks Moved</span>
        </div>
      </div>
    </div>
    
    <div class="transitions-bar">
      <div class="transitions-label">
        <span>Harmonic Transitions</span>
        <span class="transitions-count">
          {{ stats.goodTransitions }} / {{ stats.totalTransitions }} smooth
        </span>
      </div>
      <div class="transitions-track">
        <div 
          class="transitions-fill" 
          :style="{ width: `${stats.harmonicScore}%` }"
        ></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.sort-preview {
  background: var(--color-bg-secondary);
  border-radius: var(--radius-xl);
  padding: 24px;
}

.preview-title {
  font-family: var(--font-display);
  font-size: 1.25rem;
  color: var(--color-text-primary);
  margin-bottom: 20px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  background: var(--color-bg-elevated);
  border-radius: var(--radius-lg);
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.stat-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: var(--color-bg-highlight);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  color: var(--color-text-secondary);
}

.stat-icon.accent {
  background: rgba(29, 185, 84, 0.15);
  color: var(--color-spotify-green);
}

.stat-icon.success {
  background: rgba(78, 205, 196, 0.15);
  color: #4ECDC4;
}

.stat-icon.warning {
  background: rgba(255, 179, 71, 0.15);
  color: #FFB347;
}

.stat-content {
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-text-primary);
}

.stat-label {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.transitions-bar {
  margin-top: 8px;
}

.transitions-label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 0.875rem;
}

.transitions-label span:first-child {
  color: var(--color-text-secondary);
}

.transitions-count {
  color: var(--color-text-muted);
}

.transitions-track {
  height: 8px;
  background: var(--color-bg-highlight);
  border-radius: 4px;
  overflow: hidden;
}

.transitions-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--color-spotify-green), #4ECDC4);
  border-radius: 4px;
  transition: width 0.5s ease;
}

@media (max-width: 640px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
  
  .stat-value {
    font-size: 1.125rem;
  }
}
</style>

