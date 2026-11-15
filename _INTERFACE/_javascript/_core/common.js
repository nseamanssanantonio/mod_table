/**
 * Vue primitives and small application-wide utilities.
 */
const { createApp, reactive, computed, toRefs, ref, onMounted, markRaw } = Vue;

const N = 2048, FORMAT = 'mod-table-vue-wasm', VERSION = 8;

const RENDER_COUNTS = [16, 32, 64, 128, 256];

const clone = x => JSON.parse(JSON.stringify(x));

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
