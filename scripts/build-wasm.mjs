/**
 * Compile the modular C++ engine to WebAssembly.
 *
 * Only engine.cpp is passed to Clang because it includes the feature headers
 * in dependency order. The resulting fixed-memory module is saved under the
 * _DSP language section and later embedded by scripts/build.mjs.
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
const projectDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const wasmDestination = '_DSP/_webassembly/_binary/modtable.wasm';
fs.mkdirSync(path.join(projectDirectory, '_DSP/_webassembly/_binary'), { recursive: true });
const compilerOptions = [
    '--target=wasm32', '-std=c++17', '-O3', '-DMODTABLE_FREESTANDING',
    '-nostdlib', '-fno-exceptions', '-fno-rtti', '-fno-builtin',
    '-Wl,--no-entry', '-Wl,--export-all', '-Wl,--initial-memory=67108864',
    '-Wl,--max-memory=67108864', '-Wl,-z,stack-size=262144',
    '_DSP/_c++/engine.cpp', '-o', wasmDestination
];
const result = spawnSync(process.env.CLANGXX || 'clang++', compilerOptions, {
    cwd: projectDirectory,
    stdio: 'inherit'
});
if (result.error) {
    console.error('To rebuild the processing engine, install Clang with wasm32 support or set CLANGXX.');
    console.error(result.error.message);
    process.exitCode = 1;
} else {
    process.exitCode = result.status ?? 1;
}
