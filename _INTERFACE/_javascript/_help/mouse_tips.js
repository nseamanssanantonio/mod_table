/**
 * Mouse-following explanations that do not intercept user input.
 *
 * Functions operate on the shared setup state. Unless otherwise noted,
 * edits are non-destructive and saved keyframes remain unchanged.
 */

const tipRules = [
    [/undo/i, 'Reverts your last working-wave, modifier, keyframe or final-filter edit. Drag adjustments are grouped into one history step.'],
    [/redo/i, 'Reapplies the next edit after Undo.'],
    [/help/i, 'Opens the searchable offline guide with explanations of the entire editing workflow.'],
    [/tips|tooltips/i, 'Enables or disables contextual explanations above the mouse pointer as you hover over controls.'],
    [/save project/i, 'Saves editable waves, relationships, modifiers, keyframes and final filter settings as a JSON project.'],
    [/open project/i, 'Loads a compatible Mod Table project. Current unsaved work will be replaced.'],
    [/new project/i, 'Starts a new project after confirmation. Unlike Initialize, this clears stored keyframes.'],
    [/export wav|render.*export/i, 'Renders the full table, applies finish processing and globally normalizes the highest peak to 0 dBFS before saving float32 WAV.'],
    [/export options|export settings/i, 'Shows output dimensions, estimated WAV size, final-render quality and compatibility guidance.'],
    [/audition/i, 'Plays only the current working single-cycle waveform. This stops the wavetable sweep, and listening settings do not affect export.'],
    [/preview wavetable|table sweep/i, 'Plays a continuous sweep through the committed table, including interpolated frames and final processing when rendered.'],
    [/test sound/i, 'Checks Chrome audio output using a temporary 440 Hz tone, without altering your wavetable.'],
    [/restart audio/i, 'Recreates the Chrome audio output path if playback stalls or falls silent.'],
    [/add wave/i, 'Adds one wave component to the current composite, up to a maximum of 64.'],
    [/duplicate/i, 'Creates a copy of the selected wave component or modifier, preserving its parameter settings.'],
    [/relation before wave|edit relation|relation from above/i, 'Changes how this lower wave interacts with the preceding wave or the already accumulated composite. FM uses the lower wave as modulator.'],
    [/remove wave|remove this wave/i, 'Deletes this wave from the current working recipe, without changing committed frames.'],
    [/influence/i, 'Sets how strongly a wave contributes to the composite. 0% effectively silences its contribution.'],
    [/free mode/i, 'Allows arbitrary decimal harmonic ratios. With this off, intervals snap to quarter increments.'],
    [/harmonic ratio|ratio value/i, 'Sets the component frequency ratio within the single cycle. Fractional values can create complex shapes; the renderer enforces loop continuity.'],
    [/wave family/i, 'Chooses the broad family of source waveform (sine, saw, geometric, experimental, and others).'],
    [/waveform circuit type|type \/ circuit/i, 'Chooses the descriptive shape variant within the selected waveform family. These are not real synth model names.'],
    [/size|symmetry/i, 'Changes the selected waveform’s geometric width, symmetry, or pulse proportions.'],
    [/phase offset/i, 'Shifts the component horizontally around the 0–100% single cycle.'],
    [/polarity/i, 'Flips the selected wave or relationship vertically, reversing its sample sign.'],
    [/start point|relation start/i, 'Defines the starting location, as a percentage of one cycle, where this wave or relationship is active.'],
    [/end point|relation end/i, 'Defines the final location in the cycle where this wave or relationship is active.'],
    [/blend in|blend out|edge blend/i, 'Smoothly fades a wave or relationship at its active-region boundaries to reduce abrupt edges.'],
    [/resonance|\bq\b/i, 'Controls emphasis of harmonics near a resonant frequency. Higher Q produces a narrower, more prominent peak.'],
    [/rough/i, 'Blends extra nonlinear detail and brighter harmonic texture into this component’s active region.'],
    [/crushed/i, 'Adds discrete sample-amplitude steps for a quantized waveform character.'],
    [/harmonics/i, 'Provides modifiers and waveforms that operate on harmonic content rather than only time-domain shape.'],
    [/spectral/i, 'Provides processors that modify the waveform’s harmonic distribution and phase spectrum.'],
    [/distortion/i, 'Provides nonlinear waveshaping, folding, fracture and saturation processors.'],
    [/shape \/ intensity/i, 'Controls the selected modifier’s main transformation amount.'],
    [/dry \/ wet|filter wet \/ dry/i, 'Blends original and processed audio. 0% is dry; 100% is fully processed.'],
    [/commit|replace frame/i, 'Renders your current composite and modifiers to one frozen keyframe at the current timeline position.'],
    [/load to edit/i, 'Restores the selected committed frame’s editable source recipe without overwriting the stored frame.'],
    [/delete frame/i, 'Removes only this committed keyframe after confirmation. Your working waves remain intact.'],
    [/transition bias|lead/i, 'Changes where the blend midpoint occurs between two saved frames, making one wave dominate longer.'],
    [/transition method|between keyframes/i, 'Chooses the mathematical method that generates waveforms between saved keyframes.'],
    [/interpolation curve|progression/i, 'Controls the speed of progress between endpoints independently of the waveform morph algorithm.'],
    [/filter automation/i, 'Edits a separate set of cutoff and resonance automation points across the finished table.'],
    [/filter cutoff|cutoff/i, 'Sets the final-filter frequency in harmonics of the eventual played note, not a fixed frequency in hertz.'],
    [/final filter type/i, 'Selects the post-interpolation filter response baked into every rendered frame, including morphs.'],
    [/deep scan|render mode/i, 'Uses progressively higher oversampling to compare renders and reduce numerical error and generation aliasing. May take longer.'],
    [/samples per frame/i, 'Sets how many samples constitute each single-cycle waveform: 128 through 8192, in powers of two.'],
    [/rendered frames|frame count/i, 'Sets how many single-cycle frames are exported. This is separate from waveform samples per frame.'],
    [/normalize|normalization/i, 'Every export receives one global gain so the largest absolute peak across all frames reaches 0 dBFS. Stored keyframes are unchanged.'],
    [/presets/i, 'Save or restore wave, modifier-chain or complete working-recipe presets, without modifying committed frames.'],
    [/wave canvas|waveform visualization|direct edit/i, 'Displays the rendered wave. Enable Direct edit to drag the active region boundaries and its influence control.'],
    [/capture a|compare/i, 'Stores the displayed wave as a comparison reference; then overlay A with B or audition either wave.'],
];

