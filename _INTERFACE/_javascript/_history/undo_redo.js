/**
 * Bounded, gesture-coalesced project and keyframe Undo/Redo.
 *
 * Functions operate on the shared setup state. Unless otherwise noted,
 * edits are non-destructive and saved keyframes remain unchanged.
 */

// Coalesced history stores immutable snapshots of settings and shared frozen
// keyframe references; a long slider gesture becomes one undoable action.
let history = [], historyTimer = null, historyApplying = false, historyDragging = false;

const frameRefIds = new WeakMap();

let frameRefSerial = 0;

const frameID = f => { if (!f)
    return 0; if (!frameRefIds.has(f))
    frameRefIds.set(f, ++frameRefSerial); return frameRefIds.get(f); };

// Records a project snapshot suitable for Undo and Redo.
function historyCapture() { return { draft: recipe(), frames: editorState.frames.slice(), finish: clone(editorState.finish), renderOptions: clone(editorState.renderOptions), samplesPerFrame: editorState.samplesPerFrame, renderFrames: editorState.renderFrames, morph: editorState.morph, curve: editorState.curve, curveSettings: clone(editorState.curveSettings), transition: clone(editorState.transition), selectedSourceId: editorState.selectedSourceId, selectedEffectId: editorState.selectedEffectId, position: editorState.position, selectedFilterPosition: editorState.selectedFilterPosition }; }

// Handles history key for the current editor context.
function historyKey(snap) { return JSON.stringify({ draft: snap.draft, frames: snap.frames.map(frameID), finish: snap.finish, renderOptions: snap.renderOptions, samplesPerFrame: snap.samplesPerFrame, renderFrames: snap.renderFrames, morph: snap.morph, curve: snap.curve, curveSettings: snap.curveSettings, transition: snap.transition }); }

// Handles history init for the current editor context.
function historyInit() { history = [{ data: historyCapture(), key: '' }]; history[0].key = historyKey(history[0].data); historyPosition.value = 0; historyLength.value = 1; }

// Adds a de-duplicated history state within the configured history limit.
function historyPush() { if (historyApplying || !editorState.ready)
    return; clearTimeout(historyTimer); historyTimer = null; const data = historyCapture(), key = historyKey(data); if (history[historyPosition.value]?.key === key)
    return; history = history.slice(0, historyPosition.value + 1); history.push({ data, key }); if (history.length > 50)
    history.shift(); historyPosition.value = history.length - 1; historyLength.value = history.length; }

// Batches rapid edits into one undoable action.
function scheduleHistory() { if (historyApplying || !editorState.ready)
    return; clearTimeout(historyTimer); if (!historyDragging)
    historyTimer = setTimeout(historyPush, 280); }

// Handles history start drag for the current editor context.
function historyStartDrag(e) { if (e.target.matches?.('input[type=range]')) {
    historyDragging = true;
    clearTimeout(historyTimer);
} }

// Handles history end drag for the current editor context.
function historyEndDrag() { if (!historyDragging)
    return; historyDragging = false; historyPush(); }

// Restores project and keyframe state consistently across the UI and renderer.
async function goHistory(step) {
    if (historyBusy.value)
        return;
    historyPush();
    const target = historyPosition.value + step;
    if (target < 0 || target >= history.length)
        return;
    const next = history[target].data, framesChanged = next.frames.some((f, i) => f !== editorState.frames[i]);
    historyApplying = true;
    historyBusy.value = true;
    stopAudio();
    try {
        if (framesChanged) {
            await rpc('setFrames', { frames: next.frames.flatMap((f, i) => f ? [{ position: i, wave: f.wave, recipe: f.recipe, quality: f.quality, lead: f.lead, transition: f.transition }] : []) });
            editorState.frames = next.frames.slice();
        }
        editorState.sources = clone(next.draft.sources);
        editorState.effects = clone(next.draft.effects);
        editorState.output = clone(next.draft.output);
        editorState.finish = clone(next.finish);
        editorState.renderOptions = clone(next.renderOptions);
        editorState.samplesPerFrame = next.samplesPerFrame;
        editorState.renderFrames = next.renderFrames;
        editorState.morph = next.morph;
        editorState.curve = next.curve;
        editorState.curveSettings = clone(next.curveSettings);
        editorState.transition = clone(next.transition);
        editorState.selectedSourceId = editorState.sources.some(w => w.id === next.selectedSourceId) ? next.selectedSourceId : editorState.sources[0]?.id || null;
        editorState.selectedEffectId = editorState.effects.some(f => f.id === next.selectedEffectId) ? next.selectedEffectId : editorState.effects[0]?.id || null;
        editorState.position = next.position;
        editorState.selectedFilterPosition = next.selectedFilterPosition;
        historyPosition.value = target;
        invalidateFinal();
        editorState.mode = 'draft';
        editorState.dirty = true;
        revision++;
        requestRender();
        updateOverview();
        updateFilterResponse();
        say((step < 0 ? 'Undo' : 'Redo') + ' applied. Source keyframes remain non-destructive.');
    }
    catch (e) {
        editorState.error = 'Cannot restore history: ' + e.message;
    }
    finally {
        historyBusy.value = false;
        historyApplying = false;
    }
}

// Handles reset history after load for the current editor context.
function resetHistoryAfterLoad() { clearTimeout(historyTimer); historyDragging = false; historyInit(); }
