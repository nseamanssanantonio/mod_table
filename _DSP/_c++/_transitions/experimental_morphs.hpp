/**
* Endpoint-safe experimental methods for intermediate keyframe frames.
*
* These functions run on a finished single-cycle or interpolated frame.
*
* The renderer includes this file in engine.cpp in a controlled order.
* Internal state and ABI remain unchanged during this structural migration.
*/

// Endpoint-anchored transition recipes. New processes transform interpolated
// periodic frames; none mutate the committed endpoints or their recipes.
int mt_transition(double t,int method,double amount,int detail,unsigned seed){
    t=clip(t,0,1);
    amount=clip(amount,0,1);
    detail=(int)clip(detail,1,16);
    const int n=activeN;
    if(method<=2||t==0||t==1)return mt_morph(t,method<=2?method:0);
    double limit=8;
    for(int j=0;j<n;++j)limit=std::max(limit,std::max(std::fabs(double(inputA[j])),std::fabs(double(inputB[j])))+0.0);
    limit+=8;
    // Preserve raw-sum endpoint headroom rather than clipping the dry wave.
    double env=std::sin(PI*t);
    env=env*env*amount;
    mt_morph(t,0);
    // retained dry interpolation
    for(int j=0;j<n;++j)workB[j]=out[j];
    if(amount==0)return n;
    if(method==3||method==9||method==23){
        int mode=method==9?54:method==23?56:53;
        applySpectralRelation(inputA,inputB,workA,n,mode,env,detail);
        for(int j=0;j<n;++j)out[j]=(float)clip(workB[j]+env*(workA[j]-workB[j]),-limit,limit);
        return n;
    }
    bool spectral=method==4||method==7||method==8||method==10||(method>=15&&method<=19);
    if(spectral){
        analyse(inputA,n,re,im);
        analyse(inputB,n,re2,im2);
        for(int k=1;k<n/2;++k){
            double ma=std::sqrt(re[k]*re[k]+im[k]*im[k]),mb=std::sqrt(re2[k]*re2[k]+im2[k]*im2[k]);
            double pa=std::atan2(im[k],re[k]),pb=std::atan2(im2[k],re2[k]);
            if(ma<1e-8)pa=pb;
            if(mb<1e-8)pb=pa;
            double d=pb-pa;
            d-=TAU*std::floor((d+PI)/TAU);
            double local=t,mag=ma+(mb-ma)*local,phase=pa+d*local;
            if(method==4)phase+=env*TAU*detail*k/(k+8.);
            if(method==7){
                local=clip(t+env*.35*std::sin(TAU*(detail*t+k*.13)),0,1);
                mag=ma+(mb-ma)*local;
                phase=pa+d*local;
            }
            if(method==8){
                phase+=env*TAU*std::sin(k*.17+TAU*t*detail);
                mag*=1+env*.6*std::sin(k*.31-TAU*t*detail);
            }
            if(method==10)mag*=1-env*(.5+.5*std::cos(TAU*(k/double(detail+1)-t*detail)));
            if(method==15)phase*=1-env;
            // align partials temporarily, retaining magnitudes
            if(method==16)phase+=env*TAU*(hashUnit(seed+k*31)-.5)*detail;
            if(method==17)phase+=env*PI*(.5+.5*std::sin(TAU*t*detail-k*.21));
            if(method==18){
                int lo=std::max(1,k-1),hi=std::min(n/2-1,k+1);
                double mb1=std::sqrt(re2[lo]*re2[lo]+im2[lo]*im2[lo]),mb2=std::sqrt(re2[hi]*re2[hi]+im2[hi]*im2[hi]);
                mag=mag*(1-env)+env*(mag+mb1+mb2)/3;
            }
            if(method==19){
                double threshold=hashUnit(seed+k/ detail*11);
                local=clip((t-threshold)*8+.5,0,1);
                local=t+env*(local-t);
                mag=ma+(mb-ma)*local;
                phase=pa+d*local;
            }
            re[k]=mag*std::cos(phase);
            im[k]=mag*std::sin(phase);
            re[n-k]=re[k];
            im[n-k]=-im[k];
        }
        re[0]=re[0]*(1-t)+re2[0]*t;
        im[0]=0;
        re[n/2]=im[n/2]=0;
        fft(re,im,n,true);
        for(int j=0;j<n;++j)out[j]=(float)clip(workB[j]+env*(re[j]-workB[j]),-limit,limit);
        return n;
    }
    // New nonlinear geometry is evaluated at 4x and periodically decimated,
    // independently of the stored endpoints' original render quality.
    const int m=n*transitionQuality;
    double bmean=0;
    for(int j=0;j<n;++j)bmean+=inputB[j];
    bmean/=n;
    double phase=0;
    for(int j=0;j<m;++j){
        double p=double(j)/m,A=cycleRead(inputA,n,p),B=cycleRead(inputB,n,p),base=A*(1-t)+B*t,v=base;
        switch(method){
            case 5:v=std::sin(base*(1+env*detail)*PI*.5);
            v=base+env*(v-base);
            break;
            case 6:v=(1-t)*cycleRead(inputA,n,phase)+t*B;
            phase+=(1+env*detail*(B-bmean))/m;
            break;
            case 11:{
                double shift=.13*env*std::sin(TAU*p);
                v=(1-t)*cycleRead(inputA,n,p+shift)+t*cycleRead(inputB,n,p-shift);
                break;
            }
            case 12:{
                double u=t+env*.3*std::sin(PI*detail*t);
                v=A*(1-u)+B*u;
                break;
            }
            case 13:{
                double cell=std::floor(p*detail),u=clip(t+env*(hashUnit(seed+(unsigned)cell)-.5),0,1),q=frac(p+env*cell/(detail*2.));
                v=(1-u)*cycleRead(inputA,n,q)+u*cycleRead(inputB,n,q);
                break;
            }
            case 14:{
                double width=.04*env;
                v=.25*cycleRead(workB,n,p-width)+.5*base+.25*cycleRead(workB,n,p+width);
                break;
            }
            case 20:{
                double u=clip(t+env*.45*std::sin(TAU*t*detail),0,1);
                v=A*(1-u)+B*u;
                break;
            }
            case 21:{
                double u=std::round(t*(detail+1))/(detail+1);
                u=t+env*(u-t);
                v=A*(1-u)+B*u;
                break;
            }
            case 22:{
                double x=base;
                for(int k=0;k<detail;++k)x=tanhApprox(std::sin(x*(1+env*3))*1.4);
                v=base+env*(x-base);
                break;
            }
            case 24:{
                double x=0,g=.5;
                for(int k=1;k<=detail;++k){
                    x+=g*cycleRead(workB,n,p*(k+1));
                    g*=.65;
                }
                v=base+env*.5*x;
                break;
            }
        }
        workA[j]=(float)clip(v-base,-8,8);
    }
    // Decimate only the newly generated residual. Resampling the whole dry
    // waveform would change bright committed endpoints just before t=0/1.
    downsample(workA,m,out,n);
    for(int j=0;j<n;++j)out[j]=(float)clip(workB[j]+out[j],-limit,limit);
    return n;
}
