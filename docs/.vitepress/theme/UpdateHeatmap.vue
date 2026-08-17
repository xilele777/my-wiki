<script setup>
import { computed } from 'vue'
import { data } from '../../updates.data.js'

const monthLabels = computed(() => {
  const labels = Array(data.weeks.length).fill('')

  data.weeks.forEach((week, index) => {
    const firstOfMonth = week.find((day) => day.date.endsWith('-01'))
    if (firstOfMonth) {
      labels[index] = `${Number(firstOfMonth.date.slice(5, 7))}月`
    }
  })

  return labels
})

const legend = [0, 1, 2, 3, 4]

function dayLabel(day) {
  if (day.isFuture) return `${day.date}：尚未到来`
  return `${day.date}：${day.count ? `${day.count} 次更新` : '无更新'}`
}
</script>

<template>
  <section class="update-heatmap" aria-labelledby="update-heatmap-title">
    <div class="update-heatmap__header">
      <div>
        <h2 id="update-heatmap-title">更新记录</h2>
        <p>过去九个月提交了 {{ data.total }} 次更新，活跃 {{ data.activeDays }} 天</p>
      </div>
      <span class="update-heatmap__date">更新至 {{ data.generatedAt }}</span>
    </div>

    <div class="update-heatmap__body">
      <div class="update-heatmap__weekdays" aria-hidden="true">
        <span></span>
        <span>一</span>
        <span></span>
        <span>三</span>
        <span></span>
        <span>五</span>
        <span></span>
      </div>

      <div class="update-heatmap__scroll">
        <div class="update-heatmap__chart">
          <div class="update-heatmap__months" aria-hidden="true">
            <span v-for="(label, index) in monthLabels" :key="index" :style="{ gridColumn: index + 1 }">
              {{ label }}
            </span>
          </div>

          <div class="update-heatmap__grid">
            <template v-for="(week, weekIndex) in data.weeks" :key="weekIndex">
              <span
                v-for="day in week"
                :key="day.date"
                class="update-heatmap__cell"
                :class="[`level-${day.level}`, { 'is-future': day.isFuture }]"
                :title="dayLabel(day)"
                :aria-label="dayLabel(day)"
              ></span>
            </template>
          </div>
        </div>
      </div>
    </div>

    <div class="update-heatmap__legend" aria-label="更新次数图例">
      <span>少</span>
      <span v-for="level in legend" :key="level" class="update-heatmap__cell" :class="`level-${level}`"></span>
      <span>多</span>
    </div>
  </section>
</template>

<style scoped>
.update-heatmap {
  margin: 48px 0 16px;
  border-top: 1px solid var(--vp-c-divider);
  padding-top: 24px;
}

.update-heatmap__header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  max-width: 660px;
  gap: 24px;
  margin-bottom: 20px;
}

.update-heatmap h2 {
  margin: 0;
  border: 0;
  font-size: 18px;
  letter-spacing: 0;
}

.update-heatmap p,
.update-heatmap__date {
  margin: 6px 0 0;
  color: var(--vp-c-text-2);
  font-size: 13px;
}

.update-heatmap__date {
  flex-shrink: 0;
  margin-top: 0;
}

.update-heatmap__body {
  display: flex;
  gap: 8px;
}

.update-heatmap__weekdays {
  display: grid;
  flex: 0 0 16px;
  grid-template-rows: repeat(7, 12px);
  gap: 4px;
  padding-top: 22px;
  color: var(--vp-c-text-3);
  font-size: 10px;
  line-height: 12px;
  text-align: right;
}

.update-heatmap__scroll {
  max-width: 100%;
  overflow-x: auto;
  padding-bottom: 4px;
  scrollbar-width: none;
}

.update-heatmap__scroll::-webkit-scrollbar {
  display: none;
}

.update-heatmap__chart {
  min-width: 636px;
}

.update-heatmap__months,
.update-heatmap__grid {
  display: grid;
  grid-template-columns: repeat(40, 12px);
  grid-auto-flow: column;
  column-gap: 4px;
}

.update-heatmap__months {
  height: 18px;
  color: var(--vp-c-text-3);
  font-size: 10px;
  line-height: 14px;
}

.update-heatmap__months span {
  overflow: visible;
  white-space: nowrap;
}

.update-heatmap__grid {
  grid-template-rows: repeat(7, 12px);
  row-gap: 4px;
}

.update-heatmap__cell {
  display: block;
  width: 12px;
  height: 12px;
  border: 1px solid transparent;
  border-radius: 2px;
  background-color: var(--vp-c-default-soft);
}

.update-heatmap__cell.level-1 {
  background-color: #b7e3c5;
}

.update-heatmap__cell.level-2 {
  background-color: #70c78a;
}

.update-heatmap__cell.level-3 {
  background-color: #32a852;
}

.update-heatmap__cell.level-4 {
  background-color: #18743a;
}

.dark .update-heatmap__cell.level-1 {
  background-color: #174d2d;
}

.dark .update-heatmap__cell.level-2 {
  background-color: #237a43;
}

.dark .update-heatmap__cell.level-3 {
  background-color: #35a85a;
}

.dark .update-heatmap__cell.level-4 {
  background-color: #64d486;
}

.update-heatmap__cell.is-future {
  visibility: hidden;
}

.update-heatmap__legend {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  max-width: 660px;
  gap: 4px;
  margin-top: 12px;
  color: var(--vp-c-text-3);
  font-size: 10px;
}

.update-heatmap__legend .update-heatmap__cell {
  flex: 0 0 12px;
}

@media (max-width: 639px) {
  .update-heatmap {
    margin-top: 36px;
  }

  .update-heatmap__header {
    display: block;
  }

  .update-heatmap__date {
    display: block;
    margin-top: 8px;
  }
}
</style>
