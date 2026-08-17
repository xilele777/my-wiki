const HEATMAP_WEEKS = 40
const NINE_MONTHS_IN_DAYS = 273
const TIME_ZONE = 'Asia/Shanghai'
const GITHUB_REPOSITORY = process.env.GITHUB_REPOSITORY || 'xilele777/my-wiki'
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'main'
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN
const dateFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
})

function formatCalendarDate(date) {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatDateInTimeZone(value) {
  const parts = Object.fromEntries(
    dateFormatter.formatToParts(new Date(value)).map(({ type, value }) => [type, value])
  )
  return `${parts.year}-${parts.month}-${parts.day}`
}

async function loadCommitCounts(since) {
  const counts = {}
  const headers = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'my-wiki-build',
    'X-GitHub-Api-Version': '2022-11-28'
  }

  if (GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${GITHUB_TOKEN}`
  }

  for (let page = 1; ; page += 1) {
    const url = new URL(`https://api.github.com/repos/${GITHUB_REPOSITORY}/commits`)
    url.searchParams.set('sha', GITHUB_BRANCH)
    url.searchParams.set('since', since.toISOString())
    url.searchParams.set('per_page', '100')
    url.searchParams.set('page', String(page))

    const response = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(15000)
    })
    if (!response.ok) {
      const remaining = response.headers.get('x-ratelimit-remaining')
      const rateLimit = remaining === null ? '' : `，剩余请求额度 ${remaining}`
      const tokenHint = response.status === 403 && !GITHUB_TOKEN
        ? '。请在构建环境中配置 GITHUB_TOKEN'
        : ''
      throw new Error(
        `GitHub API 请求失败：${response.status} ${response.statusText}${rateLimit}${tokenHint}`
      )
    }

    const commits = await response.json()
    for (const commit of commits) {
      const date = commit.commit?.author?.date
      if (!date) continue

      const dateString = formatDateInTimeZone(date)
      counts[dateString] = (counts[dateString] || 0) + 1
    }

    if (commits.length < 100) break
  }

  return counts
}

async function buildHeatmap() {
  const todayString = formatDateInTimeZone(new Date())
  const today = new Date(`${todayString}T00:00:00Z`)

  // Start on Sunday and keep roughly nine months visible, including the current week.
  const start = new Date(today)
  start.setUTCDate(start.getUTCDate() - NINE_MONTHS_IN_DAYS - start.getUTCDay())

  // Query one extra day so timezone conversion cannot exclude commits on the first grid day.
  const since = new Date(start)
  since.setUTCDate(since.getUTCDate() - 1)
  const counts = await loadCommitCounts(since)

  const weeks = []
  const allCounts = []

  for (let week = 0; week < HEATMAP_WEEKS; week += 1) {
    const days = []

    for (let day = 0; day < 7; day += 1) {
      const date = new Date(start)
      date.setUTCDate(start.getUTCDate() + week * 7 + day)
      const dateString = formatCalendarDate(date)
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
    generatedAt: todayString
  }
}

export default {
  load: buildHeatmap
}
