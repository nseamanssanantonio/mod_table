/**
 * Project persistence, migrations and floating-point WAV serialization.
 *
 * Functions operate on the shared setup state. Unless otherwise noted,
 * edits are non-destructive and saved keyframes remain unchanged.
 */

// Handles download for the current editor context.
function download(data, name, type) { const u = URL.createObjectURL(new Blob([data], { type })); const a = document.createElement('a'); a.href = u; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(u), 10000); }

// Serializes the editable project with schema and saved keyframes.
function projectData() { return { format: FORMAT, version: VERSION, samplesPerFrame: N, frameCount: 256, draft: recipe(), keyframes: keyPositions.value.map(position => ({ position, recipe: clone(editorState.frames[position].recipe), quality: editorState.frames[position].quality, lead: editorState.frames[position].lead ?? .5, transition: clone(editorState.frames[position].transition), samples: Array.from(editorState.frames[position].wave) })), settings: { finish: clone(editorState.finish), renderOptions: clone(editorState.renderOptions), samplesPerFrame: editorState.samplesPerFrame, curveSettings: clone(editorState.curveSettings), position: editorState.position, renderFrames: editorState.renderFrames, sweepSeconds: editorState.sweepSeconds, morph: editorState.morph, curve: editorState.curve, transition: clone(editorState.transition), previewQuality: editorState.previewQuality, commitQuality: editorState.commitQuality, previewHz: editorState.previewHz, volume: editorState.volume } }; }

// Handles save project for the current editor context.
function saveProject() { download(JSON.stringify(projectData()), 'Mod_Table_Project.json', 'application/json'); say('Project saved with rendered frames and editable recipes.'); }

// Handles number for the current editor context.
function number(v, min, max, fallback) { if (v === undefined)
    return fallback; if (typeof v !== 'number' || !Number.isFinite(v))
    throw Error('Project contains an invalid numeric value.'); return clamp(v, min, max); }

// Checks loaded source and effect data before use.
function validateRecipe(r) {
    if (!r || !Array.isArray(r.sources) || r.sources.length > 64 || !Array.isArray(r.effects) || r.effects.length > 16)
        throw Error('Invalid recipe: maximum 64 sources and 16 effects.');
    const sources = r.sources.map(w => {
        if (!waveTypes.some(t => t.id === w.type))
            throw Error('Unknown waveform type.');
        const freeMode = w.freeMode === true;
        const rel = w.relation || {};
        if (rel.type !== undefined && !MT_RELATIONS.some(x => x.id === rel.type))
            throw Error('Unknown wave relation.');
        return { id: 'w' + uid++, type: w.type, detail: Math.round(number(w.detail, 2, 32, 8)), character: number(w.character, 0, 100, 50), seed: Math.round(number(w.seed, 0, 1000000, 1)), relation: { type: rel.type || 'add', target: rel.target === 'previous' ? 'previous' : 'stack', depth: number(rel.depth, 0, 100, 50), mix: number(rel.mix, 0, 100, 100), split: number(rel.split, 1, 99, 50), start: number(rel.start, 0, 99.5, 0), end: number(rel.end, .5, 100, 100), fade: number(rel.fade, 0, 50, 0), bits: Math.round(number(rel.bits, 4, 24, 12)), complexity: Math.round(number(rel.complexity, 1, 16, 4)), seed: Math.round(number(rel.seed, 0, 1000000, 1)), polarity: rel.polarity === -1 ? -1 : 1, on: rel.on !== false }, on: w.on !== false, influence: number(w.influence, 0, 100, 100), interval: freeMode ? number(w.interval, .125, 64, 1) : Math.round(number(w.interval, .25, 64, 1) * 4) / 4,
            variant: variantsFor(w.type).some(v => v.id === canonicalVariant(w.type, w.variant)) ? canonicalVariant(w.type, w.variant) : variantsFor(w.type)[0].id, size: number(w.size, 5, 95, 50), phase: number(w.phase, 0, 360, 0), polarity: w.polarity === -1 ? -1 : 1, freeMode,
            regionStart: number(w.regionStart, 0, 99.5, 0), regionEnd: number(w.regionEnd, .5, 100, 100), fadeIn: number(w.fadeIn, 0, 50, 0), fadeOut: number(w.fadeOut, 0, 50, 0),
            smooth: number(w.smooth, 0, 100, 0), resonance: number(w.resonance, 0, 100, 0), rough: number(w.rough, 0, 100, 0), crushed: number(w.crushed, 0, 100, 0) };
    });
    for (const w of sources) {
        if (w.regionStart >= w.regionEnd)
            throw Error('A wave region ends before it starts.');
        if (w.relation.start >= w.relation.end)
            throw Error('A relation region ends before it starts.');
    }
    const effects = r.effects.map(e => { if (!validFX.has(e.type))
        throw Error('Unsupported effect ID.'); return { id: 'e' + uid++, type: e.type, on: e.on !== false, shape: number(e.shape, 0, 100, 40), mix: number(e.mix, 0, 100, 100) }; });
    return { sources, effects, output: { mixMode: r.output?.mixMode === 'raw' ? 'raw' : 'weighted', removeDC: r.output?.removeDC !== false, normalize: r.output?.normalize === true } };
}

