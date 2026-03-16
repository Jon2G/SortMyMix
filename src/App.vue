<script setup lang="ts">
import { RouterView } from 'vue-router'

const commitHash = import.meta.env.VITE_GIT_COMMIT_HASH as string | undefined
</script>

<template>
  <div class="app">
    <RouterView />
    <footer class="app-footer">
      <span class="footer-credit">Made by Jon2G with ☕ and ❤️</span>
      <span v-if="commitHash" class="footer-commit">{{ commitHash.slice(0, 7) }}</span>
    </footer>
  </div>
</template>

<style>
.va-button {
  font-family: var(--font-body);
  font-weight: 600;
  letter-spacing: 0.02em;
}

.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-footer {
  margin-top: auto;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 12px 24px;
  font-size: 12px;
  color: #888;
  position: relative;
}

.footer-credit {
  text-align: center;
}

.footer-commit {
  position: absolute;
  right: 24px;
  font-family: monospace;
  font-size: 11px;
}
</style>
