/**
* Waveform source shaping and region masking.
*
* Shapes each contributing source and limits it to its selected interval inside a single cycle.
*
* The renderer includes this file in engine.cpp in a controlled order.
* Internal state and ABI remain unchanged during this structural migration.
*/

// A single component can be limited to a portion of the cycle. Fade in/out
// values represent a fraction of the selected region (0..0.5); source shapers
// operate before the per-region amplitude mask. No synth voices are created.
// Fractional ratios are genuinely fractional, never rounded to integer bins.
// For a full-cycle noninteger ratio, the final 8% of the source crosses into
// its phase-equivalent first cycle, so the exported 1-cycle table loops.
// Shapes one source, including periodic ratio closure and local nonlinear controls.
double sourceShape(int type,int variant,double ph,double size,double ratio,double phase,double smooth,double resonance,double rough,double crushed,double detail=8,double character=.5,unsigned seed=1){
    auto core=[&](double p){
        return wave(type,variant,p*ratio+phase,size,detail,character,seed);
    };
    double v=core(ph);
    if(std::fabs(ratio-std::round(ratio))>1e-7&&ph>.92){
        double u=clip((ph-.92)/.08,0,1);
        u=u*u*(3-2*u);
        v=v*(1-u)+core(ph-1)*u;
    }
    if(smooth>1e-6){
        double width=.0003+.014*smooth;
        double averaged=(core(ph-width)+2*v+core(ph+width))*.25;
        v=v*(1-smooth)+averaged*smooth;
    }
    if(resonance>1e-6){
        // phase-coherent resonant harmonic emphasis (not Viscera's filter model)
        double overtone=std::floor(std::fabs(ratio)*2+.5)+3;
        double r=std::sin(TAU*(overtone*ph+phase));
        v+=.50*resonance*r;
    }
    if(rough>1e-6){
        double drive=1+4*rough;
        double folded=std::sin(v*PI*.5*drive);
        v=v*(1-rough)+folded*rough;
    }
    if(crushed>1e-6){
        double levels=std::round(2+253*(1-crushed)*(1-crushed));
        double quantized=std::round(v*levels)/levels;
        v=v*(1-crushed)+quantized*crushed;
    }
    return clip(v,-8,8);
}
// Smooth gain mask with independent in/out widths. Zero width is a true hard
// crop; user is told that it can introduce extra high frequency harmonics.
// Calculates smooth entrance and exit weighting for a waveform region.
double regionGain(double p,double start,double end,double fadeIn,double fadeOut){
    if(p<start||p>=end)return 0;
    double length=end-start;
    if(length<=1e-8)return 0;
    double a=std::min(fadeIn,length*.5),b=std::min(fadeOut,length*.5);
    double g=1;
    if(a>1e-8&&p<start+a){
        double x=(p-start)/a;
        g=std::min(g,x*x*(3-2*x));
    }
    if(b>1e-8&&p>end-b){
        double x=(end-p)/b;
        g=std::min(g,x*x*(3-2*x));
    }
    return g;
}