// Handles tip for element for the current editor context.
function tipForElement(el) {
    if (!el)
        return null;
    const node = el.closest('[data-tip],button,input,select,summary,[role="slider"],.source-card,.effect-slot,.filter-timeline,.track,canvas');
    if (!node)
        return null;
    const label = node.dataset?.tipTitle || node.getAttribute('aria-label') || node.getAttribute('title') || node.innerText?.trim()?.slice(0, 70) || 'Control';
    const direct = node.dataset?.tip;
    if (direct)
        return { title: label, text: direct };
    const parent = node.closest('.control-slider,.field,.source-card,.relation-link,.inspector-section');
    const context = parent?.querySelector('.slider-top label, label, h3, .source-title')?.textContent || '';
    if (parent?.dataset?.tipCustom === 'true')
        return { title: context || label, text: parent.dataset.tip };
    const matchText = label + ' ' + context;
    const rule = tipRules.find(([regex]) => regex.test(matchText));
    return { title: (context && label.includes('value') ? context : label).slice(0, 65), text: rule ? rule[1] : node.matches('input[type=range]') ? 'Drag to adjust this parameter. Hold Shift for fine adjustment; double-click to restore its default.' : node.matches('select') ? 'Choose an option. Hover another control to learn how it changes the generated wavetable.' : node.matches('button') ? 'Activates this editing action. The Help guide describes the related workflow.' : 'Select this item to inspect and edit it. Right-click for contextual actions.' };
}

// Positions contextual help just above the mouse pointer when possible.
function moveTip(e) {
    if (!tipsEnabled.value || contextMenu.value || e.target.closest('.ui-dialog-backdrop')) {
        hoverTip.value = { ...hoverTip.value, on: false };
        return;
    }
    const el = e.target.closest?.('[title]');
    if (el && el.hasAttribute('title')) {
        el.setAttribute('data-tip-original-title', el.getAttribute('title'));
        el.removeAttribute('title');
    }
    const info = tipForElement(e.target);
    if (!info) {
        hoverTip.value = { ...hoverTip.value, on: false };
        return;
    }
    hoverTip.value = { on: true, title: info.title, text: info.text, x: clamp(e.clientX - 12, 8, Math.max(8, window.innerWidth - 342)), y: e.clientY > 120 ? e.clientY - 15 : e.clientY + 20, above: e.clientY > 120 };
}

// Dismisses contextual tips without affecting editor controls.
function disableTip() { hoverTip.value = { ...hoverTip.value, on: false }; }

Vue.watch(() => [helpOpen.value, pickerOpen.value, presetsOpen.value, exportOpen.value], states => { if (states.some(Boolean))
    disableTip(); });

// Enables or disables pointer-following explanations for editor controls.
function toggleTips() { tipsEnabled.value = !tipsEnabled.value; disableTip(); if (!tipsEnabled.value) {
    document.querySelectorAll('[data-tip-original-title]').forEach(el => { el.setAttribute('title', el.getAttribute('data-tip-original-title')); el.removeAttribute('data-tip-original-title'); });
} say(tipsEnabled.value ? 'Tips ON — hover controls for descriptions above your pointer.' : 'Tips OFF.'); }
