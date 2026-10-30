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

## Speaking to the world

The world obeys a handful of words. Each one changes several systems at once: the oracle's material and shape, the rings, the floor, the light, the dust, the hall, the shards and the sound. The change starts at the oracle and spreads outward. A spoken word works in every chapter and never moves you or erases your prophecy.

**How to speak:**

- Type a word anywhere. It takes effect the moment its last letter lands.
- Press **`/`** to open the command bar. Enter speaks, ↑/↓ recalls history, Tab completes, and Esc (or a click outside) closes it without speaking.
- On touch screens, tap **Speak** in the bottom bar, then tap a word or type one.

Words are case-insensitive and surrounding spaces are ignored. An unknown word changes nothing: the oracle answers with a "did you mean…" or a riddle.

| Word | What happens |
|---|---|
| **GOLD** | Molten gold with glowing seams. Amber light, rising embers, and gold rings, strips and shards. |
| **VOID** | The oracle becomes a black hole. Its rings flatten into an accretion disk, dust spirals in, space bends around it, and the world goes dark. |
| **LIQUID** | Everything flows. Heavy swells, waves across the floor, a rippling hall, drifting shards. |
| **CRYSTAL** | The oracle freezes into a faceted quartz inside a crystal cage, and spires grow out of the mirror floor. |
| **CHAOS** | For seven seconds the rules break: desynchronised rings, scattered artifacts, a storm of dust, spinning light pulsing at 120 bpm. Then the previous world returns. |
| **RESET** | Back to obsidian and chrome. |

A world state (GOLD, VOID, LIQUID, CRYSTAL…) replaces the previous one. Some hidden words are layers: they stack on top of whatever state is active and switch off when spoken again. Four words are hidden. The command bar counts them, and unknown words are answered with riddles that point toward them.

<details>
<summary>Spoilers: the hidden words</summary>

| Word | What happens |
|---|---|
| **STILL** | Time stops for the world (dust, rings, surfaces, light) while the camera keeps moving. A layer. |
| **GRAVITY** | Down changes its mind: the monoliths lift off the floor, the oracle drips upward, and dust rains up. A layer. Alias: *levitate*. |
| **WATCH** | The eye opens and follows your cursor, and the rings lock around its gaze. A layer. |
| **MEDUSA** | Everything turns to stone, and time slows. A world state. Alias: *stone*. |

</details>

### Hidden details

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
npm test          # unit tests for the command parser and world transitions
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
- **Sound:** fully synthesised with the Web Audio API (drone, shimmer, struck bell, generated reverb, and a cue for every command). It never starts without the visitor choosing it.

### The world system

The world's rules are data, not scattered conditions:

- **`core/world.js`:** the default world as about a hundred named channels (`oracle.color`, `dust.swirl`, `atmosphere.fogFar`, …). It also holds each world state and layer as a set of overrides (or relative adjustments such as `['mul', 0.85]`), and the timing that makes each change start at the oracle and travel outward.
- **`core/commands.js`:** the words, their aliases, parsing, typo suggestions that never spoil undiscovered words, and matching for words typed anywhere.
- **`core/worldMachine.js`:** a pure state machine. It tracks the active world state and layers, expires CHAOS, and blends every channel from its *current* value to the new target. Commands can interrupt each other at any moment without a jump.
- **`core/worldRuntime.js`:** connects the machine to the running experience. It advances world clocks (which STILL can stop without stopping the camera), floor ripples, sound cues, UI events, and which hidden words this visitor has found (saved per browser).

Scene components read the blended channels every frame. Transitions are plain interpolation inside the director's ticker, so overlapping commands never fight over GSAP timelines. The pure modules are covered by `node --test` (see `tests/`).

### Structure

```
src/
  core/    state store, director loop, scroll, input, audio, prophecy grammar, world system
  scene/   WebGL: oracle, chamber, hall, multitude, dust, floor, ripples, spires, horizon, atmosphere, camera rig, effects
  ui/      loader, HUD, chapter copy, hold seal, command bar, whisper line, proclamation, cursor, no-WebGL fallback
tests/     command parser and world-machine tests
```

## Performance and accessibility

- Two rendering tiers, chosen by device. A performance monitor lowers the pixel ratio and, if needed, drops the mirror floor and dense geometry.
- `prefers-reduced-motion` switches to native scrolling and removes shake, aberration and autonomous motion.
- Fully usable by keyboard: hold **Space** or focus the seal and hold **Enter**. Chapter navigation is made of real buttons.
- Touch: hold the seal (or anywhere) to be read. Tap shards to touch them. The hall steers itself.
- Without WebGL 2 there is an editorial fallback page that can still give you a reading.
- New world objects reuse instancing: the orbiting artifacts, crystal spires and distant silhouettes are each one draw call, and the floor ripples are a single additive disc. Every shader is compiled behind the loader, so a world state's first appearance doesn't hitch.
- With reduced motion, CHAOS doesn't pulse the light, title cards fade without blur, and the acknowledgement ring is skipped.

## Known limitations

- Not yet tested on real phones or in Safari. Touch was verified in Chrome's mobile emulation.
- The JS bundle is about 1.5 MB (about 445 KB gzipped) in one chunk.
- Command sounds were designed for small speakers and checked by rendering them offline: each sits mainly in the 250 Hz–5 kHz range, all match in loudness, and no two share a spectral fingerprint. They have not yet been auditioned by ear on a range of devices.
- In dev, the console shows a `THREE.Clock` deprecation warning from inside React Three Fiber.

---

Designed and built by Chirag Seervi · 2026
