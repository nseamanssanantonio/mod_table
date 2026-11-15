/**
 * Evaluates the committed wavetable at an interpolated frame position.
 *
 * This file is included by the build in manifest order. It uses the
 * surrounding application scope instead of redefining global state.
 */

// Handles frame at for the current editor context.
function frameAt(position, method = 'time', curveName = 'smooth', transition = {}, bank = frames, size = N, quality = 4, curveSettings = {}) {
    const keys = [...bank.keys()].sort((a, b) => a - b);
    if (!keys.length)
        return new Float32Array(size);
    if (bank.has(position))
        return bank.get(position).wave.slice();
    if (position < keys[0])
        return bank.get(keys[0]).wave.slice();
    if (position > keys.at(-1))
        return bank.get(keys.at(-1)).wave.slice();
    let left = keys[0], right = keys.at(-1);
    for (let k = 1; k < keys.length; k++)
        if (keys[k] >= position) {
            left = keys[k - 1];
            right = keys[k];
            break;
        }
    setSize(size);
    engine.mt_set_transition_quality(quality);
    memory(engine.mt_input_a(), size).set(bank.get(left).wave);
    memory(engine.mt_input_b(), size).set(bank.get(right).wave);
    const lead = Math.max(.05, Math.min(.95, bank.get(left).lead ?? .5)), t = Math.max(0, Math.min(1, (position - left) / (right - left))), biased = t < lead ? .5 * t / lead : .5 + .5 * (t - lead) / (1 - lead);
    const spec = bank.get(left).transition || transition, chosen = spec.mode || method;
    engine.mt_transition(mtCurve(biased, curveName, curveSettings), MT_TRANSITIONS.find(x => x.id === chosen)?.code ?? 0, (spec.amount ?? 60) / 100, spec.detail ?? 4, spec.seed ?? 1);
    return copyOut(size);
}
