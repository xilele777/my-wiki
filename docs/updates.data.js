import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const repoRoot = fileURLToPath(new URL('../', import.meta.url))
const HEATMAP_WEEKS = 40
const NINE_MONTHS_IN_DAYS = 273

function formatDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function loadCommitCounts() {
  try {
    const output = execFileSync(
      'git',
      ['log', '--format=%ad', '--date=short', '--all'],
      { cwd: repoRoot, encoding: 'utf8' }
    )

    return output
      .trim()
      .split(/\r?\n/)
      .filter(Boolean)
      .reduce((counts, date) => {
        counts[date] = (counts[date] || 0) + 1
        return counts
      }, {})
  } catch {
    return {}
  }
}

function buildHeatmap() {
  const counts = loadCommitCounts()
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Start on Sunday and keep roughly nine months visible, including the current week.
  const start = new Date(today)
  start.setDate(start.getDate() - NINE_MONTHS_IN_DAYS - start.getDay())

  const weeks = []
  const allCounts = []

  for (let week = 0; week < HEATMAP_WEEKS; week += 1) {
    const days = []

    for (let day = 0; day < 7; day += 1) {
      const date = new Date(start)
      date.setDate(start.getDate() + week * 7 + day)
      const dateString = formatDate(date)
      const isFuture = date > today
      const count = isFuture ? 0 : counts[dateString] || 0

      days.push({ date: dateString, count, isFuture })
      if (!isFuture) allCounts.push(count)
    }

    weeks.push(days)
  }

  const maxCount = Math.max(...allCounts, 0)
  const thresholds = [
    1,
    Math.max(2, Math.ceil(maxCount * 0.25)),
    Math.max(3, Math.ceil(maxCount * 0.5)),
    Math.max(4, Math.ceil(maxCount * 0.75))
  ]

  for (const week of weeks) {
    for (const day of week) {
      day.level = day.isFuture || day.count === 0
        ? 0
        : day.count >= thresholds[3]
          ? 4
          : day.count >= thresholds[2]
            ? 3
            : day.count >= thresholds[1]
              ? 2
              : 1
    }
  }

  return {
    weeks,
    total: allCounts.reduce((sum, count) => sum + count, 0),
    activeDays: allCounts.filter(Boolean).length,
    generatedAt: formatDate(today)
  }
}

export default {
  load: buildHeatmap
}
