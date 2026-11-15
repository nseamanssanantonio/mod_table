/**
 * Processes requests from the interface and reports job results and failures.
 */

self.onmessage = async ({ data: m }) => {
    try {
        if (m.type === 'cancelRender') {
            if (activeJob)
                activeJob.cancelled = true;
            self.postMessage({ id: m.id, result: true });
            return;
        }
        if (m.type === 'init') {
            engine = (await WebAssembly.instantiate(m.bytes, { math: Math })).instance.exports;
            engine.__wasm_call_ctors();
            self.postMessage({ id: m.id, result: { version: engine.mt_version() } });
            return;
        }
        if (!engine)
            throw Error('Waveform processor has not initialized.');
        let result;
        switch (m.type) {
            case 'render':
                result = render(m.recipe, m.quality, m.size ?? N);
                break;
            case 'setFrame':
                frames.set(m.position, { wave: new Float32Array(m.wave), recipe: m.recipe || null, quality: m.quality || 8, lead: m.lead ?? frames.get(m.position)?.lead ?? .5, transition: m.transition ?? frames.get(m.position)?.transition ?? null });
                changed();
                result = true;
                break;
            case 'moveFrame': {
                if (frames.has(m.to))
                    throw Error('Destination already has a keyframe.');
                const old = frames.get(m.from);
                if (!old)
                    throw Error('Source keyframe missing.');
                frames.set(m.to, old);
                frames.delete(m.from);
                changed();
                result = true;
                break;
            }
            case 'setTransition':
            case 'setLead': {
                const old = frames.get(m.position);
                if (!old)
                    throw Error('Keyframe missing.');
                if (m.type === 'setTransition')
                    old.transition = m.transition;
                else
                    old.lead = m.lead;
                changed();
                result = true;
                break;
            }
            case 'deleteFrame':
                frames.delete(m.position);
                changed();
                result = true;
                break;
            case 'setFrames':
                frames = new Map(m.frames.map(v => [v.position, { wave: new Float32Array(v.wave), recipe: v.recipe || null, quality: v.quality || 8, lead: v.lead ?? .5, transition: v.transition ?? null }]));
                changed();
                result = true;
                break;
            case 'table': {
                const s = settings(m), wave = previewAt(m.position, s);
                result = { wave, coeff: analysis(wave), playbackWave: cachedAt(m.position, s, true) || undefined, finalCached: finalCache?.key === signature(s) };
                break;
            }
            case 'audition': {
                const n = m.wave.length;
                if (!MT_FRAME_SIZES.includes(n))
                    throw Error('Invalid audition frame size.');
                setSize(n);
                memory(engine.mt_input_a(), n).set(m.wave);
                engine.mt_audition(m.hz, m.sampleRate);
                const wave = copyOut(n);
                result = { wave, coeff: analysis(wave) };
                break;
            }
            case 'overview': {
                const s = settings(m), all = new Float32Array(N * 18);
                for (let i = 0; i < 18; i++)
                    all.set(previewAt(i * 255 / 17, s), i * N);
                result = { wave: all };
                break;
            }
            case 'filterResponse': {
                setFilter(mtValidateFinish(m.finish), m.position ?? 0);
                engine.mt_filter_response();
                result = { points: memory(engine.mt_filter_response_buffer(), 256).slice() };
                break;
            }
            case 'renderFinal': {
                const c = await finalRender(m);
                result = { report: c.report };
                break;
            }
            case 'export': {
                const c = await finalRender(m);
                result = { wave: c.wave.slice(), report: c.report, count: c.count, samplesPerFrame: c.n };
                break;
            }
            default: throw Error('Unknown waveform processing request');
        }
        const transfers = [];
        if (result && typeof result === 'object')
            for (const v of Object.values(result))
                if (v instanceof Float32Array)
                    transfers.push(v.buffer);
        self.postMessage({ id: m.id, result }, transfers);
    }
    catch (e) {
        self.postMessage({ id: m.id, error: e?.message || String(e) });
    }
};
