/**
 * Default settings for interpolation, final filtering and rendering.
 *
 * This file is included by the build in manifest order. It uses the
 * surrounding application scope instead of redefining global state.
 */

// Handles curve defaults for the current editor context.
function mtCurveDefaults() { return { direction: 'inout', exponent: 3, steepness: 6, x1: .25, y1: .1, x2: .75, y2: .9, startHold: .2, endHold: .2, steps: 8, glide: .5, rebounds: 3, damping: 4, amount: .3 }; }

// Handles filter point for the current editor context.
function mtFilterPoint(position = 0) { return { position, cutoff: 16, q: .707, drive: 0, mix: 100, morph: 0, gain: 9 }; }

// Handles finish defaults for the current editor context.
function mtFinishDefaults() { return { enabled: false, type: 'lp24', motion: 'static', base: mtFilterPoint(), nodes: [mtFilterPoint(0), { ...mtFilterPoint(255), cutoff: 128, morph: 100 }], curve: 'smooth', curveSettings: mtCurveDefaults(), removeDC: true, level: 'safety', ceiling: -1, pitchLimit: false, maxHz: 1000, sampleRate: 48000 }; }

// Handles render defaults for the current editor context.
function mtRenderDefaults() { return { mode: 'standard', quality: 8, maxQuality: 64, tolerance: -72, regenerate: true }; }