// Loads and migrates a validated project without partially changing existing data.
async function importProject(p) {
    if (editorState.committing || editorState.finalBuilding)
        throw Error('Finish or cancel the current render before opening a project.');
    const legacy = p?.format === 'mod-table-composite-keyframes';
    if (!legacy && (p?.format !== FORMAT || ![4, 5, 6, 7, 8].includes(p.version) || p.samplesPerFrame !== N || p.frameCount !== 256))
        throw Error('This file is not a supported Mod Table project.');
    const draft = validateRecipe(legacy ? { sources: p.draft, effects: [], output: p.settings } : p.draft);
    if (!Array.isArray(p.keyframes) || p.keyframes.length > 256)
        throw Error('Invalid keyframe list.');
    const next = Array(256).fill(null);
    // Validate everything before touching the current session or the worker bank.
    for (const k of p.keyframes) {
        if (!Number.isInteger(k.position) || k.position < 0 || k.position > 255 || next[k.position])
            throw Error('Invalid or duplicate keyframe position.');
        const r = validateRecipe(legacy ? { sources: k.layers, effects: [], output: k.settings } : k.recipe);
        let wave = null, quality = legacy ? 8 : k.quality;
        if (![2, 4, 8, 16].includes(quality))
            throw Error('Invalid stored render quality.');
        if (!legacy) {
            if (!Array.isArray(k.samples) || k.samples.length !== N || k.samples.some(v => typeof v !== 'number' || !Number.isFinite(v) || Math.abs(v) > 64))
                throw Error('Invalid rendered waveform data.');
            wave = Float32Array.from(k.samples);
        }
        next[k.position] = markRaw({ recipe: r, wave, quality, lead: number(k.lead, .05, .95, .5), transition: validateTransition(k.transition, true) });
    }
    const settings = p.settings || {};
    const checkedFinish = mtValidateFinish(settings.finish), checkedCurve = mtValidateCurves(settings.curveSettings), checkedRender = { ...mtRenderDefaults(), ...settings.renderOptions };
    if (!['standard', 'deep'].includes(checkedRender.mode) || ![2, 4, 8, 16].includes(checkedRender.quality) || ![16, 32, 64].includes(checkedRender.maxQuality) || typeof checkedRender.tolerance !== 'number' || !Number.isFinite(checkedRender.tolerance) || checkedRender.tolerance < -100 || checkedRender.tolerance > -36)
        throw Error('Invalid final rendering settings.');
    if (settings.samplesPerFrame !== undefined && !MT_FRAME_SIZES.includes(settings.samplesPerFrame))
        throw Error('Invalid samples per frame.');
    const checkedSweep = number(settings.sweepSeconds, 2, 30, 6);
    const checked = { position: Math.round(number(settings.position, 0, 255, 0)), previewHz: number(settings.previewHz, 30, 1000, 110), volume: number(settings.volume, 0, 100, 50), transition: validateTransition(settings.transition) };
    if (legacy) {
        say('Updating an older project to the current waveform format…');
        for (const k of next)
            if (k) {
                const r = await rpc('render', { recipe: k.recipe, quality: 8 });
                if (r.stats[3] > 0)
                    throw Error('Legacy frame did not settle.');
                k.wave = r.wave;
            }
    }
    await rpc('setFrames', { frames: next.flatMap((k, position) => k ? [{ position, wave: k.wave, recipe: k.recipe, quality: k.quality, lead: k.lead, transition: k.transition }] : []) });
    editorState.finish = checkedFinish;
    editorState.curveSettings = checkedCurve;
    editorState.renderOptions = checkedRender;
    editorState.samplesPerFrame = settings.samplesPerFrame || 2048;
    editorState.selectedFilterPosition = editorState.finish.nodes[0].position;
    invalidateFinal();
    editorState.frames = next;
    restoreRecipe(draft);
    editorState.undoDraft = null;
    editorState.position = checked.position;
    editorState.previewPosition = editorState.position;
    editorState.renderFrames = Number.isInteger(settings.renderFrames) && settings.renderFrames >= 2 && settings.renderFrames <= 256 ? settings.renderFrames : 256;
    editorState.sweepSeconds = checkedSweep;
    cancelSweep();
    editorState.morph = MT_TRANSITIONS.some(t => t.id === p.settings?.morph) ? p.settings.morph : 'time';
    editorState.transition = checked.transition;
    editorState.curve = MT_CURVES.some(c => c.id === p.settings?.curve) ? p.settings.curve : 'smooth';
    editorState.previewQuality = [2, 4, 8, 16].includes(p.settings?.previewQuality) ? p.settings.previewQuality : 4;
    editorState.commitQuality = [2, 4, 8, 16].includes(p.settings?.commitQuality) ? p.settings.commitQuality : 8;
    editorState.previewHz = checked.previewHz;
    editorState.volume = checked.volume;
    setVolume();
    editorState.tab = 'sources';
    editorState.dirty = true;
    editorState.error = '';
    resetHistoryAfterLoad();
    requestRender();
    updateOverview();
    say('Project opened: ' + keyCount.value + ' committed frames' + (legacy ? ' · migrated from v0.3.' : '.'));
}

