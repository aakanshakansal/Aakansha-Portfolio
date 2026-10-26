# Aakansha Kansal — Space Portfolio

A 3D portfolio inspired by Bruno Simon's: fly a plane through a small solar system where each planet is a section of the résumé.

```bash
npm install
npm run dev      # http://localhost:5173 (or the next free port)
npm run build    # static site in dist/ — deploy to Vercel / Netlify
```

- Content (text, projects, links): `src/content.js`
- Plane model: `public/models/aeroplane.glb` (`MODEL_YAW` in `src/world/plane.js` sets its facing)
- World pieces: `src/world/` (space, planets, asteroids, rings, trail)
