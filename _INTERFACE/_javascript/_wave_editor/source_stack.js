/**
 * Add, remove, duplicate and reorder waveform components.
 *
 * Functions operate on the shared setup state. Unless otherwise noted,
 * edits are non-destructive and saved keyframes remain unchanged.
 */

// Appends a new waveform without exceeding the 64-source limit.
function addSource() { if (editorState.sources.length >= 64)
    return; snapshotUndo(); const w = newSource('sine', 1, 40); editorState.sources.push(w); editorState.selectedSourceId = w.id; edit(); say('Wave added to the composite.'); }

// Creates a separate editable copy of the selected waveform.
function duplicateSource() { if (!selectedSource.value || editorState.sources.length >= 64)
    return; snapshotUndo(); const w = { ...clone(selectedSource.value), id: 'w' + uid++ }; editorState.sources.push(w); editorState.selectedSourceId = w.id; edit(); }

// Removes a waveform and keeps selection on a valid remaining source.
function removeSource(id) { snapshotUndo(); const i = editorState.sources.findIndex(w => w.id === id); if (i < 0)
    return; editorState.sources.splice(i, 1); if (editorState.selectedSourceId === id)
    editorState.selectedSourceId = editorState.sources[Math.min(i, editorState.sources.length - 1)]?.id || null; edit(); say('Wave removed. Stored frames unchanged.'); }

// Changes the source evaluation order without losing relation settings.
function moveSource(dir) { const i = selectedSourceIndex.value, j = i + dir; if (i < 0 || j < 0 || j >= editorState.sources.length)
    return; snapshotUndo(); [editorState.sources[i], editorState.sources[j]] = [editorState.sources[j], editorState.sources[i]]; edit(); }
