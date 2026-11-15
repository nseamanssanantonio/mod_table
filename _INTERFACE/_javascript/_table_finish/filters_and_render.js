/**
 * Final filter automation, render settings, Deep Scan and export controls.
 *
 * Functions operate on the shared setup state. Unless otherwise noted,
 * edits are non-destructive and saved keyframes remain unchanged.
 */

// Non-destructive table finishing; this configuration is not part of a wave recipe.
const selectedFilter = computed(() => editorState.finish.motion === 'static' ? editorState.finish.base : editorState.finish.nodes.find(x => x.position === editorState.selectedFilterPosition) || editorState.finish.nodes[0]);

const filterPointPositions = computed(() => editorState.finish.nodes.map(x => x.position));

const cutoffLog = computed(() => Math.log2(selectedFilter.value.cutoff));

const filterResponsePath = ref('');

let finishTimer = null, finishResponseToken = 0;

// Handles set cutoff log for the current editor context.
function setCutoffLog(v) { selectedFilter.value.cutoff = Math.pow(2, v); finishChanged(); }

// Handles table request for the current editor context.
function tableRequest() { return { method: editorState.morph, curve: editorState.curve, curveSettings: clone(editorState.curveSettings), transition: clone(editorState.transition), sampleSize: editorState.samplesPerFrame, count: editorState.renderFrames, finish: clone(editorState.finish), renderOptions: clone(editorState.renderOptions) }; }

// Handles invalidate final for the current editor context.
function invalidateFinal() { editorState.renderReport = null; editorState.previewFinalCached = false; if (editorState.finalBuilding)
    rpc('cancelRender').catch(() => { }); }

// Handles select tab for the current editor context.
function selectTab(t) { editorState.tab = t; if (t === 'tablefx') {
    if (keyCount.value) {
        setMode('table');
        setView('table');
    }
    updateFilterResponse();
} }

// Invalidates the cached final render after a filter or render-setting change.
function finishChanged() { invalidateFinal(); cancelSweep(); scheduleHistory(); editorState.renderFrames = clamp(Math.round(Number(editorState.renderFrames) || 256), 2, 256); clearTimeout(finishTimer); finishTimer = setTimeout(() => { if (editorState.mode === 'table')
    updateTable(); updateOverview(); updateFilterResponse(); }, 90); }

// Draws the selected final filter frequency response.
async function updateFilterResponse() { if (!editorState.ready)
    return; const token = ++finishResponseToken; try {
    const r = await rpc('filterResponse', { finish: clone(editorState.finish), position: editorState.selectedFilterPosition });
    if (token !== finishResponseToken)
        return;
    let d = '';
    for (let i = 0; i < 128; i++) {
        const x = 8 + i / 127 * 244, y = 50 - clamp(r.points[2 * i + 1], -48, 36) * .85;
        d += (i ? 'L' : 'M') + x.toFixed(2) + ' ' + y.toFixed(2);
    }
    filterResponsePath.value = d;
}
catch (e) {
    editorState.error = e.message;
} }

// Adds a filter automation point at the current table position.
function addFilterPoint() {
    if (editorState.finish.nodes.length >= 256)
        return;
    let p = Math.round(editorState.mode === 'table' ? editorState.previewPosition : editorState.position);
    if (editorState.finish.nodes.some(x => x.position === p)) {
        p = Array.from({ length: 256 }, (_, i) => i).filter(i => !editorState.finish.nodes.some(x => x.position === i)).sort((a, b) => Math.abs(a - p) - Math.abs(b - p))[0];
    }
    const point = { ...mtFilterAt(p, editorState.finish), position: p };
    editorState.finish.nodes.push(point);
    editorState.finish.nodes.sort((a, b) => a.position - b.position);
    editorState.selectedFilterPosition = p;
    editorState.finish.motion = 'evolving';
    finishChanged();
}

