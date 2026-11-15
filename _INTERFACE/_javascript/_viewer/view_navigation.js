/**
 * Wavetable overview, canvas mode and timeline scrubbing.
 *
 * Functions operate on the shared setup state. Unless otherwise noted,
 * edits are non-destructive and saved keyframes remain unchanged.
 */

let overviewToken = 0;

// Builds the wavetable overview without blocking the editable waveform.
async function updateOverview() { const token = ++overviewToken; if (!keyCount.value) {
    overview = null;
    return;
} try {
    const r = await rpc('overview', tableRequest());
    if (token === overviewToken)
        overview = r.wave;
}
catch (e) {
    editorState.error = e.message;
} }

// Handles set view for the current editor context.
function setView(v) { editorState.view = v; if (v === 'table')
    updateOverview(); }

// Handles track position for the current editor context.
function trackPosition(e) { setPosition(positionFromPointer(e), editorState.mode === 'table'); }

// Handles track down for the current editor context.
function trackDown(e) { if (e.button !== 0)
    return; dragging = true; e.currentTarget.setPointerCapture(e.pointerId); trackPosition(e); }

// Handles track move for the current editor context.
function trackMove(e) {
    if (pointDrag) {
        const v = positionFromPointer(e);
        if (pointDrag.kind === 'key')
            editorState.frameDrag.to = clamp(Math.round(v), 0, 255);
        else
            editorState.blendDrag.lead = clamp((v - pointDrag.from) / (pointDrag.to - pointDrag.from), .05, .95);
        return;
    }
    if (dragging)
        trackPosition(e);
}

// Handles track up for the current editor context.
function trackUp() { dragging = false; if (pointDrag)
    finishPointDrag(); }
