<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { VaButton, VaIcon } from 'vuestic-ui'
import { useSpotifyAuth } from '@/composables/useSpotifyAuth'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()
const { login } = useSpotifyAuth()

const isLoggedIn = computed(() => authStore.isAuthenticated)

function handleLogin() {
  if (isLoggedIn.value) {
    router.push({ name: 'playlists' })
  } else {
    login()
  }
}

const features = [
  {
    icon: 'speed',
    title: 'BPM Sorting',
    description: 'Organize tracks by tempo for smooth energy transitions throughout your set'
  },
  {
    icon: 'music_note',
    title: 'Harmonic Mixing',
    description: 'Use the Camelot Wheel to ensure seamless key-matched transitions'
  },
  {
    icon: 'playlist_play',
    title: 'Smart Preview',
    description: 'Preview your sorted playlist before applying changes to Spotify'
  }
]
</script>

<template>
  <div class="home">
    <div class="hero">
      <div class="hero-background">
        <div class="gradient-orb orb-1"></div>
        <div class="gradient-orb orb-2"></div>
        <div class="gradient-orb orb-3"></div>
      </div>
      
      <div class="hero-content">
        <div class="logo-section">
          <div class="logo-icon">
            <svg viewBox="0 0 100 100" class="logo-svg">
              <defs>
                <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style="stop-color:#1DB954"/>
                  <stop offset="100%" style="stop-color:#1ed760"/>
                </linearGradient>
              </defs>
              <circle cx="50" cy="50" r="48" fill="url(#logoGrad)"/>
              <g fill="#121212">
                <rect x="25" y="30" width="8" height="40" rx="2"/>
                <rect x="38" y="40" width="8" height="30" rx="2"/>
                <rect x="51" y="25" width="8" height="45" rx="2"/>
                <rect x="64" y="35" width="8" height="35" rx="2"/>
              </g>
            </svg>
          </div>
          <h1 class="hero-title">SortMyMix</h1>
        </div>
        
        <p class="hero-subtitle">
          Transform your Spotify playlists into perfectly mixed sets using 
          <span class="highlight">BPM</span> and 
          <span class="highlight">harmonic key</span> sorting
        </p>
        
        <VaButton 
          class="cta-button" 
          size="large" 
          color="primary"
          @click="handleLogin"
        >
          <VaIcon name="login" class="btn-icon" />
          {{ isLoggedIn ? 'Go to Playlists' : 'Connect with Spotify' }}
        </VaButton>
        
        <p class="disclaimer">
          No account required. We only read and modify playlists you select.
        </p>
      </div>
    </div>
    
    <section class="features">
      <div class="container">
        <h2 class="section-title">How it works</h2>
        
        <div class="features-grid">
          <div 
            v-for="(feature, index) in features" 
            :key="feature.title"
            class="feature-card"
            :style="{ animationDelay: `${index * 100}ms` }"
          >
            <div class="feature-icon">
              <VaIcon :name="feature.icon" />
            </div>
            <h3 class="feature-title">{{ feature.title }}</h3>
            <p class="feature-description">{{ feature.description }}</p>
          </div>
        </div>
      </div>
    </section>
    
    <section class="camelot-section">
      <div class="container">
        <h2 class="section-title">The Camelot Wheel</h2>
        <p class="section-description">
          Professional DJs use the Camelot Wheel to mix tracks harmonically. 
          Adjacent keys on the wheel blend seamlessly, creating smooth transitions 
          that keep your audience moving.
        </p>
        
        <div class="camelot-visual">
          <div class="camelot-ring outer-ring">
            <div 
              v-for="i in 12" 
              :key="`b-${i}`" 
              class="camelot-key major"
              :style="{ transform: `rotate(${(i - 1) * 30}deg) translateY(-120px)` }"
            >
              {{ i }}B
            </div>
          </div>
          <div class="camelot-ring inner-ring">
            <div 
              v-for="i in 12" 
              :key="`a-${i}`" 
              class="camelot-key minor"
              :style="{ transform: `rotate(${(i - 1) * 30}deg) translateY(-70px)` }"
            >
              {{ i }}A
            </div>
          </div>
          <div class="camelot-center">
            <span>Camelot</span>
          </div>
        </div>
      </div>
    </section>
    
    <footer class="footer">
      <div class="container">
        <p>
          Built with Vue.js + Vuestic UI | 
          <a href="https://github.com" target="_blank" rel="noopener">GitHub</a>
        </p>
        <p class="footer-disclaimer">
          SortMyMix is not affiliated with Spotify AB
        </p>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.home {
  min-height: 100vh;
  overflow-x: hidden;
}

.hero {
  position: relative;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 24px;
  overflow: hidden;
}

.hero-background {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, #0a0a0a 0%, #121212 50%, #1a1a2e 100%);
}

.gradient-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.4;
}

