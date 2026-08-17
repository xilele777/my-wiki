// https://vitepress.dev/guide/custom-theme
import { h } from 'vue'
import DefaultTheme from 'vitepress/theme'
import SidebarItemTooltip from './SidebarItemTooltip.vue'
import './style.css'

/** @type {import('vitepress').Theme} */
export default {
  extends: DefaultTheme,
  Layout: () => {
    return h(DefaultTheme.Layout, null, {
      // https://vitepress.dev/guide/extending-default-theme#layout-slots
      // 给被截断的侧边栏标题补上原生 tooltip
      'sidebar-nav-after': () => h(SidebarItemTooltip)
    })
  },
  enhanceApp({ app, router, siteData }) {
    // ...
  }
}