// Handles open file for the current editor context.
function openFile() { if (editorState.committing)
    return; fileInput.value?.click(); }

// Handles file selected for the current editor context.
async function fileSelected(event) { const f = event.target.files?.[0]; if (!f)
    return; try {
    if (f.size > 40 * 1024 * 1024)
        throw Error('Project exceeds the 40 MB limit.');
    await importProject(JSON.parse(await f.text()));
}
catch (e) {
    editorState.error = 'Could not open project: ' + e.message;
}
finally {
    event.target.value = '';
} }

// Encodes floating-point samples into a WAV file with standard chunk headers.
function wavBuffer(samples) { const buffer = new ArrayBuffer(56 + samples.byteLength), v = new DataView(buffer), tag = (off, str) => [...str].forEach((c, i) => v.setUint8(off + i, c.charCodeAt(0))); tag(0, 'RIFF'); v.setUint32(4, buffer.byteLength - 8, true); tag(8, 'WAVE'); tag(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 3, true); v.setUint16(22, 1, true); v.setUint32(24, 44100, true); v.setUint32(28, 176400, true); v.setUint16(32, 4, true); v.setUint16(34, 32, true); tag(36, 'fact'); v.setUint32(40, 4, true); v.setUint32(44, samples.length, true); tag(48, 'data'); v.setUint32(52, samples.byteLength, true); for (let i = 0; i < samples.length; i++)
    v.setFloat32(56 + i * 4, samples[i], true); return buffer; }

// Exports the current table using the configured final rendering pipeline.
async function exportTable() { return buildFinal(true); }
