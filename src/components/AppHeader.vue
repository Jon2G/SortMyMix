<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { VaButton, VaAvatar, VaIcon } from 'vuestic-ui'
import { useAuthStore } from '@/stores/auth'
import { useSpotifyAuth } from '@/composables/useSpotifyAuth'

const router = useRouter()
const authStore = useAuthStore()
const { logout } = useSpotifyAuth()

const user = computed(() => authStore.user)
const userImage = computed(() => user.value?.images?.[0]?.url)

function handleLogout() {
  logout()
  router.push({ name: 'home' })
}
</script>

<template>
  <header class="app-header">
    <div class="header-content">
      <router-link to="/" class="logo-link">
        <svg viewBox="0 0 100 100" class="logo-icon">
          <defs>
            <linearGradient id="headerLogoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:#1DB954"/>
              <stop offset="100%" style="stop-color:#1ed760"/>
            </linearGradient>
          </defs>
          <circle cx="50" cy="50" r="48" fill="url(#headerLogoGrad)"/>
          <g fill="#121212">
            <rect x="25" y="30" width="8" height="40" rx="2"/>
            <rect x="38" y="40" width="8" height="30" rx="2"/>
            <rect x="51" y="25" width="8" height="45" rx="2"/>
            <rect x="64" y="35" width="8" height="35" rx="2"/>
          </g>
        </svg>
        <span class="logo-text">SortMyMix</span>
      </router-link>
      
      <nav class="header-nav">
        <router-link 
          to="/playlists" 
          class="nav-link"
          active-class="nav-link--active"
        >
          Playlists
        </router-link>
      </nav>
      
      <div class="header-actions">
        <div v-if="user" class="user-info">
          <VaAvatar 
            :src="userImage" 
            :alt="user.display_name"
            size="small"
            color="primary"
          >
            {{ user.display_name?.charAt(0) || 'U' }}
          </VaAvatar>
          <span class="user-name">{{ user.display_name }}</span>
        </div>
        
        <VaButton 
          preset="secondary" 
          size="small" 
          @click="handleLogout"
          class="logout-btn"
        >
          <VaIcon name="logout" />
        </VaButton>
      </div>
    </div>
  </header>
</template>

<style scoped>
.app-header {
  position: sticky;
  top: 0;
  z-index: 100;
  background: rgba(18, 18, 18, 0.95);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.header-content {
  max-width: 1400px;
  margin: 0 auto;
  padding: 12px 24px;
  display: flex;
  align-items: center;
  gap: 32px;
}

.logo-link {
  display: flex;
  align-items: center;
  gap: 12px;
  text-decoration: none;
}

.logo-icon {
  width: 36px;
  height: 36px;
}

.logo-text {
  font-family: var(--font-display);
  font-size: 1.25rem;
  color: var(--color-text-primary);
}

.header-nav {
  flex: 1;
  display: flex;
  gap: 24px;
}

.nav-link {
  color: var(--color-text-secondary);
  font-weight: 500;
  transition: color 0.2s ease;
  padding: 8px 0;
}

.nav-link:hover,
.nav-link--active {
  color: var(--color-text-primary);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 16px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.user-name {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
}

.logout-btn {
  color: var(--color-text-muted);
}

@media (max-width: 640px) {
  .user-name {
    display: none;
  }
  
  .header-nav {
    display: none;
  }
}
</style>

