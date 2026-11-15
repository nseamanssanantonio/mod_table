/**
* Time and spectral interpolation.
*
* Computes the base morph between two stored, single-cycle keyframe buffers.
*
* The renderer includes this file in engine.cpp in a controlled order.
* Internal state and ABI remain unchanged during this structural migration.
*/

// Interpolates between two committed source cycles at one frame position.
int mt_morph(double t,int method){
    t=clip(t,0,1);
    int n=activeN;
    if(t==0||t==1){
        for(int j=0;j<n;++j)out[j]=t==0?inputA[j]:inputB[j];
        return n;
    }
    if(method==1){
        analyse(inputA,n,re,im);
        analyse(inputB,n,re2,im2);
        for(int k=0;k<=n/2;++k){
            double ma=std::sqrt(re[k]*re[k]+im[k]*im[k]),mb=std::sqrt(re2[k]*re2[k]+im2[k]*im2[k]);
            double pa=std::atan2(im[k],re[k]),pb=std::atan2(im2[k],re2[k]);
            if(ma<1e-9)pa=pb;
            if(mb<1e-9)pb=pa;
            double d=pb-pa;
            while(d>PI)d-=TAU;
            while(d<-PI)d+=TAU;
            double mag=ma+(mb-ma)*t,phase=pa+d*t;
            re[k]=mag*std::cos(phase);
            im[k]=mag*std::sin(phase);
            if(k==0||k==n/2)im[k]=0;
            else{
                re[n-k]=re[k];
                im[n-k]=-im[k];
            }
        }
        fft(re,im,n,true);
        for(int j=0;j<n;++j)out[j]=(float)safeFinite(re[j]);
    }
    else{
        double a=method==2?std::cos(t*PI/2):1-t,b=method==2?std::sin(t*PI/2):t;
        for(int j=0;j<n;++j)out[j]=(float)(a*inputA[j]+b*inputB[j]);
    }
    return n;
}
