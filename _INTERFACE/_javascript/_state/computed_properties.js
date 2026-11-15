/**
 * Selected items, keyframe counts, visible effects and waveform catalogues.
 *
 * Functions operate on the shared setup state. Unless otherwise noted,
 * edits are non-destructive and saved keyframes remain unchanged.
 */

const fileInput = ref(null), selectedSource = computed(() => editorState.sources.find(w => w.id === editorState.selectedSourceId) || null), selectedSourceIndex = computed(() => editorState.sources.findIndex(w => w.id === editorState.selectedSourceId));

const selectedEffect = computed(() => editorState.effects.find(e => e.id === editorState.selectedEffectId) || null), selectedEffectIndex = computed(() => editorState.effects.findIndex(e => e.id === editorState.selectedEffectId));

const keyPositions = computed(() => editorState.frames.flatMap((f, i) => f ? [i] : [])), keyCount = computed(() => keyPositions.value.length), currentKey = computed(() => editorState.frames[editorState.position]);

const effectInfo = id => catalog.find(e => e.id === Number(id)) || catalog[0];

const tabs = [{ id: 'sources', label: 'Wave' }, { id: 'distortion', label: 'Distortion' }, { id: 'spectral', label: 'Spectral effects' }, { id: 'harmonics', label: 'Harmonics' }, { id: 'tablefx', label: 'Table finish' }], effectGroups = tabs.slice(1, 4);

const visibleEffects = computed(() => catalog.filter(e => e.category === editorState.tab && (e.name + ' ' + e.description).toLowerCase().includes(editorState.search.toLowerCase())));

const waveTypes = [{ id: 'sine', label: 'Sine' }, { id: 'saw', label: 'Saw' }, { id: 'square', label: 'Square / pulse' }, { id: 'triangle', label: 'Triangle' }, { id: 'trapezoid', label: 'Trapezoid' }, ...Object.keys(MT_WAVES).map(id => ({ id, label: { geometry: 'Experimental geometry', harmonic: 'Harmonic patterns', phase: 'Phase & sync', folded: 'Folded shapes', texture: 'Structured textures' }[id] }))];

// User-facing shape IDs are generic. Old IDs are translated on project import.
const waveVariants = {
    sine: [{ id: 'clean', label: 'Pure Sine' }, { id: 'rectified', label: 'Rectified Sine' }, { id: 'quadrature', label: 'Quadrature Sine' }, { id: 'sigmoid', label: 'Sigmoid Sine' }, { id: 'magnetic', label: 'Magnetic Sine' }],
    saw: [{ id: 'clean', label: 'Linear Saw' }, { id: 'reset', label: 'Reset Saw' }, { id: 'falling', label: 'Falling Ramp' }, { id: 'charged', label: 'Charged Saw' }, { id: 'double', label: 'Double Saw' }, { id: 'stepped', label: 'Stepped saw' }],
    square: [{ id: 'clean', label: 'Pure Pulse / Square' }, { id: 'linked', label: 'Linked Pulse' }, { id: 'warped', label: 'Warped Square' }, { id: 'hollow', label: 'Hollow Pulse' }, { id: 'rounded', label: 'Rounded Square' }, { id: 'tri_state', label: 'Tri-State Pulse' }],
    triangle: [{ id: 'clean', label: 'Linear Triangle' }, { id: 'sharktooth', label: 'Sharktooth Triangle' }, { id: 'skew', label: 'Skew Triangle' }, { id: 'varactor', label: 'Varactor Triangle' }, { id: 'zigzag', label: 'Zigzag Triangle' }],
    trapezoid: [{ id: 'clean', label: 'Linear Trapezoid' }, { id: 'skew', label: 'Skew Plateau' }, { id: 'hard', label: 'Hard Plateau' }, { id: 'varactor', label: 'Varactor Trapezoid' }, { id: 'dual_cap', label: 'Dual-Capacitor Trapezoid' }]
};

Object.assign(waveVariants, MT_WAVES);

const relations = MT_RELATIONS, relationGroups = [...new Set(relations.map(x => x.group))], transitions = MT_TRANSITIONS;

const relationInfo = w => relations.find(x => x.id === (w.relation?.type || 'add')) || relations[0];

const transitionInfo = id => transitions.find(x => x.id === id) || transitions[0];
