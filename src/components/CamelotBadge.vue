<script setup lang="ts">
import { computed } from 'vue'
import { spotifyToCamelot, getCamelotColor, camelotToString } from '@/services/camelot'

const props = defineProps<{
  spotifyKey?: number
  spotifyMode?: number
  camelotKey?: string | null
  size?: 'small' | 'medium' | 'large'
}>()

const camelot = computed(() => {
  if (props.camelotKey) {
    // Parse from string
    const match = props.camelotKey.match(/^(\d+)([AB])$/)
    if (match) {
      return {
        number: parseInt(match[1]),
        letter: match[2] as 'A' | 'B'
      }
    }
    return null
  }
  
  if (props.spotifyKey !== undefined && props.spotifyMode !== undefined) {
    return spotifyToCamelot(props.spotifyKey, props.spotifyMode)
  }
  
  return null
})

const displayText = computed(() => {
  return camelot.value ? camelotToString(camelot.value) : '—'
})

const backgroundColor = computed(() => {
  return getCamelotColor(camelot.value)
})

const sizeClass = computed(() => `badge--${props.size || 'medium'}`)
</script>

<template>
  <span 
    class="camelot-badge" 
    :class="[sizeClass, { 'badge--unknown': !camelot }]"
    :style="{ '--badge-color': backgroundColor }"
    :title="camelot ? `Camelot Key: ${displayText}` : 'Key unknown'"
  >
    {{ displayText }}
  </span>
</template>

<style scoped>
.camelot-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  border-radius: 4px;
  background: var(--badge-color);
  color: #121212;
  white-space: nowrap;
}

.badge--small {
  font-size: 0.625rem;
  padding: 2px 6px;
  min-width: 28px;
}

.badge--medium {
  font-size: 0.75rem;
  padding: 4px 8px;
  min-width: 36px;
}

.badge--large {
  font-size: 0.875rem;
  padding: 6px 12px;
  min-width: 44px;
}

.badge--unknown {
  background: var(--color-bg-highlight);
  color: var(--color-text-muted);
}
</style>

