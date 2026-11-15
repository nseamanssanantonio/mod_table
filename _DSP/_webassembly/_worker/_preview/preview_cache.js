/**
 * Reuses finished frames for responsive previews and invalidates stale rendered tables.
 *
 * Worker routines share one bounded WebAssembly runtime.
 * The build preserves declaration order, and all audio work remains in the UI.
 */

// Reuses finished frames for responsive previews and invalidates stale rendered tables.
function cachedAt(position, s, full = false) { if (finalCache?.key !== signature(s))
    return null; const c = finalCache, x = mtClamp(position / 255, 0, 1) * (c.count - 1), i = Math.floor(x), j = Math.min(c.count - 1, i + 1), t = x - i, w = new Float32Array(c.n); for (let k = 0; k < c.n; k++)
    w[k] = c.wave[i * c.n + k] * (1 - t) + c.wave[j * c.n + k] * t; return full ? w : resample(w, N); }

// Reuses finished frames for responsive previews and invalidates stale rendered tables.
function previewAt(position, s) { let w = cachedAt(position, s); if (w)
    return w; w = frameAt(position, s.method, s.curveName, s.transition, frames, N, 4, s.curveSettings); w = cleanup(filterWave(w, position, s.c, 4), s.c); return w; }

// Reuses finished frames for responsive previews and invalidates stale rendered tables.
function changed() { framesVersion++; finalCache = null; }

