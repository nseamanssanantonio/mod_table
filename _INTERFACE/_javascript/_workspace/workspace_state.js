/**
 * Interface state for tips, pickers, menus, comparisons and render status.
 *
 * Functions operate on the shared setup state. Unless otherwise noted,
 * edits are non-destructive and saved keyframes remain unchanged.
 */

// Mod Table 0.9: desktop editing workflow. All changes here are UI-state only.
const tipsEnabled = ref(false), hoverTip = ref({ on: false, title: '', text: '', x: 20, y: 20, above: true });

const inspectorFocus = ref('wave'), contextMenu = ref(null), pickerOpen = ref(false), pickerKind = ref('wave'), pickerSearch = ref('');

const presetsOpen = ref(false), presetName = ref(''), presetKind = ref('recipe'), presetSelection = ref(''), presetLibrary = ref([]);

const exportOpen = ref(false), compareReady = ref(false), compareOverlay = ref(true), compareListen = ref('B'), compareName = ref('');

const clipboardLabel = ref(''), waveFavorites = ref([]), effectFavorites = ref([]);

const historyPosition = ref(0), historyLength = ref(0), historyBusy = ref(false);

const canUndo = computed(() => historyPosition.value > 0), canRedo = computed(() => historyPosition.value < historyLength.value - 1);

const projectStatus = computed(() => editorState.finalBuilding ? `RENDERING ${editorState.renderProgress}%` : editorState.committing ? 'COMMITTING' : editorState.renderReport ? 'FINAL RENDER READY' : editorState.dirty ? 'WORKING WAVE EDITED' : keyCount.value ? 'TABLE NEEDS RENDER' : 'NO KEYFRAMES');

const exportSize = computed(() => ((editorState.renderFrames * editorState.samplesPerFrame * 4 + 56) / 1048576).toFixed(2));

const allWaveChoices = computed(() => waveTypes.flatMap(t => variantsFor(t.id).map(v => ({ family: t.id, familyLabel: t.label, id: v.id, label: v.label, code: t.id + ':' + v.id }))));

const filteredWaveChoices = computed(() => allWaveChoices.value.filter(w => (w.label + ' ' + w.familyLabel).toLowerCase().includes(pickerSearch.value.toLowerCase())).sort((a, b) => (waveFavorites.value.includes(b.code) ? 1 : 0) - (waveFavorites.value.includes(a.code) ? 1 : 0)));

const filteredEffectChoices = computed(() => catalog.filter(f => (f.name + ' ' + f.category + ' ' + f.description).toLowerCase().includes(pickerSearch.value.toLowerCase())).sort((a, b) => (effectFavorites.value.includes(b.id) ? 1 : 0) - (effectFavorites.value.includes(a.id) ? 1 : 0)));

const focusLabel = computed(() => inspectorFocus.value === 'relation' ? 'Wave relationship' : inspectorFocus.value === 'frame' ? 'Keyframe controls' : inspectorFocus.value === 'effect' ? 'Selected modifier' : inspectorFocus.value === 'filter' ? 'Final table filter' : 'Selected wave');

let compareBuffer = null, uiClipboard = null;
