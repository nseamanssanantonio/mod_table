#!/usr/bin/env bash
# Rebuild the C++ processing engine in the structured source tree.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p _DSP/_webassembly/_binary
"${CLANGXX:-clang++}" --target=wasm32 -std=c++17 -O3 -DMODTABLE_FREESTANDING -nostdlib -fno-exceptions -fno-rtti -fno-builtin -Wl,--no-entry -Wl,--export-all -Wl,--initial-memory=67108864 -Wl,--max-memory=67108864 -Wl,-z,stack-size=262144 _DSP/_c++/engine.cpp -o _DSP/_webassembly/_binary/modtable.wasm
