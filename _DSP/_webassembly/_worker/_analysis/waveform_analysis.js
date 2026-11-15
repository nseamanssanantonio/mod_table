/**
 * Transforms waveform samples into spectrum data and converts sample rates.
 *
 * This file is included by the build in manifest order. It uses the
 * surrounding application scope instead of redefining global state.
 */

// Handles analysis for the current editor context.
function analysis(wave) { setSize(wave.length); memory(engine.mt_input_a(), wave.length).set(wave); engine.mt_analyse(); return memory(engine.mt_coefficients(), wave.length * 2).slice(); }

// Handles resample for the current editor context.
function resample(wave, n) { if (wave.length === n)
    return wave.slice(); memory(engine.mt_input_a(), wave.length).set(wave); if (engine.mt_resample(wave.length, n) < 0)
    throw Error('Resampling failed.'); return copyOut(n); }
