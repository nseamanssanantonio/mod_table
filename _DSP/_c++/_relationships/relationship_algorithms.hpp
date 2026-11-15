/**
* Arithmetic, geometry, FM, phase, spectral and bitwise wave-to-wave processing.
*
* These functions run on a finished single-cycle or interpolated frame.
*
* The renderer includes this file in engine.cpp in a controlled order.
* Internal state and ABI remain unchanged during this structural migration.
*/

// Wave-to-wave relations. Offline graph evaluation at the selected oversampling.
// Nodes are single periodic buffers, never independent synth voices.
static float relations[64*14]{
},
extendedSources[64*4]{
};
// Scratch recycling, heavier subtree first: at most 8 slots for 64 leaves.
// Ten slots include safety headroom; no render-time heap allocation.
static float graphData[10*MAX_N]{
};
static bool graphUsed[10]{
};
static int nodeSlots[128]{
},
nodeNeeds[128]{
};
static int takeGraphSlot(){
    for(int i=0;i<10;++i)if(!graphUsed[i]){
        graphUsed[i]=true;
        return i;
    }
    return -1;
}
static int graphNeed(int i);
/**
* RelationNode groups the values needed for its processing stage.
* Instances do not own external browser or interface state.
*/
struct RelationNode {
    int source,left,right,relation;
    double weight;
};
static RelationNode graphNodes[128];
static int graphCount=0;
float* mt_relations(){
    return relations;
}
float* mt_extended_sources(){
    return extendedSources;
}
static double cycleRead(const float*x,int n,double phase){
    double q=frac(phase)*n;
    int j=(int)q;
    double t=q-j;
    // Cubic interpolation on the periodic ring. Final FFT decimation handles
    // the output band limit; this lookup alone is not an anti-aliasing filter.
    double a=x[(j+n-1)%n],b=x[j],c=x[(j+1)%n],d=x[(j+2)%n];
    return b+.5*t*(c-a+t*(2*a-5*b+4*c-d+t*(3*(b-c)+d-a)));
}
static double signPower(double x,double p){
    return (x<0?-1.:1.)*std::exp(p*std::log(std::max(1e-12,std::fabs(x))));
}
static unsigned quantized(double x,int bits){
    unsigned mask=(1U<<bits)-1;
    return (unsigned)clip(std::floor((clip(x,-1,1)*.5+.5)*mask+.5),0,mask);
}
static double unquantized(unsigned x,int bits){
    return 2.*double(x&((1U<<bits)-1))/((1U<<bits)-1)-1.;
}
static bool spectralRelation(int mode){
    return (mode>=32&&mode<=38)||mode==53||mode==54||mode==56;
}
static void applySpectralRelation(const float*a,const float*b,float*y,int n,int mode,double depth,int complexity){
    analyse(a,n,re,im);
    analyse(b,n,re2,im2);
    double maximumB=1e-12;
    int strongest=1;
    for(int k=1;k<n/2;++k){
        double mb=std::sqrt(re2[k]*re2[k]+im2[k]*im2[k]);
        if(mb>maximumB){
            maximumB=mb;
            strongest=k;
        }
    }
    if(mode==53||mode==56){
        for(int k=0;k<n;++k)prior[k]=0;
        // real scratch uses graph output; imaginary uses prior
        for(int k=0;k<n;++k)y[k]=0;
        for(int k=1;k<n/2;++k){
            double target=mode==53?k+(strongest-k)*depth:k+(k>=strongest?1:-1)*depth*(1+complexity);
            target=clip(target,1,n/2-1);
            int lo=(int)std::floor(target);
            double f=target-lo;
            for(int j=0;j<2;++j){
                int dest=lo+j;
                if(dest>=n/2)continue;
                double gain=j?f:1-f;
                y[dest]+=(float)(gain*re[k]);
                prior[dest]+=(float)(gain*im[k]);
            }
        }
        for(int k=1;k<n/2;++k){
            re[k]=y[k];
            im[k]=prior[k];
        }
    }
    else{
        // Rotation needs the original spectrum until every destination has read it.
        if(mode==38){
            for(int k=0;k<n;++k){
                y[k]=(float)re[k];
                prior[k]=(float)im[k];
            }
        }
        for(int k=1;k<n/2;++k){
            double ar=re[k],ai=im[k],br=re2[k],bi=im2[k],ma=std::sqrt(ar*ar+ai*ai),mb=std::sqrt(br*br+bi*bi),pa=std::atan2(ai,ar),pb=std::atan2(bi,br),mag=ma,phase=pa;
            if(mode==32){
                re[k]=(ar*br-ai*bi)/n;
                im[k]=(ar*bi+ai*br)/n;
                continue;
            }
            if(mode==33)mag=ma*(1-depth)+mb*depth;
            if(mode==34){
                if(((k-1)/complexity)%2){
                    mag=ma*(1-depth)+mb*depth;
                    double diff=pb-pa;
                    diff-=TAU*std::floor((diff+PI)/TAU);
                    phase=pa+depth*diff;
                }
            }
            if(mode==35)mag=ma*((1-depth)+depth*mb/maximumB);
            if(mode==36)mag=std::max(0.,ma-depth*mb);
            if(mode==37){
                double diff=pb-pa;
                diff-=TAU*std::floor((diff+PI)/TAU);
                phase=pa+depth*diff;
            }
            if(mode==38){
                int band=std::min(n/2-1,16*complexity),shift=(int)(depth*(1+strongest+complexity));
                if(k<=band){
                    int src=1+(k-1+shift)%band;
                    re[k]=y[src];
                    im[k]=prior[src];
                }
                continue;
            }
            if(mode==54)mag=(1-depth)*ma+depth*(std::sqrt(ma*mb)+.25*std::fabs(ma-mb));
            re[k]=mag*std::cos(phase);
            im[k]=mag*std::sin(phase);
        }
    }
    re[0]=im[0]=re[n/2]=im[n/2]=0;
    for(int k=1;k<n/2;++k){
        re[n-k]=re[k];
        im[n-k]=-im[k];
    }
    fft(re,im,n,true);
    for(int j=0;j<n;++j)y[j]=(float)clip(re[j],-8,8);
}
static void applyRelation(const float*a,const float*b,float*y,int n,const float*r){
    int mode=(int)clip(r[0],0,56),bits=(int)clip(r[8],4,24),complexity=(int)clip(r[9],1,16);
    unsigned seed=(unsigned)clip(r[10],0,1000000);
    double depth=clip(r[2],0,1),mix=clip(r[3],0,1),split=clip(r[4],.01,.99),start=clip(r[5],0,1),end=clip(r[6],0,1),fade=clip(r[7],0,.5)*(end-start),polarity=r[12]<0?-1:1;
    if(r[13]<.5||mix==0){
        for(int j=0;j<n;++j)y[j]=a[j];
        return;
    }
    if(spectralRelation(mode))applySpectralRelation(a,b,y,n,mode,depth,complexity);
    double mean=0,phase=0;
    int lastCross=-n;
    if(mode>=4&&mode<=6){
        for(int j=0;j<n;++j){
            double u=mode==5?std::exp(.6931471805599453*depth*6*b[j]):1+depth*12*b[j];
            if(mode==4)u=std::max(0.,u);
            prior[j]=(float)u;
            mean+=u;
        }
        mean/=n;
    }
    if(mode==21||mode==22)for(int j=0;j<n;++j)if(b[(j+n-1)%n]<=0&&b[j]>0)lastCross=j-n;
    bool selectB=false;
    for(int j=0;j<n;++j){
        double p=double(j)/n,A=a[j],B=b[j],v=A;
        if(spectralRelation(mode))v=y[j];
        else switch(mode){
            case 0:v=A+B;
            break;
            case 1:v=A-B;
            break;
            case 2:{
                double qA=p/split,qB=(p-split)/(1-split),edge=.0001+.04*depth;
                double t=clip((p-split+edge)/(2*edge),0,1);
                t=t*t*(3-2*t);
                v=(1-t)*cycleRead(a,n,qA)+t*cycleRead(b,n,qB);
                break;
            }
            case 3:{
                double c=2*split-1;
                v=std::max(A,c)+std::min(B,c)-c;
                break;
            }
            case 4:case 5:case 6:{
                v=cycleRead(a,n,phase);
                double speed=mode==6?prior[j]-(mean-1):mean>1e-12?prior[j]/mean:1;
                phase+=speed/n;
                break;
            }
            case 7:v=A*B;
            break;
            case 8:{
                double floor=.5-.48*depth,den=(B<0?-1:1)*std::max(floor,std::fabs(B));
                v=A/den;
                break;
            }
            case 9:v=std::min(A,B);
            break;
            case 10:v=std::max(A,B);
            break;
            case 11:v=std::fabs(A-B);
            break;
            case 12:{
                double d=clip(A-B,-2,2);
                v=d*d*.5;
                break;
            }
            case 13:v=signPower(clip(A,-1,1),std::exp(depth*B*1.6));
            break;
            case 14:{
                double threshold=clip(.05+.95*(B*.5+.5),.025,2);
                v=2*threshold*(frac((A+threshold)/(2*threshold))-.5);
                break;
            }
            case 15:case 16:{
                double d=A-B,soft=.001+.5*depth;
                v=.5*(A+B+(mode==15?-1:1)*std::sqrt(d*d+soft*soft));
                break;
            }
            case 17:v=tanhApprox(A*(1+depth*10*(B*.5+.5)));
            break;
            case 18:v=cycleRead(a,n,p+depth*.5*B);
            break;
            case 19:v=cycleRead(a,n,p+depth*.3*B*std::sin(TAU*p));
            break;
            case 20:v=cycleRead(a,n,.5+.5*triangleUnit((p+depth*.5*B)*.5));
            break;
            case 21:case 22:{
                if(b[(j+n-1)%n]<=0&&B>0)lastCross=j;
                double synced=cycleRead(a,n,double(j-lastCross)/n*(1+complexity));
                v=mode==22?synced:A*(1-depth)+depth*synced;
                break;
            }
            case 23:v=cycleRead(a,n,B>2*split-1?1-p:p);
            break;
            case 24:{
                double steps=2+complexity*4*(1+depth*B);
                v=cycleRead(a,n,std::floor(p*steps)/steps);
                break;
            }
            case 25:v=cycleRead(a,n,B>2*split-1?std::fabs(2*p-1):p);
            break;
            case 26:{
                double d=std::fabs(p-split),width=.01+.49*depth,edge=.01;
                double t=clip((width-d)/edge,0,1);
                t=t*t*(3-2*t);
                v=A+(B-A)*t;
                break;
            }
            case 27:if(std::fabs(A)<.03||std::fabs(B)<.03)selectB=B>A;
            v=selectB?B:A;
            break;
            case 28:v=A*((1-depth)+depth*std::fabs(B));
            break;
            case 29:v=A+depth*B*(1-std::min(1.,A*A));
            break;
            case 30:v=A/(1+depth*6*std::fabs(B));
            break;
            case 31:{
                int step=std::max(1,n/256);
                double curvature=(b[(j+step)%n]+b[(j+n-step)%n]-2*B);
                v=A+depth*4*curvature;
                break;
            }
            case 39:case 40:case 41:case 42:case 43:case 47:{
                unsigned u=quantized(A,bits),vB=quantized(B,bits),word=(1U<<bits)-1,result=u;
                int shift=(int)clip(std::floor((B*.5+.5)*(bits-1)),0,bits-1);
                if(mode==39)result=u^vB;
                if(mode==40)result=u&vB;
                if(mode==41)result=u|vB;
                if(mode==42)result=(u&0x55555555U)|(vB&0xaaaaaaaaU);
                if(mode==43)result=(u<<shift)&word;
                if(mode==47&&shift)result=((u<<shift)|(u>>(bits-shift)))&word;
                v=unquantized(result,bits);
                break;
            }
            case 44:v=A>B?1:-1;
            break;
            case 45:v=B>2*split-1?A:0;
            break;
            case 46:v=B>=0?A:B;
            break;
            case 48:{
                double threshold=.05+.95*std::fabs(B);
                v=threshold*triangleUnit((A/threshold+1)*.25);
                break;
            }
            case 49:{
                double displacement=0,gain=.5;
                for(int k=0;k<complexity;++k){
                    displacement+=gain*cycleRead(b,n,p*(k+1));
                    gain*=.5;
                }
                v=cycleRead(a,n,p+depth*displacement);
                break;
            }
            case 50:{
                double av=A,bv=B;
                for(int k=0;k<complexity;++k){
                    double nextA=cycleRead(a,n,p+depth*.15*bv),nextB=cycleRead(b,n,p+depth*.15*av);
                    av=nextA;
                    bv=nextB;
                }
                v=.75*av+.25*bv;
                break;
            }
            case 51:{
                double width=depth*(.001+.03*std::fabs(B));
                v=(cycleRead(a,n,p-width)+2*A+cycleRead(a,n,p+width))*.25;
                break;
            }
            case 52:v=A+depth*.5*B*std::sin(TAU*(1+complexity)*p);
            break;
            case 55:{
                v=A;
                for(int k=0;k<complexity;++k)v=std::sin(v*(1+depth*(1+std::fabs(B)))*PI*.5);
                break;
            }
        }
        double mask=regionGain(p,start,end,fade,fade)*mix;
        y[j]=(float)clip(A+(polarity*v-A)*mask,-8,8);
    }
}
static void generateSource(int index,float*y,int n){
    float*c=sources+index*17,*x=extendedSources+index*4;
    int type=(int)clip(c[0],0,9),variant=(int)clip(c[16],0,8);
    double influence=clip(c[2],0,1),ratio=clip(c[3],.125,64),size=clip(c[4],.05,.95),phase=clip(c[5],0,1),polarity=c[6]<0?-1:1;
    double a=clip(c[8],0,1),b=clip(c[9],0,1);
    if(b<a){
        double t=a;
        a=b;
        b=t;
    }
    double fi=clip(c[10],0,.5)*(b-a),fo=clip(c[11],0,.5)*(b-a);
    for(int j=0;j<n;++j){
        double p=double(j)/n,mask=regionGain(p,a,b,fi,fo);
        y[j]=mask<=0?0:(float)(mask*influence*polarity*sourceShape(type,variant,p,size,ratio,phase,clip(c[12],0,1),clip(c[13],0,1),clip(c[14],0,1),clip(c[15],0,1),x[0]>0?x[0]:8,x[1],(unsigned)x[2]));
    }
}
static int graphNeed(int i){
    auto &v=graphNodes[i];
    if(v.source>=0)return nodeNeeds[i]=1;
    int a=graphNeed(v.left),b=graphNeed(v.right);
    return nodeNeeds[i]=std::max(3,std::max(std::max(a,b),std::min(a,b)+1));
}
static float* evaluateNode(int index,int n){
    auto&node=graphNodes[index];
    if(node.source>=0){
        int slot=takeGraphSlot();
        nodeSlots[index]=slot;
        float*y=graphData+slot*MAX_N;
        generateSource(node.source,y,n);
        node.weight=clip(sources[node.source*17+2],0,1);
        return y;
    }
    float*a,*b;
    if(nodeNeeds[node.left]>=nodeNeeds[node.right]){
        a=evaluateNode(node.left,n);
        b=evaluateNode(node.right,n);
    }
    else{
        b=evaluateNode(node.right,n);
        a=evaluateNode(node.left,n);
    }
    int slot=takeGraphSlot();
    nodeSlots[index]=slot;
    float*y=graphData+slot*MAX_N;
    const float*r=relations+node.relation*14;
    applyRelation(a,b,y,n,r);
    int mode=(int)r[0];
    double mix=r[13]<.5?0:clip(r[3],0,1),aw=graphNodes[node.left].weight,bw=graphNodes[node.right].weight;
    node.weight=(mode==0||mode==1)?aw+mix*bw:aw*(1-mix)+mix*std::max(aw,bw);
    graphUsed[nodeSlots[node.left]]=false;
    graphUsed[nodeSlots[node.right]]=false;
    return y;
}
static bool renderRelationshipGraph(int count,int n,int balanced){
    bool use=false;
    for(int s=0;s<count;++s){
        const float*r=relations+s*14;
        if(sources[s*17+1]>=.5&&r[11]>.5&&(r[0]!=0||r[3]!=1||r[5]!=0||r[6]!=1||r[7]!=0||r[12]<0||r[13]<.5))use=true;
    }
    if(!use)return false;
    graphCount=0;
    int root=-1,lastLeaf=-1,lastParent=-1;
    for(int s=0;s<count;++s){
        if(sources[s*17+1]<.5)continue;
        int leaf=graphCount++;
        graphNodes[leaf]={
            s,-1,-1,-1,0
        };
        if(root<0){
            root=lastLeaf=leaf;
            continue;
        }
        float*r=relations+s*14;
        // Legacy/no-extension entries still mean additive mix.
        if(r[11]<.5){
            for(int k=0;k<14;++k)r[k]=0;
            r[3]=1;
            r[4]=.5;
            r[6]=1;
            r[8]=12;
            r[9]=4;
            r[12]=r[13]=1;
        }
        int op=graphCount++;
        bool previous=r[1]>.5;
        graphNodes[op]={
            -1,previous?lastLeaf:root,leaf,s,0
        };
        if(previous&&lastParent>=0)graphNodes[lastParent].right=op;
        else root=op;
        lastLeaf=leaf;
        lastParent=op;
    }
    if(root<0){
        for(int j=0;j<n;++j)workA[j]=0;
        return true;
    }
    for(int i=0;i<10;++i)graphUsed[i]=false;
    graphNeed(root);
    float*y=evaluateNode(root,n);
    double gain=balanced?std::max(1.,graphNodes[root].weight):1.;
    for(int j=0;j<n;++j)workA[j]=(float)(y[j]/gain);
    return true;
}
