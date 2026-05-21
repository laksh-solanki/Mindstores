import { createVuetify } from 'vuetify'
import { aliases, mdi } from 'vuetify/iconsets/mdi'
// Styles
import 'vuetify/styles'
import '@mdi/font/css/materialdesignicons.css'
export default createVuetify({
  icons: {
    defaultSet: 'mdi',
    aliases,
    sets: {
      mdi,
    },
  },
  theme: {
    defaultTheme: (typeof window !== 'undefined' && window.localStorage.getItem('mindstore_theme')) || 'light',
  },
})
