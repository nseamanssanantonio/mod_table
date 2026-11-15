/**
 * Waveform family selection, labels, and compatibility aliases.
 *
 * Functions operate on the shared setup state. Unless otherwise noted,
 * edits are non-destructive and saved keyframes remain unchanged.
 */

// Handles relation changed for the current editor context.
function relationChanged(w) { editorState.selectedSourceId = w.id; if (['linear_fm', 'exponential_fm', 'through_zero_fm', 'pm'].includes(w.relation.type))
    w.relation.target = 'previous'; edit(); }

const legacyVariantAliases = { "sine": { "ems_rect": "rectified", "rubicon_sigmoid": "sigmoid" }, "saw": { "ms20": "reset", "juno": "falling", "tb303": "charged", "rubicon_double": "double" }, "square": { "ems": "linked", "tb303": "warped", "alpha_juno": "hollow", "moog_square": "rounded" }, "triangle": { "moog": "sharktooth", "ems": "skew", "rubicon": "zigzag" }, "trapezoid": { "ems": "skew" } };

const canonicalVariant = (family, id) => legacyVariantAliases[family]?.[id] || id;

const variantsFor = t => waveVariants[t] || waveVariants.sine;

// Handles change family for the current editor context.
function changeFamily(w) { w.variant = variantsFor(w.type)[0].id; edit(); }

const variantLabel = w => variantsFor(w.type).find(x => x.id === (w.variant || 'clean'))?.label || 'Clean';

const waveLabel = t => waveTypes.find(w => w.id === t)?.label || t;

const sourceColor = i => ['#bba5f3', '#76b1e2', '#e4b780', '#82d9af', '#e4a9a9', '#b4dc7b'][i % 6];
