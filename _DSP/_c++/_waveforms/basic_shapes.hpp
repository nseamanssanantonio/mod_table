/**
* Basic procedural wave geometry.
*
* Computes the unprocessed waveform families and stable nonlinear shaping utilities.
*
* The renderer includes this file in engine.cpp in a controlled order.
* Internal state and ABI remain unchanged during this structural migration.
*/

// Clean deterministic geometry. Size = duty/symmetry, plus trapezoid plateau.
// Evaluates a basic waveform at the requested cycle phase.
double baseWave(int type,double p,double size){
    p=frac(p);
    double w=p<size?p/(2*size):.5+(p-size)/(2*(1-size));
    double tri=w<.25?4*w:w<.75?2-4*w:4*w-4;
    switch(type){
        case 0:return std::sin(TAU*w);
        case 1:return 2*w-1;
        case 2:return p<size?1:-1;
        case 3:return tri;
        case 4:return clip(tri*(1+(1-size)/.24),-1,1);
        default:return 0;
    }
}
// Wave family variants are deterministic, single-cycle behavioral approximations
// inspired by names in Viscera's oscillator catalog, NOT ports of its circuit DSP.
// Variant 0 always retains the exact pre-v0.6 clean waveform math.
// Returns a bounded hyperbolic-tangent approximation for shape generation.
inline double tanhApprox(double x){
    if(x>18)return 1;
    if(x< -18)return -1;
    return 1.-2./(std::exp(2*x)+1.);
}
