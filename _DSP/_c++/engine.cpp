/**
 * Mod Table C++ processing entry point.
 *
 * Only this file is compiled into the WebAssembly module. Each included header
 * groups closely related, human-readable DSP functions and retains the
 * original execution order. The internal buffers remain private to the one
 * translation unit; only the documented extern "C" functions form the ABI.
 *
 * Do not add UI code or browser state to the processing library. The engine
 * only accepts waveform recipes and produces finite, periodic sample data.
 */

#include "_core/engine_context.hpp"
#include "_math/fourier_transform.hpp"
#include "_waveforms/basic_shapes.hpp"
#include "_waveforms/experimental_shapes.hpp"
#include "_waveforms/clean_variants.hpp"
#include "_math/periodic_resampling.hpp"
#include "_modifiers/viscera_stage_adapter.hpp"

} // Anonymous namespace holding internal numeric operations and shared buffers.

extern "C" {

#include "_bridge/buffers_and_quality.hpp"
#include "_waveforms/source_regions.hpp"
#include "_relationships/relationship_algorithms.hpp"
#include "_rendering/composite_renderer.hpp"
#include "_analysis/harmonic_analysis.hpp"
#include "_transitions/base_morph.hpp"
#include "_transitions/experimental_morphs.hpp"
#include "_waveforms/source_thumbnails.hpp"
#include "_audio/pitch_limited_preview.hpp"
#include "_filters/final_table_filter.hpp"

} // C-compatible WebAssembly worker entry points.
