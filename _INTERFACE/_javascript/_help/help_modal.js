/**
 * Searchable Help chapters and opening/closing the guide.
 *
 * Functions operate on the shared setup state. Unless otherwise noted,
 * edits are non-destructive and saved keyframes remain unchanged.
 */

// Each topic is editable text; it does not have to be kept inside a large JS string.
const helpSections = [
    {
        "id": "start",
        "title": "Getting started",
        "kicker": "START HERE",
        "intro": "Mod Table is an offline wavetable editor, not a synth. It builds single-cycle frames that you export as a standard WAV file.",
        "blocks": [
            {
                "heading": "The basic workflow",
                "text": "Choose wave components on the Wave tab. Adjust their shape and relationships. Add up to 16 modifiers, then press Commit to store the current finished waveform as a keyframe."
            },
            {
                "heading": "Build the table",
                "text": "Move to another position in the 256-position timeline, change your working wave, and Commit again. The editor fills the positions between saved keyframes using the selected morph and curve."
            },
            {
                "heading": "Finish and export",
                "text": "Open Table finish to apply a static or moving filter across all frames, choose the sample size and frame count, optionally use Deep Scan, and render/export a WAV."
            }
        ],
        "tip": "Initialize resets your working recipe only. New project is the action that clears the complete table."
    },
    {
        "id": "waves",
        "title": "Wave stack: 64 components",
        "kicker": "WAVE TAB",
        "intro": "Each source contributes to the single composite waveform; these are not 64 synth voices.",
        "blocks": [
            {
                "heading": "Add, select, duplicate, reorder, remove",
                "text": "Use the wave stack in the left panel. Select a card to edit it in the inspector. You can keep up to 64 components; bypass or reduce Influence to silence one without deleting it."
            },
            {
                "heading": "Wave families and types",
                "text": "Choose a family and a generic, descriptive variant. Clean, geometric, harmonic and experimental waves have different timbres and applicable detail/character parameters."
            },
            {
                "heading": "Influence, size, phase, polarity",
                "text": "Influence is contribution level, Size reshapes the wave, Phase shifts it around one cycle, and Polarity inverts it. Most numeric fields and sliders reset on double-click."
            },
            {
                "heading": "Harmonic ratio and free mode",
                "text": "With Free mode checked off, ratios snap to quarter increments (for example 1.25× or 2.75×). Enable Free mode to enter an arbitrary ratio. Noninteger ratios receive periodic-boundary handling when rendered."
            }
        ],
        "tip": "Changes to the working wave do not rewrite keyframes you already committed."
    },
    {
        "id": "regions",
        "title": "Wave regions and local shaping",
        "kicker": "WAVE TAB",
        "intro": "Restrict a source to part of the 0–100% single cycle, then shape that contribution.",
        "blocks": [
            {
                "heading": "Start and End",
                "text": "Choose the active section of the cycle. For example, Start 12% and End 25% confines the source to that interval."
            },
            {
                "heading": "Fade in and Fade out",
                "text": "Blend the contribution smoothly into and out of the selected region to reduce sharp edges and discontinuities."
            },
            {
                "heading": "Local shaping",
                "text": "Smooth softens local variation; Resonance adds localized harmonic accent; Rough introduces nonlinear texture; Crushed introduces quantized steps. Each has its own amount control."
            }
        ],
        "tip": "Local shaping belongs to the selected source, before the complete composite reaches its modifier chain."
    },
    {
        "id": "relations",
        "title": "Relationships between waves",
        "kicker": "WAVE TAB",
        "intro": "Each relationship sits between two source cards. The lower wave determines how it interacts with the signal above it.",
        "blocks": [
            {
                "heading": "Arithmetic and geometry",
                "text": "Choose Add, Subtract, Multiply, Minimum, Maximum, half-horizontal, half-vertical, waveform stitching and other combinations."
            },
            {
                "heading": "FM and phase",
                "text": "Linear FM, exponential FM, through-zero FM, phase modulation and distortion use the lower waveform as the modulator. The previous enabled wave is the default carrier; Accumulated stack targets the whole signal assembled so far."
            },
            {
                "heading": "Experimental modes",
                "text": "Spectral, logic and experimental families add harmonic operations, quantized logic, nonlinear interactions and more. Use the relation inspector to adjust depth, blend, position, and mode-specific parameters."
            },
            {
                "heading": "Regional relationships",
                "text": "A relation can be confined to a start/end portion of the single cycle, using independent fade settings. It does not automatically affect the whole waveform."
            }
        ],
        "tip": "You can bypass an individual relation, and every committed keyframe stores the relation configuration used to render it."
    },
    {
        "id": "modifiers",
        "title": "Distortion, Spectral effects and Harmonics",
        "kicker": "TABS 2–4",
        "intro": "The three effect-browser tabs populate one shared chain of up to 16 ordered modifiers.",
        "blocks": [
            {
                "heading": "Add processors",
                "text": "Select a tab, browse or search processors, and add a modifier. The chain is shared even when you switch categories."
            },
            {
                "heading": "Edit the chain",
                "text": "Select a slot to adjust shape and wet/dry mix, bypass, duplicate, remove or change its position. Order matters: the result of one slot feeds the next."
            },
            {
                "heading": "Creative versus final processing",
                "text": "These 16 modifiers become part of the editable working waveform and are baked into the wave when you Commit. They are separate from the non-destructive Table finish filter."
            }
        ],
        "tip": "Some unusual processes can make bright or harsh waveforms. Start with a low mix and increase gradually."
    },
    {
        "id": "keys",
        "title": "Keyframes, Commit and Initialize",
        "kicker": "KEYFRAME TIMELINE",
        "intro": "Keyframes store the waveform you designed and the settings needed to edit it later.",
        "blocks": [
            {
                "heading": "Commit a wave",
                "text": "Choose a timeline position and click Commit. This renders the working composite and stores it there. Committing at an occupied position replaces that stored frame."
            },
            {
                "heading": "Move and edit",
                "text": "Drag keyframe markers to different timeline positions. Select or load a stored frame to recover its source recipe and continue editing."
            },
            {
                "heading": "Up to 256 keyframes",
                "text": "You can save as many as 256 distinct keyframes. Empty spaces between them are filled by interpolation; adding another keyframe shortens the surrounding morph spans."
            },
            {
                "heading": "Initialize versus New",
                "text": "Initialize restores a clean working sine and empty modifier chain but retains every committed keyframe. New project asks for confirmation before clearing the entire project."
            }
        ],
        "tip": "Save project frequently. It preserves editable settings, keyframes, relations, modifiers and final-processing settings."
    },
    {
        "id": "morph",
        "title": "Interpolation and progression curves",
        "kicker": "KEYFRAME TIMELINE",
        "intro": "Morph method determines the intermediate waveform; progression determines how quickly the morph advances.",
        "blocks": [
            {
                "heading": "Morph methods",
                "text": "Time morph blends time-domain samples; Spectral morph blends harmonic information; Equal Power changes gain during the crossfade. Experimental transition methods offer more complex trajectories."
            },
            {
                "heading": "Bias between keyframes",
                "text": "Drag the transition diamonds between keyframe markers to make one side dominate longer or to bring the crossover earlier."
            },
            {
                "heading": "Curves",
                "text": "Linear, Smoothstep, Smootherstep and additional ease/hold/step/elastic/Bézier styles determine movement over the gap. They are separate from the morph algorithm."
            },
            {
                "heading": "Endpoint preservation",
                "text": "Changing a transition affects interpolated frames, not the baked endpoint samples of your saved keyframes."
            }
        ],
        "tip": "Use the Committed table preview to hear the result across the full frame progression."
    },
    {
        "id": "preview",
        "title": "Views and audio preview",
        "kicker": "PREVIEW",
        "intro": "Audition one working wave or sweep the finished table; these modes are mutually exclusive.",
        "blocks": [
            {
                "heading": "Waveform viewer",
                "text": "Use Wave, Spectrum, Table and Layers to inspect the shape, harmonic content and progression. The displayed preview depends on Working wave or Committed table mode."
            },
            {
                "heading": "Audition",
                "text": "Audition plays the current working single-cycle waveform at the listening pitch and level. Those controls do not change any exported sample."
            },
            {
                "heading": "Preview wavetable",
                "text": "The wavetable sweep moves through the committed table over your chosen number of seconds. Starting the sweep stops single-wave audition; starting audition stops the sweep."
            },
            {
                "heading": "Audio troubleshooting",
                "text": "If silent, press Test sound, inspect the output meter, make sure listening level is above zero, and use Restart audio. Chrome is the recommended browser for the standalone HTML."
            }
        ],
        "tip": "The output meter measures browser audio before your actual speakers or headphones."
    },
    {
        "id": "finish",
        "title": "Table finish: filtering and resonance",
        "kicker": "FINAL TAB",
        "intro": "This processing occurs AFTER keyframe interpolation, so it affects saved-frame positions and every morph frame consistently.",
        "blocks": [
            {
                "heading": "Static or evolving",
                "text": "Static applies the same response to all frames. Evolving lets you drag independent filter-automation points across the table. Filter points do not replace waveform keyframes."
            },
            {
                "heading": "Filter selection",
                "text": "Choose low-pass, high-pass, band-pass, notch, peaking, all-pass or generic Z-morph/formant/cavity responses. Adjust cutoff, resonance/Q, drive and wet/dry."
            },
            {
                "heading": "Harmonic cutoff",
                "text": "Cutoff is specified relative to the harmonic spectrum, because a finished wavetable may later be played at many pitches in other instruments."
            },
            {
                "heading": "Automation points",
                "text": "Add and move filter points to change filter settings over wavetable position. A separate progression curve controls the movement between filter points."
            },
            {
                "heading": "Non-destructive",
                "text": "Changing the filter never overwrites the original committed waves. Re-render to obtain the newly processed final table."
            }
        ],
        "tip": "Final filtering makes the frames sound as though they were filtered; it is not an active, note-following synth filter."
    },
    {
        "id": "deep",
        "title": "Deep Scan: slower quality render",
        "kicker": "RENDER QUALITY",
        "intro": "Use the slower scan when you want the renderer to spend more time reducing generation error and aliasing artifacts.",
        "blocks": [
            {
                "heading": "What it does",
                "text": "The renderer regenerates waves from editable recipes at the chosen resolution, refining through progressively higher oversampling settings and comparing the results."
            },
            {
                "heading": "Convergence and limits",
                "text": "Deep Scan can compare 8×, 16×, 32× and 64× renders. It retains the finest available result and reports when the requested threshold has not converged."
            },
            {
                "heading": "What it cannot promise",
                "text": "It cannot distinguish all pre-existing aliasing from intentional harmonic content or guarantee alias-free playback in another synthesizer."
            },
            {
                "heading": "Render and cancel",
                "text": "Use Render finished table, monitor its progress and report, or cancel the current render. The operation may take significant time with 64 sources, 16 modifiers and a large table."
            }
        ],
        "tip": "Try ordinary rendering for edits and reserve Deep Scan for final export."
    },
    {
        "id": "export",
        "title": "Table dimensions, rendering and export",
        "kicker": "EXPORT",
        "intro": "Rendered frame count and samples per frame are two separate dimensions.",
        "blocks": [
            {
                "heading": "Samples per frame",
                "text": "Choose a power-of-two cycle length: 128, 256, 512, 1024, 2048, 4096 or 8192 samples. This is the amount of audio data in each single-cycle frame."
            },
            {
                "heading": "Frames per table",
                "text": "Choose 2–256 final frames. The editor generates frames between committed keyframes to reach the chosen table length."
            },
            {
                "heading": "Render & export",
                "text": "Render finished table prepares the complete result including interpolation and final filters. Render & export WAV writes that result into an ordinary wavetable WAV file."
            },
            {
                "heading": "Mandatory normalization",
                "text": "Export always finds the greatest absolute sample peak across the full finished table and applies ONE global gain factor to reach 0 dBFS. Relative level differences between frames are preserved; silent tables remain silent."
            }
        ],
        "tip": "The 256 saved keyframe limit is not the same as 8192 samples per frame."
    },
    {
        "id": "projects",
        "title": "Projects, shortcuts and recovery",
        "kicker": "FILES & CONTROLS",
        "intro": "Save editable recipes in a project; export audio separately when you are ready to use the result elsewhere.",
        "blocks": [
            {
                "heading": "Save and open",
                "text": "Save project writes a project JSON file. Open project loads an earlier Mod Table project and compatible settings. Export WAV writes audio, not an editable session."
            },
            {
                "heading": "Control resets",
                "text": "Double-click supported sliders and numeric inputs to return to their default value. Double-clicking a menu may also restore its default selection."
            },
            {
                "heading": "Keyboard shortcuts",
                "text": "Ctrl/Cmd+S saves a project, Ctrl/Cmd+Enter commits the working waveform, and Space toggles audition when focus is not in a form control."
            },
            {
                "heading": "Project recovery",
                "text": "Initialize is safe for stored frames. New project clears them and requests confirmation. Keep a separate saved project before experimenting extensively."
            }
        ],
        "tip": "Press Esc or the Close button to dismiss this Help guide; no project settings change when reading it."
    }
];

const helpOpen = ref(false), helpSearch = ref(''), helpTopic = ref('start'), helpSearchInput = ref(null);

const filteredHelpSections = computed(() => { const q = helpSearch.value.trim().toLowerCase(); return !q ? helpSections : helpSections.filter(section => (section.title + ' ' + section.kicker + ' ' + section.intro + ' ' + section.tip + ' ' + section.blocks.map(b => b.heading + ' ' + b.text).join(' ')).toLowerCase().includes(q)); });

const activeHelpSection = computed(() => filteredHelpSections.value.find(x => x.id === helpTopic.value) || filteredHelpSections.value[0] || null);

// Handles open help for the current editor context.
function openHelp() { disableTip(); helpOpen.value = true; helpSearch.value = ''; helpTopic.value = 'start'; Vue.nextTick(() => helpSearchInput.value?.focus()); }

// Handles close help for the current editor context.
function closeHelp() { helpOpen.value = false; }
