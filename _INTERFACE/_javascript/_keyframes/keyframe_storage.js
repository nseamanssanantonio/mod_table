/**
 * Commit, load and remove source keyframes without changing the others.
 *
 * Functions operate on the shared setup state. Unless otherwise noted,
 * edits are non-destructive and saved keyframes remain unchanged.
 */

// Renders the working composite and stores its waveform plus editable recipe at the current frame.
async function commit() {
    if (editorState.finalBuilding)
        return;
    invalidateFinal();
    if (!editorState.ready || editorState.committing || !editorState.sources.length)
        return;
    editorState.committing = true;
    const target = editorState.position, settings = recipe(), signature = JSON.stringify(settings), quality = editorState.commitQuality;
    try {
        const result = await rpc('render', { recipe: settings, quality });
        if (result.stats[3] > 0)
            throw Error('A stateful stage did not settle. Lower its resonance/shape before committing. The frame was not changed.');
        const frame = markRaw({ recipe: settings, wave: result.wave.slice(), quality, lead: editorState.frames[target]?.lead ?? .5, transition: editorState.frames[target]?.transition ?? null });
        await rpc('setFrame', { position: target, wave: frame.wave, recipe: frame.recipe, quality: frame.quality, lead: frame.lead, transition: frame.transition });
        editorState.frames[target] = frame;
        historyPush();
        if (JSON.stringify(recipe()) === signature) {
            editorState.dirty = false;
            draftResult = result;
            if (editorState.mode === 'draft')
                showResult(result);
        }
        if (editorState.mode === 'table')
            await updateTable();
        updateOverview();
        say(`Frame ${String(target + 1).padStart(3, '0')} committed · ${N} samples · ${quality}×. Settings saved with the wave.`);
    }
    catch (e) {
        editorState.error = e.message;
        say('Commit failed; previous frame preserved.');
    }
    finally {
        editorState.committing = false;
    }
}

// Loads a saved keyframe recipe back into the working editor.
function loadKey() { const k = currentKey.value; if (!k)
    return; snapshotUndo(); restoreRecipe(k.recipe); editorState.dirty = false; editorState.tab = 'sources'; say('Loaded frame ' + (editorState.position + 1) + ' into the working editor. The stored wave stays frozen until recommit.'); }

// Deletes a selected stored frame without clearing the rest of the wavetable.
function deleteKey() { if (!currentKey.value)
    return; const p = editorState.position; ask('Delete frame ' + String(p + 1).padStart(3, '0') + '?', 'This deletes only this committed keyframe. Your working sources and effects will remain.', 'Delete frame', async () => { await rpc('deleteFrame', { position: p }); editorState.frames[p] = null; historyPush(); if (!keyCount.value) {
    cancelSweep();
    setMode('draft');
}
else if (editorState.mode === 'table')
    updateTable(); updateOverview(); say('Committed frame deleted.'); }); }

// Changes the selected frame position and schedules the corresponding preview.
function setPosition(p, preview = false) { cancelSweep(); editorState.position = clamp(Math.round(Number.isFinite(p) ? p : 0), 0, 255); editorState.previewPosition = editorState.position; if (preview && keyCount.value)
    editorState.mode = 'table'; if (editorState.mode === 'table')
    updateTable(); }

// Handles set mode for the current editor context.
function setMode(m) { if (m === 'table' && !keyCount.value)
    return; cancelSweep(); editorState.mode = m; if (m === 'table') {
    editorState.previewPosition = editorState.position;
    updateTable();
}
else if (draftResult)
    showResult(draftResult);
else
    requestRender(); }
