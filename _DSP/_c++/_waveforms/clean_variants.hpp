/**
 * Waveform variant selection.
 *
 * Chooses a source shape from the family and generic variant identifiers.
 *
 * The renderer includes this file in engine.cpp in a controlled order.
 * Internal state and ABI remain unchanged during this structural migration.
 */

// Selects a waveform variant and evaluates it at a normalized phase.
double wave(int type,int variant,double p,double size,double detail=8,double character=.5,unsigned seed=1){
 if(type>=5)return experimentalWave(type,variant,p,size,detail,character,seed);
 p=frac(p);size=clip(size,.05,.95);
 double x=baseWave(type,p,size),a=std::sin(TAU*p),tri=baseWave(3,p,size);
 if(variant<=0)return x;
 switch(type){
 case 0: // Sine: rectified, quadrature, sigmoid and magnetic variants
  switch(variant){
   case 1:return std::max(0.,a)*2.-.5; // rectifier
   case 2:return .77*a+.23*std::cos(2*TAU*p);
   case 3:return tanhApprox(a*(1.0+2.4*size))/tanhApprox(1.0+2.4*size);
   case 4:return a*(.86+.14*std::sin(TAU*3*p));
  }break;
 case 1: // Saw
  switch(variant){
   case 1:return clip((2*p-1)+.23*std::exp(-p*22.)*std::sin(TAU*p*5),-1,1); // MS20-like reset
   case 2:return 1.-2*p+.11*std::sin(TAU*p); // falling-ramp variant
   case 3:return tanhApprox((2*p-1)*2.3)/tanhApprox(2.3); // 303-like charged
   case 4:return clip(.65*x+.35*baseWave(1,frac(p*2),size),-1,1); // double-ramp saw variant
   case 5:return std::floor((2*p-1)*12.+.5)/12.; // stepped
  }break;
 case 2: // Square / Pulse
  switch(variant){
   case 1:return p<size?1:-.8+0.2*std::sin(TAU*p); // linked-pulse variant
   case 2:return p<size?1:-1+.22*std::sin(TAU*p*2.); // 303-like warped square
   case 3:return p<size?1:p<size+.12?.25:-1; // hollow-pulse variant
   case 4:{ // Newly authored rounded-pulse approximation
    double edge=.008+.028*(1-size),u=std::sin(TAU*(p-size));
    return tanhApprox((p<size?1.:-1.)*(3.+10.*size)+.2*u)/tanhApprox(3.+10.*size)*(1.-edge);}
   case 5:return p<size*.45?1:(p<size?.04:-1); // tri-state
  }break;
 case 3: // Triangle
  switch(variant){
   case 1:return clip(tri+.25*(2*p-1)*(1-tri*tri),-1,1); // sharktooth
   case 2:return baseWave(3,frac(p+.07+.18*(size-.5)),clip(size*.78+.11,.05,.95)); // skewed-triangle variant
   case 3:return std::sin(PI*.5*tri)*(1.-.2*std::fabs(a)); // varactor-like curve
   case 4:return clip(tri+.22*std::sin(TAU*p*3),-1,1); // zigzag
  }break;
 case 4: // Trapezoid
  switch(variant){
   case 1:return clip(baseWave(4,frac(p+.06+.12*(size-.5)),size),-1,1);
   case 2:return clip(2.7*tri,-1,1);
   case 3:return clip(1.2*std::sin(PI*.5*tri)*1.5,-1,1);
   case 4:return clip(baseWave(4,p,size)+.14*std::sin(TAU*p*3),-1,1);
  }break;
 }
 return x;
}
