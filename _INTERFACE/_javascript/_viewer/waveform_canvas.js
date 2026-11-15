/**
 * Composite waveform previews, miniature waveforms and canvas drawing.
 *
 * Functions operate on the shared setup state. Unless otherwise noted,
 * edits are non-destructive and saved keyframes remain unchanged.
 */

// Handles simple wave for the current editor context.
function simpleWave(w, p) {
    const cached = miniWaves.get(w.id);
    if (cached) {
        const q = ((p % 1 + 1) % 1) * 160, j = Math.floor(q), t = q - j;
        return (cached[j] + (cached[(j + 1) % 160] - cached[j]) * t) / (w.influence > 0 ? w.influence / 100 : 1);
    }
    const ratio = w.interval, phase = w.phase / 360, size = w.size / 100;
    const core = x => {
        const a = ((x * ratio + phase) % 1 + 1) % 1, q = a < size ? a / (2 * size) : .5 + (a - size) / (2 * (1 - size));
        const tri = q < .25 ? 4 * q : q < .75 ? 2 - 4 * q : 4 * q - 4;
        return w.type === 'sine' ? Math.sin(2 * Math.PI * q) : w.type === 'saw' ? 2 * q - 1 : w.type === 'square' ? (a < size ? 1 : -1) : w.type === 'triangle' ? tri : clamp(tri * (1 + (1 - size) / .24), -1, 1);
    };
    const start = (w.regionStart ?? 0) / 100, end = (w.regionEnd ?? 100) / 100;
    if (p < start || p >= end)
        return 0;
    let v = core(p);
    if (Math.abs(ratio - Math.round(ratio)) > 1e-7 && p > .92) {
        let t = clamp((p - .92) / .08, 0, 1);
        t = t * t * (3 - 2 * t);
        v = v * (1 - t) + core(p - 1) * t;
    }
    const sm = (w.smooth ?? 0) / 100;
    if (sm) {
        const d = .0003 + .014 * sm;
        v = v * (1 - sm) + (core(p - d) + 2 * v + core(p + d)) * .25 * sm;
    }
    const res = (w.resonance ?? 0) / 100;
    if (res)
        v += .5 * res * Math.sin(2 * Math.PI * ((Math.floor(Math.abs(ratio) * 2 + .5) + 3) * p + phase));
    const rough = (w.rough ?? 0) / 100;
    if (rough)
        v = v * (1 - rough) + Math.sin(v * Math.PI * .5 * (1 + 4 * rough)) * rough;
    const crush = (w.crushed ?? 0) / 100;
    if (crush) {
        const levels = Math.round(2 + 253 * (1 - crush) * (1 - crush));
        v = v * (1 - crush) + Math.round(v * levels) / levels * crush;
    }
    const len = end - start, fadeIn = Math.min((w.fadeIn ?? 0) / 100, .5) * len, fadeOut = Math.min((w.fadeOut ?? 0) / 100, .5) * len;
    let gain = 1;
    if (fadeIn > 0 && p < start + fadeIn) {
        let t = clamp((p - start) / fadeIn, 0, 1);
        gain = Math.min(gain, t * t * (3 - 2 * t));
    }
    if (fadeOut > 0 && p > end - fadeOut) {
        let t = clamp((end - p) / fadeOut, 0, 1);
        gain = Math.min(gain, t * t * (3 - 2 * t));
    }
    return gain * v * w.polarity;
}

// Handles mini path for the current editor context.
function miniPath(w) { let p = ''; for (let i = 0; i < 160; i++)
    p += (i ? 'L' : 'M') + (i / 159 * 240).toFixed(1) + ' ' + (23 - simpleWave(w, i / 159) * 16).toFixed(1); return p; }

// Handles plot for the current editor context.
function plot(ctx, w, width, height, color, line = 2, alpha = 1, ox = 0, oy = 0, scale = 1) { ctx.save(); ctx.globalAlpha = alpha; ctx.strokeStyle = color; ctx.lineWidth = line; ctx.beginPath(); const max = Math.max(1.05, editorState.peak * 1.05); for (let i = 0; i < w.length; i += 2) {
    const x = 20 + (width - 40) * i / (w.length - 1) + ox, y = height / 2 + oy - w[i] / max * (height - 48) * .43 * scale;
    if (i === 0)
        ctx.moveTo(x, y);
    else
        ctx.lineTo(x, y);
} ctx.stroke(); ctx.restore(); }

