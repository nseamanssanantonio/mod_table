/**
 * Worker request IDs, pending operations and the request/response bridge.
 *
 * Functions operate on the shared setup state. Unless otherwise noted,
 * edits are non-destructive and saved keyframes remain unchanged.
 */

let worker, workerURL, requestId = 1, pending = new Map(), revision = 0, renderTimer = null, inflight = false, rerender = false, tableToken = 0, audioToken = 0, audioTimer = null;

let miniWaves = new Map();

let draftResult = null, displayWave = new Float32Array(N), displayAudioWave = new Float32Array(N), displayRaw = new Float32Array(N), displayCoeff = new Float32Array(N * 2), overview = null;

let audio = null, auditionPending = null, auditionBusy = false, anim = 0, dragging = false, previousCanvasSize = '', sweepStarted = 0, lastSweepUpdate = 0, tableInFlight = false, tableAgain = false, pointDrag = null;

// Handles say for the current editor context.
function say(t) { editorState.message = t; }

// Sends a typed request to the background processing worker and resolves its response.
function rpc(type, data = {}, transfers = []) { return new Promise((resolve, reject) => { if (!worker) {
    reject(Error('Waveform processing is not available'));
    return;
} const id = requestId++, timer = ['export', 'renderFinal'].includes(type) ? null : setTimeout(() => { pending.delete(id); reject(Error('Processing timed out. Your committed frames were not changed.')); }, 90000); pending.set(id, { resolve, reject, timer }); try {
    worker.postMessage({ id, type, ...data }, transfers);
}
catch (e) {
    clearTimeout(timer);
    pending.delete(id);
    reject(e);
} }); }
