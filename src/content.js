// All portfolio content lives here. Edit text/links without touching the 3D code.

export const profile = {
  name: 'Aakansha Kansal',
  role: 'Frontend Developer · React.js & Three.js Engineer',
  email: 'aakanshakansal56@gmail.com',
  // TODO: replace with your real profile URLs
  github: 'https://github.com/',
  linkedin: 'https://www.linkedin.com/',
}

export const SPAWN = { position: [0, 0, 70], heading: 0 }

// Neon rings to fly through (a loose tour of every planet)
export const GATES = [
  [0, 0, 15],
  [-95, 6, -115],
  [-170, 12, -300],
  [-20, 10, -480],
  [80, 18, -540],
  [215, 8, -330],
  [110, 0, -70],
  [45, -2, 0],
]

const projects = [
  {
    name: 'Badvisor',
    tag: 'Web 3D editor & viewer',
    stack: ['React 19', 'Three.js', 'R3F', 'WebGPU'],
    text: 'Browser-based 3D editor: WebGPU rendering with WebGL fallback, post-processing, GLB/OBJ/VRM pipeline with Draco & KTX2, Gaussian splats, gizmos, scene outliner and orbit/first-person cameras with collision.',
  },
  {
    name: 'DCOS',
    tag: 'Data center digital twin (Hitachi)',
    stack: ['React', 'Three.js', 'R3F', 'Croquet', 'WebSockets'],
    text: 'Interactive 3D digital twin scaling to 500+ server racks with drag-and-drop placement, grid layout editing, live power/temperature data and multi-user real-time collaboration.',
  },
  {
    name: 'SHERPA',
    tag: 'Smart energy & power allocation',
    stack: ['React', 'Highcharts', 'REST', 'WebSockets'],
    text: 'Rack-level power and utilization dashboards with continuous live streaming and reusable components built for high-frequency updates.',
  },
  {
    name: 'IoT Digital Twin',
    tag: 'Server room simulation',
    stack: ['Three.js', 'R3F', 'ESP32', 'WebSockets'],
    text: 'WebGL server room twin fed by ESP32 telemetry, with CFD-based airflow visualization, temperature overlays and synchronized multi-user sessions.',
  },
  {
    name: 'OASIS',
    tag: 'Alarm & spatial insights search',
    stack: ['React', 'Three.js', 'REST'],
    text: 'Interactive 2D/3D floor-plan app for operational alarms and spatial search across infrastructure.',
  },
  {
    name: 'Omniverse Twin',
    tag: 'NVIDIA Omniverse PoC',
    stack: ['Omniverse', 'OpenUSD', 'Kit SDK', 'Python'],
    text: 'Digital-twin workflows with Kit SDK, OpenUSD scene composition and DSX Blueprint, evaluating interoperability with the web stack.',
  },
]

const skills = {
  Frontend: ['React.js', 'JavaScript (ES6+)', 'TypeScript', 'HTML5', 'CSS3', 'Tailwind CSS', 'Redux'],
  '3D & Visualization': ['Three.js', 'React Three Fiber', 'WebGL', 'WebGPU', 'glTF / GLB', 'Croquet', 'Highcharts', 'D3.js', 'OpenUSD', 'NVIDIA Omniverse'],
  'APIs & Real-time': ['REST APIs', 'WebSockets', 'Socket.IO', 'JSON'],
  Backend: ['Node.js', 'Express.js', 'MongoDB', 'MySQL'],
  Tools: ['Git', 'GitHub', 'VS Code', 'Postman', 'Vercel', 'Netlify', 'Render'],
}

const chips = (list) => `<div class="chips">${list.map((s) => `<span>${s}</span>`).join('')}</div>`

