#pragma once
// Viscera oscillator modifiers v9: 56 live DSP types, retaining the original 48 IDs and behavior.
// Original algorithms inspired by Modal ARGON8 manual categories, NOT firmware clones.
// Per-voice/per-oscillator mutable state; no allocation, locks, or throwing in process().
#include <array>
#include <cmath>
#include <cstdint>
#include <algorithm>
namespace viscera { namespace modifiers {
constexpr float kPi = 3.14159265358979323846f;
constexpr float kTau = 6.28318530717958647692f;
inline float clamp(float x,float lo,float hi) noexcept {
    return std::isfinite(x)?std::max(lo,std::min(hi,x)):lo;
}
inline float wrap(float x) noexcept { return x-std::floor(x); }
inline float lerp(float a,float b,float t) noexcept { return a+(b-a)*t; }
inline float sine(float phase) noexcept {
    // Polynomial fast sine with phase 0..1; no lookup table or trig call.
    const float x=2.f*wrap(phase)-1.f;
    float y=4.f*x*(1.f-std::fabs(x));
    y=0.225f*(y*std::fabs(y)-y)+y;
    return -y;
}
inline float triangle(float p) noexcept { return 1.f-4.f*std::fabs(wrap(p)-0.5f); }
inline float fold(float x) noexcept { return 1.f-4.f*std::fabs(wrap((x+1.f)*0.25f)-0.5f); }
inline float soft(float x) noexcept { return x/(1.f+std::fabs(x)); }
inline float smoothstep(float x) noexcept { x=clamp(x,0.f,1.f); return x*x*(3.f-2.f*x); }

enum class Type:std::uint8_t {
    Bypass=0,
    CycleHold1,CycleHold2,CycleHold3,BitFray1,BitFray2,ClockHold1,ClockHold2,ClockHold3,
    SpectralSieve1,SpectralSieve2,SplitRectifier1,SplitRectifier2,PrismFold,SineFracture,
    SoftContour,HarmonicBulge,PressureDrive,CubicWarp,RippleWarp,
    SineArcWarp,PivotWarp,ElasticRepeat,AmplitudeWindow,
    ResonantWindow,PositiveRectifier,NegativeRectifier,ShapedProduct,
    PolaritySplit,PhaseMirror,HalfReflection,OverflowWrap,SignDifference,
    CrossPhase,CrossRing,CrossAmplitude,HardRetrigger,WindowRetrigger,
    CurveMorph,SegmentInvert,SyncProduct,
    FractureSync,AlternatingWidth,SawPulseCarve,ApexPinch,MetallicLattice,
    HarmonicRing,QuantizedVoice,DetunePair,
    CancellationArc,OctantBend,InharmonicPull,OvertoneStack,PartialShrapnel,
    ResonanceSpine,NoiseIncision,CrossfoldMatrix,
    Count
};
constexpr unsigned kModifierCount=static_cast<unsigned>(Type::Count)-1;
static_assert(kModifierCount==56,"48 unchanged IDs + 8 additional waveform modifiers");
constexpr std::array<const char*,57> kNames{{
    "Bypass","Cycle Hold I","Cycle Hold II","Cycle Hold III","Bit Fray I",
    "Bit Fray II","Clock Hold I","Clock Hold II","Clock Hold III","Spectral Sieve I",
    "Spectral Sieve II","Split Rectifier I","Split Rectifier II","Prism Fold","Sine Fracture",
    "Soft Contour","Harmonic Bulge","Pressure Drive","Cubic Warp","Ripple Warp",
    "Sine Arc Warp","Pivot Warp","Elastic Repeat","Amplitude Window","Resonant Window",
    "Positive Rectifier","Negative Rectifier","Shaped Product","Polarity Split","Phase Mirror",
    "Half Reflection","Overflow Wrap","Sign Difference","Cross-Phase","Cross-Ring",
    "Cross-Amplitude","Hard Retrigger","Window Retrigger","Curve Morph","Segment Invert",
    "Sync Product","Fracture Sync","Alternating Width","Saw-Pulse Carve","Apex Pinch",
    "Metallic Lattice","Harmonic Ring","Quantized Voice","Detune Pair",
    "Cancellation Arc","Octant Bend","Inharmonic Pull","Overtone Stack",
    "Partial Shrapnel","Resonance Spine","Noise Incision","Crossfold Matrix"
}};

// A pure phase sample reader for an individual oscillator, sampled at any phase.
// Should NOT advance oscillator state, allocate, or change random generators.
// Important: for VA saw/square, a *bandlimited* phase reader is recommended.
struct Reader {
    using Callback=float(*)(const void*,float) noexcept;
    Callback function=nullptr;
    const void* context=nullptr;
    float at(float phase,float fallback) const noexcept {
        return function?function(context,wrap(phase)):fallback;
    }
    explicit operator bool() const noexcept { return function!=nullptr; }
};
struct Frame {
    float sample=0.f;
    float phase=0.f;       // 0..1, periodic phase in *this oscillator*
    float freqHz=110.f;    // needed for per-cycle sample/hold family
    float modSample=0.f;   // other oscillator's sample; provided by host
    float modPhase=0.f;    // phase of the modulating oscillator
    Reader reader{};      // optional, required for exact phase-read transforms
};
// Source selection is stored on EACH modifier slot and uses a raw oscillator
// snapshot, never an upstream modifier's output.  Self-selection is rejected
// by the three-channel mixer bridge. Next is the historical default.
enum class ModSource : std::uint8_t { Next=0, Previous=1, Osc1=2, Osc2=3, Osc3=4 };
inline constexpr bool isCrossInput(Type t) noexcept {
    return t==Type::CrossPhase || t==Type::CrossRing ||
           t==Type::CrossAmplitude || t==Type::SyncProduct ||
           t==Type::MetallicLattice || t==Type::HarmonicRing ||
           t==Type::CrossfoldMatrix;
}
struct Config {
    Type type=Type::Bypass;
    float shape=0.5f;      // 0..1: controls intensity, rate, or position by type
    float mix=1.f;        // 0..1: always DRY (0) to processed WET (1)
    ModSource source=ModSource::Next; // used by cross-input types
};
// O(1) state; no tables / no heap; smooth Shape and Mix at 2ms.
class Stage {
public:
    void prepare(float sr) noexcept { sr_=clamp(sr,8000.f,384000.f); smoothA_=1.f-std::exp(-1.f/(0.002f*sr_)); reset(); }
    void reset() noexcept { held_=0.f; counter_=0.f; last_=0.f; lp_=0.f;
        spreadPhase_={0.f,0.f}; spreadPrimed_=false; phasePrimed_=false; cycleNumber_=0; spreadLastPhase_=0.f; resetV9();
        shapeSm_=target_.shape; mixSm_=target_.mix; }
    void set(Config c) noexcept {
        if(static_cast<unsigned>(c.type)>=static_cast<unsigned>(Type::Count)) c.type=Type::Bypass;
        c.shape=clamp(c.shape,0.f,1.f); c.mix=clamp(c.mix,0.f,1.f);
        if(static_cast<unsigned>(c.source)>static_cast<unsigned>(ModSource::Osc3))
            c.source=ModSource::Next;
        if(c.type!=target_.type) {target_.type=c.type;reset();}
        target_=c;
    }
    Config config() const noexcept {return target_;}
    float process(const Frame &f) noexcept {
        const float raw=std::isfinite(f.sample)?clamp(f.sample,-8.f,8.f):0.f;
        // Zero mix is bit-exact even on first sample (no DSP history needed).
        if(target_.type==Type::Bypass || target_.mix<=0.f) { mixSm_=target_.mix; return raw; }
        shapeSm_+=smoothA_*(target_.shape-shapeSm_);
        mixSm_+=smoothA_*(target_.mix-mixSm_);
        if(std::fabs(shapeSm_-target_.shape)<1.e-5f) shapeSm_=target_.shape;
        if(std::fabs(mixSm_-target_.mix)<1.e-5f) mixSm_=target_.mix;
        const float s=clamp(shapeSm_,0.f,1.f),p=wrap(f.phase),x=raw;
        const float mm=clamp(f.modSample,-4.f,4.f),freq=clamp(f.freqHz,5.f,18000.f);
        float y=x;
        auto ph=[&](float at)->float{return f.reader.at(at,x);};
        auto sampledHold=[&](float steps)->float {
            counter_-=1.f;
            if(counter_<=0.f) {
                held_=x;
                counter_+=std::max(1.f,steps);
                if(counter_<1.f) counter_=1.f;
            }
            return held_;
        };
        switch(target_.type) {
        case Type::Bypass: break;
        case Type::CycleHold1: case Type::CycleHold2: case Type::CycleHold3: {
            const int tier=int(target_.type)-int(Type::CycleHold1)+1;
            // Hold samples for fractions of a cycle; analog-like stepping.
            const float srDown=clamp(freq*(32.f/(tier*(.40f+2.6f*s))),250.f,sr_);
            y=sampledHold(sr_/srDown); break;
        }
        case Type::BitFray1: case Type::BitFray2: {
            const int tier=int(target_.type)-int(Type::BitFray1);
            const int bits=std::max(3,int(std::lround(14.f-(tier?8.f:5.f)*s)));
            const float levels=float((1u<<(bits-1))-1u);
            y=std::round(clamp(x,-1.f,1.f)*levels)/levels;break;
        }
        case Type::ClockHold1: case Type::ClockHold2: case Type::ClockHold3: {
            const int tier=int(target_.type)-int(Type::ClockHold1)+1;
            const float period=1.f+tier*(1.f+12.f*s);
            // Naive rate reduction distinct from Derez's pitch-tracked clock.
            y=sampledHold(period);break;
        }
        case Type::SpectralSieve1: case Type::SpectralSieve2: {
            const float tier=target_.type==Type::SpectralSieve2?0.5f:1.f;
            const float cutoff=clamp(freq*(11.f-9.f*s)*tier,30.f,0.47f*sr_);
            const float a=clamp((kTau*cutoff/sr_)/(1.f+kTau*cutoff/sr_),0.f,1.f);
            lp_+=a*(x-lp_); y=lp_;break;
        }
        case Type::SplitRectifier1: case Type::SplitRectifier2: {
            if(f.reader) {
                float r=std::fabs(ph(wrap(p*(2.f+3.f*s))));
                y=(p<.25f||p>=.75f)? r:0.f;
                if(target_.type==Type::SplitRectifier2 && p>=.5f) y=-y;
                if(target_.type==Type::SplitRectifier1 && p>=.5f) y=std::fabs(y);
            } else y=(p<.25f||p>.75f)?std::fabs(x):0.f;
            break;
        }
        case Type::PrismFold: y=fold(x*(1.f+5.5f*s));break;
        case Type::SineFracture: y=sine((x*(1.f+3.2f*s)+1.f)*.25f);
            y=lerp(y,soft(y*2.f),.3f*s);break;
        case Type::SoftContour: y=x/(1.f+.65f*s*std::fabs(x));break;
        case Type::HarmonicBulge: y=x*(1.f+(2.7f*s)*(1.f-x*x));break;
        case Type::PressureDrive: y=soft((1.f+6.f*s)*x)*(1.f+.6f*s);break;
        case Type::CubicWarp:
            if(f.reader) y=ph(lerp(p,smoothstep(p),s));
            // No implicit pretend phase-read transformation without a reader.
            break;
        case Type::RippleWarp:
            if(f.reader) y=ph(wrap(p+(s*.125f)*sine(p)));
            break;
        case Type::SineArcWarp:
            if(f.reader) y=ph(lerp(p,0.5f-0.5f*std::cos(kPi*p),s));
            break;
        case Type::PivotWarp:
            if(f.reader) {
                const float knee=.5f+.42f*s;
                y=ph(p<knee?0.5f*p/knee:0.5f+0.5f*(p-knee)/(1.f-knee));
            } break;
        case Type::ElasticRepeat:
            if(f.reader) {
                const float q=wrap(p*(1.f+3.f*s)+.08f*s*sine(p));
                y=ph(q);
            } break;
        case Type::AmplitudeWindow: {
            const float win=.5f+.5f*sine(4.5f*p+.25f);
            y=x*lerp(1.f,win,0.2f+0.8f*s);break;
        }
        case Type::ResonantWindow: {
            y=lerp(x,std::max(0.f,x)*sine(8.5f*p),.2f+.8f*s);break;
        }
        case Type::PositiveRectifier: y=std::max(0.f,x-.28f*s);break;
        case Type::NegativeRectifier: y=std::min(0.f,x+.28f*s);break;
        case Type::ShapedProduct: y=x*sine(2.5f*p)*(.6f+.4f*s)+.22f*s*x*x;break;
        case Type::PolaritySplit: y=(p<(.2f+.6f*s)?1.f:-1.f)*std::fabs(x);break;
        case Type::PhaseMirror:
            if(f.reader) y=ph(lerp(p,p<.5f?2.f*p:2.f-2.f*p,s));
            break;
        case Type::HalfReflection:
            if(f.reader) y=ph(lerp(p,p<.5f?p:1.f-(p-.5f),s));
            break;
        case Type::OverflowWrap: y=2.f*wrap((x*(1.f+5.f*s)+1.f)*.5f)-1.f;break;
        case Type::SignDifference: y=(.5f+.5f*s)*(x>0.f?1.f:(x<0.f?-1.f:0.f))-x;break;
        case Type::CrossPhase:
            if(f.reader) y=ph(p+.25f*s*mm);
            break;
        case Type::CrossRing: {
            const float biased=lerp(mm,soft(mm*(1.f+3.f*s))*(1.f+.5f*s),s);
            y=x*biased;break;
        }
        case Type::CrossAmplitude: y=x*(1.f-s+.5f*s*(1.f+clamp(mm,-1.f,1.f)));break;
        case Type::HardRetrigger:
            if(f.reader) y=ph(wrap(p*(1.f+7.f*s)));
            break;
        case Type::WindowRetrigger:
            if(f.reader) {
                const float slave=wrap(p*(1.f+7.f*s));
                y=ph(slave)*(.5f-.5f*std::cos(kTau*p));
            } break;
        case Type::CurveMorph: {
            // Continuous morph across soft, asymmetric, and clipped curves.
            const float a=soft(x*(1.f+3.f*s))*2.f;
            const float b=soft((x+.20f)*(1.f+4.f*s))-soft(.20f*(1.f+4.f*s));
            const float c=clamp(x*(1.f+4.f*s),-1.f,1.f);
            y=s<.5f?lerp(a,b,2.f*s):lerp(b,c,2.f*s-1.f);
            break;
        }
        case Type::SegmentInvert: y=(p<s)?-x:x;break;
        case Type::SyncProduct:
            if(f.reader) {
                const float slave=ph(wrap(p*(1.f+6.f*s)));
                y=lerp(slave,slave*mm,s);
            } break;
        // Eight distinctive, Cobalt-inspired oscillator processes.
        // The actual COBALT oscillator has two parameters per algorithm; our
        // versions map to one Shape plus a universally available dry/wet Mix.
        case Type::FractureSync:
            if(f.reader) {
                // Alternating fundamental cycles use asymmetric slave ratios.
                // infer parity from cycle wrap; stage holds a cycle counter.
                if(phasePrimed_ && p+0.4f<spreadLastPhase_) ++cycleNumber_;
                phasePrimed_=true; spreadLastPhase_=p;
                const float base=1.f+7.f*s;
                const float alt=(cycleNumber_&1u)?base*(1.f+0.33f*s):base;
                y=ph(wrap(p*alt));
            } break;
        case Type::AlternatingWidth:
            if(f.reader) {
                if(phasePrimed_ && p+0.4f<spreadLastPhase_) ++cycleNumber_;
                phasePrimed_=true; spreadLastPhase_=p;
                const float width=clamp(0.5f + ((cycleNumber_&1u)?-1.f:1.f)*0.42f*s,0.08f,0.92f);
                // Continuous piecewise phase mapping, no intra-cycle phase jumps.
                const float q=p<width?0.5f*p/width:0.5f+0.5f*(p-width)/(1.f-width);
                y=ph(q);
            } break;
        case Type::SawPulseCarve:
            if(f.reader) {
                // Saw region is a warped reading of the actual source;
                // the remaining region is a pulse whose width follows Shape.
                const float boundary=0.20f+0.62f*s;
                const float sawPart=ph(p/boundary)*0.85f;
                const float t=(p-boundary)/(1.f-boundary);
                const float pulsePart=t<(0.25f+0.5f*s)?1.f:-1.f;
                // Ramp smoothly into the pulse region for fewer clicks.
                const float blend=smoothstep((p-boundary)/0.025f);
                y=lerp(sawPart,pulsePart,blend);
            } break;
        case Type::ApexPinch:
            if(f.reader) {
                if(phasePrimed_ && p+0.4f<spreadLastPhase_) ++cycleNumber_;
                phasePrimed_=true; spreadLastPhase_=p;
                const float apex=clamp(.5f + ((cycleNumber_&1u)?-1.f:1.f)*0.42f*s,0.08f,0.92f);
                const float q=p<apex? .5f*p/apex : .5f+.5f*(p-apex)/(1.f-apex);
                // Oscillator-based phase pinch plus triangle component: unlike
                // PWM Dual this bends the ramp into an audible triangle edge.
                y=lerp(ph(q),triangle(q),0.38f*s);
            } break;
        case Type::MetallicLattice:
            if(f.reader) {
                const float ratio=1.0f+10.f*s;
                const float slave=ph(wrap(p*ratio));
                // Rate-linked sidebands and the selected OTHER oscillator;
                // unlike ordinary ring modulation, sync provides extra edges.
                const float baseCarrier=sine(p*ratio);
                const float side=slave*(0.60f*baseCarrier+0.40f*mm);
                y=lerp(slave,side,0.35f+0.65f*s);
            } else {
                const float carrier=sine(p*(1.f+10.f*s));
                y=x*(0.6f*carrier+0.4f*mm);
            } break;
        case Type::HarmonicRing: {
            // Pitch-ratio stepped harmonic products unlike the free-running
            // CrossRing type. Other oscillator is routed by the host.
            constexpr float steps[]={1.f,1.5f,2.f,2.5f,3.f,4.f,5.f,6.f,8.f};
            const float v=s*8.f;
            const int i=std::min(7,int(v));
            const float ratio=lerp(steps[i],steps[i+1],v-i);
            const float carrier=f.reader?ph(wrap(p*ratio)):x;
            y=carrier*mm; break;
        }
        case Type::QuantizedVoice: {
            // Amplitude-domain dynamic resolution, preserving existing wave
            // identity; Shape maps to progressively lower bit precision.
            const int bits=std::max(4,14-int(10.f*s));
            const float levels=static_cast<float>(1u<<bits);
            const float reduced=sampledHold(1.f+12.f*s);
            y=std::round(clamp(reduced,-2.f,2.f)*levels)/levels;
            break;
        }
        case Type::DetunePair:
            if(f.reader) {
                // Two virtual detuned taps sample the SAME source oscillator.
                // Continuously accumulated phases yield audible beating;
                // reset on large carrier phase discontinuities.
                if(!spreadPrimed_) {
                    spreadPhase_[0]=p;spreadPhase_[1]=p;spreadPrimed_=true;
                } else {
                    const float dp=wrap(p-spreadLastPhase_);
                    // Keep running through ordinary wraps; ignore transport jumps.
                    const float increment=(dp>0.15f)?(freq/sr_):dp;
                    const float cents=2.f+34.f*s;
                    const float detune=0.00057762265f*cents; // ln(2)/1200
                    spreadPhase_[0]=wrap(spreadPhase_[0]+increment*(1.f+detune));
                    spreadPhase_[1]=wrap(spreadPhase_[1]+increment*(1.f-detune));
                }
                spreadLastPhase_=p;
                y=0.50f*x+0.25f*(ph(spreadPhase_[0])+ph(spreadPhase_[1]));
            } break;
        // Eight new Viscera-native modifier architectures, numeric IDs 49..56.
        case Type::CancellationArc: {
            // Delayed phase subtraction creates a moving comb/notch signature.
            if(f.reader) {
                const float offset=0.013f+0.35f*s;
                y=0.72f*(x-ph(p+offset));
            }
            break;
        }
        case Type::OctantBend:
            if(f.reader) {
                // Eight segments with seven independently offset internal
                // control points. Boundaries stay strictly monotonic.
                constexpr float offsets[9]={0.f,.039f,-.034f,.044f,-.040f,
                                             .030f,-.045f,.035f,0.f};
                const unsigned idx=std::min(7u,static_cast<unsigned>(p*8.f));
                const float base=float(idx)*.125f;
                const float fraction=clamp((p-base)*8.f,0.f,1.f);
                const float q0=base+s*offsets[idx];
                const float q1=base+.125f+s*offsets[idx+1u];
                y=ph(q0+(q1-q0)*fraction);
            }
            break;
        case Type::InharmonicPull:
        case Type::PartialShrapnel:
            if(f.reader) {
                scanHarmonics(f.reader);
                updateUnwrapped(p,freq);
                if(dftReady_) {
                    const bool scatter=target_.type==Type::PartialShrapnel;
                    const float resynth=partialSynthesis(s,freq,scatter);
                    // Shape 0 retains original full-band waveform, even
                    // though reconstruction uses the first eight partials.
                    y=lerp(x,resynth,s);
                }
            }
            break;
        case Type::OvertoneStack:
            if(f.reader) {
                // Harmonic oscillator copies: not simple gain or distortion.
                // Respect harmonic Nyquist ceiling to limit added aliasing.
                float sum=x,weight=1.f;
                for(unsigned h=2;h<=5;++h) {
                    const float taper=clamp((0.47f*sr_-freq*float(h))/(0.08f*sr_),0.f,1.f);
                    const float amount=s*(0.6f/float(h))*taper;
                    sum+=amount*ph(p*float(h));weight+=amount;
                }
                y=sum/(0.9f+0.1f*weight);
            }
            break;
        case Type::ResonanceSpine: {
            // Tuned, high-Q TPT state-variable bandpass overlay.
            // Tan is computed once per 16 samples, not every process call.
            if((resonatorTick_++&15u)==0u) {
                const float ratio=1.0f+10.f*s;
                const float center=clamp(freq*ratio,30.f,0.43f*sr_);
                resonanceG_=std::tan(kPi*center/sr_);
                resonanceK_=1.f/(0.7f+12.f*s);
            }
            const float g=resonanceG_,k=resonanceK_;
            const float a1=1.f/(1.f+g*(g+k));
            const float a2=g*a1,a3=g*a2;
            const float v3=x-resonatorIc2_;
            const float v1=a1*resonatorIc1_+a2*v3;
            const float v2=resonatorIc2_+a2*resonatorIc1_+a3*v3;
            resonatorIc1_=clamp(2.f*v1-resonatorIc1_,-16.f,16.f);
            resonatorIc2_=clamp(2.f*v2-resonatorIc2_,-16.f,16.f);
            // Mix within wet path is shape-controlled; final dry/wet
            // still follows the common Mix knob.
            y=lerp(x,0.72f*x+0.25f*v1,s);
            break;
        }
        case Type::NoiseIncision: {
            if(noisePrimed_ && p+0.5f<noisePrevP_) ++noiseCycle_;
            noisePrimed_=true;noisePrevP_=p;
            // Three short windows per cycle. Envelope has soft entry/exit
            // so random stepped noise is gated without sharp phase jumps.
            const float local=wrap(p*3.f);
            const float width=0.17f+0.48f*s;
            const float rising=smoothstep(local/(0.12f*width));
            const float falling=1.f-smoothstep((local-(width*0.75f))/(width*0.25f));
            const float env=rising*falling;
            const auto bucket=static_cast<std::uint32_t>(p*(12.f+84.f*s));
            const auto seed=scramble(bucket+static_cast<std::uint32_t>(noiseCycle_)*0x9e3779b9u);
            const float noise=(float(seed&0xffffu)*(2.f/65535.f))-1.f;
            y=x+s*env*(0.13f*x+0.72f*noise);
            break;
        }
        case Type::CrossfoldMatrix: {
            // Cross input is always a pre-modifier snapshot from one of the
            // other oscillators, consistent with all existing cross modifiers.
            const float signal=x+mm*(0.15f+2.9f*s);
            const float wrapped=fold(signal*(1.f+3.5f*s));
            y=lerp(x,wrapped,0.20f+0.8f*s);
            break;
        }
        case Type::Count: break;
        }
        // A conservative per-stage safety bound while allowing strong distortion.
        y=clamp(y,-8.f,8.f);
        last_=y;
        return lerp(raw,y,clamp(mixSm_,0.f,1.f));
    }
private:

