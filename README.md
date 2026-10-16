# Minkowski Lab

An offline Minkowski and Euclidean diagram editor for **KTH · SH2373 Special Relativity**.

This export contains the full application and all editable application source. No external fonts, images, libraries, plug-ins, accounts, or network services are required by the app.

## Open it immediately

Double-click **index.html** and open it in a modern browser. This is the complete standalone application, already built and ready to use. No Node.js installation or server is needed to use it.

## Develop locally

The optional development tools require **Node.js 18 or later**. There are no package dependencies and no `npm install` step.

From this project directory:

```sh
npm run dev
```

Open **http://127.0.0.1:5173**. Edit the files in `src/` and refresh the browser; the server rebuilds the standalone page on every page request. Stop it with Ctrl+C. To use a different port, set the `MINKOWSKI_PORT` environment variable.

To build without running a server:

```sh
npm run build
```

To check JavaScript syntax, template bundling, embedded scene JSON, and script/style self-containment:

```sh
npm run check
```

These are lightweight source checks, not a complete browser test suite. Run `npm test` to check full-screen state transitions, fallback behaviour, control restoration, cancellation, keyboard handling, invariant metrics, rotations, light cones, and scene compatibility using a simulated document and numerical checks. Equivalent commands without npm are `node tools/serve.mjs`, `node tools/build.mjs`, and `node tools/check.mjs`.

## Source files

| File | Purpose |
| --- | --- |
| `src/index.template.html` | Page structure, labels, help text, and the default embedded-scene slot. The two comment markers are replaced during the build. |
| `src/styles.css` | Layout, responsive styling, KTH interface palette, and colour-palette dialog styling. |
| `src/app.js` | Lorentz transformations, rendering, drawing and editing, colour selection, animation, presets, history, and scene export/import. |
| `index.html` | Generated, fully self-contained app. This is the file to distribute or open offline. |
| `tools/build.mjs` | Dependency-free source bundler. |
| `tools/serve.mjs` | Local-only preview server with rebuild on refresh. |
| `tools/check.mjs` | Lightweight source and build checks. |
| `package.json` | Convenient local commands. |

