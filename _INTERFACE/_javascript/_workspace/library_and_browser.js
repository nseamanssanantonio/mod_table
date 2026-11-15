/**
 * Browser-storage settings, favorites and waveform or modifier browsing.
 *
 * Functions operate on the shared setup state. Unless otherwise noted,
 * edits are non-destructive and saved keyframes remain unchanged.
 */

// Handles safe get for the current editor context.
function safeGet(key, fallback) { try {
    const value = JSON.parse(localStorage.getItem(key));
    return Array.isArray(value) ? value : fallback;
}
catch {
    return fallback;
} }

// Handles safe set for the current editor context.
function safeSet(key, value) { try {
    localStorage.setItem(key, JSON.stringify(value));
}
catch {
    say('Storage not available here. Use Export presets to keep a copy.');
} }

// Handles init uilibrary for the current editor context.
function initUILibrary() { presetLibrary.value = safeGet('modtable09.presets', []).filter(x => x && typeof x.name === 'string' && ['wave', 'chain', 'recipe'].includes(x.kind)).slice(0, 80); waveFavorites.value = safeGet('modtable09.waveFavorites', []); effectFavorites.value = safeGet('modtable09.effectFavorites', []); }

// Handles toggle favorite for the current editor context.
function toggleFavorite(kind, id) { let r = kind === 'wave' ? waveFavorites : effectFavorites; const present = r.value.includes(id); r.value = present ? r.value.filter(v => v !== id) : [...r.value, id]; safeSet('modtable09.' + (kind === 'wave' ? 'waveFavorites' : 'effectFavorites'), r.value); }

// Handles open picker for the current editor context.
function openPicker(kind) { disableTip(); pickerKind.value = kind; pickerSearch.value = ''; pickerOpen.value = true; contextMenu.value = null; }

// Handles choose picker wave for the current editor context.
function choosePickerWave(item) { if (!selectedSource.value) {
    addSource();
} const w = selectedSource.value; if (!w)
    return; w.type = item.family; w.variant = item.id; edit(); pickerOpen.value = false; focusObject('wave', w.id); say('Wave type selected: ' + item.label + '.'); }

// Handles choose picker effect for the current editor context.
function choosePickerEffect(item) { if (editorState.effects.length >= 16) {
    say('Chain already has 16 modifiers.');
    return;
} addEffect(item.id); pickerOpen.value = false; focusObject('effect', editorState.selectedEffectId); }
