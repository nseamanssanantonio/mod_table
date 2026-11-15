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

## Where to make a change

| You want to change… | Start here |
|---|---|
| An experimental waveform | `_DSP/_c++/_waveforms/experimental_shapes.hpp` |
| How stacked waves combine | `_DSP/_c++/_relationships/relationship_algorithms.hpp` |
| Available wave/relation labels | `_DSP/_webassembly/_shared/_catalogs/` |
| Keyframe transition math | `_DSP/_c++/_transitions/` and `_DSP/_webassembly/_shared/_settings/progression_curves.js` |
| Final resonance/filtering | `_DSP/_c++/_filters/` and `_DSP/_webassembly/_worker/_filters/` |
| Deep Scan | `_DSP/_webassembly/_worker/_rendering/deep_scan.js` |
| Keyframe timeline controls | `_INTERFACE/_html/_panels/keyframe_timeline.html` and `_INTERFACE/_javascript/_keyframes/` |
| Help text and hover explanations | `_INTERFACE/_javascript/_help/` and `_INTERFACE/_html/_dialogs/` |
| Slider appearance or behavior | `_INTERFACE/_html/_components/slider.html`, `_INTERFACE/_css/`, `_INTERFACE/_javascript/_components/slider_component.js` |
| Preview or audio output | `_INTERFACE/_javascript/_audio/` |
| Final export | `_INTERFACE/_javascript/_table_finish/`, `_INTERFACE/_javascript/_projects/`, `_DSP/_webassembly/_worker/_rendering/` |

## A couple of rules for development

**Keep each function focused on one responsibility.** Use descriptive names, comment why a decision is necessary, and give each file a short multiline purpose statement. Document classes with multiline comments and ordinary functions with a concise one-line description. The retained third-party DSP headers are deliberately kept intact.

The project keeps the existing **stable waveform IDs, effect IDs, saved project schema, and output conventions**. Avoid renaming those identifiers just to change a displayed label. Do not change the DSP processing order without reference-render tests.

See [Architecture](docs/ARCHITECTURE.md), [Code Style](docs/CODE_STYLE.md), and [Refactor Verification](docs/REFACTOR_VALIDATION.md) for the detailed development conventions.

## Scope of this refactor

This is an organization-and-readability pass on the working 0.9.1 editor, **not a new synthesis algorithm**. The current Vue `setup()` logic is divided into ordered, purpose-specific source files and assembled at build time into the same lexical scope. That compatibility step deliberately preserves existing reactive dependencies. Over time, these groups can be moved into independently imported composables without mixing it into the initial directory migration.

The final HTML remains standalone; `dist/` is generated and should not be edited by hand.
