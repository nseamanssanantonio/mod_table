/**
* Harmonic analysis export.
*
* Makes frequency-domain coefficients available to the interface for preview.
*
* The renderer includes this file in engine.cpp in a controlled order.
* Internal state and ABI remain unchanged during this structural migration.
*/

// Returns periodic harmonic coefficients of the input waveform.
int mt_analyse(){
    analyse(inputA,activeN,re,im);
    for(int k=0;k<activeN;++k){
        coeff[k]=(float)(re[k]*2/activeN);
        coeff[activeN+k]=(float)(-im[k]*2/activeN);
    }
    return activeN;
}
