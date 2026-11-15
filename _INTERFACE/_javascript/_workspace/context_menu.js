/**
 * Context-based commands for waves, modifiers and keyframes.
 *
 * Functions operate on the shared setup state. Unless otherwise noted,
 * edits are non-destructive and saved keyframes remain unchanged.
 */

// Handles focus object for the current editor context.
function focusObject(kind, id = null) {
    inspectorFocus.value = kind;
    if (kind === 'wave' || kind === 'relation') {
        if (id)
            editorState.selectedSourceId = id;
        editorState.tab = 'sources';
    }
    else if (kind === 'effect') {
        const fx = editorState.effects.find(e => e.id === id) || selectedEffect.value;
        if (fx) {
            editorState.selectedEffectId = fx.id;
            editorState.tab = effectInfo(fx.type).category;
        }
    }
    else if (kind === 'frame') {
        if (Number.isInteger(id))
            setPosition(id, true);
    }
    else if (kind === 'filter')
        selectTab('tablefx');
    Vue.nextTick(() => { const sel = kind === 'relation' ? '.relationship-inspector' : kind === 'wave' ? '.source-inspector' : kind === 'effect' ? '.effect-inspector' : kind === 'frame' ? '.frame-editor' : '.filter-inspector'; const el = document.querySelector(sel); if (el) {
        const aside = el.closest('.inspector');
        if (aside && aside.scrollHeight > aside.clientHeight)
            aside.scrollTo({ top: Math.max(0, el.offsetTop - aside.offsetTop - 55), behavior: 'smooth' });
        el.classList.add('inspector-highlight');
        setTimeout(() => el.classList.remove('inspector-highlight'), 750);
    } });
}

// Opens a right-click menu appropriate to the selected editor object.
function showContext(e, kind, id) { e.preventDefault(); e.stopPropagation(); hoverTip.value = { ...hoverTip.value, on: false }; const width = 198, height = 250; contextMenu.value = { kind, id, x: Math.min(e.clientX, window.innerWidth - width - 12), y: Math.min(e.clientY, window.innerHeight - height - 12) }; }

// Handles close context for the current editor context.
function closeContext() { contextMenu.value = null; }

// Copies selected wave, modifier, relation, or frame settings into the UI clipboard.
function copyItem(kind, id) {
    if (kind === 'wave') {
        const item = editorState.sources.find(x => x.id === id);
        if (!item)
            return;
        uiClipboard = { kind, data: clone(item) };
    }
    else if (kind === 'effect') {
        const item = editorState.effects.find(x => x.id === id);
        if (!item)
            return;
        uiClipboard = { kind, data: clone(item) };
    }
    else if (kind === 'frame') {
        const f = editorState.frames[id];
        if (!f)
            return;
        uiClipboard = { kind, data: { recipe: clone(f.recipe), wave: f.wave.slice(), quality: f.quality, lead: f.lead, transition: clone(f.transition) } };
    }
    clipboardLabel.value = kind + ' copied';
    say('Copied ' + kind + ' settings within this session.');
    closeContext();
}

// Applies clipboard settings to a compatible selected object.
async function pasteItem(kind, id) {
    if (!uiClipboard || uiClipboard.kind !== kind) {
        say('Copy a ' + kind + ' first.');
        closeContext();
        return;
    }
    if (kind === 'wave') {
        const p = editorState.sources.findIndex(x => x.id === id);
        if (p < 0)
            return;
        const w = clone(uiClipboard.data);
        w.id = editorState.sources[p].id;
        editorState.sources[p] = w;
        editorState.selectedSourceId = w.id;
        edit();
    }
    else if (kind === 'effect') {
        const p = editorState.effects.findIndex(x => x.id === id);
        if (p < 0)
            return;
        const fx = clone(uiClipboard.data);
        fx.id = editorState.effects[p].id;
        editorState.effects[p] = fx;
        editorState.selectedEffectId = fx.id;
        edit();
    }
    else if (kind === 'frame') {
        if (!editorState.ready || editorState.committing || editorState.finalBuilding)
            return;
        const d = uiClipboard.data, frame = markRaw({ recipe: clone(d.recipe), wave: d.wave.slice(), quality: d.quality, lead: d.lead, transition: clone(d.transition) });
        await rpc('setFrame', { position: id, ...frame });
        editorState.frames[id] = frame;
        invalidateFinal();
        tableChanged();
        updateOverview();
        scheduleHistory();
    }
    say('Pasted ' + kind + ' settings.');
    closeContext();
}

// Handles context action for the current editor context.
function contextAction(action) {
    const cm = contextMenu.value;
    if (!cm)
        return;
    closeContext();
    const { kind, id } = cm;
    if (action === 'select') {
        focusObject(kind, id);
        return;
    }
    if (action === 'copy') {
        copyItem(kind, id);
        return;
    }
    if (action === 'paste') {
        if (kind === 'frame' && editorState.frames[id]) {
            ask('Replace saved frame ' + (id + 1) + '?', 'Pasting will replace this committed waveform. Undo can restore it.', 'Replace frame', () => pasteItem(kind, id).catch(e => editorState.error = e.message));
        }
        else
            pasteItem(kind, id).catch(e => editorState.error = e.message);
        return;
    }
    if (kind === 'wave') {
        if (action === 'duplicate') {
            editorState.selectedSourceId = id;
            duplicateSource();
        }
        else if (action === 'remove')
            removeSource(id);
        else if (action === 'toggle') {
            const w = editorState.sources.find(x => x.id === id);
            if (w) {
                w.on = !w.on;
                edit();
            }
        }
        else if (action === 'reset') {
            const ix = editorState.sources.findIndex(x => x.id === id);
            if (ix >= 0) {
                const n = newSource();
                n.id = id;
                editorState.sources[ix] = n;
                edit();
            }
        }
    }
    else if (kind === 'effect') {
        const fx = editorState.effects.find(x => x.id === id);
        if (!fx)
            return;
        editorState.selectedEffectId = id;
        if (action === 'duplicate')
            duplicateEffect();
        else if (action === 'remove')
            removeEffect(id);
        else if (action === 'toggle') {
            fx.on = !fx.on;
            edit();
        }
    }
    else if (kind === 'frame') {
        editorState.position = id;
        if (action === 'load')
            loadKey();
        else if (action === 'remove')
            deleteKey();
        else if (action === 'preview')
            setPosition(id, true);
    }
}

const contextActions = computed(() => { const cm = contextMenu.value; if (!cm)
    return []; const k = cm.kind; return [{ id: 'select', label: k === 'frame' ? 'Preview keyframe' : 'Select / inspect' }, ...(k === 'frame' ? [{ id: 'load', label: 'Load frame to edit' }] : []), { id: 'copy', label: 'Copy settings' }, { id: 'paste', label: 'Paste settings', disabled: uiClipboard?.kind !== k }, ...(k !== 'frame' ? [{ id: 'duplicate', label: 'Duplicate' }, { id: 'toggle', label: 'Enable / bypass' }] : []), ...(k === 'wave' ? [{ id: 'reset', label: 'Initialize this wave' }] : []), { id: 'remove', label: 'Remove', danger: true }]; });
