/**
 * Manage up to sixteen serial waveform modifiers.
 *
 * Functions operate on the shared setup state. Unless otherwise noted,
 * edits are non-destructive and saved keyframes remain unchanged.
 */

// Inserts a modifier into the 16-slot processing chain.
function addEffect(type) { if (editorState.effects.length >= 16)
    return; snapshotUndo(); const fx = newEffect(type); editorState.effects.push(fx); editorState.selectedEffectId = fx.id; edit(); say(effectInfo(type).name + ' added at slot ' + editorState.effects.length + '.'); }

// Handles select effect for the current editor context.
function selectEffect(fx) { editorState.selectedEffectId = fx.id; editorState.tab = effectInfo(fx.type).category; editorState.search = ''; }

// Removes the selected modifier from the serial processing chain.
function removeEffect(id) { snapshotUndo(); const i = editorState.effects.findIndex(e => e.id === id); if (i < 0)
    return; editorState.effects.splice(i, 1); if (editorState.selectedEffectId === id)
    editorState.selectedEffectId = editorState.effects[Math.min(i, editorState.effects.length - 1)]?.id || null; edit(); say('Effect removed from the working chain.'); }

// Moves one modifier within its serial processing order.
function moveEffect(dir) { const i = selectedEffectIndex.value, j = i + dir; if (i < 0 || j < 0 || j >= editorState.effects.length)
    return; snapshotUndo(); [editorState.effects[i], editorState.effects[j]] = [editorState.effects[j], editorState.effects[i]]; edit(); }

// Copies a modifier with its current parameters.
function duplicateEffect() { if (!selectedEffect.value || editorState.effects.length >= 16)
    return; snapshotUndo(); const fx = { ...clone(selectedEffect.value), id: 'e' + uid++ }; editorState.effects.splice(selectedEffectIndex.value + 1, 0, fx); editorState.selectedEffectId = fx.id; edit(); }

// Bypasses or enables every modifier as a group.
function toggleAllEffects() { snapshotUndo(); const on = !editorState.effects.some(e => e.on); editorState.effects.forEach(e => e.on = on); edit(); }
