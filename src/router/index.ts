import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import HomeView from '@/views/HomeView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView
    },
    {
      path: '/callback',
      name: 'callback',
      component: () => import('@/views/CallbackView.vue')
    },
    {
      path: '/playlists',
      name: 'playlists',
      component: () => import('@/views/PlaylistsView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/sort/:playlistId',
      name: 'sort',
      component: () => import('@/views/SortView.vue'),
      meta: { requiresAuth: true }
    }
  ]
})

router.beforeEach((to, _from, next) => {
  const authStore = useAuthStore()
  
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next({ name: 'home' })
  } else {
    next()
  }
})

export default router

