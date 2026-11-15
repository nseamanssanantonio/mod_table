<div align="center">

# Mod Table

**Build waves. Shape transitions. Export wavetables.**

A standalone wavetable editor I've been working on. The idea is to build a waveform from individual pieces, control how those pieces interact, and turn the results into a finished wavetable for use in other synths.

**This is a wavetable editor, not a synthesizer.**

[**Open Mod Table**](https://nseamanssanantonio.github.io/mod_table/mod_table.main.html) · [**View the editor file**](mod_table.main.html) · [**Getting started**](#getting-started)

</div>

---

## What it does

- **64 waveform layers** — mix, shape, position, and combine waves.
- **Wave relationships** — arithmetic, phase modulation, FM, through-zero FM, spectral operations, and more.
- **16 modifier slots** — distortions, harmonic processors, and experimental effects.
- **Up to 256 keyframes** — build individual waves and control the transitions between them.
- **Full wavetable preview** — hear the working wave or sweep through the finished table.
- **Final-table processing** — apply filters and resonance across committed and interpolated frames.
- **Deep Scan rendering** — optional slower, higher-quality rendering and analysis.
- **WAV export** — 128, 256, 512, 1024, 2048, 4096, or 8192 samples per frame.
- **Automatic global peak normalization** — exported tables are normalized using the highest peak across the whole table.
- **Project saving** — keep your work and come back to it later.

There are also Undo/Redo, presets, waveform comparison, keyboard shortcuts, a built-in Help guide, and mouse-following Tips.

## Getting started

**Try it online:** [nseamanssanantonio.github.io/mod_table](https://nseamanssanantonio.github.io/mod_table/mod_table.main.html)

GitHub Pages opens [`mod_table.main.html`](mod_table.main.html) through the root [`index.html`](index.html). The website is a static app; the waveform processing runs in your browser.

**Run it locally:** download `mod_table.main.html` and open it in Chrome or Edge. You can also use the included Windows launcher or local development server.

A basic workflow is:

1. Add a few waves and adjust their shapes and relationships.
2. Add modifiers if you want to change the sound further.
3. **Commit** the result as a keyframe.
4. Change the wave and commit more keyframes.
5. Adjust the timeline and transitions, then preview the table.
6. Optionally apply final filtering, choose a frame size, and export the WAV.

The **Help** button in the editor explains the controls in more detail.

## Project structure

I've separated the project by **processing** and **interface**. Within those, code is grouped by language, feature, and responsibility so it's easier to find and work on.

```text
mod_table/
├── _DSP/                         # Waveform processing
│   ├── _c++/
│   │   ├── _core/                # Shared processing context
│   │   ├── _waveforms/           # Basic and experimental wave generation
│   │   ├── _relationships/       # FM, arithmetic, phase, spectral relationships
│   │   ├── _modifiers/           # Distortion and other waveform modifiers
│   │   ├── _transitions/         # Keyframe morphing
│   │   ├── _filters/             # Final-table filtering
│   │   ├── _rendering/           # Waveform and table rendering
│   │   ├── _math/                # Fourier and resampling utilities
│   │   ├── _analysis/            # Spectrum and measurements
│   │   ├── _audio/               # Audition-related processing
│   │   └── _bridge/              # Exports for WebAssembly
│   └── _webassembly/
│       ├── _binary/              # Compiled engine
│       ├── _shared/              # Catalogs and settings
│       └── _worker/              # Background rendering and requests
│
├── _INTERFACE/                   # Everything the user sees
│   ├── _html/                    # Page, panels, dialogs, controls
│   ├── _css/                     # Theme, layout, feature styles
│   └── _javascript/              # Editor state and interaction logic
│       ├── _wave_editor/
│       ├── _modifiers/
│       ├── _keyframes/
│       ├── _table_finish/
│       ├── _audio/
│       ├── _rendering/
│       ├── _projects/
│       ├── _history/
│       ├── _help/
│       └── ...                   # Additional small feature modules
│
├── scripts/                      # Build and local-server scripts
├── build.manifest.json           # Ordered list of source files
├── package.json
├── mod_table.main.html           # Built application / Pages target
└── index.html                    # GitHub Pages entry point
```

### Where to make changes

| If you're working on… | Start here |
|---|---|
| Waveforms, FM, modifiers, filters | `_DSP/_c++/` |
| WebAssembly loading and render jobs | `_DSP/_webassembly/` |
| Page sections and dialogs | `_INTERFACE/_html/` |
| Appearance and layout | `_INTERFACE/_css/` |
| Controls, timeline, history, Help | `_INTERFACE/_javascript/` |
| Build order | `build.manifest.json` |
| Final published application | `mod_table.main.html` (generated output) |

## Building from source

You'll need **Node.js 18+**. Rebuilding the processing engine also requires a C++ compiler with WebAssembly target support.

```bash
# Assemble the standalone HTML from the source files
npm run build

# Recompile the C++ processing engine when DSP code changes
npm run build:wasm
npm run build

# Run the processing tests
npm test

# Start a local development server
npm start
```

The build produces `dist/Mod_Table.html` locally. The repository's `mod_table.main.html` is the file currently used for GitHub Pages; update that published file from the tested build when releasing a new version.

**Please edit the files in `_DSP/` and `_INTERFACE/`, not the generated application.** The source manifest controls how everything is assembled.

## How I want the code organized

I'm trying to keep this project readable for humans:

- One file or module should have a clear purpose.
- Keep related processes together, but split unrelated behavior into separate files.
- Use descriptive variable and method names.
- Document classes and larger modules with multi-line comments.
- Give smaller methods a short explanation of what they do.
- Prefer small, focused functions over giant methods.
- Keep the interface separate from the processing engine.

## Status

**Work in progress.** The editor is usable, but I'm still improving the interface, waveform processing, rendering quality, and compatibility with different wavetable synths. Experimental modes may change as I refine them.

The goal is simple: make normal wavetables quickly, but have enough control to build some really unusual ones too.
