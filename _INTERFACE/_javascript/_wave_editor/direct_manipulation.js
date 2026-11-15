/**
 * Shift-drag precision and waveform-viewer handles.
 *
 * Functions operate on the shared setup state. Unless otherwise noted,
 * edits are non-destructive and saved keyframes remain unchanged.
 */

// Handles fine start for the current editor context.
function fineStart(e, change, min, max, step, current) {
    if (!e.shiftKey)
        return;
    e.preventDefault();
    e.stopPropagation();
    const el = e.currentTarget, startX = e.clientX, start = current;
    el.setPointerCapture(e.pointerId);
    const move = ev => { if (!Number.isFinite(startX))
        return; const v = clamp(start + (ev.clientX - startX) * (max - min) / 2400, min, max); const q = step > 0 ? Math.round(v / step) * step : v; change(q); };
    const end = () => { el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', end); el.removeEventListener('pointercancel', end); historyEndDrag(); };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
}

const directEdit = ref(false), directDrag = ref(null);

// Handles direct control x for the current editor context.
function directControlX(e) { const rect = e.currentTarget.getBoundingClientRect(); return clamp((e.clientX - rect.left) / rect.width * 100, 0, 100); }

// Starts a direct waveform control drag in the preview canvas.
function directDown(e, field) { if (!selectedSource.value || e.button !== 0)
    return; e.preventDefault(); e.stopPropagation(); directDrag.value = { field, startX: e.clientX, startY: e.clientY, startValue: field === 'influence' ? selectedSource.value.influence : field === 'start' ? selectedSource.value.regionStart : field === 'end' ? selectedSource.value.regionEnd : selectedSource.value.phase }; e.currentTarget.setPointerCapture(e.pointerId); historyDragging = true; }

// Updates the selected waveform parameter from direct mouse movement.
function directMove(e) {
    if (!directDrag.value || !selectedSource.value)
        return;
    const d = directDrag.value, w = selectedSource.value, rect = e.currentTarget.getBoundingClientRect();
    const factor = e.shiftKey ? .15 : 1;
    const delta = (e.clientX - d.startX) / Math.max(30, rect.width) * 100 * factor;
    if (d.field === 'start')
        setRegion('start', Math.round(clamp(d.startValue + delta, 0, w.regionEnd - .5) * 2) / 2);
    else if (d.field === 'end')
        setRegion('end', Math.round(clamp(d.startValue + delta, w.regionStart + .5, 100) * 2) / 2);
    else if (d.field === 'phase') {
        w.phase = clamp(d.startValue + delta * 3.6, 0, 360);
        edit();
    }
    else if (d.field === 'influence') {
        w.influence = clamp(d.startValue - (e.clientY - d.startY) / (rect.height || 200) * 100 * factor, 0, 100);
        edit();
    }
}

// Finishes the canvas drag and creates one history entry.
function directUp() { if (!directDrag.value)
    return; directDrag.value = null; historyEndDrag(); }

// Returns a directly manipulated waveform parameter to its default.
function directReset() { directEdit.value = false; directDrag.value = null; }
