/**
* Periodic Fourier analysis.
*
* Provides basic bounded numerical helpers, forward/inverse FFT and spectrum extraction.
*
* The renderer includes this file in engine.cpp in a controlled order.
* Internal state and ABI remain unchanged during this structural migration.
*/

inline double safeFinite(double x,double fallback=0){
    return std::isfinite(x)?x:fallback;
}
inline double clip(double x,double a,double b){
    return std::max(a,std::min(b,safeFinite(x)));
}
inline double frac(double x){
    return x-std::floor(x);
}
// Calculates an in-place radix-two complex Fourier transform.
void fft(double*r,double*i,int n,bool inverse){
    for(int a=1,b=0;a<n;++a){
        int bit=n>>1;
        for(;b&bit;bit>>=1)b^=bit;
        b^=bit;
        if(a<b){
            double t=r[a];
            r[a]=r[b];
            r[b]=t;
            t=i[a];
            i[a]=i[b];
            i[b]=t;
        }
    }
    for(int len=2;len<=n;len<<=1){
        double ang=(inverse?TAU:-TAU)/len,wr=std::cos(ang),wi=std::sin(ang);
        for(int a=0;a<n;a+=len){
            double cr=1,ci=0;
            for(int j=0;j<len/2;++j){
                int b=a+j,c=b+len/2;
                double tr=cr*r[c]-ci*i[c],ti=cr*i[c]+ci*r[c];
                r[c]=r[b]-tr;
                i[c]=i[b]-ti;
                r[b]+=tr;
                i[b]+=ti;
                double nr=cr*wr-ci*wi;
                ci=cr*wi+ci*wr;
                cr=nr;
            }
        }
    }
    if(inverse)for(int j=0;j<n;++j){
        r[j]/=n;
        i[j]/=n;
    }
}
// Converts a periodic waveform buffer into complex harmonic coefficients.
void analyse(const float*x,int n,double*r,double*i){
    for(int j=0;j<n;++j){
        r[j]=safeFinite(x[j]);
        i[j]=0;
    }
    fft(r,i,n,false);
}
