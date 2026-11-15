# Mod Table

Mod Table is a standalone wavetable editor for creating single-cycle waveforms and exporting them as finished WAV tables. It's not a synthesizer. You can build a wave from up to 64 components, define the relationships between them, add modifiers, commit up to 256 editable keyframes, and render the table at your chosen resolution.

This repository is organized to make the code easier to find, read, maintain, and test. The **application code lives in two sections:** `_DSP/` and `_INTERFACE/`. Build utilities, tests, examples, and documentation are kept separately.

## Start here

- **Use the editor:** open [`dist/Mod_Table.html`](dist/Mod_Table.html) in Chrome or Edge. It is a complete standalone build.
- **Build the standalone HTML:** `npm run build` (Node.js 18 or later).
- **Rebuild the C++ audio engine:** `npm run build:wasm` (Clang with WebAssembly target support), then `npm run build`.
- **Run processing tests:** `npm test`.
- **Start a local preview server:** `npm start`, or double-click `START_WINDOWS.cmd` on Windows.

There is no mandatory dependency installation step for the prebuilt editor. The code is still compiled to one HTML file for convenience; the editable project no longer has to be developed as one large file.

## Source tree

```text
Mod-Table/
├── _DSP/
│   ├── _c++/
│   │   ├── engine.cpp                  # Only C++ compilation entry point
│   │   ├── _core/                     # Shared rendering context
│   │   ├── _waveforms/                # Base, clean, experimental, regions
│   │   ├── _relationships/            # Wave-to-wave arithmetic/FM/spectral operations
│   │   ├── _modifiers/                # Processing stages and retained source library
│   │   ├── _transitions/              # Time, spectral and experimental morphing
│   │   ├── _filters/                  # Final-table filters
│   │   ├── _rendering/                # Composite cycle generation
│   │   ├── _math/                     # Fourier transform and resampling
│   │   ├── _analysis/                 # Spectrum exports
│   │   ├── _audio/                    # Pitch-limited audition coefficients
│   │   └── _bridge/                   # WebAssembly-compatible exported functions
│   └── _webassembly/
│       ├── _binary/                   # Compiled processing engine
│       ├── _shared/
│       │   ├── _catalogs/             # Stable waveform/relation/transition IDs
│       │   └── _settings/             # Frame sizes, curves, validation, defaults
│       └── _worker/
│           ├── _core/                 # Worker state and request routing
│           ├── _rendering/            # Composite, final render, Deep Scan
│           ├── _keyframes/            # Intermediate-frame generation
│           ├── _filters/              # Final-table filter preparation
│           ├── _preview/              # Cached wavetable preview
│           └── _analysis/             # Waveform analysis
│
├── _INTERFACE/
│   ├── _html/
│   │   ├── _shell/                    # Document start, header, navigation, status
│   │   ├── _layout/                   # Main workspace structure
│   │   ├── _panels/                   # Wave stack, timeline, inspectors, Table finish
│   │   ├── _dialogs/                  # Help, Tips, presets, picker, export
│   │   └── _components/              # Slider template
│   ├── _css/
│   │   ├── _foundation/               # Theme and base widgets
│   │   ├── _layout/                   # Compact workspace and responsive rules
│   │   ├── _wave_editor/              # Wave shape and region controls
│   │   ├── _relationships/            # Relation inspector styles
│   │   ├── _keyframes/                # Timeline presentation
│   │   ├── _table_finish/             # Filters, render progress, export
│   │   ├── _audio/                    # Audition meter and controls
│   │   ├── _help/                     # Help modal
│   │   └── _workspace/                # Tips, presets, context menus
│   └── _javascript/
│       ├── _app/                     # Vue setup, initialization and mounting
│       ├── _state/                   # Editor state and object factories
│       ├── _catalogs/                # Modifier descriptions
│       ├── _components/              # Reusable slider behavior
│       ├── _wave_editor/             # Wave stack, source settings, direct editing
│       ├── _modifiers/               # Modifier-chain actions
│       ├── _keyframes/               # Commit, timeline and preview
│       ├── _table_finish/            # Filter automation and export controls
│       ├── _audio/                   # Browser-native playback
│       ├── _rendering/               # Working-wave rendering requests
│       ├── _viewer/                  # Canvas drawing and navigation
│       ├── _projects/                # Project and WAV files
│       ├── _workspace/               # Browser, context menu, presets, comparison
│       ├── _history/                 # Undo/Redo
│       ├── _help/                    # Searchable Help and pointer Tips
│       ├── _services/                # Background worker communication
│       ├── _core/                    # Shared interface utilities
│       └── _vendor/                  # Bundled Vue distribution
│
├── build.manifest.json             # Explicit source order for the offline build
├── scripts/                        # Build, compile, serve, example generation
├── tests/                          # DSP, native and browser regressions
├── examples/                       # Example projects
├── docs/                           # Architecture, style, test records
└── dist/                           # Finished standalone HTML
```
