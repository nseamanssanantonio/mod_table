/**
 * Applies final filtering and cleanup to a finished frame.
 *
 * This file is included by the build in manifest order. It uses the
 * surrounding application scope instead of redefining global state.
 */

// Handles set filter for the current editor context.
function setFilter(c, position) { const p = mtFilterAt(position, c); memory(engine.mt_filter_params(), 16).set([c.enabled ? 1 : 0, MT_FILTERS.find(x => x.id === c.type).code, p.cutoff, p.q, p.drive, p.mix / 100, p.morph / 100, p.gain]); return p; }

// Handles filter wave for the current editor context.
function filterWave(wave, position, c, quality = 4) { setSize(wave.length); setFilter(c, position); memory(engine.mt_input_a(), wave.length).set(wave); if (engine.mt_table_filter(quality) < 0)
    throw Error('Final filtering failed.'); return copyOut(wave.length); }

// Handles cleanup for the current editor context.
function cleanup(wave, c) {
    const limit = c.pitchLimit ? Math.max(1, Math.min(wave.length / 2 - 1, Math.floor(.48 * c.sampleRate / c.maxHz))) : wave.length / 2 - 1;
    if (!c.removeDC && !c.pitchLimit)
        return wave;
    setSize(wave.length);
    memory(engine.mt_input_a(), wave.length).set(wave);
    engine.mt_final_cleanup(c.removeDC ? 1 : 0, limit);
    return copyOut(wave.length);
}
