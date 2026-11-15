/**
 * WebAssembly instance, committed-frame map and sample-buffer utilities.
 *
 * This file is included by the build in manifest order. It uses the
 * surrounding application scope instead of redefining global state.
 */

/* Dedicated C++/WASM worker. Long renders yield between jobs; cancellable. */
let engine = null, frames = new Map(), framesVersion = 0, finalCache = null, activeJob = null;

const N = 2048;

const memory = (ptr, n = N) => new Float32Array(engine.memory.buffer, ptr, n);

const setSize = n => { if (engine.mt_set_size(n) !== n)
    throw Error('Unsupported waveform size.'); };

const copyOut = (n = N) => memory(engine.mt_output(), n).slice();
