/**
 * Browser-native audio audition.
 *
 * ModTableNativePreview manages playback and waveform crossfades. It receives
 * already-rendered cycles, and never changes exported sample values. Only
 * one audible mode can run at a time.
 */

/* Audition only. C++/WASM still generates and pitch-limits the edited cycle.
 * Playback uses browser-native PeriodicWave nodes, so it does not depend on an
 * AudioWorklet module, a blob module loader, or a JS process callback. Two
 * phase-aligned readers overlap only to crossfade edits of the SAME wave.
 */
class ModTableNativePreview {
        // Initializes preview state without opening an audio device.
constructor(onStatus = () => { }) {
        this.onStatus = onStatus;
        this.ctx = null;
        this.readers = [];
        this.active = 0;
        this.hasWave = false;
        this.listening = false;
        this.level = .12;
        this.fadeEnd = 0;
        this.queuedWave = null;
        this.frameTimer = null;
        this.meterTimer = null;
        this.tone = null;
        this.closed = false;
        this.lastFrameRMS = 0;
        this.lastError = '';
        this.ready = false;
        this.resumePending = null;
    }
        // Creates or resumes the browser audio output after a user interaction.
async open() {
        if (this.closed)
            throw Error('Audio output was closed. Use Restart audio.');
        if (!this.ctx) {
            const Context = window.AudioContext || window.webkitAudioContext;
            if (!Context)
                throw Error('This browser does not expose Web Audio. Open the downloaded HTML in Chrome or Edge.');
            const ctx = this.ctx = new Context({ latencyHint: 'interactive' });
            this.master = ctx.createGain();
            this.master.gain.value = this.level;
            this.previewGate = ctx.createGain();
            this.previewGate.gain.value = 0;
            this.previewGate.connect(this.master);
            this.analyser = ctx.createAnalyser();
            this.analyser.fftSize = 2048;
            this.meterBuffer = new Float32Array(this.analyser.fftSize);
            this.master.connect(this.analyser);
            this.analyser.connect(ctx.destination);
            const startAt = ctx.currentTime + .005;
            this.readers = [0, 1].map(i => {
                const osc = ctx.createOscillator(), gain = ctx.createGain();
                osc.frequency.value = 110;
                gain.gain.value = i === 0 ? 1 : 0;
                osc.connect(gain).connect(this.previewGate);
                osc.start(startAt);
                return { osc, gain };
            });
            ctx.addEventListener('statechange', () => {
                if (this.closed)
                    return;
                if (ctx.state === 'running' && this.queuedWave)
                    this.flushWave();
                this.emitStatus();
            });
            this.meterTimer = setInterval(() => this.emitStatus(), 100);
        }
        // Call resume synchronously on the user-click path, before DSP or file work.
        // Bound the wait: a blocked/suspended context must not masquerade as playing.
        if (this.ctx.state !== 'running') {
            if (!this.resumePending) {
                let timeout;
                const resumed = this.ctx.resume();
                this.resumePending = Promise.race([
                    resumed,
                    new Promise((_, reject) => {
                        timeout = setTimeout(() => reject(Error('Audio output did not start. Open the downloaded file in Chrome/Edge, allow sound, then press Restart audio.')), 3000);
                    })
                ]).finally(() => { clearTimeout(timeout); this.resumePending = null; });
            }
            await this.resumePending;
        }
        if (this.ctx.state !== 'running')
            throw Error('Audio is ' + this.ctx.state + '. Press Restart audio to resume output.');
        this.ready = true;
        this.lastError = '';
        this.emitStatus();
        return this;
    }
        // Smoothly changes a gain value to avoid clicks at edit boundaries.
ramp(param, value, seconds = .012) {
        const t = this.ctx.currentTime;
        if (typeof param.cancelAndHoldAtTime === 'function')
            param.cancelAndHoldAtTime(t);
        else {
            const old = param.value;
            param.cancelScheduledValues(t);
            param.setValueAtTime(old, t);
        }
        param.linearRampToValueAtTime(value, t + seconds);
    }
        // Updates the listening level without changing waveform samples.
setLevel(value) {
        this.level = Math.max(0, Math.min(.24, Number.isFinite(value) ? value : 0));
        if (this.ctx && !this.closed)
            this.ramp(this.master.gain, this.level);
    }
        // Starts or stops the currently selected audition mode.
setListening(value) {
        this.listening = !!value;
        if (this.ctx && !this.closed)
            this.ramp(this.previewGate.gain, this.listening && this.hasWave && !this.tone ? 1 : 0);
        this.emitStatus();
    }
        // Queues a new periodic waveform for smooth audible replacement.
setFrame(coefficients, hz, frameRMS = 0) {
        if (!this.ctx || this.closed)
            return;
        if (!(coefficients instanceof Float32Array) || ![256, 512, 1024, 2048, 4096, 8192, 16384].includes(coefficients.length) || !coefficients.every(Number.isFinite)) {
            throw Error('Invalid audition spectrum; previous audio was preserved.');
        }
        if (!Number.isFinite(hz) || hz < 20 || hz > 2000)
            throw Error('Invalid audition pitch.');
        const n = coefficients.length / 2;
        const real = coefficients.slice(0, n / 2), imag = coefficients.slice(n, n + n / 2);
        real[0] = imag[0] = 0;
        const periodicWave = this.ctx.createPeriodicWave(real, imag, { disableNormalization: true });
        // Both readers keep exactly the same start time and frequency automation.
        for (const r of this.readers)
            this.ramp(r.osc.frequency, hz, .012);
        this.lastFrameRMS = frameRMS;
        if (!this.hasWave) {
            for (const r of this.readers)
                r.osc.setPeriodicWave(periodicWave);
            this.hasWave = true;
            this.setListening(this.listening);
        }
        else {
            // Coalesce rapid edits without continually cancelling their audible update.
            this.queuedWave = periodicWave;
            this.flushWave();
        }
        this.emitStatus();
    }
        // Transfers the newest preview wave into the currently selected oscillator.
flushWave() {
        if (!this.queuedWave || this.closed || this.ctx.state !== 'running')
            return;
        clearTimeout(this.frameTimer);
        this.frameTimer = null;
        const t = this.ctx.currentTime;
        if (t < this.fadeEnd) {
            this.frameTimer = setTimeout(() => this.flushWave(), Math.max(4, (this.fadeEnd - t) * 1000 + 3));
            return;
        }
        const incoming = 1 - this.active, wave = this.queuedWave;
        this.queuedWave = null;
        this.readers[incoming].osc.setPeriodicWave(wave);
        const duration = .025;
        this.readers[incoming].gain.gain.cancelScheduledValues(t);
        this.readers[incoming].gain.gain.setValueAtTime(0, t);
        this.readers[incoming].gain.gain.linearRampToValueAtTime(1, t + duration);
        this.readers[this.active].gain.gain.cancelScheduledValues(t);
        this.readers[this.active].gain.gain.setValueAtTime(1, t);
        this.readers[this.active].gain.gain.linearRampToValueAtTime(0, t + duration);
        this.active = incoming;
        this.fadeEnd = t + duration;
    }
        // Plays a short test tone without changing the saved project.
async testTone() {
        await this.open();
        if (this.level === 0)
            throw Error('Listening level is 0%. Raise it before testing sound.');
        if (this.tone)
            return;
        const ctx = this.ctx, osc = ctx.createOscillator(), gain = ctx.createGain(), t = ctx.currentTime + .015;
        osc.type = 'sine';
        osc.frequency.value = 440;
        gain.gain.value = 0;
        osc.connect(gain).connect(this.master);
        this.tone = { osc, gain };
        this.ramp(this.previewGate.gain, 0, .008);
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(.65, t + .02);
        gain.gain.setValueAtTime(.65, t + .48);
        gain.gain.linearRampToValueAtTime(0, t + .55);
        osc.onended = () => {
            osc.disconnect();
            gain.disconnect();
            if (this.tone?.osc !== osc)
                return;
            this.tone = null;
            if (!this.closed) {
                this.setListening(this.listening);
                this.emitStatus();
            }
        };
        osc.start(t);
        osc.stop(t + .57);
        this.emitStatus();
    }
        // Measures the audio output for the visible meter and diagnostics.
getMetrics() {
        if (!this.ctx || this.closed || !this.analyser || this.ctx.state !== 'running')
            return { rms: 0, peak: 0, db: -120 };
        this.analyser.getFloatTimeDomainData(this.meterBuffer);
        let power = 0, peak = 0;
        for (const sample of this.meterBuffer) {
            if (!Number.isFinite(sample))
                return { rms: 0, peak: 0, db: -120 };
            power += sample * sample;
            peak = Math.max(peak, Math.abs(sample));
        }
        const rms = Math.sqrt(power / this.meterBuffer.length);
        return { rms, peak, db: rms > 1e-6 ? 20 * Math.log10(rms) : -120 };
    }
        // Reports preview status to the editor interface.
emitStatus() {
        if (this.closed)
            return;
        const metrics = this.getMetrics();
        this.onStatus({ backend: 'Native Web Audio', state: this.ctx?.state || 'not started', sampleRate: this.ctx?.sampleRate || 0,
            listening: this.listening, hasWave: this.hasWave, testing: !!this.tone, lastFrameRMS: this.lastFrameRMS, ...metrics });
    }
        // Stops the oscillators and releases their browser-audio resources.
close() {
        if (this.closed)
            return;
        this.closed = true;
        clearTimeout(this.frameTimer);
        clearInterval(this.meterTimer);
        if (this.tone) {
            try {
                this.tone.osc.stop();
            }
            catch { }
            this.tone = null;
        }
        for (const r of this.readers) {
            try {
                r.osc.stop();
            }
            catch { }
            r.osc.disconnect();
            r.gain.disconnect();
        }
        if (this.ctx) {
            this.previewGate.disconnect();
            this.master.disconnect();
            this.analyser.disconnect();
            this.ctx.close().catch(() => { });
        }
        this.queuedWave = null;
    }
}
