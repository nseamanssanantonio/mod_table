/**
* Periodic complex-frequency filters and post-table cleanup.
*
* These functions run on a finished single-cycle or interpolated frame.
*
* The renderer includes this file in engine.cpp in a controlled order.
* Internal state and ABI remain unchanged during this structural migration.
*/

// Final periodic filtering. Applies the COMPLEX response at harmonic bins,
// therefore includes phase response and has no startup transient or tail splice.
// Generic digital pole/zero responses, not ports of proprietary hardware.
// Coefficients: RBJ Audio EQ Cookbook (W3C Working Group Note, 2021).
static float filterParams[16]{
};
static float filterResponse[256]{
};
float* mt_filter_params(){
    return filterParams;
}
float* mt_filter_response_buffer(){
    return filterResponse;
}
/**
* MTComplex groups the values needed for its processing stage.
* Instances do not own external browser or interface state.
*/
struct MTComplex {
    double r,i;
};
static MTComplex cmul(MTComplex a,MTComplex b){
    return {
        a.r*b.r-a.i*b.i,a.r*b.i+a.i*b.r
    };
}
static MTComplex cdiv(MTComplex a,MTComplex b){
    double d=b.r*b.r+b.i*b.i;
    if(d<1e-28)d=1e-28;
    return {
        (a.r*b.r+a.i*b.i)/d,(a.i*b.r-a.r*b.i)/d
    };
}
/**
* MTBiquad groups the values needed for its processing stage.
* Instances do not own external browser or interface state.
*/
struct MTBiquad {
    double b0,b1,b2,a0,a1,a2;
};
static MTBiquad makeBiquad(int type,double cutoff,double Q,double gain){
    // Fixed virtual sampling rate decouples response from table resolution / OS.
    const double fs=65536.,w=TAU*clip(cutoff,.125,12000)/fs,c=std::cos(w),sn=std::sin(w),a=sn/(2*clip(Q,.5,24)),A=std::exp(gain*.05756462732485114);
    if(type==0)return {
        (1-c)*.5,1-c,(1-c)*.5,1+a,-2*c,1-a
    };
    if(type==1)return {
        (1+c)*.5,-1-c,(1+c)*.5,1+a,-2*c,1-a
    };
    if(type==2)return {
        a,0,-a,1+a,-2*c,1-a
    };
    if(type==3)return {
        1,-2*c,1,1+a,-2*c,1-a
    };
    if(type==4)return {
        1+a*A,-2*c,1-a*A,1+a/A,-2*c,1-a/A
    };
    return {
        1-a,-2*c,1+a,1+a,-2*c,1-a
    };
    // all-pass
}
static MTComplex responseAt(const MTBiquad&b,double harmonic){
    double w=TAU*harmonic/65536.,c=std::cos(w),s=-std::sin(w),c2=c*c-s*s,s2=2*c*s;
    return cdiv({
        b.b0+b.b1*c+b.b2*c2,b.b1*s+b.b2*s2
    },
    {
        b.a0+b.a1*c+b.a2*c2,b.a1*s+b.a2*s2
    }
    );
}
static int prepareFinal(MTBiquad*b){
    int type=(int)clip(filterParams[1],0,10);
    double cut=clip(filterParams[2],.25,4095),q=clip(filterParams[3],.5,24),m=clip(filterParams[6],0,1),g=clip(filterParams[7],-24,24);
    if(type<8){
        int k=type==0||type==1?0:type==2||type==3?1:type==4?2:type==5?3:type==6?4:5;
        b[0]=makeBiquad(k,cut,q,g);
        if(type==1||type==3){
            b[1]=b[0];
            return 2;
        }
        return 1;
    }
    // Three stable peaking/notch sections with centers moving logarithmically.
    // These are original Mod Table response presets; no manufacturer names.
    const double from[3][3]={
        {
            .45,1.,2.4
        },
        {
            .5,1.4,3.7
        },
        {
            .6,1.5,2.8
        }
    };
    const double to[3][3]={
        {
            .85,1.8,3.4
        },
        {
            .9,2.7,4.8
        },
        {
            .95,2.1,4.2
        }
    };
    const int preset=type-8;
    for(int j=0;j<3;++j){
        double center=cut*std::exp(std::log(from[preset][j])*(1-m)+std::log(to[preset][j])*m);
        double gain=(type==10?(j%2?1:-1):1)*(3+clip(g,0,24))*(.65+.35*(j==1));
        b[j]=makeBiquad(4,center,clip(q*(.8+j*.15),.5,24),gain);
    }
    return 3;
}
static MTComplex finalResponse(const MTBiquad*b,int count,double h){
    MTComplex v{
        1,0
    };
    for(int i=0;i<count;++i)v=cmul(v,responseAt(b[i],h));
    return v;
}
int mt_filter_response(){
    MTBiquad b[3];
    int count=prepareFinal(b);
    for(int i=0;i<128;++i){
        double h=std::exp(std::log(4095.)*i/127.);
        auto z=finalResponse(b,count,h);
        filterResponse[2*i]=(float)h;
        filterResponse[2*i+1]=(float)(10/std::log(10.)*std::log(std::max(1e-20,z.r*z.r+z.i*z.i)));
    }
    return 128;
}
int mt_table_filter(int oversample){
    const int n=activeN;
    int m=n*oversample;
    if(oversample<1||oversample>64||(oversample&(oversample-1))||m>MAX_N)return -1;
    const double mix=clip(filterParams[5],0,1),drive=clip(filterParams[4],0,36);
    if(filterParams[0]<.5||mix==0){
        for(int i=0;i<n;++i)out[i]=inputA[i];
        return n;
    }
    // At zero drive the operation is linear: frequency multiplication at n is
    // already the periodic steady-state solution. Do not waste 64x CPU on it.
    if(drive<=0)m=n;
    if(m==n){
        for(int j=0;j<n;++j)workA[j]=inputA[j];
    }
    else downsample(inputA,n,workA,m);
    if(drive>0){
        double gain=std::exp(drive*std::log(10.)/20.),wet=std::min(1.,drive/6.),div=tanhApprox(gain);
        for(int j=0;j<m;++j){
            double x=workA[j];
            workA[j]=(float)(x+wet*(tanhApprox(x*gain)/div-x));
        }
    }
    analyse(workA,m,re,im);
    MTBiquad b[3];
    int count=prepareFinal(b);
    for(int k=0;k<=m/2;++k){
        auto h=finalResponse(b,count,k);
        double r=re[k]*h.r-im[k]*h.i,i=re[k]*h.i+im[k]*h.r;
        re[k]=r;
        im[k]=(k==0||k==m/2)?0:i;
        if(k>0&&k<m/2){
            re[m-k]=r;
            im[m-k]=-i;
        }
    }
    fft(re,im,m,true);
    for(int j=0;j<m;++j)workA[j]=(float)safeFinite(re[j]);
    if(m==n)for(int j=0;j<n;++j)out[j]=workA[j];
    else downsample(workA,m,out,n);
    for(int j=0;j<n;++j){
        double y=inputA[j]+mix*(out[j]-inputA[j]);
        if(!std::isfinite(y))return -2;
        out[j]=(float)y;
    }
    return n;
}
// Optional explicit playback band limit, NOT automatic removal of bright content.
int mt_final_cleanup(int removeDC,int harmonicLimit){
    const int n=activeN;
    analyse(inputA,n,re,im);
    if(removeDC)re[0]=im[0]=0;
    const int limit=std::max(1,std::min(n/2-1,harmonicLimit));
    for(int k=limit+1;k<=n/2;++k){
        re[k]=im[k]=0;
        if(k<n/2)re[n-k]=im[n-k]=0;
    }
    fft(re,im,n,true);
    for(int j=0;j<n;++j)out[j]=(float)safeFinite(re[j]);
    return n;
}
// Four-times periodic peak estimate, not a standards-certified true-peak meter.
double mt_peak_scan(int factor){
    factor=factor==4?4:1;
    int m=activeN*factor;
    downsample(inputA,activeN,workA,m);
    double peak=0;
    for(int i=0;i<m;++i)peak=std::max(peak,std::fabs(double(workA[i])));
    return peak;
}
