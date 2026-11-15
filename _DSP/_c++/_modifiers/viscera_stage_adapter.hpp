/**
* Modifier stage processing.
*
* Wraps per-voice modifier algorithms around repeated periodic cycles for offline rendering.
*
* The renderer includes this file in engine.cpp in a controlled order.
* Internal state and ABI remain unchanged during this structural migration.
*/

/**
* BufferReader groups the values needed for its processing stage.
* Instances do not own external browser or interface state.
*/
struct BufferReader {
    const float*x;
    int n;
};
// Reads a periodic sample buffer using wrapped linear interpolation.
float readCycle(const void*ctx,float phase) noexcept {
    auto&b=*(const BufferReader*)ctx;
    float p=wrap(phase)*b.n;
    int j=(int)p;
    float t=p-j;
    return b.x[j%b.n]+(b.x[(j+1)%b.n]-b.x[j%b.n])*t;
}
// Rejects unsupported modifier identifiers before constructing a stage.
bool allowed(int t){
    switch(t){
        case 1:case 4:case 5:case 6:case 9:case 10:case 11:case 12:case 13:case 14:case 15:case 16:case 17:case 18:case 19:case 20:case 21:case 22:case 23:case 24:case 25:case 26:case 28:case 29:case 30:case 31:case 32:case 36:case 37:case 38:case 39:case 41:case 42:case 43:case 44:case 45:case 46:case 47:case 48:case 49:case 50:case 51:case 52:case 53:case 54:case 55:case 56:return true;
        default:return false;
    }
}
// Viscera 51/53 use noninteger free-running partial frequencies. For a single
// periodic cycle we reuse their first-eight-partial target formulas and masks,
// distributing each target between adjacent INTEGER harmonic bins instead.
// This adaptation is explicitly labelled in the UI; not the original inharmonic DSP.
// Redistributes selected harmonic bins while preserving a single-cycle period.
void periodicPartials(const float*x,float*y,int n,int type,double shape,double mix){
    analyse(x,n,re,im);
    for(int k=0;k<n;++k)re2[k]=im2[k]=0;
    for(int h=0;h<8;++h){
        int k=h+1;
        double target=type==53?k+.91*shape*((1+(h*5+3)%8)-k):k+shape*.22*k*std::sqrt(double(k));
        double gain=type==53?1+shape*((h%3==0?.20:.65)-1):1;
        int lo=(int)std::floor(target);
        double frac=target-lo;
        for(int q=0;q<2;++q){
            int bin=lo+q;
            if(bin<1||bin>=n/2)continue;
            double a=gain*(q?frac:1-frac);
            re2[bin]+=a*re[k];
            im2[bin]+=a*im[k];
        }
    }
    for(int k=1;k<n/2;++k){
        re2[n-k]=re2[k];
        im2[n-k]=-im2[k];
    }
    fft(re2,im2,n,true);
    for(int j=0;j<n;++j)y[j]=(float)clip(x[j]+shape*mix*(re2[j]-x[j]),-8,8);
}
// Applies one modifier after settling its internal filter memory if necessary.
void applyStage(const float*x,float*y,int n,int type,float shape,float mix,int&unsettled){
    if(type==51||type==53){
        periodicPartials(x,y,n,type,shape,mix);
        return;
    }
    Stage stage;
    Config cfg;
    cfg.type=(Type)type;
    cfg.shape=shape;
    cfg.mix=mix;
    stage.prepare(n*110.f);
    stage.set(cfg);
    stage.reset();
    BufferReader rd{
        x,n
    };
    Frame f;
    f.freqHz=110;
    f.reader={
        readCycle,&rd
    };
    bool memory=type==9||type==10||type==54;
    int cycles=memory?48:1;
    bool converged=!memory;
    for(int cycle=0;cycle<cycles;++cycle){
        double maxDiff=0,maxAmp=0;
        for(int j=0;j<n;++j){
            f.phase=float(j)/n;
            f.sample=x[j];
            f.modPhase=wrap(f.phase+.25f);
            f.modSample=readCycle(&rd,f.modPhase);
            float v=stage.process(f);
            maxDiff=std::max(maxDiff,std::fabs(double(v-prior[j])));
            maxAmp=std::max(maxAmp,std::fabs(double(v)));
            prior[j]=v;
            y[j]=v;
        }
        if(memory&&cycle>=2&&maxDiff<2e-6*(1+maxAmp)){
            converged=true;
            break;
        }
    }
    if(!converged)++unsettled;
}
// Calculates output peak level, DC offset and root-mean-square amplitude.
void measure(float*x,int n){
    double peak=0,dc=0,power=0;
    for(int j=0;j<n;++j){
        peak=std::max(peak,std::fabs(double(x[j])));
        dc+=x[j];
        power+=x[j]*x[j];
    }
    stats[0]=peak;
    stats[1]=dc/n;
    stats[2]=std::sqrt(power/n);
}
