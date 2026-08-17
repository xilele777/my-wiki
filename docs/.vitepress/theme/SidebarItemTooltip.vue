<script setup>
import { onMounted, onUnmounted } from 'vue'

/**
 * 侧边栏标题被 CSS 截断后（见 style.css 的 Sidebar 一节）看不到全文。
 *
 * 气泡是挂到 document.body 上的独立元素，而不是侧边栏内的伪元素：
 * .VPSidebar 既有 overflow-x: hidden 又有 transform（transform 会成为
 * fixed 后代的包含块，所以连 position: fixed 都逃不掉它的裁剪），留在里面
 * 就只能挤在侧边栏宽度内折行。挂到 body 才能像原生 tooltip 那样单行铺开。
 *
 * 只给真正溢出的标题写 data-title —— 否则短标题 hover 也会弹出一个和眼前
 * 文字一模一样的气泡。
 *
 * 这是个无渲染组件，挂在 sidebar-nav-after slot 上，生命周期跟随侧边栏。
 */

const SELECTOR = '.VPSidebarItem .text'
const CURSOR_GAP = 18 // 气泡相对鼠标指针的下移量，贴近原生 tooltip 的位置感
const EDGE = 8 // 与视口边缘的最小间距

let resizeObserver = null
let mutationObserver = null
let observed = null
let pending = false
let sidebar = null
let tip = null
let active = null

function syncTitle(el) {
  if (el.scrollWidth > el.clientWidth) {
    // item.text 是 v-html 渲染的，可能含标签，取纯文本
    const text = el.textContent.trim()
    if (el.getAttribute('data-title') !== text) el.setAttribute('data-title', text)
  } else if (el.hasAttribute('data-title')) {
    el.removeAttribute('data-title')
    // 窗口变宽后不再截断的标题，气泡要跟着撤掉
    if (active === el) hide()
  }
}

function observeTexts() {
  for (const el of sidebar.querySelectorAll(SELECTOR)) {
    if (observed.has(el)) continue
    observed.add(el)
    resizeObserver.observe(el)
  }
}

function hide() {
  active = null
  if (tip) tip.style.display = 'none'
}

/** left/top 是期望的视口坐标，越界时在这里修正 */
function show(el, left, top) {
  const text = el.getAttribute('data-title')
  if (!text) return

  active = el
  tip.textContent = text
  tip.style.whiteSpace = 'nowrap'
  tip.style.maxWidth = ''
  tip.style.visibility = 'hidden'
  tip.style.display = 'block'

  // 先按单行量一次；只有长到横跨整个视口才退让为折行
  const limit = window.innerWidth - EDGE * 2
  let rect = tip.getBoundingClientRect()
  if (rect.width > limit) {
    tip.style.whiteSpace = 'normal'
    tip.style.maxWidth = `${limit}px`
    rect = tip.getBoundingClientRect()
  }

  if (left + rect.width > window.innerWidth - EDGE) {
    left = window.innerWidth - EDGE - rect.width
  }
  // 下方放不下就翻到指针上方，同原生行为
  if (top + rect.height > window.innerHeight - EDGE) {
    top -= rect.height + CURSOR_GAP
  }

  tip.style.left = `${Math.max(EDGE, left)}px`
  tip.style.top = `${Math.max(EDGE, top)}px`
  tip.style.visibility = 'visible'
}

function onPointerOver(e) {
  const el = e.target.closest?.(`${SELECTOR}[data-title]`)
  if (!el || el === active) return
  show(el, e.clientX, e.clientY + CURSOR_GAP)
}

function onPointerOut(e) {
  const el = e.target.closest?.(SELECTOR)
  if (!el || el !== active) return
  // 在标题内部的子元素之间移动不算离开
  if (el.contains(e.relatedTarget)) return
  hide()
}

// 键盘走查时也给出提示，此时没有指针坐标，改为贴在标题正下方
function onFocusIn(e) {
  const item = e.target.closest?.('.VPSidebarItem .item')
  const el = item?.querySelector(`.text[data-title]`)
  if (!el) return
  const rect = el.getBoundingClientRect()
  show(el, rect.left, rect.bottom + 2)
}

onMounted(() => {
  sidebar = document.querySelector('.VPSidebar')
  if (!sidebar) return

  observed = new WeakSet()

  tip = document.createElement('div')
  tip.className = 'vp-sidebar-tip'
  tip.setAttribute('role', 'tooltip')
  tip.style.display = 'none'
  document.body.appendChild(tip)

  // 观察元素自身尺寸：窗口缩放导致侧边栏变窄、分组折叠展开
  // （display:none 与可见之间切换）都会触发，不必再单独监听 window resize
  resizeObserver = new ResizeObserver((entries) => {
    for (const entry of entries) syncTitle(entry.target)
  })

  // 路由切换时 VPSidebarGroup 的 key 变化会让整棵子树重建，新节点需要重新挂观察。
  // 只监听 childList，不监听 attributes，这样写 data-title 不会把自己再触发一遍
  mutationObserver = new MutationObserver(() => {
    if (pending) return
    pending = true
    requestAnimationFrame(() => {
      pending = false
      // 正在提示的节点可能已被整棵替换掉
      if (active && !active.isConnected) hide()
      observeTexts()
    })
  })
  mutationObserver.observe(sidebar, { childList: true, subtree: true })

  observeTexts()

  sidebar.addEventListener('mouseover', onPointerOver)
  sidebar.addEventListener('mouseout', onPointerOut)
  sidebar.addEventListener('focusin', onFocusIn)
  sidebar.addEventListener('focusout', hide)
  // 气泡是 fixed 定位、不跟随滚动，一滚就会错位，直接撤掉
  sidebar.addEventListener('scroll', hide, { passive: true })
  window.addEventListener('scroll', hide, { passive: true })
  window.addEventListener('resize', hide, { passive: true })

  // 字体加载完成会改变 scrollWidth 却不改变 clientWidth，
  // ResizeObserver 收不到通知，这里补测一次
  document.fonts?.ready.then(() => {
    for (const el of sidebar.querySelectorAll(SELECTOR)) syncTitle(el)
  })
})

onUnmounted(() => {
  resizeObserver?.disconnect()
  mutationObserver?.disconnect()

  sidebar?.removeEventListener('mouseover', onPointerOver)
  sidebar?.removeEventListener('mouseout', onPointerOut)
  sidebar?.removeEventListener('focusin', onFocusIn)
  sidebar?.removeEventListener('focusout', hide)
  sidebar?.removeEventListener('scroll', hide)
  window.removeEventListener('scroll', hide)
  window.removeEventListener('resize', hide)

  tip?.remove()
  resizeObserver = mutationObserver = observed = sidebar = tip = active = null
})
</script>

<template>
  <!-- 无渲染：只为侧边栏标题挂载 tooltip 逻辑 -->
</template>