// Handles remove filter point for the current editor context.
function removeFilterPoint() { if (editorState.finish.nodes.length < 2)
    return; editorState.finish.nodes = editorState.finish.nodes.filter(x => x.position !== editorState.selectedFilterPosition); editorState.selectedFilterPosition = editorState.finish.nodes[0].position; finishChanged(); }

// Moves a filter automation point without creating duplicate positions.
function setFilterNodePosition(v) { const p = clamp(Math.round(Number(v)), 0, 255), old = editorState.finish.nodes.find(x => x.position === editorState.selectedFilterPosition); if (!old || !Number.isFinite(p))
    return; if (editorState.finish.nodes.some(x => x !== old && x.position === p)) {
    say('That filter automation position is already occupied.');
    return;
} old.position = p; editorState.selectedFilterPosition = p; editorState.finish.nodes.sort((a, b) => a.position - b.position); finishChanged(); }

// Handles filter pointer down for the current editor context.
function filterPointerDown(e, p) { editorState.selectedFilterPosition = p; editorState.filterDrag = { original: p, to: p }; e.currentTarget.parentElement.setPointerCapture(e.pointerId); updateFilterResponse(); }

// Handles filter pointer move for the current editor context.
function filterPointerMove(e) { if (!editorState.filterDrag)
    return; const r = e.currentTarget.getBoundingClientRect(); editorState.filterDrag.to = clamp(Math.round((e.clientX - r.left) / r.width * 255), 0, 255); }

// Handles filter pointer up for the current editor context.
function filterPointerUp() { if (!editorState.filterDrag)
    return; const p = editorState.filterDrag.to; editorState.filterDrag = null; setFilterNodePosition(p); }

// Resets final table finishing without modifying saved source keyframes.
function resetFinal() { editorState.finish = mtFinishDefaults(); editorState.selectedFilterPosition = 0; finishChanged(); say('Final filter reset. Source waves and keyframes preserved.'); }

// Renders every frame, applies table finishing, and prepares downloadable output.
async function buildFinal(download = false) {
    if (!keyCount.value || editorState.finalBuilding || editorState.committing)
        return;
    stopAudio();
    editorState.finalBuilding = true;
    editorState.exporting = download;
    editorState.renderProgress = editorState.exportProgress = 0;
    editorState.renderStage = 'Preparing source recipes…';
    editorState.error = '';
    const request = tableRequest(), sig = JSON.stringify(request);
    try {
        const r = await rpc(download ? 'export' : 'renderFinal', request);
        if (sig !== JSON.stringify(tableRequest())) {
            say('Settings changed during rendering. Render the current settings again.');
            return;
        }
        editorState.renderReport = markRaw(r.report);
        editorState.mode = 'table';
        editorState.previewPosition = editorState.position;
        await updateTable();
        await updateOverview();
        if (download) {
            downloadWave(r.wave, request.count, request.sampleSize);
            say('Exported ' + request.count + ' frames × ' + request.sampleSize + ' samples. Whole-table peak normalized to 0 dBFS' + (r.report.exportPeakNormalized ? '.' : ' (silent table).'));
        }
        else
            say('Finished table ready to preview. ' + r.report.maximumOversampling + '× maximum · ' + r.report.unconverged + ' scans at the quality ceiling.');
    }
    catch (e) {
        if (/cancelled/.test(e.message))
            say(e.message);
        else {
            editorState.error = e.message;
            say('Render did not complete. Source keyframes are unchanged.');
        }
    }
    finally {
        editorState.finalBuilding = false;
        editorState.exporting = false;
    }
}

// Downloads a rendered table as a floating-point WAV file.
function downloadWave(w, count, size) { download(wavBuffer(w), 'Mod_Table_' + count + 'frames_' + size + 'samples_float32.wav', 'audio/wav'); }

// Handles cancel final for the current editor context.
async function cancelFinal() { await rpc('cancelRender'); say('Stopping after the current render pass…'); }

// Handles download report for the current editor context.
function downloadReport() { if (editorState.renderReport)
    download(JSON.stringify(editorState.renderReport, null, 2), 'Mod_Table_Render_Report.json', 'application/json'); }