Edit the files in **src/**, then rebuild. Direct changes to `index.html` are overwritten by the next build. The template is not intended to be opened directly in a browser.

## Included features

- Switch between Minkowski spacetime (t and x, c = 1, velocity v) and a Euclidean plane (y and x). Each geometry preserves its own scene when you switch.
- Velocity/rapidity controls for boosts; degree/radian controls for rotations. Capture the current frame's axes in either geometry.
- Events, lines, segments, arrows, freehand curves, rectangles, circles, text, invariant Minkowski hyperbolae, Euclidean circles, and editable light cones placed at any event.
- Selection, multi-selection, geometry and style editing, deletion, visibility, undo/redo, pan, zoom, and a full-screen diagram workspace with a vertical boost slider, drawing-tools drop-down, and optional object editor.
- Animated transitions to a selected timelike line's rest frame or a spacelike line's simultaneous frame. Lightlike and zero-length directions are handled explicitly. Euclidean lines can be aligned vertically with Space or horizontally using the Inspector.
- Minkowski presets: time dilation, length contraction, twin paradox, pole in a barn, and a blank canvas.
- Euclidean presets: components and circles, width and oblique slices, straight path and detour, a tilted pole, and a blank plane.
- KTH and diagram colour palettes, with an optional custom colour picker.
- Editable JSON scene files, standalone HTML scene copies, and SVG diagram export.

## Physics and implementation

Reference events are stored as `(x₀, t₀)`. Viewing coordinates are calculated using

```text
x = cosh(η) x₀ − sinh(η) t₀
t = cosh(η) t₀ − sinh(η) x₀
v = tanh(η)
```

Every view is calculated from the stored reference geometry. Dragging the slider does not repeatedly transform and overwrite the stored events. Drawing in a boosted view applies the inverse transformation before storing geometry.

For a timelike line, the target rest-frame velocity is Δx₀/Δt₀. For a spacelike line, the target velocity is Δt₀/Δx₀. Frame transitions interpolate in rapidity. Full origin-centred invariant hyperbolae remain on the same locus.

Useful places to start in `src/app.js`:

- `cases`: the ten built-in scenes (four examples plus a blank scene per geometry) and their explanatory text.
- `boost`, `lineFrame`, `animateBoost`: transformation and frame-transition logic.
- `geometry`, `render`, `drawObject`: SVG rendering.
- `inspector` and pointer handlers: editing interactions.
- `colourPalettes`: the preset colour choices.
- `validateState`: JSON scene validation.

## Saving and moving work

The app attempts to save the current scene in browser local storage. Storage differs between browser profiles and origins, including local-file and local-server use. Use **Save scene** before moving work to another browser or computer, then **Open scene** to restore it.

**Save HTML** embeds the current scene into a complete copy of the running app. That copy is a standalone deliverable; it does not update this project's source files.

This project export starts with the built-in time-dilation example. New scene files and Save HTML copies include both geometry scenes; original Minkowski scene files remain supported. It does not include unsaved drawings that exist only in a separate browser session. The `work/` files from the original construction environment were temporary screenshots, development scripts, and machine-specific checks; they are not application dependencies.

## KTH palette

The interface uses KTH's primary colours, including KTH blue `#004791`, navy `#000061`, sky blue `#6298D2`, light blue `#DEF0FF`, sand `#EBE5E0`, and digital blue `#0029ED`. The diagram has additional colours to distinguish teaching objects.

Palette reference: [KTH official colours](https://intra.kth.se/en/administration/kommunikation/varumarke/grafiskprofil/profilfarger-1.845077). This reference is optional; the app never needs to load it.

## Full-screen teaching view

Choose **Full screen** for a large diagram with a vertical boost slider on its right. Positive values are at the top. **Drawing tools** opens the tools and colour palette; **Objects** opens the object list and Inspector. **Exit** or Esc returns to the normal layout. If the browser does not allow native fullscreen, the same workspace fills the available app window.

## Keyboard shortcuts

Shortcuts work in both layouts, outside fields and dialogs. Select a straight line, segment, arrow or frame axis before pressing Space.

| Key | Action |
| --- | --- |
| Left / right arrow | Change the boost by 0.01 (v or η), or rotate by 1° / 0.01 rad. Hold to repeat; one held press is one undo step. |
| Shift + left / right arrow | Fine steps: 0.001 for boosts; 0.1° / 0.001 rad for rotations. |
| Space | Smoothly enter the selected line's rest frame or make a spacelike line purely spatial. In Euclidean mode, align the line vertically. |
| 0 | Smoothly return to the reference frame. |
| F | Toggle full-screen view. |
| Home | Fit visible objects. |
| + / − | Zoom in / out. |
| V / H | Select / pan tool. |
| Escape | Cancel a gesture, close a full-screen panel, or exit full-screen view. |
| Delete / Backspace | Delete selection. |
| Cmd/Ctrl Z / Cmd/Ctrl Shift Z | Undo / redo. |
| Cmd/Ctrl S | Save scene. |
| ? | Open help and the shortcut list. |

Euclidean rotation arrows wrap at ±180° (±π radians), so you can keep turning in either direction, including with fine steps. Minkowski boost arrows stay within the slider's current range. When the slider is focused, up/down also adjust the boost and Home/End select the minimum/maximum. Use H to pan; Space no longer temporarily activates panning.

## Euclidean geometry and light cones

The **Geometry** menu is above the transformation slider in both layouts. Switching modes retains each mode's objects, camera, transformation and example. The complete pair is saved in scene JSON and embedded HTML. Undo/redo also works across geometry switches.

Euclidean mode uses ordinary spatial coordinates and a passive rotation:

```text
x = cos(θ) x₀ + sin(θ) y₀
y = cos(θ) y₀ − sin(θ) x₀
```

Positive θ turns the viewing axes counterclockwise, so fixed objects rotate clockwise on screen. The slider spans ±180° (±π radians). Lengths, angles and x² + y² are invariant. A circle centred at the origin keeps its locus; an offset centre rotates. Draw a circle by dragging from its centre to its circumference, then edit its centre or radius in the Inspector.

The Euclidean examples are geometric comparisons, not alternative relativistic physics:

- **Components & circles:** a length-5 vector has components (3, 4), calibrated by a radius-5 circle.
- **Width & oblique slices:** a strip of perpendicular width 4 has a horizontal cross-section of length 5.
- **Straight path & detour:** a direct route of length 8 is shorter than two legs of length 5, contrasting with the twin example's proper times.
- **A tilted pole:** a length-5 pole fits diagonally in a 4-by-5 rectangle with horizontal projection 3. Containment is invariant under rotation.

In Minkowski mode, choose **Light cone** and click its vertex. The full past and future cone is one selectable object. Its vertex transforms with the diagram; both null lines stay at 45°. Drag it, change its colour/style, edit its centre, duplicate it or delete it like other objects. The existing light-cone display checkbox only controls the faint guide through the origin, not these user-created cones.

For local development, `state.geometry` selects the metric. The internal second-coordinate property remains `t` in both modes for file compatibility; the Euclidean interface labels it `y`. `state.eta` stores rapidity in Minkowski mode and angle in radians in Euclidean mode. The optional `alternateScene` holds the other geometry without nested alternates. `tests/geometry.mjs` verifies metric preservation, line alignment, circles, cone vertices, example lengths and scene migration.
