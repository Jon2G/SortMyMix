import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createVuestic } from 'vuestic-ui'
import 'vuestic-ui/dist/vuestic-ui.css'

import App from './App.vue'
import router from './router'
import './styles/main.css'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(createVuestic({
  config: {
    colors: {
      variables: {
        primary: '#1DB954',
        secondary: '#191414',
        success: '#1DB954',
        info: '#535353',
        danger: '#E91429',
        warning: '#FFA500',
        background: '#121212',
        backgroundPrimary: '#121212',
        backgroundSecondary: '#181818',
        backgroundElement: '#282828',
        textPrimary: '#FFFFFF',
        textInverted: '#121212'
      }
    }
  }
}))

app.mount('#app')

