/**
 * Initialize, confirmation and project-reset operations.
 *
 * Functions operate on the shared setup state. Unless otherwise noted,
 * edits are non-destructive and saved keyframes remain unchanged.
 */

// Resets the working recipe while retaining all committed keyframes.
function initialize() { if (editorState.committing)
    return; snapshotUndo(); editorState.sources = [newSource()]; editorState.effects = []; editorState.output = defaults(); editorState.selectedSourceId = editorState.sources[0].id; editorState.selectedEffectId = null; editorState.tab = 'sources'; edit(); say(`Working settings initialized. All ${keyCount.value} committed frames preserved.`); }

// Opens a confirmation prompt for a potentially destructive editor operation.
function ask(title, text, action, callback) { editorState.dialog = { title, text, action, callback }; }

// Handles confirm dialog for the current editor context.
function confirmDialog() { const f = editorState.dialog?.callback; editorState.dialog = null; f?.(); }

// Handles new project for the current editor context.
function newProject() { if (editorState.committing)
    return; ask('Start a new project?', 'This is the only reset action that clears the complete frame table. Save your current project first. Initialize only resets working settings.', 'Clear project', async () => { editorState.finish = mtFinishDefaults(); editorState.renderOptions = mtRenderDefaults(); editorState.samplesPerFrame = 2048; editorState.renderFrames = 256; editorState.curveSettings = mtCurveDefaults(); invalidateFinal(); editorState.frames = Array(256).fill(null); await rpc('setFrames', { frames: [] }); cancelSweep(); editorState.position = 0; editorState.previewPosition = 0; editorState.morph = 'time'; editorState.curve = 'smooth'; editorState.transition = defaultTransition(); overview = null; initialize(); editorState.undoDraft = null; resetHistoryAfterLoad(); say('New empty project.'); }); }