export const sections = [
  {
    id: 'about',
    label: 'ABOUT',
    subtitle: 'Who I am',
    accent: '#b794ff',
    planet: { position: [-45, 0, -40], radius: 20, colors: ['#3b1d8f', '#8b5cf6', '#f0abfc'], style: 'bands', seed: 1, ring: true },
    html: `
      <p class="kicker">Planet 01 · About</p>
      <h2>Hi, I'm Aakansha 👋</h2>
      <p class="lead">Frontend Developer with 3+ years building performant, scalable React.js applications — and real-time 3D experiences on the web with Three.js and React Three Fiber.</p>
      <p>I specialise in WebGL/WebGPU interfaces for enterprise infrastructure: digital twins, 3D editors and live data visualization. I'm just as comfortable owning standard product UI as the advanced 3D features in the same codebase.</p>
      <div class="stats">
        <div><b>3+</b><span>years experience</span></div>
        <div><b>500+</b><span>racks in one 3D twin</span></div>
        <div><b>8.9</b><span>CGPA, B.Tech CSE</span></div>
      </div>
      <h3>Education</h3>
      <div class="card">
        <strong>B.Tech — Computer Science &amp; Engineering</strong>
        <span class="muted">AKTU, Ghaziabad · 2019 – 2023 · CGPA 8.9</span>
      </div>`,
  },
  {
    id: 'experience',
    label: 'EXPERIENCE',
    subtitle: '3+ years',
    accent: '#5eead4',
    planet: { position: [-200, 15, -200], radius: 26, colors: ['#0b3b4a', '#14b8a6', '#a7f3d0'], style: 'rocky', seed: 2 },
    moons: ['Webforest', 'Systaldyn'],
    html: `
      <p class="kicker">Planet 02 · Experience</p>
      <h2>Where I've worked</h2>
      <div class="timeline">
        <div class="card">
          <div class="row"><strong>Webforest Agency</strong><span class="muted">09/2026 – Present · Remote</span></div>
          <em>Frontend &amp; Three.js Developer</em>
          <ul>
            <li>Building <b>Badvisor</b>, a browser-based 3D editor and viewer in React 19, Three.js and R3F.</li>
            <li>WebGPU rendering with automatic WebGL fallback and a post-processing pipeline.</li>
            <li>Asset pipeline for GLB/glTF, OBJ+MTL and VRM with Draco and KTX2/Basis, plus Gaussian splats.</li>
            <li>Orbit &amp; first-person cameras: inertia, limits, per-device focal lengths, click-to-walk with collision.</li>
            <li>Editor tools: selection, transform gizmos, shortcuts, drag-and-drop placement, scene outliner, 3D text and materials.</li>
          </ul>
        </div>
        <div class="card">
          <div class="row"><strong>Systaldyn Consultancy Pvt. Ltd.</strong><span class="muted">04/2023 – 09/2026 · Noida</span></div>
          <em>Frontend Developer · React.js &amp; Three.js Engineer</em>
          <ul>
            <li>Architected <b>DCOS</b>, a 3D data center digital twin scaling to <b>500+ racks</b>.</li>
            <li>Multi-user real-time collaboration with Croquet's publish-subscribe model.</li>
            <li>Streamed live power, temperature and alarm data into 3D scenes and Highcharts dashboards.</li>
            <li>Kept hundreds of interactive 3D components smooth via asset optimization, memoization and lazy loading.</li>
            <li>Delivered SHERPA and OASIS, an IoT server room twin, and NVIDIA Omniverse prototypes.</li>
          </ul>
        </div>
      </div>`,
  },
  {
    id: 'projects',
    label: 'PROJECTS',
    subtitle: '6 missions',
    accent: '#fbbf24',
    planet: { position: [190, -10, -180], radius: 30, colors: ['#5b1a0e', '#f97316', '#fde68a'], style: 'bands', seed: 3, ring: true },
    moons: projects.map((p) => p.name),
    html: `
      <p class="kicker">Planet 03 · Projects</p>
      <h2>Missions completed</h2>
      <div class="grid">
        ${projects
          .map(
            (p) => `
          <div class="card project">
            <strong>${p.name}</strong>
            <span class="muted">${p.tag}</span>
            <p>${p.text}</p>
            ${chips(p.stack)}
          </div>`
          )
          .join('')}
      </div>`,
  },
  {
    id: 'skills',
    label: 'SKILLS',
    subtitle: 'Tech constellation',
    accent: '#60a5fa',
    planet: { position: [-110, 5, -420], radius: 24, colors: ['#0c1e5b', '#3b82f6', '#c7d2fe'], style: 'rocky', seed: 4 },
    tags: ['React', 'Three.js', 'R3F', 'WebGL', 'WebGPU', 'TypeScript', 'Redux', 'Tailwind', 'Node.js', 'WebSockets', 'D3.js', 'OpenUSD'],
    html: `
      <p class="kicker">Planet 04 · Skills</p>
      <h2>Tech constellation</h2>
      ${Object.entries(skills)
        .map(([group, list]) => `<h3>${group}</h3>${chips(list)}`)
        .join('')}`,
  },
  {
    id: 'contact',
    label: 'CONTACT',
    subtitle: 'Send a signal',
    accent: '#f472b6',
    planet: { position: [150, 20, -440], radius: 18, colors: ['#4a0d2e', '#ec4899', '#fbcfe8'], style: 'rocky', seed: 5 },
    station: true,
    html: `
      <p class="kicker">Planet 05 · Contact</p>
      <h2>Let's build something out of this world</h2>
      <p class="lead">Open to frontend and Three.js roles, 3D web projects and collaborations.</p>
      <div class="links">
        <a class="btn primary" href="mailto:${profile.email}">✉ ${profile.email}</a>
        <a class="btn" href="${profile.github}" target="_blank" rel="noopener">GitHub ↗</a>
        <a class="btn" href="${profile.linkedin}" target="_blank" rel="noopener">LinkedIn ↗</a>
      </div>`,
  },
]
