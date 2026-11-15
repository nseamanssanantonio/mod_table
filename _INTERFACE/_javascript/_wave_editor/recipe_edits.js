/**
 * Working-wave recipes, harmonic ratio controls and region editing.
 *
 * Functions operate on the shared setup state. Unless otherwise noted,
 * edits are non-destructive and saved keyframes remain unchanged.
 */

// Copies the current wave sources, modifier chain, and output settings into an editable recipe.
function recipe() { return { sources: clone(editorState.sources), effects: clone(editorState.effects), output: clone(editorState.output) }; }

// Restores a validated recipe into the working-wave editor.
function restoreRecipe(r) { editorState.sources = clone(r.sources); editorState.effects = clone(r.effects); editorState.output = clone(r.output); editorState.selectedSourceId = editorState.sources[0]?.id || null; editorState.selectedEffectId = editorState.effects[0]?.id || null; edit(); }

// Handles snapshot undo for the current editor context.
function snapshotUndo() { editorState.undoDraft = recipe(); }

// Handles undo draft change for the current editor context.
function undoDraftChange() { if (!editorState.undoDraft)
    return; let old = clone(editorState.undoDraft); editorState.undoDraft = null; restoreRecipe(old); say('Working settings restored. Committed frames unchanged.'); }

// Marks the working wave as changed, records history, and schedules preview rendering.
function edit() { cancelSweep(); editorState.dirty = true; editorState.mode = 'draft'; revision++; requestRender(); scheduleHistory(); }

// Updates the selected source harmonic ratio according to its quantization mode.
function changeInterval(value) { const w = selectedSource.value; if (!w)
    return; const v = Number(value); if (!Number.isFinite(v))
    return; w.interval = w.freeMode ? clamp(v, .125, 64) : clamp(Math.round(v * 4) / 4, .25, 64); edit(); }

// Toggles fractional harmonic-ratio entry for the current wave.
function setFreeMode(event) { const w = selectedSource.value; if (!w)
    return; w.freeMode = event.target.checked; if (!w.freeMode)
    w.interval = clamp(Math.round(w.interval * 4) / 4, .25, 64); edit(); }

// Constrains the selected wave region and adds edge tapers when cropping.
function setRegion(which, value) {
    const w = selectedSource.value;
    if (!w)
        return;
    const n = Number(value);
    if (!Number.isFinite(n))
        return;
    if (which === 'start')
        w.regionStart = clamp(n, 0, w.regionEnd - .5);
    else
        w.regionEnd = clamp(n, w.regionStart + .5, 100);
    // A cropped component needs softly tapered boundaries by default. The user
    // can turn either taper back down to 0 for an intentional hard edge.
    if ((w.regionStart > 0 || w.regionEnd < 100) && w.fadeIn === 0 && w.fadeOut === 0) {
        w.fadeIn = 15;
        w.fadeOut = 15;
    }
    edit();
}
