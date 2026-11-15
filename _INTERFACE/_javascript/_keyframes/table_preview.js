/**
 * Wavetable interpolation preview and frame selection.
 *
 * Functions operate on the shared setup state. Unless otherwise noted,
 * edits are non-destructive and saved keyframes remain unchanged.
 */

// Requests interpolation of the current position in the committed wavetable.
async function updateTable() {
    if (!editorState.ready || !keyCount.value || editorState.mode !== 'table')
        return;
    if (tableInFlight) {
        tableAgain = true;
        return;
    }
    tableInFlight = true;
    const token = ++tableToken, pos = editorState.previewPosition;
    try {
        const result = await rpc('table', { ...tableRequest(), position: pos });
        if (token === tableToken && editorState.mode === 'table')
            showResult(result);
    }
    catch (e) {
        editorState.error = e.message;
    }
    finally {
        tableInFlight = false;
        if (tableAgain) {
            tableAgain = false;
            updateTable();
        }
    }
}

// Handles set preview position for the current editor context.
function setPreviewPosition(v) { editorState.previewPosition = clamp(Number(v) || 0, 0, 255); if (editorState.mode !== 'table')
    setMode('table');
else
    updateTable(); }

// Starts or stops exclusive wavetable preview playback.
// Wavetable sweep and working-wave audition are mutually exclusive playback modes.
// The audio output is a single native Web Audio graph; we always mute its
// previous source before preparing the newly selected waveform.
async function toggleSweep() {
    if (editorState.audioStarting || !keyCount.value)
        return;
    if (editorState.playbackMode === 'sweep' && editorState.sweeping) {
        stopAudio();
        say('Wavetable preview stopped.');
        return;
    }
    const started = await beginPlayback('sweep', async () => {
        editorState.mode = 'table';
        editorState.sweepSeconds = clamp(editorState.sweepSeconds, 2, 30);
        await updateTable();
    });
    if (!started)
        return;
    editorState.sweeping = true;
    sweepStarted = performance.now() - editorState.previewPosition / 255 * editorState.sweepSeconds * 1000;
    lastSweepUpdate = 0;
    say('Previewing the committed wavetable only. Single-wave audition is inactive.');
}
