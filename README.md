# ORACLE

**A chamber that reads you back.** An experimental, immersive 3D web experience built with React Three Fiber, custom GLSL and GSAP.

A liquid-chrome oracle hangs in an obsidian hall. It does not answer questions. It answers whoever holds still long enough to be seen.

## The journey

The whole experience runs on one persistent WebGL canvas. Scrolling drives the camera through five connected chapters:

| | Chapter | What happens |
|---|---|---|
| I | **Arrival** | A mercury-like oracle inside a gyroscope of rings, ringed by obsidian monoliths over a mirror floor. It leans toward your cursor. |
| II | **The Reading** | The signature interaction: **press and hold**. The rings slerp out of their tumble and lock into concentric halos, the metal pulls into a socket, and a gold iris ignites. Let go too early and it forgets you. Hold to the end and it gives you a prophecy. |
| III | **Hall of Echoes** | A corridor of floating frames that twists into a helix as you travel, bends toward wherever you point, and sends a pulse of gold light ahead of you. |
| IV | **The Multitude** | A thousand chrome shards orbit a dark event horizon. They scatter from your cursor, and any shard you touch keeps your gold. Then they gather into a portal ring. |
| V | **The Negative** | Passing through the portal inverts the world's luminance (gold survives as bronze ink). On the other side is the opening shot, mirrored. Here the oracle's eye is already open, and it shows you your reading again. |

### Hidden details

- Type **`gold`** anywhere.
- Each prophecy is seeded by how you behaved: how long you held, how much you moved and the moment you let go.
- The shards you touch stay gold for the rest of the visit and are counted.
- Open the browser console.

## Run it

Requires Node 20.19+ or 22.12+.

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # production build in dist/
npm run preview   # serve the production build
```

Append `?quality=high` or `?quality=low` to the URL to force a rendering tier.

## Deploy

The build is a static site with relative paths, so it works on any host and under any sub-path.

- **GitHub Pages:** the included workflow (`.github/workflows/deploy.yml`) builds and deploys on every push to `main`. Enable it once under *Settings → Pages → Source: GitHub Actions*.
- **Vercel / Netlify:** framework *Vite*, build command `npm run build`, output directory `dist`.

## How it's built

- **Liquid chrome:** a `MeshPhysicalMaterial` extended through `onBeforeCompile`. Layered simplex noise displaces the vertices, and normals are rebuilt analytically from neighbouring samples so reflections flow with the surface. The socket, iris and post-reading shock ripple are all in the same shader.
- **Studio lighting without HDR files:** a procedural environment (gradient sky sphere and Lightformer softboxes) is baked once into the environment map.
- **The Negative:** a custom `postprocessing` effect that inverts luminance while preserving chroma, with a radial wipe, a champagne seam, grain and a vignette, all in one pass.
- **Instancing everywhere:** monoliths, hall frames, gold strips and the thousand shards each render in a single draw call. The dust volume wraps around the camera in the vertex shader, so a single draw call fills the whole journey.
- **Choreography:** scroll (Lenis → ScrollTrigger) maps to a single chapter coordinate. The camera follows Catmull-Rom splines keyed to it, and per-frame values live in a mutable store rather than React state.
- **Sound:** fully synthesised with the Web Audio API (drone, shimmer, struck bell, generated reverb). It never starts without the visitor choosing it.

### Structure

```
src/
  core/    state store, director loop, scroll, input, audio, prophecy grammar
  scene/   WebGL: oracle, chamber, hall, multitude, dust, floor, camera rig, effects
  ui/      loader, HUD, chapter copy, hold seal, cursor, no-WebGL fallback
```

## Performance and accessibility

- Two rendering tiers, chosen by device. A performance monitor lowers the pixel ratio and, if needed, drops the mirror floor and dense geometry.
- `prefers-reduced-motion` switches to native scrolling and removes shake, aberration and autonomous motion.
- Fully usable by keyboard: hold **Space** or focus the seal and hold **Enter**. Chapter navigation is made of real buttons.
- Touch: hold the seal (or anywhere) to be read. Tap shards to touch them. The hall steers itself.
- Without WebGL 2 there is an editorial fallback page that can still give you a reading.

---

Designed and built by Chirag Seervi · 2026
