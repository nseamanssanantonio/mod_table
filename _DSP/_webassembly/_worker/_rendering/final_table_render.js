/**
 * Builds the finished table, applies virtual filtering, measures differences and reports progress.
 *
 * Worker routines share one bounded WebAssembly runtime.
 * The build preserves declaration order, and all audio work remains in the UI.
 */

// Builds the finished table, applies virtual filtering, measures differences and reports progress.
async function finalRender(m) {
    const s = settings(m), key = signature(s);
    if (finalCache?.key === key)
        return finalCache;
    if (activeJob)
        throw Error('A table render is already running.');
    if (!frames.size)
        throw Error('Commit at least one waveform first.');
    const job = activeJob = { settings: s, cancelled: false, version: framesVersion };
    const start = performance.now();
    const report = { version: '0.8.1', mode: s.r.mode, frameCount: s.count, samplesPerFrame: s.n, sourceKeys: frames.size, sourcePolicy: s.r.regenerate ? 'Regenerated editable recipes' : 'Preserved stored cycles; periodic resampling only', maximumOversampling: 0, comparisonPasses: 0, unconverged: 0, scans: [], unsettledStages: 0, bakedOnly: 0, filterEnabled: s.c.enabled, filterType: s.c.type, filterMotion: s.c.motion, dcRemoved: s.c.removeDC, pitchLimited: s.c.pitchLimit, harmonicLimit: s.c.pitchLimit ? Math.min(s.n / 2 - 1, Math.floor(.48 * s.c.sampleRate / s.c.maxHz)) : s.n / 2 - 1, warnings: [] };
    const snapshot = new Map([...frames].map(([p, k]) => [p, { ...k, wave: k.wave.slice(), recipe: k.recipe ? JSON.parse(JSON.stringify(k.recipe)) : null }]));
    const bank = new Map();
    const progress = (x, stage) => self.postMessage({ progress: x, stage, jobId: m.id });
    try {
        let done = 0;
        for (const [p, k] of snapshot) {
            cancellation(job);
            progress(.3 * done / snapshot.size, 'Preparing keyframe ' + (p + 1));
            let wave;
            if (s.r.regenerate && k.recipe) {
                const rr = await compareRender(q => render(k.recipe, s.r.mode === 'standard' ? Math.max(q, k.quality || q) : q, s.n, false), job, report, { stage: 'source', position: p });
                wave = rr.wave;
                report.unsettledStages += rr.stats[3];
                report.maximumOversampling = Math.max(report.maximumOversampling, rr.quality);
            }
            else {
                wave = resample(k.wave, s.n);
                report.bakedOnly++;
            }
            bank.set(p, { ...k, wave });
            done++;
            await pause();
        }
        const all = new Float32Array(s.n * s.count);
        let beforePeak = 0, scanPeak = 0, maxDC = 0, minRMS = Infinity, maxRMS = 0, nyquistPeak = 0;
        for (let i = 0; i < s.count; i++) {
            cancellation(job);
            const position = i * 255 / (s.count - 1);
            progress(.3 + .65 * i / s.count, 'Rendering frame ' + (i + 1) + ' / ' + s.count);
            const execute = q => { const w = frameAt(position, s.method, s.curveName, s.transition, bank, s.n, q, s.curveSettings); return filterWave(w, position, s.c, q); };
            const w = cleanup(await compareRender(execute, job, report, { stage: 'frame', frame: i, position }), s.c);
            if (w.some(x => !Number.isFinite(x)))
                throw Error('Non-finite result at frame ' + (i + 1));
            let dc = 0, power = 0;
            for (const x of w) {
                beforePeak = Math.max(beforePeak, Math.abs(x));
                dc += x;
                power += x * x;
            }
            dc /= s.n;
            const rms = Math.sqrt(power / s.n);
            maxDC = Math.max(maxDC, Math.abs(dc));
            minRMS = Math.min(minRMS, rms);
            maxRMS = Math.max(maxRMS, rms);
            if (s.c.level === 'rms' && rms > 1e-9) {
                const gain = Math.min(4, .25 / rms);
                for (let j = 0; j < s.n; j++)
                    w[j] *= gain;
            }
            setSize(s.n);
            memory(engine.mt_input_a(), s.n).set(w);
            scanPeak = Math.max(scanPeak, engine.mt_peak_scan(4));
            for (const x of w)
                scanPeak = Math.max(scanPeak, Math.abs(x));
            all.set(w, i * s.n);
            await pause();
        }
        cancellation(job);
        if (job.version !== framesVersion)
            throw Error('Keyframes changed during rendering. Render again to use the latest frames.');
        const ceiling = Math.pow(10, s.c.ceiling / 20);
        let gain = 1;
        if (s.c.level === 'peak' && scanPeak > 1e-12)
            gain = ceiling / scanPeak;
        else if (s.c.level !== 'none' && scanPeak > ceiling)
            gain = ceiling / scanPeak;
        // 0.8.1: compulsory FINAL global peak normalization. One identical gain is
        // applied to the entire table, never a different gain to individual frames.
        // This must happen after all filters, interpolation, and optional RMS matching
        // so that preview, cached finished table, and exported WAV are identical.
        let preNormalizePeak = 0;
        for (let i = 0; i < all.length; i++)
            preNormalizePeak = Math.max(preNormalizePeak, Math.abs(all[i] * gain));
        const exportGain = preNormalizePeak > 0 ? 1 / preNormalizePeak : 1;
        const totalGain = gain * exportGain;
        let finalPeak = 0, finalPower = 0;
        for (let i = 0; i < all.length; i++) {
            const sample = all[i] * totalGain;
            if (!Number.isFinite(sample))
                throw Error('Non-finite sample during final peak normalization.');
            all[i] = sample;
            finalPeak = Math.max(finalPeak, Math.abs(all[i]));
            finalPower += all[i] * all[i];
        }
        report.samplePeakBefore = beforePeak;
        report.oversampledPeakBefore = scanPeak;
        report.preNormalizePeak = preNormalizePeak;
        report.exportPeakGainDb = 20 * Math.log10(exportGain);
        report.gainDb = 20 * Math.log10(totalGain);
        report.exportPeakNormalized = preNormalizePeak > 0;
        report.normalizationScope = 'One global gain across all frames; highest absolute sample reaches 0 dBFS';
        report.finalPeak = finalPeak;
        report.finalRMS = Math.sqrt(finalPower / all.length);
        let finalDC = 0;
        for (let f = 0; f < s.count; f++) {
            let dc = 0;
            for (let i = 0; i < s.n; i++)
                dc += all[f * s.n + i];
            finalDC = Math.max(finalDC, Math.abs(dc / s.n));
        }
        report.maxDC = finalDC;
        report.frameRMSRangeBefore = [minRMS, maxRMS];
        report.elapsedMs = performance.now() - start;
        report.convergenceTargetDb = s.r.tolerance;
        report.worstResidualDb = report.scans.length ? Math.max(...report.scans.map(x => x.residualDb)) : null;
        if (!report.exportPeakNormalized)
            report.warnings.push('The table is silent; no peak normalization was possible.');
        if (report.unconverged)
            report.warnings.push(`${report.unconverged} scans reached the quality ceiling without meeting the convergence target. The highest-quality results were kept.`);
        if (report.unsettledStages)
            report.warnings.push(`${report.unsettledStages} source filter stages reached their settling limit.`);
        if (report.bakedOnly)
            report.warnings.push(`${report.bakedOnly} keyframes used stored samples. Existing aliasing in baked samples cannot be reliably undone.`);
        if (s.c.pitchLimit)
            report.warnings.push('Pitch-limited export reduces upper harmonics deliberately. It is darker than the full-band master.');
        report.warnings.push('Successive-render convergence is not a proof of zero aliasing. Playback pitch, synth interpolation and table scanning can introduce additional aliasing.');
        report.warnings.push('Peak measurement uses 4× periodic reconstruction, not a certified true-peak standard.');
        finalCache = { key, wave: all, report, n: s.n, count: s.count };
        progress(1, 'Render complete');
        return finalCache;
    }
    finally {
        activeJob = null;
        setSize(N);
        engine.mt_set_transition_quality(4);
    }
}

