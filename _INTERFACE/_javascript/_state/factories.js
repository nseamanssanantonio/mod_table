/**
 * Default wave, relation, effect and output factories with stable identifiers.
 */
const validFX = new Set(catalog.map(f => f.id));

let uid = 1;

const defaultRelation = () => ({ type: 'add', target: 'stack', depth: 50, mix: 100, split: 50, start: 0, end: 100, fade: 0, bits: 12, complexity: 4, seed: 1, polarity: 1, on: true });

const defaultTransition = () => ({ amount: 60, detail: 4, seed: 1 });

const newSource = (type = 'sine', interval = 1, influence = 100) => ({ id: 'w' + uid++, type, variant: 'clean', detail: 8, character: 50, seed: 1, relation: defaultRelation(), interval, influence, size: 50, phase: 0, polarity: 1, on: true, freeMode: false, regionStart: 0, regionEnd: 100, fadeIn: 0, fadeOut: 0, smooth: 0, resonance: 0, rough: 0, crushed: 0 });

const newEffect = type => ({ id: 'e' + uid++, type, shape: 40, mix: 100, on: true });

const defaults = () => ({ mixMode: 'weighted', removeDC: true, normalize: false });
