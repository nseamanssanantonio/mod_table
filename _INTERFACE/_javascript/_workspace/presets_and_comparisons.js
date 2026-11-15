/**
 * Portable presets and non-destructive A/B waveform comparison.
 *
 * Functions operate on the shared setup state. Unless otherwise noted,
 * edits are non-destructive and saved keyframes remain unchanged.
 */

// Handles preset payload for the current editor context.
function presetPayload(kind) { if (kind === 'wave')
    return selectedSource.value ? clone(selectedSource.value) : null; if (kind === 'chain')
    return clone(editorState.effects); return recipe(); }

// Stores reusable wave, chain, or recipe settings in local browser storage.
function savePreset() { const name = presetName.value.trim().slice(0, 60); if (!name) {
    say('Enter a preset name.');
    return;
} const data = presetPayload(presetKind.value); if (!data) {
    say('Select a wave first.');
    return;
} const id = 'p' + Date.now() + Math.random().toString(36).slice(2, 6); presetLibrary.value = [...presetLibrary.value, { id, name, kind: presetKind.value, data }].slice(-80); presetSelection.value = id; safeSet('modtable09.presets', presetLibrary.value); say('Saved ' + presetKind.value + ' preset: ' + name + '.'); }

// Loads a saved preset into the working editor without deleting committed frames.
function applyPreset() {
    const p = presetLibrary.value.find(x => x.id === presetSelection.value);
    if (!p)
        return;
    try {
        if (p.kind === 'recipe') {
            const r = validateRecipe(p.data);
            restoreRecipe(r);
        }
        else if (p.kind === 'chain') {
            if (!Array.isArray(p.data) || p.data.length > 16)
                throw Error('Invalid chain.');
            const r = validateRecipe({ sources: [], effects: p.data, output: defaults() });
            editorState.effects = r.effects;
            edit();
        }
        else {
            if (!selectedSource.value)
                addSource();
            const r = validateRecipe({ sources: [p.data], effects: [], output: defaults() });
            const id = selectedSource.value.id;
            editorState.sources[editorState.sources.findIndex(w => w.id === id)] = { ...r.sources[0], id };
            edit();
        }
        presetsOpen.value = false;
        say('Applied ' + p.name + '. Stored frames remain unchanged.');
    }
    catch (e) {
        editorState.error = 'Cannot apply preset: ' + e.message;
    }
}

// Handles delete preset for the current editor context.
function deletePreset() { presetLibrary.value = presetLibrary.value.filter(x => x.id !== presetSelection.value); presetSelection.value = presetLibrary.value[0]?.id || ''; safeSet('modtable09.presets', presetLibrary.value); }

// Saves the preset library to a portable JSON backup.
function exportPresets() { download(JSON.stringify({ format: 'mod-table-ui-presets', version: 1, presets: presetLibrary.value }, null, 2), 'Mod_Table_Presets.json', 'application/json'); }

const presetFile = ref(null);

// Validates and merges an imported JSON preset library.
async function importPresets(e) { const file = e.target.files?.[0]; e.target.value = ''; if (!file)
    return; try {
    if (file.size > 1024 * 1024)
        throw Error('Preset file exceeds 1 MB');
    const p = JSON.parse(await file.text());
    if (p.format !== 'mod-table-ui-presets' || !Array.isArray(p.presets) || p.presets.length > 80)
        throw Error('Unrecognized preset file');
    const safe = p.presets.filter(x => x && ['wave', 'chain', 'recipe'].includes(x.kind) && typeof x.name === 'string' && x.name.length < 90 && x.data !== undefined).map(x => ({ id: 'p' + Math.random().toString(36).slice(2), kind: x.kind, name: x.name, data: x.data }));
    presetLibrary.value = [...presetLibrary.value, ...safe].slice(-80);
    safeSet('modtable09.presets', presetLibrary.value);
    say('Imported ' + safe.length + ' presets.');
}
catch (err) {
    editorState.error = 'Could not import presets: ' + err.message;
} }

// Captures a waveform snapshot for A/B inspection.
function saveCompare() { compareBuffer = new Float32Array(displayWave); compareReady.value = true; compareOverlay.value = true; compareName.value = editorState.mode === 'table' ? 'Table frame ' + (Math.round(editorState.previewPosition) + 1) : 'Working waveform'; compareListen.value = 'B'; say('Captured A. Continue editing, then compare to the current B waveform.'); }

// Changes the A/B listening reference without editing committed frames.
function switchCompare(which) { if (which === 'A' && !compareBuffer)
    return; compareListen.value = which; refreshAudio(); }

// Handles clear compare for the current editor context.
function clearCompare() { compareBuffer = null; compareReady.value = false; compareListen.value = 'B'; refreshAudio(); }
