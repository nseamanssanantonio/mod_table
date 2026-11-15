/**
 * Assemble Mod Table's human-readable source tree into one offline HTML app.
 *
 * The checked-in files stay separated by interface feature and DSP function.
 * The generated HTML embeds Vue, the worker program and the compiled DSP
 * binary so opening it in Chrome does not require a server or installation.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceManifest = JSON.parse(fs.readFileSync(path.join(projectDirectory, 'build.manifest.json'), 'utf8'));

// Read a source part relative to the repository root.
function readSource(relativeFile) {
    return fs.readFileSync(path.join(projectDirectory, relativeFile), 'utf8');
}

// Assemble the explicitly ordered source files without reordering side effects.
function combineSource(parts) {
    return parts.map(relativeFile => `\n/* BEGIN ${relativeFile} */\n${readSource(relativeFile)}\n/* END ${relativeFile} */\n`).join('\n');
}

// Keep HTML fragments in their declared markup order.
function combineHTML(parts) {
    return parts.map(readSource).join('\n');
}

// Embed the exact C++/WebAssembly binary used by the rendering worker.
function embeddedBinary() {
    const binary = fs.readFileSync(path.join(projectDirectory, '_DSP/_webassembly/_binary/modtable.wasm'));
    return binary.toString('base64');
}

// Escape an HTML-closing script sequence within an embedded JavaScript string.
function safeInlineScript(source) {
    return source.replaceAll('</script', '<\\/script');
}

// Compose shared catalogues once for the interface and again for the worker.
function buildWorkerProgram() {
    return combineSource(sourceManifest.sharedParts) + combineSource(sourceManifest.workerParts);
}

// Build the single-file offline distribution from separate editable modules.
function buildStandaloneFile() {
    const htmlTemplate = combineHTML(sourceManifest.htmlParts);
    const cssSource = combineSource(sourceManifest.cssParts);
    const sharedSource = combineSource(sourceManifest.sharedParts);
    const appSource = combineSource(sourceManifest.appParts);
    const workerSource = buildWorkerProgram();
    const vueRuntime = readSource('_INTERFACE/_javascript/_vendor/vue.global.prod.js');
    const audioPreview = readSource('_INTERFACE/_javascript/_audio/audio_preview.js');
    const sliderTemplate = readSource(sourceManifest.componentTemplates.slider)
        .replace(/^<!--[^\n]*-->\n/, '').trim();
    const configuration = `const MOD_TABLE_SLIDER_TEMPLATE = ${JSON.stringify(sliderTemplate)};\n` +
                          `const MOD_TABLE_WASM = ${JSON.stringify(embeddedBinary())};\n` +
                          `const MOD_TABLE_WORKER = ${JSON.stringify(workerSource)};`;

    return htmlTemplate
        .replace('/*STYLE*/', () => cssSource)
        .replace('/*VUE*/', () => vueRuntime)
        .replace('/*CONFIG*/', () => safeInlineScript(configuration))
        .replace('/*APP*/', () => sharedSource + '\n' + audioPreview + '\n' + appSource);
}

const standalone = buildStandaloneFile();
const distributionDirectory = path.join(projectDirectory, 'dist');
fs.mkdirSync(distributionDirectory, { recursive: true });
fs.writeFileSync(path.join(distributionDirectory, 'Mod_Table.html'), standalone);
console.log(`Built dist/Mod_Table.html (${standalone.length.toLocaleString()} characters) from modular source.`);
