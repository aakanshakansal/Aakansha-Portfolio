const LIST = [
  { id: 'launch', icon: '🚀', title: 'Lift-off', text: 'Launch the plane' },
  { id: 'first-planet', icon: '🪐', title: 'First contact', text: 'Explore your first planet' },
  { id: 'all-planets', icon: '🌌', title: 'Explorer', text: 'Explore all five planets' },
  { id: 'name', icon: '🔤', title: 'Rearranged', text: 'Knock a letter of my name' },
  { id: 'first-ring', icon: '⭕', title: 'Threading the needle', text: 'Fly through a ring' },
  { id: 'all-rings', icon: '🏁', title: 'Ace pilot', text: 'Clear every ring' },
  { id: 'smash', icon: '☄️', title: 'Asteroid smasher', text: 'Bump into 15 asteroids' },
  { id: 'boost', icon: '⚡', title: 'Light speed', text: 'Reach top boost speed' },
  { id: 'contact', icon: '📡', title: 'Signal sent', text: 'Open one of my contact links' },
  { id: 'secret', icon: '⭐', title: 'Stargazer', text: 'Find the hidden golden star', hint: 'Look behind the launch pad, high up…' },
]

const STORAGE_KEY = 'ak-space-achievements'

export function createAchievements({ onUnlock } = {}) {
  let unlocked = new Set()
  try {
    unlocked = new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]'))
  } catch {}

  const save = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...unlocked]))
    } catch {}
  }

  return {
    total: LIST.length,
    get count() {
      return unlocked.size
    },
    has: (id) => unlocked.has(id),
    unlock(id) {
      if (unlocked.has(id)) return
      const item = LIST.find((a) => a.id === id)
      if (!item) return
      unlocked.add(id)
      save()
      onUnlock?.(item)
    },
    reset() {
      unlocked.clear()
      save()
    },
    html() {
      return `
        <p class="kicker">Captain's log</p>
        <h2>Achievements ${unlocked.size}/${LIST.length}</h2>
        <div class="achievements">
          ${LIST.map((a) => {
            const done = unlocked.has(a.id)
            return `<div class="achievement ${done ? 'done' : ''}">
              <span class="icon">${done || !a.hint ? a.icon : '❔'}</span>
              <div><strong>${a.title}</strong><span class="muted">${done || !a.hint ? a.text : a.hint}</span></div>
            </div>`
          }).join('')}
        </div>
        <button class="btn" id="reset-achievements" style="margin-top:18px;width:100%;cursor:pointer">Reset progress</button>`
    },
  }
}