    // Source reader must be pure. One 32-point analysis tap per audio sample,
    // bounded O(8) work/sample; coefficients update once per 32 samples, never
    // a large FFT or allocation inside an audio callback. Only types 51/53 use it.
    void scanHarmonics(const Reader& reader) noexcept {
        if(!reader) return;
        const float gridPhase=float(dftIndex_)*(1.f/32.f);
        const float v=clamp(reader.at(gridPhase,0.f),-4.f,4.f);
        for(unsigned h=0;h<8;++h) {
            const float hp=wrap(float(h+1)*gridPhase);
            dftAccReal_[h]+=v*sine(hp+.25f);
            dftAccImag_[h]+=v*sine(hp);
        }
        if(++dftIndex_==32) {
            for(unsigned h=0;h<8;++h) {
                dftReal_[h]=dftAccReal_[h]*(2.f/32.f);
                dftImag_[h]=dftAccImag_[h]*(2.f/32.f);
                dftAccReal_[h]=dftAccImag_[h]=0.f;
            }
            dftIndex_=0; dftReady_=true;
        }
    }
    void updateUnwrapped(float p,float freq) noexcept {
        if(!continuousPrimed_) { continuousPhase_=double(p);lastSourcePhase_=p;continuousPrimed_=true;return; }
        float delta=p-lastSourcePhase_;
        if(delta>0.5f)delta-=1.f;
        if(delta<-.5f)delta+=1.f;
        if(!std::isfinite(delta) || std::fabs(delta)>.45f) delta=clamp(freq/sr_,0.f,.45f);
        continuousPhase_+=double(delta);
        lastSourcePhase_=p;
    }
    float partialSynthesis(float shape,float fundamental,bool scatter) const noexcept {
        if(!dftReady_) return 0.f;
        float sum=0.f;
        for(unsigned h=0;h<8;++h) {
            const float harmonic=float(h+1);
            // Pull harmonics toward increasingly inharmonic frequencies; or
            // smoothly scatter partial frequencies and suppress some bins.
            const float swapped=float(1u+((h*5u+3u)%8u));
            const float position=scatter
                ? lerp(harmonic,swapped,0.91f*shape)
                : harmonic+shape*0.22f*harmonic*std::sqrt(harmonic);
            const float hz=fundamental*position;
            const float antiAlias=clamp((0.47f*sr_-hz)/(0.09f*sr_),0.f,1.f);
            const float attenuation=scatter
                ? lerp(1.f,((h%3u)==0u?0.20f:0.65f),shape)
                : 1.f;
            // phase in double ensures no discontinuity at the carrier's cycle
            // boundary when a target partial is non-integral.
            const float phase=wrap(float(std::fmod(continuousPhase_*double(position),1.0)));
            const float component=dftReal_[h]*sine(phase+.25f)+dftImag_[h]*sine(phase);
            sum+=antiAlias*attenuation*component;
        }
        return clamp(sum,-4.f,4.f);
    }
    static std::uint32_t scramble(std::uint32_t x) noexcept {
        x^=x>>16; x*=0x7feb352du; x^=x>>15;
        x*=0x846ca68bu;return x^(x>>16);
    }
    void resetV9() noexcept {
        dftReal_.fill(0.f);dftImag_.fill(0.f);
        dftAccReal_.fill(0.f);dftAccImag_.fill(0.f);
        dftIndex_=0;dftReady_=false; continuousPrimed_=false;
        continuousPhase_=0.0;lastSourcePhase_=0.f;
        resonatorIc1_=resonatorIc2_=0.f;resonatorTick_=0;
        resonanceG_=0.05f;resonanceK_=0.5f;
        noisePrevP_=0.f;noiseCycle_=0;noisePrimed_=false;
    }
    float sr_{48000.f},smoothA_{1.f},shapeSm_{.5f},mixSm_{1.f};
    float held_{0.f},counter_{0.f},last_{0.f},lp_{0.f};
    std::array<float,2> spreadPhase_{{0.f,0.f}};
    float spreadLastPhase_{0.f};
    bool spreadPrimed_{false}, phasePrimed_{false};
    std::uint64_t cycleNumber_{0};
    Config target_{};
    std::array<float,8> dftReal_{},dftImag_{},dftAccReal_{},dftAccImag_{};
    unsigned dftIndex_{0};bool dftReady_{false};
    double continuousPhase_{0.0};float lastSourcePhase_{0.f};bool continuousPrimed_{false};
    float resonatorIc1_{0.f},resonatorIc2_{0.f};
    float resonanceG_{0.05f},resonanceK_{0.5f};unsigned resonatorTick_{0u};
    float noisePrevP_{0.f};std::uint64_t noiseCycle_{0};bool noisePrimed_{false};
};
}} // namespace viscera::modifiers
