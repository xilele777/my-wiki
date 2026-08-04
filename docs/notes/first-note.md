---
title: 我的第一篇笔记
order: 1
---
这是一篇示例文章，用来演示自动侧边栏的层级效果。

使用 **解法 A（自动侧边栏插件）** 方案，能让你在 Decap CMS 后台创建新 `.md` 文件后，VitePress 自动扫描文件并生成侧边栏目录，省去手动修改 `config.mjs` 的麻烦。

## 第一步：安装自动侧边栏插件

在项目根目录下打开终端，运行命令安装 `vitepress-plugin-autosidebar`：

```bash
npm install -D vitepress-plugin-autosidebar

```

---

## 第二步：修改 VitePress 配置文件

打开 `.vitepress/config.mjs`，引入插件并将其添加到 `vite: { plugins: [...] }` 配置项中：

```js
// .vitepress/config.mjs
import { defineConfig } from 'vitepress'
import AutoSidebar from 'vitepress-plugin-autosidebar'

export default defineConfig({
  title: "我的知识库",
  description: "VitePress + Decap CMS Wiki",

  // 1. 在 Vite 配置中注入自动侧边栏插件
  vite: {
    plugins: [
      AutoSidebar({
        // 忽略公共文件夹和管理后台相关目录
        ignoreList: ['public', 'admin'],
        // 按照文件名或内部标题进行排序
        collapsed: false, 
      })
    ]
  },

  themeConfig: {
    // 2. 移除或注释掉原本手动写的 themeConfig.sidebar 数组！
    // 插件会自动接管并填充侧边栏内容
  }
})

```

---

## 第三步：控制文章在侧边栏的排序（可选）

由于静态系统没有“拖拽排序”界面，你可以通过以下两种最直观的方式决定侧边栏的上下顺序：

1. **方式一：通过 Frontmatter 序号控制（推荐）**
在 Decap CMS 写文章时，在文章开头的 YAML 区块加入 `order` 字段：
```markdown
---
title: 我的第一篇文档
order: 1
---

```


2. **方式二：在文件名加数字前缀**
直接将文件名命名为 `01-入门.md`、`02-进阶.md`，插件会默认按照文件名升序排列。

---

## 第四步：推送到 GitHub 测试

修改完成后，提交代码并推送到 GitHub：

```bash
git add .
git commit -m "add auto sidebar plugin"
git push origin main

```

Netlify 重新构建完成后，刷新你的网站，刚才在 Decap CMS 后台提交的 `测试.md` 就会自动出现在 VitePress 的左侧边栏中了！
