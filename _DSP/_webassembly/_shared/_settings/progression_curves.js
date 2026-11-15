/**
 * Progression curves used to evaluate positions between two keyframes.
 *
 * This file is included by the build in manifest order. It uses the
 * surrounding application scope instead of redefining global state.
 */

// Handles clamp for the current editor context.
function mtClamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

// Handles curve for the current editor context.
function mtCurve(t, id = 'smooth', opts = {}) {
    t = mtClamp(t, 0, 1);
    if (t === 0 || t === 1)
        return t;
    const o = { ...mtCurveDefaults(), ...opts }, smooth = x => x * x * (3 - 2 * x), smoother = x => x * x * x * (x * (6 * x - 15) + 10);
    function directed(f) { return o.direction === 'in' ? f(t) : o.direction === 'out' ? 1 - f(1 - t) : t < .5 ? .5 * f(2 * t) : 1 - .5 * f(2 - 2 * t); }
    switch (id) {
        case 'linear': return t;
        case 'smooth': return smooth(t);
        case 'smoother': return smoother(t);
        case 'sine': return directed(x => 1 - Math.cos(x * Math.PI / 2));
        case 'power': return directed(x => Math.pow(x, o.exponent));
        case 'exponential': return directed(x => Math.expm1(o.steepness * x) / Math.expm1(o.steepness));
        case 'bezier': {
            const b = (u, a, c) => 3 * (1 - u) * (1 - u) * u * a + 3 * (1 - u) * u * u * c + u * u * u;
            let lo = 0, hi = 1;
            for (let i = 0; i < 28; i++) {
                const u = (lo + hi) / 2;
                if (b(u, o.x1, o.x2) < t)
                    lo = u;
                else
                    hi = u;
            }
            return mtClamp(b((lo + hi) / 2, o.y1, o.y2), 0, 1);
        }
        case 'hold': {
            let a = o.startHold, b = o.endHold;
            if (a + b > .95) {
                const f = .95 / (a + b);
                a *= f;
                b *= f;
            }
            return smoother(mtClamp((t - a) / (1 - a - b), 0, 1));
        }
        case 'steps': {
            const x = t * o.steps, i = Math.floor(x), p = x - i;
            return (i + smooth(mtClamp((p - (1 - o.glide)) / Math.max(.001, o.glide), 0, 1))) / o.steps;
        }
        case 'elastic': return mtClamp(t + o.amount * Math.sin(Math.PI * t) ** 2 * Math.sin(2 * Math.PI * o.rebounds * t) * Math.exp(-o.damping * t), 0, 1);
        default: throw Error('Unknown progression curve.');
    }
}

// Handles validate curves for the current editor context.
function mtValidateCurves(o = {}) {
    const d = mtCurveDefaults();
    for (const [k, a, b] of [['exponent', .2, 8], ['steepness', .1, 12], ['x1', 0, 1], ['y1', 0, 1], ['x2', 0, 1], ['y2', 0, 1], ['startHold', 0, .9], ['endHold', 0, .9], ['steps', 1, 32], ['glide', .001, 1], ['rebounds', 1, 12], ['damping', 0, 12], ['amount', 0, 1]]) {
        if (o[k] !== undefined) {
            if (typeof o[k] !== 'number' || !Number.isFinite(o[k]))
                throw Error('Invalid curve ' + k);
            d[k] = mtClamp(o[k], a, b);
        }
    }
    for (const k of ['steps', 'rebounds'])
        d[k] = Math.round(d[k]);
    d.direction = ['in', 'out', 'inout'].includes(o.direction) ? o.direction : 'inout';
    return d;
}
