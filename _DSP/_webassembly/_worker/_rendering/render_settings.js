/**
 * Validates render dimensions and defines cache and comparison helpers.
 *
 * This file is included by the build in manifest order. It uses the
 * surrounding application scope instead of redefining global state.
 */

// Handles settings for the current editor context.
function settings(m) {
    const n = m.sampleSize ?? 2048, count = m.count ?? 256;
    if (!MT_FRAME_SIZES.includes(n))
        throw Error('Choose 128–8192 samples per frame, in powers of two.');
    if (!Number.isInteger(count) || count < 2 || count > 256)
        throw Error('A table must contain 2–256 rendered frames.');
    const r = { ...mtRenderDefaults(), ...m.renderOptions };
    r.mode = r.mode === 'deep' ? 'deep' : 'standard';
    if (![2, 4, 8, 16].includes(r.quality))
        throw Error('Invalid render quality.');
    if (![16, 32, 64].includes(r.maxQuality))
        throw Error('Invalid deep-scan ceiling.');
    if (!Number.isFinite(r.tolerance) || r.tolerance > -36 || r.tolerance < -100)
        throw Error('Invalid convergence tolerance.');
    const c = m.finish ? mtValidateFinish(m.finish) : { ...mtFinishDefaults(), removeDC: false, level: 'none' };
    const curveName = m.curve || 'smooth';
    if (!MT_CURVES.some(x => x.id === curveName))
        throw Error('Unknown progression curve.');
    const method = m.method || 'time';
    if (!MT_TRANSITIONS.some(x => x.id === method))
        throw Error('Unknown transition method.');
    return { n, count, r, c, curveSettings: mtValidateCurves(m.curveSettings), curveName, method, transition: m.transition || {} };
}

// Handles signature for the current editor context.
function signature(s, version = framesVersion) { return JSON.stringify([version, s]); }

// Handles scan difference for the current editor context.
function scanDifference(a, b) { let d = 0, p = 0, peak = 0; for (let i = 0; i < a.length; i++) {
    const x = a[i] - b[i];
    d += x * x;
    p += b[i] * b[i];
    peak = Math.max(peak, Math.abs(x));
} return { db: d <= 1e-24 ? -240 : 10 * Math.log10(d / Math.max(1e-20, p)), peak }; }

const pause = () => new Promise(r => setTimeout(r, 0));
