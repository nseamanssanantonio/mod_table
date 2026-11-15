/**
 * Validation and interpolation of non-destructive final-filter automation.
 *
 * This file is included by the build in manifest order. It uses the
 * surrounding application scope instead of redefining global state.
 */

// Handles validate finish for the current editor context.
function mtValidateFinish(o = {}) {
    const d = mtFinishDefaults(), num = (v, a, b, def) => { if (v === undefined)
        return def; if (typeof v !== 'number' || !Number.isFinite(v))
        throw Error('Invalid final filter value.'); return mtClamp(v, a, b); };
    if (o.type !== undefined && !MT_FILTERS.some(x => x.id === o.type))
        throw Error('Unknown table filter.');
    d.enabled = o.enabled === true;
    d.type = o.type || d.type;
    d.motion = o.motion === 'evolving' ? 'evolving' : 'static';
    function point(x, p) { return { position: Math.round(num(x?.position, 0, 255, p)), cutoff: num(x?.cutoff, .25, 4095, 16), q: num(x?.q, .5, 24, .707), drive: num(x?.drive, 0, 36, 0), mix: num(x?.mix, 0, 100, 100), morph: num(x?.morph, 0, 100, 0), gain: num(x?.gain, -24, 24, 9) }; }
    d.base = point(o.base, 0);
    if (o.nodes !== undefined) {
        if (!Array.isArray(o.nodes) || o.nodes.length < 1 || o.nodes.length > 256)
            throw Error('Invalid filter automation points.');
        d.nodes = o.nodes.map((x, i) => point(x, i)).sort((a, b) => a.position - b.position);
        if (new Set(d.nodes.map(x => x.position)).size !== d.nodes.length)
            throw Error('Duplicate filter automation positions.');
    }
    if (o.curve !== undefined && !MT_CURVES.some(x => x.id === o.curve))
        throw Error('Invalid filter progression.');
    d.curve = o.curve || 'smooth';
    d.curveSettings = mtValidateCurves(o.curveSettings);
    d.removeDC = o.removeDC !== false;
    d.level = ['none', 'safety', 'peak', 'rms'].includes(o.level) ? o.level : 'safety';
    d.ceiling = num(o.ceiling, -12, 0, -1);
    d.pitchLimit = o.pitchLimit === true;
    d.maxHz = num(o.maxHz, 30, 10000, 1000);
    d.sampleRate = [44100, 48000, 96000].includes(o.sampleRate) ? o.sampleRate : 48000;
    return d;
}

// Handles filter at for the current editor context.
function mtFilterAt(position, c) {
    if (c.motion !== 'evolving' || c.nodes.length === 1)
        return { ...(c.motion === 'evolving' ? c.nodes[0] : c.base) };
    const keys = c.nodes;
    if (position <= keys[0].position)
        return { ...keys[0] };
    if (position >= keys.at(-1).position)
        return { ...keys.at(-1) };
    let i = 1;
    while (keys[i].position < position)
        i++;
    const a = keys[i - 1], b = keys[i], t = mtCurve((position - a.position) / (b.position - a.position), c.curve, c.curveSettings), out = { position };
    for (const k of ['cutoff', 'q'])
        out[k] = Math.exp(Math.log(a[k]) * (1 - t) + Math.log(b[k]) * t);
    for (const k of ['drive', 'mix', 'morph', 'gain'])
        out[k] = a[k] + (b[k] - a[k]) * t;
    return out;
}
