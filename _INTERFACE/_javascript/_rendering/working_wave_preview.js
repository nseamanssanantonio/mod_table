/**
 * Coalesced rendering and displayed waveform measurements.
 *
 * Functions operate on the shared setup state. Unless otherwise noted,
 * edits are non-destructive and saved keyframes remain unchanged.
 */

// Schedules one preview render while coalescing rapid control changes.
function requestRender() { clearTimeout(renderTimer); renderTimer = setTimeout(renderNow, 24); }

// Submits the current composite to the renderer and ignores stale results.
async function renderNow() { if (!editorState.ready)
    return; if (inflight) {
    rerender = true;
    return;
} inflight = true; editorState.rendering = true; const rev = revision; try {
    const result = await rpc('render', { recipe: recipe(), quality: editorState.previewQuality });
    if (rev === revision) {
        draftResult = result;
        if (editorState.mode === 'draft')
            showResult(result);
    }
}
catch (e) {
    editorState.error = e.message;
}
finally {
    inflight = false;
    editorState.rendering = false;
    if (rerender) {
        rerender = false;
        renderNow();
    }
} }

// Updates peak, RMS, and other measurements from a rendered waveform.
function updateMetrics(w) { let peak = 0, power = 0; for (const v of w) {
    peak = Math.max(peak, Math.abs(v));
    power += v * v;
} editorState.peak = peak; editorState.rms = Math.sqrt(power / w.length); }

// Transfers a completed waveform render into the viewer and audition cache.
function showResult(r) { editorState.previewFinalCached = r.finalCached === true; if (r.mini && r.miniIds)
    miniWaves = new Map(r.miniIds.map((id, i) => [id, r.mini.subarray(i * 160, (i + 1) * 160)])); displayWave = r.wave; displayAudioWave = r.playbackWave || r.wave; displayRaw = r.raw || new Float32Array(N); displayCoeff = r.coeff; editorState.renderMs = r.elapsed ?? 0; editorState.displayQuality = r.quality ?? (currentKey.value?.quality || editorState.commitQuality); editorState.renderWarning = r.stats?.[3] > 0 ? 'A stateful stage reached its settling limit; inspect this waveform before final use.' : ''; updateMetrics(displayWave); refreshAudio(); }
