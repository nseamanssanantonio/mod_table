/**
 * Converts wave and modifier recipes into one rendered composite cycle.
 *
 * This file is included by the build in manifest order. It uses the
 * surrounding application scope instead of redefining global state.
 */

// Handles render for the current editor context.
function render(recipe, quality, size = N, thumbnails = true) {
    setSize(size);
    const s = memory(engine.mt_sources(), 64 * 17), e = memory(engine.mt_effects(), 64);
    s.fill(0);
    e.fill(0);
    const types = ['sine', 'saw', 'square', 'triangle', 'trapezoid', ...Object.keys(MT_WAVES)];
    const variantCodes = { sine: ['clean', 'rectified', 'quadrature', 'sigmoid', 'magnetic'], saw: ['clean', 'reset', 'falling', 'charged', 'double', 'stepped'], square: ['clean', 'linked', 'warped', 'hollow', 'rounded', 'tri_state'], triangle: ['clean', 'sharktooth', 'skew', 'varactor', 'zigzag'], trapezoid: ['clean', 'skew', 'hard', 'varactor', 'dual_cap'] };
    Object.assign(variantCodes, Object.fromEntries(Object.entries(MT_WAVES).map(([k, v]) => [k, v.map(x => x.id)])));
    const rel = memory(engine.mt_relations(), 64 * 14), extra = memory(engine.mt_extended_sources(), 64 * 4);
    rel.fill(0);
    extra.fill(0);
    recipe.sources.forEach((v, i) => { const r = v.relation || {}; rel.set([MT_RELATIONS.find(x => x.id === (r.type || 'add'))?.code ?? 0, r.target === 'previous' ? 1 : 0, (r.depth ?? 50) / 100, (r.mix ?? 100) / 100, (r.split ?? 50) / 100, (r.start ?? 0) / 100, (r.end ?? 100) / 100, (r.fade ?? 0) / 100, r.bits ?? 12, r.complexity ?? 4, r.seed ?? 1, 1, r.polarity ?? 1, r.on === false ? 0 : 1], i * 14); extra.set([v.detail ?? 8, (v.character ?? 50) / 100, v.seed ?? 1, 0], i * 4); });
    recipe.sources.forEach((v, i) => s.set([
        types.indexOf(v.type), v.on ? 1 : 0, v.influence / 100, v.interval, v.size / 100, v.phase / 360, v.polarity, v.freeMode ? 1 : 0,
        (v.regionStart ?? 0) / 100, (v.regionEnd ?? 100) / 100, (v.fadeIn ?? 0) / 100, (v.fadeOut ?? 0) / 100,
        (v.smooth ?? 0) / 100, (v.resonance ?? 0) / 100, (v.rough ?? 0) / 100, (v.crushed ?? 0) / 100,
        Math.max(0, variantCodes[v.type]?.indexOf(v.variant ?? 'clean') ?? 0)
    ], i * 17));
    recipe.effects.forEach((v, i) => e.set([v.type, v.shape / 100, v.mix / 100, v.on ? 1 : 0], i * 4));
    const before = performance.now();
    const n = engine.mt_render(recipe.sources.length, recipe.effects.length, quality, recipe.output.mixMode === 'weighted' ? 1 : 0, recipe.output.removeDC ? 1 : 0, recipe.output.normalize ? 1 : 0);
    if (n < 0)
        throw Error(`Waveform processing rejected these settings (${n})`);
    const mini = new Float32Array(thumbnails ? recipe.sources.length * 160 : 0);
    if (thumbnails)
        recipe.sources.forEach((v, i) => mini.set(memory(engine.mt_thumbnail(i), 160), i * 160));
    const wave = copyOut(size), raw = memory(engine.mt_raw(), size).slice(), stats = memory(engine.mt_stats(), 8).slice();
    return { wave, raw, stats, mini, miniIds: recipe.sources.map(v => v.id), coeff: thumbnails ? analysis(wave) : undefined, elapsed: performance.now() - before, quality };
}
