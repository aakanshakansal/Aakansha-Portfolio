const $ = (id) => document.getElementById(id)

export function createUI() {
  const panel = $('panel')
  const panelBody = $('panel-body')
  const prompt = $('prompt')
  const promptName = $('prompt-name')
  const toastEl = $('toast')
  let toastTimer = 0
  let openSection = null
  let promptSection = null

  return {
    setProgress(p) {
      $('loader-bar').style.width = `${Math.round(p * 100)}%`
    },
    ready(onLaunch) {
      const btn = $('launch')
      $('loader').classList.add('ready')
      btn.disabled = false
      btn.textContent = 'LAUNCH'
      btn.focus()
      btn.addEventListener('click', () => {
        $('loader').classList.add('fade')
        setTimeout(() => $('loader').classList.add('hidden'), 900)
        $('hud').classList.remove('hidden')
        if (matchMedia('(pointer: coarse)').matches) $('touch').classList.remove('hidden')
        onLaunch()
      }, { once: true })
    },
    showPrompt(section) {
      if (section === promptSection) return
      promptSection = section
      prompt.classList.toggle('hidden', !section || !!openSection)
      if (section) {
        promptName.textContent = section.label
        document.documentElement.style.setProperty('--accent', section.accent)
      }
    },
    get promptSection() {
      return promptSection
    },
    openPanel(section, html = section.html) {
      openSection = section
      panelBody.innerHTML = html
      panel.classList.remove('hidden')
      panel.scrollTop = 0
      prompt.classList.add('hidden')
      document.documentElement.style.setProperty('--accent', section.accent)
      // Restart the slide-in animation
      panel.style.animation = 'none'
      void panel.offsetWidth
      panel.style.animation = ''
    },
    closePanel() {
      openSection = null
      panel.classList.add('hidden')
      if (promptSection) prompt.classList.remove('hidden')
    },
    get isPanelOpen() {
      return !!openSection
    },
    toast(message, ms = 2400) {
      toastEl.textContent = message
      toastEl.classList.add('show')
      clearTimeout(toastTimer)
      toastTimer = setTimeout(() => toastEl.classList.remove('show'), ms)
    },
    setSpeed(v) {
      $('speed').textContent = Math.round(v)
    },
    setTrophies(count, total, bump = false) {
      $('trophy-count').textContent = count
      $('trophy-total').textContent = total
      if (bump) {
        const el = $('btn-trophy')
        el.classList.remove('bump')
        void el.offsetWidth
        el.classList.add('bump')
      }
    },
    setGates(count, total) {
      $('gate-count').textContent = count
      $('gate-total').textContent = total
    },
    toggleHelp(force) {
      $('help').classList.toggle('hidden', force === undefined ? undefined : !force)
    },
    setButtonOff(id, off) {
      $(id).classList.toggle('off', off)
    },
  }
}
