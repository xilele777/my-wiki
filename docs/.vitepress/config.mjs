import { defineConfig } from 'vitepress'
import { withSidebar } from 'vitepress-sidebar'

// https://vitepress.dev/reference/site-config
const vitePressOptions = {
  title: "我的知识库",
  description: "这是一个基于 VitePress 构建的极速静态文档站点。",
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    outline: {
      level: [2, 3],       // 右侧目录收集 ## 和 ### 两级标题
      label: '本页目录'
    },

    nav: [
      { text: '首页', link: '/' }
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/xilele777' }
    ]
  }
}

// 自动侧边栏：构建时扫描 docs 下的所有 .md 自动生成目录
// 选项文档：https://vitepress-sidebar.cdget.com/guide/options
const vitePressSidebarOptions = {
  documentRootPath: '/docs',
  useTitleFromFrontmatter: true,     // 优先用 frontmatter 的 title（Decap CMS 填写的"标题"）
  useTitleFromFileHeading: true,     // 没有 title 时用文件内的一级标题
  useFolderTitleFromIndexFile: true, // 文件夹标题取自其下 index.md
  hyphenToSpace: true,               // 文件名中的 - 显示为空格
  collapsed: false,                  // 分组默认展开
  sortMenusByFrontmatterOrder: true, // 按 frontmatter 的 order 排序，数字小的在前（没写 order 的按 0 处理）
  excludeByGlobPattern: ['public/**']
}

export default defineConfig(withSidebar(vitePressOptions, vitePressSidebarOptions))
