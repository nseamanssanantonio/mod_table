/**
 * Compact source preview generation.
 *
 * Provides low-resolution cycle previews for source cards without altering the final waveform.
 *
 * The renderer includes this file in engine.cpp in a controlled order.
 * Internal state and ABI remain unchanged during this structural migration.
 */

static float thumbnail[160];
// Generates a lightweight miniature waveform for one source card.
float* mt_thumbnail(int source){if(source<0||source>=64)return thumbnail;generateSource(source,thumbnail,160);return thumbnail;}
// Generate a pitch-limited audition cycle; never changes stored/exported data.
