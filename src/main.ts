import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { createApiService } from './services/api'

// Create the API service
const apiService = createApiService()

// Create Vue application instance
const app = createApp(App)

// Use Pinia for state management
app.use(createPinia())

// Use Vue Router
app.use(router)

// Provide API service globally
app.provide('api', apiService)

// Mount the application
app.mount('#app')
