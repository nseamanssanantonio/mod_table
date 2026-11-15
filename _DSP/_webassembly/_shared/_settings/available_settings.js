/**
 * The allowed table frame sizes, morph curves and final filter models.
 *
 * This file is included by the build in manifest order. It uses the
 * surrounding application scope instead of redefining global state.
 */

/* Shared, versioned table-finishing settings. No browser dependency. */
const MT_FRAME_SIZES = [128, 256, 512, 1024, 2048, 4096, 8192];

const MT_CURVES = [['linear', 'Linear'], ['smooth', 'Smoothstep'], ['smoother', 'Smootherstep'], ['sine', 'Sine ease'], ['power', 'Power curve'], ['exponential', 'Exponential'], ['bezier', 'Custom Bézier'], ['hold', 'Hold & glide'], ['steps', 'Stepped glide'], ['elastic', 'Elastic return']].map(([id, label]) => ({ id, label }));

const MT_FILTERS = [['lp12', 'Low-pass · 12 dB'], ['lp24', 'Low-pass · 24 dB'], ['hp12', 'High-pass · 12 dB'], ['hp24', 'High-pass · 24 dB'], ['bp', 'Band-pass'], ['notch', 'Notch'], ['peak', 'Resonant peak'], ['allpass', 'All-pass'], ['zformant', 'Z morph · formant'], ['zchamber', 'Z morph · chamber'], ['zcavity', 'Z morph · cavities']].map(([id, label], code) => ({ id, label, code }));
