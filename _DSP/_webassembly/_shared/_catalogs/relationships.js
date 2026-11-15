/**
 * Stable relationship identifiers and the controls described by each operation.
 *
 * This file is included by the build in manifest order. It uses the
 * surrounding application scope instead of redefining global state.
 */

// Shared stable IDs: changing labels does not change saved recipes.
const MT_RELATIONS = [
    {
        "id": "add",
        "code": 0,
        "label": "Addition",
        "group": "Arithmetic",
        "description": "A + B. The lower component adds to the carrier."
    },
    {
        "id": "subtract",
        "code": 1,
        "label": "Subtraction",
        "group": "Arithmetic",
        "description": "A − B. Inverting B reverses the subtraction."
    },
    {
        "id": "horizontal",
        "code": 2,
        "label": "Horizontal splice",
        "group": "Geometry",
        "description": "Compress A into the first portion and B into the remainder. Split sets the boundary."
    },
    {
        "id": "vertical",
        "code": 3,
        "label": "Vertical splice",
        "group": "Geometry",
        "description": "Upper values from A and lower values from B, around the Split amplitude."
    },
    {
        "id": "linear_fm",
        "code": 4,
        "label": "Linear FM",
        "group": "Modulation",
        "description": "Integrate a nonnegative frequency trajectory driven by B; normalize its cycle length."
    },
    {
        "id": "exponential_fm",
        "code": 5,
        "label": "Exponential FM",
        "group": "Modulation",
        "description": "B scales traversal speed exponentially. Cycle-average speed is normalized for a periodic frame."
    },
    {
        "id": "through_zero_fm",
        "code": 6,
        "label": "Through-zero FM",
        "group": "Modulation",
        "description": "Integrate signed traversal speed. Negative speed reads A backwards. Mean correction closes one cycle."
    },
    {
        "id": "ring",
        "code": 7,
        "label": "Multiply / ring",
        "group": "Arithmetic",
        "description": "Multiply sample amplitudes: A × B."
    },
    {
        "id": "divide",
        "code": 8,
        "label": "Protected divide",
        "group": "Arithmetic",
        "description": "A divided by B with a bounded denominator and output. Depth controls the denominator floor."
    },
    {
        "id": "minimum",
        "code": 9,
        "label": "Minimum",
        "group": "Arithmetic",
        "description": "The lower sample value at every phase."
    },
    {
        "id": "maximum",
        "code": 10,
        "label": "Maximum",
        "group": "Arithmetic",
        "description": "The higher sample value at every phase."
    },
    {
        "id": "abs_difference",
        "code": 11,
        "label": "Absolute difference",
        "group": "Arithmetic",
        "description": "Absolute value of A − B; DC removal remains an output option."
    },
    {
        "id": "difference_squared",
        "code": 12,
        "label": "Difference squared",
        "group": "Arithmetic",
        "description": "Square the difference, with a bounded input."
    },
    {
        "id": "power",
        "code": 13,
        "label": "Signed power",
        "group": "Arithmetic",
        "description": "B varies the signed-power exponent of A without taking fractional powers of a negative number."
    },
    {
        "id": "modulo",
        "code": 14,
        "label": "Amplitude modulo",
        "group": "Arithmetic",
        "description": "Wrap A inside an amplitude interval determined by B."
    },
    {
        "id": "soft_min",
        "code": 15,
        "label": "Soft minimum",
        "group": "Arithmetic",
        "description": "A rounded minimum; Depth controls corner softness."
    },
    {
        "id": "soft_max",
        "code": 16,
        "label": "Soft maximum",
        "group": "Arithmetic",
        "description": "A rounded maximum; Depth controls corner softness."
    },
    {
        "id": "cross_saturation",
        "code": 17,
        "label": "Cross saturation",
        "group": "Arithmetic",
        "description": "B changes the saturation drive applied to A."
    },
    {
        "id": "pm",
        "code": 18,
        "label": "Phase modulation",
        "group": "Phase",
        "description": "B directly displaces the lookup phase of A."
    },
    {
        "id": "phase_distortion",
        "code": 19,
        "label": "Phase distortion",
        "group": "Phase",
        "description": "B bends a monotonic-style base phase map; strong settings may reverse local traversal."
    },
    {
        "id": "phase_fold",
        "code": 20,
        "label": "Phase folding",
        "group": "Phase",
        "description": "Reflect phase at the edges rather than only wrapping it."
    },
    {
        "id": "soft_sync",
        "code": 21,
        "label": "Soft sync splice",
        "group": "Phase",
        "description": "Blend a zero-crossing-triggered reset of A with its unreset cycle."
    },
    {
        "id": "hard_sync",
        "code": 22,
        "label": "Hard sync",
        "group": "Phase",
        "description": "Rising zero crossings in B restart A. Complexity sets traversal rate."
    },
    {
        "id": "reverse",
        "code": 23,
        "label": "Reverse regions",
        "group": "Phase",
        "description": "B selects forward or reverse playback of A."
    },
    {
        "id": "phase_quantize",
        "code": 24,
        "label": "Phase quantization",
        "group": "Phase",
        "description": "B controls the resolution of A’s phase staircase."
    },
    {
        "id": "phase_mirror",
        "code": 25,
        "label": "Phase mirror",
        "group": "Phase",
        "description": "B selects reflected portions of the carrier cycle."
    },
    {
        "id": "stitch",
        "code": 26,
        "label": "Waveform stitch",
        "group": "Geometry",
        "description": "Replace a movable part of A with B. Split and Depth set position and width."
    },
    {
        "id": "zero_merge",
        "code": 27,
        "label": "Zero-crossing merge",
        "group": "Geometry",
        "description": "Change between A and B at detected near-zero regions; the pattern is repeated every cycle."
    },
    {
        "id": "envelope",
        "code": 28,
        "label": "Envelope imprint",
        "group": "Geometry",
        "description": "The absolute amplitude of B shapes the amplitude of A."
    },
    {
        "id": "bend",
        "code": 29,
        "label": "Waveform bend",
        "group": "Geometry",
        "description": "B curves the amplitude of A while retaining bounded output."
    },
    {
        "id": "pinch",
        "code": 30,
        "label": "Waveform pinch",
        "group": "Geometry",
        "description": "B changes the local compression of A toward the centerline."
    },
    {
        "id": "curvature",
        "code": 31,
        "label": "Curvature transfer",
        "group": "Geometry",
        "description": "Add a scale-normalized second difference of B to A."
    },
    {
        "id": "spectral_product",
        "code": 32,
        "label": "Spectral product",
        "group": "Spectral",
        "description": "Complex spectral multiplication: periodic circular convolution, with conservative level scaling."
    },
    {
        "id": "spectral_imprint",
        "code": 33,
        "label": "Spectral imprint",
        "group": "Spectral",
        "description": "Transfer B’s harmonic magnitudes onto A’s harmonic phases."
    },
    {
        "id": "harmonic_interleave",
        "code": 34,
        "label": "Harmonic interleave",
        "group": "Spectral",
        "description": "Alternate groups of harmonic bins from A and B."
    },
    {
        "id": "spectral_mask",
        "code": 35,
        "label": "Spectral mask",
        "group": "Spectral",
        "description": "B’s normalized harmonic magnitudes mask A."
    },
    {
        "id": "spectral_difference",
        "code": 36,
        "label": "Spectral difference",
        "group": "Spectral",
        "description": "Positive difference of harmonic magnitudes, retaining A’s phase."
    },
    {
        "id": "phase_exchange",
        "code": 37,
        "label": "Phase exchange",
        "group": "Spectral",
        "description": "Keep A’s harmonic magnitudes and take the phases from B."
    },
    {
        "id": "spectral_rotate",
        "code": 38,
        "label": "Spectral rotation",
        "group": "Spectral",
        "description": "Rotate a finite band of A’s harmonic bins; B sets part of the rotation distance."
    },
    {
        "id": "xor",
        "code": 39,
        "label": "Bitwise XOR",
        "group": "Digital",
        "description": "XOR of unsigned offset-binary quantized A and B."
    },
    {
        "id": "and",
        "code": 40,
        "label": "Bitwise AND",
        "group": "Digital",
        "description": "AND of unsigned offset-binary quantized A and B."
    },
    {
        "id": "or",
        "code": 41,
        "label": "Bitwise OR",
        "group": "Digital",
        "description": "OR of unsigned offset-binary quantized A and B."
    },
    {
        "id": "bit_interleave",
        "code": 42,
        "label": "Bit interleave",
        "group": "Digital",
        "description": "Alternate bit positions from quantized A and B."
    },
    {
        "id": "bit_shift",
        "code": 43,
        "label": "Bit shift",
        "group": "Digital",
        "description": "B controls a bounded left shift of A within the chosen bit depth."
    },
    {
        "id": "comparator",
        "code": 44,
        "label": "Comparator",
        "group": "Digital",
        "description": "Switch output polarity according to whether A exceeds B."
    },
    {
        "id": "gate",
        "code": 45,
        "label": "Threshold gate",
        "group": "Digital",
        "description": "B gates A relative to the Split threshold."
    },
    {
        "id": "sample_select",
        "code": 46,
        "label": "Sample selector",
        "group": "Digital",
        "description": "B’s polarity selects between A and B."
    },
    {
        "id": "bit_rotate",
        "code": 47,
        "label": "Bit rotation",
        "group": "Digital",
        "description": "B rotates A’s bits within the selected word width."
    },
    {
        "id": "digital_fold",
        "code": 48,
        "label": "Digital fold",
        "group": "Digital",
        "description": "B moves the threshold of a repeating amplitude reflection."
    },
    {
        "id": "fractal",
        "code": 49,
        "label": "Fractal cross-modulation",
        "group": "Experimental",
        "description": "A bounded multiscale phase displacement driven by repeated copies of B."
    },
    {
        "id": "entangle",
        "code": 50,
        "label": "Reciprocal phase",
        "group": "Experimental",
        "description": "Several bounded simultaneous A/B phase-displacement iterations. No persistent feedback loop."
    },
    {
        "id": "erosion",
        "code": 51,
        "label": "Waveform erosion",
        "group": "Experimental",
        "description": "B controls local neighbor smoothing of A."
    },
    {
        "id": "resonant_crossfeed",
        "code": 52,
        "label": "Resonant crossfeed",
        "group": "Experimental",
        "description": "B excites an integer-harmonic ring pattern that is added to A."
    },
    {
        "id": "harmonic_gravity",
        "code": 53,
        "label": "Harmonic gravity",
        "group": "Experimental",
        "description": "Move A’s harmonic energy toward B’s strongest harmonic; distribute onto integer bins."
    },
    {
        "id": "harmonic_collision",
        "code": 54,
        "label": "Harmonic collision",
        "group": "Experimental",
        "description": "A nonlinear product-and-difference of normalized harmonic magnitudes."
    },
    {
        "id": "iterative_fold",
        "code": 55,
        "label": "Iterative wavefold",
        "group": "Experimental",
        "description": "Repeated sine folding of A with B-controlled thresholds. Complexity caps iteration count."
    },
    {
        "id": "spectral_repulsion",
        "code": 56,
        "label": "Spectral repulsion",
        "group": "Experimental",
        "description": "Move A’s harmonic energy away from B’s strongest harmonic onto integer bins."
    }
];
