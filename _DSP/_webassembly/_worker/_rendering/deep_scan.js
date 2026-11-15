/**
 * Checks render cancellation and compares successive oversampling results.
 *
 * Worker routines share one bounded WebAssembly runtime.
 * The build preserves declaration order, and all audio work remains in the UI.
 */

// Checks render cancellation and compares successive oversampling results.
function cancellation(job) { if (job.cancelled)
    throw Error('Render cancelled. Committed keyframes were not changed.'); }

// Checks render cancellation and compares successive oversampling results.
async function compareRender(fn, job, report, tag) {
    const s = job.settings;
    if (s.r.mode !== 'deep') {
        const value = fn(s.r.quality);
        report.maximumOversampling = Math.max(report.maximumOversampling, s.r.quality);
        return value;
    }
    let last = fn(8), quality = 8, diff = { db: 0, peak: 0 }, converged = false;
    for (quality = 16; quality <= s.r.maxQuality; quality *= 2) {
        await pause();
        cancellation(job);
        const next = fn(quality);
        diff = scanDifference(last.wave || last, next.wave || next);
        last = next;
        report.comparisonPasses++;
        report.maximumOversampling = Math.max(report.maximumOversampling, quality);
        if (diff.db <= s.r.tolerance) {
            converged = true;
            break;
        }
    }
    const record = { ...tag, quality: Math.min(quality, s.r.maxQuality), residualDb: Math.max(-240, diff.db), peakDifference: diff.peak, converged };
    report.scans.push(record);
    if (!converged)
        report.unconverged++;
    return last;
}

