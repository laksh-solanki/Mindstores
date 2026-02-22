import {
  mdiAccount,
  mdiAccountCircle,
  mdiCart,
  mdiCartOutline,
  mdiCartPlus,
  mdiCheckCircle,
  mdiCircle,
  mdiCircleSmall,
  mdiClockOutline,
  mdiClose,
  mdiDelete,
  mdiEmailArrowRightOutline,
  mdiGithub,
  mdiGoogle,
  mdiLogout,
  mdiMinus,
  mdiPackageVariant,
  mdiPencil,
  mdiPlus,
  mdiPrinterOutline,
  mdiReddit,
  mdiShieldCheck,
  mdiShieldStarOutline,
} from '@mdi/js'
import { defineComponent, h } from 'vue'
// Composables
import { createVuetify } from 'vuetify'
import { aliases, mdi } from 'vuetify/iconsets/mdi-svg'
// Styles
import 'vuetify/styles'

const mdiPathByName = {
  'mdi-account': mdiAccount,
  'mdi-account-circle': mdiAccountCircle,
  'mdi-cart': mdiCart,
  'mdi-cart-outline': mdiCartOutline,
  'mdi-cart-plus': mdiCartPlus,
  'mdi-check-circle': mdiCheckCircle,
  'mdi-circle': mdiCircle,
  'mdi-clock-outline': mdiClockOutline,
  'mdi-close': mdiClose,
  'mdi-delete': mdiDelete,
  'mdi-github': mdiGithub,
  'mdi-google': mdiGoogle,
  'mdi-logout': mdiLogout,
  'mdi-minus': mdiMinus,
  'mdi-package-variant': mdiPackageVariant,
  'mdi-shield-check': mdiShieldCheck,
  'mdi-email-arrow-right-outline': mdiEmailArrowRightOutline,
  'mdi-circle-small': mdiCircleSmall,
  'mdi-pencil': mdiPencil,
  'mdi-plus': mdiPlus,
  'mdi-printer-outline': mdiPrinterOutline,
  'mdi-reddit': mdiReddit,
  'mdi-shield-star-outline': mdiShieldStarOutline,
}

function resolveMdiPath (icon) {
  if (Array.isArray(icon)) {return icon}
  if (typeof icon !== 'string') {return icon}

  const name = icon.trim()

  if (name.startsWith('svg:')) {return name.slice(4)}
  if (name.startsWith('M')) {return name}

  if (name.startsWith('mdi-')) {
    const path = mdiPathByName[name]
    if (path) {return path}
  }

  return name
}

const MdiCompatSvgIcon = defineComponent({
  name: 'MdiCompatSvgIcon',
  props: {
    icon: {
      type: [String, Array],
      default: '',
    },
    tag: {
      type: [String, Object, Function],
      required: true,
    },
  },
  setup(props, { attrs }) {
    return () => {
      const icon = resolveMdiPath(props.icon)
      const paths = Array.isArray(icon) ? icon : [icon]

      return h(
        props.tag,
        { ...attrs, style: null },
        h(
          'svg',
          {
            class: 'v-icon__svg',
            xmlns: 'http://www.w3.org/2000/svg',
            viewBox: '0 0 24 24',
            role: 'img',
            'aria-hidden': 'true',
          },
          paths.map((path) =>
            Array.isArray(path)
              ? h('path', { d: path[0], 'fill-opacity': path[1] })
              : h('path', { d: path }),
          ),
        ),
      )
    }
  },
})

// https://vuetifyjs.com/en/introduction/why-vuetify/#feature-guides
export default createVuetify({
  icons: {
    defaultSet: 'mdi',
    aliases,
    sets: {
      mdi: {
        ...mdi,
        component: MdiCompatSvgIcon,
      },
    },
  },
  theme: {
    defaultTheme: 'light',
  },
})
