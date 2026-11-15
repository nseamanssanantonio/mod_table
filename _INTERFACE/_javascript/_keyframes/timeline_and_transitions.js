/**
 * Exclusive sweep control and draggable keyframe or transition handles.
 *
 * Functions operate on the shared setup state. Unless otherwise noted,
 * edits are non-destructive and saved keyframes remain unchanged.
 */

// Handles preview settings changed for the current editor context.
function previewSettingsChanged() { if (editorState.sweeping)
    sweepStarted = performance.now() - editorState.previewPosition / 255 * editorState.sweepSeconds * 1000; }

// Handles key marker pos for the current editor context.
function keyMarkerPos(p) { return editorState.frameDrag?.from === p ? editorState.frameDrag.to : p; }

const blendSegments = computed(() => keyPositions.value.slice(0, -1).map((from, i) => { const to = keyPositions.value[i + 1], lead = editorState.frames[from]?.lead ?? .5; return { from, to, lead, x: from + (to - from) * lead, span: to - from }; }));

// Starts repositioning a committed keyframe on the timeline.
function beginKeyDrag(e, p) { if (editorState.committing || e.button !== 0)
    return; pointDrag = { kind: 'key', from: p, to: p }; editorState.frameDrag = { from: p, to: p }; e.currentTarget.parentElement.setPointerCapture(e.pointerId); }

// Starts moving a transition-bias diamond between saved keyframes.
function beginBlendDrag(e, seg) { if (e.button !== 0)
    return; pointDrag = { kind: 'blend', from: seg.from, to: seg.to }; editorState.blendDrag = { from: seg.from, to: seg.to, lead: seg.lead }; e.currentTarget.parentElement.setPointerCapture(e.pointerId); }

// Handles position from pointer for the current editor context.
function positionFromPointer(e) { const r = e.currentTarget.getBoundingClientRect(); return clamp((e.clientX - r.left) / r.width * 255, 0, 255); }

// Finishes a timeline drag and commits its new position to the history.
async function finishPointDrag() {
    const d = pointDrag;
    pointDrag = null;
    if (!d)
        return;
    if (d.kind === 'key') {
        const to = editorState.frameDrag?.to ?? d.from;
        editorState.frameDrag = null;
        if (to === d.from) {
            setPosition(to, true);
            return;
        }
        if (editorState.frames[to]) {
            editorState.error = 'Frame ' + (to + 1) + ' is occupied. Move it to an empty position.';
            return;
        }
        try {
            await rpc('moveFrame', { from: d.from, to });
            editorState.frames[to] = editorState.frames[d.from];
            editorState.frames[d.from] = null;
            historyPush();
            editorState.position = to;
            editorState.previewPosition = to;
            updateOverview();
            tableChanged();
            say('Moved keyframe to ' + (to + 1) + '. Interpolated intervals updated.');
        }
        catch (e) {
            editorState.error = e.message;
        }
    }
    else {
        const lead = editorState.blendDrag?.lead ?? .5;
        editorState.blendDrag = null;
        try {
            await rpc('setLead', { position: d.from, lead });
            editorState.frames[d.from] = markRaw({ ...editorState.frames[d.from], lead });
            tableChanged();
            say('Transition bias updated.');
        }
        catch (e) {
            editorState.error = e.message;
        }
    }
}

// Changes the morph midpoint bias for the selected outgoing segment.
function setSelectedLead(v) { const p = editorState.position; if (!editorState.frames[p])
    return; const lead = clamp(Number(v), .05, .95); editorState.frames[p] = markRaw({ ...editorState.frames[p], lead }); rpc('setLead', { position: p, lead }).then(() => tableChanged()).catch(e => editorState.error = e.message); }

// Normalizes transition settings before storing or rendering them.
function validateTransition(value, nullable = false) {
    if (!value)
        return nullable ? null : defaultTransition();
    if (value.mode !== undefined && !MT_TRANSITIONS.some(t => t.id === value.mode))
        throw Error('Unknown transition method.');
    return { ...(value.mode ? { mode: value.mode } : {}), amount: number(value.amount, 0, 100, 60), detail: Math.round(number(value.detail, 1, 16, 4)), seed: Math.round(number(value.seed, 0, 1000000, 1)) };
}

// Handles set frame transition for the current editor context.
function setFrameTransition(mode) {
    if (!currentKey.value)
        return;
    const p = editorState.position;
    const transition = mode === 'global' ? null : { ...editorState.transition, mode };
    rpc('setTransition', { position: p, transition }).then(() => { editorState.frames[p] = markRaw({ ...editorState.frames[p], transition }); tableChanged(); }).catch(e => editorState.error = e.message);
}

// Handles update frame transition for the current editor context.
function updateFrameTransition(field, value) {
    if (!currentKey.value?.transition)
        return;
    const p = editorState.position, transition = validateTransition({ ...currentKey.value.transition, [field]: value });
    rpc('setTransition', { position: p, transition }).then(() => { editorState.frames[p] = markRaw({ ...editorState.frames[p], transition }); tableChanged(); }).catch(e => editorState.error = e.message);
}

// Handles table changed for the current editor context.
function tableChanged() { invalidateFinal(); if (editorState.mode === 'table')
    updateTable(); updateOverview(); scheduleHistory(); }