.orb-1 {
  width: 600px;
  height: 600px;
  background: radial-gradient(circle, #1DB954 0%, transparent 70%);
  top: -200px;
  right: -200px;
  animation: float 20s ease-in-out infinite;
}

.orb-2 {
  width: 400px;
  height: 400px;
  background: radial-gradient(circle, #7B68EE 0%, transparent 70%);
  bottom: -100px;
  left: -100px;
  animation: float 15s ease-in-out infinite reverse;
}

.orb-3 {
  width: 300px;
  height: 300px;
  background: radial-gradient(circle, #FF6B6B 0%, transparent 70%);
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  animation: pulse 10s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translate(0, 0); }
  50% { transform: translate(30px, -30px); }
}

@keyframes pulse {
  0%, 100% { opacity: 0.2; transform: translate(-50%, -50%) scale(1); }
  50% { opacity: 0.4; transform: translate(-50%, -50%) scale(1.1); }
}

.hero-content {
  position: relative;
  z-index: 1;
  text-align: center;
  max-width: 600px;
  animation: slideUp 0.8s ease-out;
}

.logo-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
}

.logo-icon {
  width: 100px;
  height: 100px;
  animation: fadeIn 1s ease-out;
}

.logo-svg {
  width: 100%;
  height: 100%;
  filter: drop-shadow(0 8px 32px rgba(29, 185, 84, 0.4));
}

.hero-title {
  font-family: var(--font-display);
  font-size: clamp(3rem, 8vw, 5rem);
  font-weight: 400;
  letter-spacing: -0.02em;
  background: linear-gradient(135deg, #fff 0%, #b3b3b3 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.hero-subtitle {
  font-size: 1.25rem;
  color: var(--color-text-secondary);
  line-height: 1.7;
  margin-bottom: 40px;
}

.highlight {
  color: var(--color-spotify-green);
  font-weight: 600;
}

.cta-button {
  font-size: 1.125rem;
  padding: 16px 40px;
  border-radius: 500px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.cta-button:hover {
  transform: scale(1.05);
  box-shadow: 0 8px 32px rgba(29, 185, 84, 0.4);
}

.btn-icon {
  margin-right: 8px;
}

.disclaimer {
  margin-top: 16px;
  font-size: 0.875rem;
  color: var(--color-text-muted);
}

.features {
  padding: 100px 24px;
  background: var(--color-bg-secondary);
}

.section-title {
  font-family: var(--font-display);
  font-size: 2.5rem;
  text-align: center;
  margin-bottom: 60px;
  color: var(--color-text-primary);
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 32px;
  max-width: 1000px;
  margin: 0 auto;
}

.feature-card {
  background: var(--color-bg-elevated);
  border-radius: var(--radius-xl);
  padding: 40px 32px;
  text-align: center;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  animation: slideUp 0.6s ease-out backwards;
}

.feature-card:hover {
  transform: translateY(-8px);
  box-shadow: var(--shadow-lg);
}

.feature-icon {
  width: 64px;
  height: 64px;
  margin: 0 auto 24px;
  background: linear-gradient(135deg, var(--color-spotify-green) 0%, #1ed760 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  color: var(--color-bg-primary);
}

.feature-title {
  font-family: var(--font-display);
  font-size: 1.5rem;
  margin-bottom: 12px;
  color: var(--color-text-primary);
}

.feature-description {
  color: var(--color-text-secondary);
  line-height: 1.6;
}

.camelot-section {
  padding: 100px 24px;
  background: var(--color-bg-primary);
}

.section-description {
  text-align: center;
  max-width: 600px;
  margin: 0 auto 60px;
  color: var(--color-text-secondary);
  line-height: 1.7;
}

.camelot-visual {
  position: relative;
  width: 300px;
  height: 300px;
  margin: 0 auto;
}

.camelot-ring {
  position: absolute;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
}

.camelot-key {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 36px;
  height: 36px;
  margin-left: -18px;
  margin-top: -18px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 700;
  transition: transform 0.3s ease;
}

.camelot-key.major {
  background: var(--color-spotify-green);
  color: var(--color-bg-primary);
}

.camelot-key.minor {
  background: var(--color-bg-elevated);
  color: var(--color-text-primary);
  border: 2px solid var(--color-bg-highlight);
}

.camelot-key:hover {
  transform: scale(1.2);
}

.camelot-center {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 60px;
  height: 60px;
  background: var(--color-bg-secondary);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.625rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--color-text-muted);
}

.footer {
  padding: 40px 24px;
  background: var(--color-bg-secondary);
  text-align: center;
}

.footer p {
  color: var(--color-text-muted);
  font-size: 0.875rem;
}

.footer a {
  color: var(--color-spotify-green);
  transition: opacity 0.2s ease;
}

.footer a:hover {
  opacity: 0.8;
}

.footer-disclaimer {
  margin-top: 8px;
  font-size: 0.75rem;
}

@media (max-width: 768px) {
  .hero {
    padding: 80px 20px;
  }
  
  .hero-subtitle {
    font-size: 1.125rem;
  }
  
  .features {
    padding: 60px 20px;
  }
  
  .section-title {
    font-size: 2rem;
  }
  
  .camelot-visual {
    transform: scale(0.8);
  }
}
</style>
