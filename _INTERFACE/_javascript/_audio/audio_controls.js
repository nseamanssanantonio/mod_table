/**
 * Audition, wavetable sweep and browser sound-device diagnostics.
 *
 * Functions operate on the shared setup state. Unless otherwise noted,
 * edits are non-destructive and saved keyframes remain unchanged.
 */

// Lazily creates the browser-native audio preview backend.
function getAudio() {
    if (audio)
        return audio;
    const player = new ModTableNativePreview(status => {
        if (audio !== player)
            return;
        editorState.audioContextState = status.state;
        editorState.audioRate = status.sampleRate;
        editorState.audioBackend = status.backend;
        editorState.audioRMS = status.rms;
        editorState.audioDb = status.db;
        editorState.audioHasWave = status.hasWave;
        editorState.audioFrameRMS = status.lastFrameRMS;
        editorState.audioTesting = status.testing;
    });
    audio = player;
    player.setLevel(editorState.volume / 100 * .24);
    return player;
}

// Stops active audition and its audio output.
function stopAudio() {
    editorState.playing = false;
    editorState.playbackMode = null;
    editorState.sweeping = false;
    ++audioToken;
    auditionPending = null;
    clearTimeout(audioTimer);
    audioTimer = null;
    audio?.setListening(false);
}

// Stops wavetable sweep playback before starting another audio mode.
function cancelSweep() { if (editorState.sweeping || editorState.playbackMode === 'sweep')
    stopAudio();
else
    editorState.sweeping = false; }

// Starts one mutually exclusive audio playback mode.
async function beginPlayback(mode, prepare) {
    if (editorState.audioStarting)
        return false;
    // A full stop also invalidates any pending asynchronous old-mode render/audio.
    stopAudio();
    editorState.audioStarting = true;
    editorState.audioError = '';
    const token = audioToken;
    try {
        // open() must be called synchronously on the click path or Chrome may
        // reject AudioContext.resume() after awaiting a WebAssembly render.
        const player = getAudio();
        await Promise.all([player.open(), prepare()]);
        if (token !== audioToken)
            return false;
        if (token !== audioToken || player !== audio)
            return false;
        editorState.playbackMode = mode;
        editorState.playing = true;
        setVolume();
        player.setListening(true);
        refreshAudio();
        return true;
    }
    catch (e) {
        if (token === audioToken) {
            stopAudio();
            editorState.audioError = 'Audio could not start: ' + e.message;
        }
        return false;
    }
    finally {
        editorState.audioStarting = false;
    }
}

// Starts or stops listening to the working single-cycle waveform.
async function toggleAudio() {
    if (editorState.audioStarting)
        return;
    if (editorState.playbackMode === 'audition' && editorState.playing && audio?.ctx?.state === 'running') {
        stopAudio();
        say('Single-wave audition stopped.');
        return;
    }
    const started = await beginPlayback('audition', async () => {
        editorState.mode = 'draft';
        ++tableToken; // ignore any stale wavetable response
        if (draftResult)
            showResult(draftResult);
        else
            await renderNow();
    });
    if (started)
        say('Auditioning the working single-cycle wave only. Wavetable sweep is inactive.');
}

// Applies the listening level without affecting rendered waveform samples.
function setVolume() { audio?.setLevel(editorState.volume / 100 * .24); }

// Updates the audition waveform only when playback is active.
function refreshAudio() {
    if (!editorState.playing || !audio?.ctx)
        return;
    auditionPending = { wave: (compareReady.value && compareListen.value === 'A' && editorState.playbackMode === 'audition' && compareBuffer ? compareBuffer : displayAudioWave).slice(), hz: editorState.previewHz, sampleRate: audio.ctx.sampleRate };
    if (!auditionBusy && !audioTimer)
        audioTimer = setTimeout(pumpAudition, 20);
}

// Transfers the latest pitch-limited preview into browser-native audio.
async function pumpAudition() {
    audioTimer = null;
    if (auditionBusy || !auditionPending || !editorState.playing || !audio)
        return;
    const job = auditionPending, token = audioToken, player = audio;
    auditionPending = null;
    auditionBusy = true;
    try {
        const r = await rpc('audition', job);
        if (token !== audioToken || player !== audio || !editorState.playing)
            return;
        let power = 0;
        for (const v of r.wave)
            power += v * v;
        player.setFrame(r.coeff, job.hz, Math.sqrt(power / r.wave.length));
        player.setListening(true);
        editorState.audioError = '';
    }
    catch (e) {
        if (token === audioToken && player === audio)
            editorState.audioError = 'Could not prepare audition: ' + e.message;
    }
    finally {
        auditionBusy = false;
        if (auditionPending && editorState.playing && !audioTimer)
            audioTimer = setTimeout(pumpAudition, 20);
    }
}

// Plays an independent short diagnostic tone without modifying project data.
async function testSound() {
    if (editorState.audioStarting || editorState.audioTesting)
        return;
    editorState.audioStarting = true;
    editorState.audioError = '';
    try {
        const player = getAudio();
        setVolume();
        await player.testTone();
        say('440 Hz output test. This does not change your wave, effects or frames.');
    }
    catch (e) {
        editorState.audioError = 'Test sound could not start: ' + e.message;
    }
    finally {
        editorState.audioStarting = false;
    }
}

// Resets browser audio resources while preserving the edited project.
async function restartAudio() {
    if (editorState.audioStarting)
        return;
    const resume = editorState.playing, mode = editorState.playbackMode, wasSweeping = editorState.sweeping;
    stopAudio();
    const old = audio;
    audio = null;
    editorState.audioStarting = true;
    editorState.audioError = '';
    editorState.audioRMS = 0;
    editorState.audioDb = -120;
    editorState.audioHasWave = false;
    editorState.audioTesting = false;
    try {
        const player = getAudio();
        const opened = player.open();
        old?.close();
        await opened;
        if (resume) {
            editorState.playbackMode = mode;
            editorState.playing = true;
            editorState.sweeping = wasSweeping;
            player.setListening(true);
            refreshAudio();
        }
        say('Audio output restarted. Use Audition or Preview wavetable.');
    }
    catch (e) {
        old?.close();
        editorState.audioError = 'Audio restart failed: ' + e.message;
    }
    finally {
        editorState.audioStarting = false;
    }
}

const audioStatusText = computed(() => {
    if (editorState.audioError)
        return editorState.audioError;
    if (editorState.audioStarting)
        return 'Starting browser audio…';
    if (editorState.audioContextState === 'not started')
        return 'Press Audition to hear the working wave. Test sound checks the output independently.';
    if (editorState.audioContextState !== 'running')
        return 'Audio is ' + editorState.audioContextState + '. Press Audition or Restart audio to resume.';
    if (editorState.audioTesting)
        return 'Playing a short 440 Hz test tone through the browser’s current output.';
    if (!editorState.playing)
        return 'Audio ready. Both single-wave audition and wavetable preview are stopped.';
    if (editorState.volume === 0)
        return 'Listening level is 0%. Raise it to hear the wave.';
    if (!editorState.audioHasWave)
        return 'Preparing the working wave for playback…';
    if (editorState.audioFrameRMS < 1e-6)
        return 'This wave is silent at the listening pitch. Check component levels, polarity cancellation and effect settings.';
    if (editorState.audioRMS > 1e-5)
        return (editorState.playbackMode === 'sweep' ? 'Wavetable preview' : 'Single-wave audition') + ' output is active. If silent at your speakers, check Chrome and Windows volume.';
    return 'Waiting for output. Use Test sound or Restart audio if the meter stays empty.';
});