// Handles draw for the current editor context.
function draw(time) {
    if (editorState.sweeping && keyCount.value && editorState.mode === 'table') {
        editorState.previewPosition = ((time - sweepStarted) / (editorState.sweepSeconds * 1000) * 255) % 255;
        if (time - lastSweepUpdate > 50) {
            lastSweepUpdate = time;
            updateTable();
        }
    }
    const canvas = document.getElementById('waveCanvas');
    if (canvas) {
        const r = canvas.getBoundingClientRect(), w = r.width, h = r.height, dpr = Math.min(devicePixelRatio || 1, 2);
        const key = w + ',' + h + ',' + dpr;
        if (key !== previousCanvasSize) {
            canvas.width = Math.round(w * dpr);
            canvas.height = Math.round(h * dpr);
            previousCanvasSize = key;
        }
        const c = canvas.getContext('2d');
        c.setTransform(dpr, 0, 0, dpr, 0, 0);
        c.clearRect(0, 0, w, h);
        c.strokeStyle = '#2d4957';
        c.lineWidth = .7;
        for (let x = 0; x <= 10; x++) {
            c.beginPath();
            c.moveTo(20 + (w - 40) * x / 10, 24);
            c.lineTo(20 + (w - 40) * x / 10, h - 23);
            c.stroke();
        }
        for (let y = 0; y <= 6; y++) {
            c.beginPath();
            c.moveTo(20, 24 + (h - 47) * y / 6);
            c.lineTo(w - 20, 24 + (h - 47) * y / 6);
            c.stroke();
        }
        if (editorState.view === 'spectrum') {
            let max = .1;
            for (let k = 1; k <= 128; k++)
                max = Math.max(max, Math.hypot(displayCoeff[k], displayCoeff[N + k]));
            for (let k = 1; k <= 128; k++) {
                const amp = Math.hypot(displayCoeff[k], displayCoeff[N + k]), height = amp / max * (h - 60);
                c.fillStyle = k < 17 ? '#78e0d4' : '#638faa';
                c.fillRect(20 + (k - 1) / 128 * (w - 40), h - 28 - height, Math.max(1, (w - 40) / 128 * .65), height);
            }
        }
        else if (editorState.view === 'table' && overview) {
            for (let i = 17; i >= 0; i--) {
                const y = (i - 8.5) * Math.min(7, Math.max(1, (h - 80) / 26)), x = (i - 8.5) * 3;
                plot(c, overview.subarray(i * N, (i + 1) * N), w - 80, h, i === Math.round(editorState.previewPosition / 255 * 17) ? '#e6c18c' : '#78cfc7', 1.2, .35 + i * .025, 40 + x, y, .45);
            }
        }
        else {
            if (compareReady.value && compareOverlay.value && compareBuffer && editorState.view === 'wave') {
                plot(c, compareBuffer, w, h, '#f0ae79', 1.65, .85);
            }
            if (editorState.mode === 'draft') {
                if (editorState.view === 'layers') {
                    editorState.sources.forEach((source, i) => { if (!source.on || (editorState.sources.length > 24 && i % Math.ceil(editorState.sources.length / 24) !== 0 && source.id !== editorState.selectedSourceId))
                        return; const a = new Float32Array(512); for (let j = 0; j < 512; j++)
                        a[j] = simpleWave(source, j / 512) * source.influence / 100; plot(c, a, w, h, sourceColor(i), 1, .4); });
                }
                else
                    plot(c, displayRaw, w, h, '#beaaf0', 1, .45);
                if (currentKey.value)
                    plot(c, currentKey.value.wave, w, h, '#e6c18c', 1, .55);
            }
            plot(c, displayWave, w, h, '#83eee1', 2.3, .98);
        }
        // A subtle refresh-rate-driven activity trace; no timer-driven UI rebuilds.
        const x = 20 + ((time * .00008) % 1) * (w - 40);
        c.fillStyle = editorState.playing ? '#93f5e522' : '#93f5e508';
        c.fillRect(x, 25, 1, h - 50);
    }
    anim = requestAnimationFrame(draw);
}

