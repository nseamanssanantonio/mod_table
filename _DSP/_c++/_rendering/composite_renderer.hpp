/**
* Composite waveform renderer.
*
* Combines source waves, relationship operations and serial modifiers into one periodic waveform.
*
* The renderer includes this file in engine.cpp in a controlled order.
* Internal state and ABI remain unchanged during this structural migration.
*/

// Evaluates the full source-and-modifier chain into one periodic output cycle.
int mt_render(int sc,int ec,int oversample,int balanced,int removeDC,int normalize){
    if(sc<0||sc>64||ec<0||ec>16||(oversample!=1&&oversample!=2&&oversample!=4&&oversample!=8&&oversample!=16&&oversample!=32&&oversample!=64))return -1;
    const int n=activeN,m=n*oversample;
    lastN=n;
    double weight=0;
    for(int j=0;j<m;++j)workA[j]=0;
    const bool usedGraph=renderRelationshipGraph(sc,m,balanced);
    if(!usedGraph)for(int s=0;s<sc;++s){
        float*c=sources+s*17;
        if(c[1]<.5)continue;
        int type=(int)clip(c[0],0,9),variant=(int)clip(c[16],0,8);
        double influence=clip(c[2],0,1),ratio=clip(c[3],.125,64),size=clip(c[4],.05,.95),phase=clip(c[5],0,1),polarity=c[6]<0?-1:1;
        double a=clip(c[8],0,1),b=clip(c[9],0,1);
        if(b<a){
            double t=a;
            a=b;
            b=t;
        }
        double fadeIn=clip(c[10],0,.5)*(b-a),fadeOut=clip(c[11],0,.5)*(b-a);
        double smooth=clip(c[12],0,1),resonance=clip(c[13],0,1),rough=clip(c[14],0,1),crushed=clip(c[15],0,1);
        weight+=influence;
        for(int j=0;j<m;++j){
            double p=double(j)/m,mask=regionGain(p,a,b,fadeIn,fadeOut);
            if(mask<1e-9)continue;
            double v=sourceShape(type,variant,p,size,ratio,phase,smooth,resonance,rough,crushed,extendedSources[s*4]>0?extendedSources[s*4]:8,extendedSources[s*4+1],(unsigned)extendedSources[s*4+2]);
            workA[j]+=(float)(influence*polarity*mask*v);
        }
    }
    if(!usedGraph&&balanced&&weight>1)for(int j=0;j<m;++j)workA[j]/=weight;
    downsample(workA,m,raw,n);
    float*current=workA;
    float*next=workB;
    int unsettled=0;
    for(int e=0;e<ec;++e){
        float*c=effects+e*4;
        int type=(int)c[0];
        if(c[3]<.5||c[2]<=0)continue;
        if(!allowed(type))return -2;
        applyStage(current,next,m,type,clamp(c[1],0,1),clamp(c[2],0,1),unsettled);
        auto*t=current;
        current=next;
        next=t;
    }
    downsample(current,m,out,n);
    if(removeDC){
        double dc=0;
        for(int j=0;j<n;++j)dc+=out[j];
        dc/=n;
        for(int j=0;j<n;++j)out[j]-=dc;
    }
    if(normalize){
        double peak=0;
        for(int j=0;j<n;++j)peak=std::max(peak,std::fabs(double(out[j])));
        if(peak>1e-8)for(int j=0;j<n;++j)out[j]/=peak;
    }
    measure(out,n);
    stats[3]=unsettled;
    stats[4]=oversample;
    return n;
}
