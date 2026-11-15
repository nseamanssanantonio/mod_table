/**
* Audition spectrum preparation.
*
* Limits waveform harmonics for browser playback. No synth voice is created here.
*
* The renderer includes this file in engine.cpp in a controlled order.
* Internal state and ABI remain unchanged during this structural migration.
*/

// Prepares pitch-limited harmonics for non-destructive browser audition.
int mt_audition(double hz,double sr){
    int n=activeN;
    hz=clip(hz,20,2000);
    sr=clip(sr,8000,192000);
    analyse(inputA,n,re,im);
    double limit=std::min(double(n/2-1),.46*sr/hz);
    re[0]=im[0]=0;
    for(int k=1;k<n/2;++k){
        double g=k<=.9*limit?1:k>=limit?0:.5+.5*std::cos(PI*(k-.9*limit)/(.1*limit));
        re[k]*=g;
        im[k]*=g;
        re[n-k]=re[k];
        im[n-k]=-im[k];
    }
    re[n/2]=im[n/2]=0;
    fft(re,im,n,true);
    double peak=1;
    for(int j=0;j<n;++j)peak=std::max(peak,std::fabs(re[j]));
    for(int j=0;j<n;++j)out[j]=(float)(re[j]/peak);
    return n;
}