onMounted(async () => { document.getElementById('boot')?.remove(); initUILibrary(); try {
    const code = new Blob([MOD_TABLE_WORKER], { type: 'application/javascript' });
    workerURL = URL.createObjectURL(code);
    worker = new Worker(workerURL);
    worker.onmessage = ({ data: d }) => { if (d.progress !== undefined) {
        editorState.exportProgress = editorState.renderProgress = Math.round(d.progress * 100);
        editorState.renderStage = d.stage || '';
        return;
    } const p = pending.get(d.id); if (!p)
        return; clearTimeout(p.timer); pending.delete(d.id); d.error ? p.reject(Error(d.error)) : p.resolve(d.result); };
    worker.onerror = e => { editorState.error = 'Waveform processing error: ' + e.message; pending.forEach(p => { clearTimeout(p.timer); p.reject(Error(editorState.error)); }); pending.clear(); };
    const bytes = Uint8Array.from(atob(MOD_TABLE_WASM), c => c.charCodeAt(0));
    await rpc('init', { bytes: bytes.buffer }, [bytes.buffer]);
    editorState.ready = true;
    say('Ready. Build a wave, stack effects, then commit a frame.');
    historyInit();
    renderNow();
}
catch (e) {
    editorState.error = 'Could not start waveform processing: ' + e.message + ' Try opening the app in Chrome or Edge.';
} anim = requestAnimationFrame(draw); });

window.addEventListener('keydown', e => {
    const key = e.key.toLowerCase(), mod = e.ctrlKey || e.metaKey;
    if (e.key === 'Escape') {
        if (contextMenu.value || pickerOpen.value || presetsOpen.value || exportOpen.value || helpOpen.value) {
            e.preventDefault();
            closeContext();
            pickerOpen.value = false;
            presetsOpen.value = false;
            exportOpen.value = false;
            closeHelp();
            return;
        }
        if (tipsEnabled.value) {
            toggleTips();
            return;
        }
    }
    if (helpOpen.value || pickerOpen.value || presetsOpen.value || exportOpen.value)
        return;
    const typing = e.target.isContentEditable || (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName) && !['range', 'checkbox', 'radio'].includes(e.target.type));
    if (mod && key === 's') {
        e.preventDefault();
        saveProject();
        return;
    }
    if (mod && e.key === 'Enter') {
        e.preventDefault();
        commit();
        return;
    }
    if (mod && key === 'z' && !typing) {
        e.preventDefault();
        goHistory(e.shiftKey ? 1 : -1);
        return;
    }
    if (mod && key === 'y' && !typing) {
        e.preventDefault();
        goHistory(1);
        return;
    }
    if (mod && key === 'd' && !typing) {
        e.preventDefault();
        if (editorState.tab === 'sources')
            duplicateSource();
        else if (selectedEffect.value)
            duplicateEffect();
        return;
    }
    if (mod && key === 'c' && !typing) {
        e.preventDefault();
        if (editorState.tab === 'sources' && selectedSource.value)
            copyItem('wave', editorState.selectedSourceId);
        else if (selectedEffect.value)
            copyItem('effect', editorState.selectedEffectId);
        return;
    }
    if (mod && key === 'v' && !typing) {
        e.preventDefault();
        if (editorState.tab === 'sources' && selectedSource.value)
            pasteItem('wave', editorState.selectedSourceId);
        else if (selectedEffect.value)
            pasteItem('effect', editorState.selectedEffectId);
        return;
    }
    if (mod && /^[1-5]$/.test(key)) {
        e.preventDefault();
        selectTab(tabs[Number(key) - 1].id);
        return;
    }
    if (typing || e.altKey || mod)
        return;
    if (key === '?' || key === 'f1') {
        e.preventDefault();
        openHelp();
        return;
    }
    if (key === 't') {
        e.preventDefault();
        toggleTips();
        return;
    }
    if (key === 'delete' && editorState.tab === 'sources' && selectedSource.value) {
        e.preventDefault();
        removeSource(editorState.selectedSourceId);
        return;
    }
    if (e.code === 'Space' && !['BUTTON'].includes(e.target.tagName)) {
        e.preventDefault();
        toggleAudio();
        return;
    }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        setPosition(editorState.position + (e.key === 'ArrowRight' ? 1 : -1));
        return;
    }
});

window.addEventListener('beforeunload', () => { cancelAnimationFrame(anim); worker?.terminate(); if (workerURL)
    URL.revokeObjectURL(workerURL); audio?.close(); });
