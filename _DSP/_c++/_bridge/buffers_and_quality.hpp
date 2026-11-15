/**
* Fixed WebAssembly memory bridge.
*
* Exposes pointers, supported sample sizes and render quality controls to the worker.
*
* The renderer includes this file in engine.cpp in a controlled order.
* Internal state and ABI remain unchanged during this structural migration.
*/

float* mt_sources(){
    return sources;
}
float* mt_effects(){
    return effects;
}
float* mt_output(){
    return out;
}
float* mt_raw(){
    return raw;
}
float* mt_input_a(){
    return inputA;
}
float* mt_input_b(){
    return inputB;
}
float* mt_coefficients(){
    return coeff;
}
float* mt_stats(){
    return stats;
}
int mt_version(){
    return 8;
}
int mt_set_size(int n){
    if(n<128||n>MAX_FRAME_N||(n&(n-1)))return -1;
    activeN=n;
    return n;
}
int mt_size(){
    return activeN;
}
int mt_set_transition_quality(int q){
    if(q<1||q>64||(q&(q-1)))return -1;
    transitionQuality=q;
    return q;
}
int mt_resample(int from,int to){
    if(from<128||from>MAX_FRAME_N||to<128||to>MAX_FRAME_N||(from&(from-1))||(to&(to-1)))return -1;
    if(from==to){
        for(int i=0;i<to;++i)out[i]=inputA[i];
    }
    else downsample(inputA,from,out,to);
    return to;
}
