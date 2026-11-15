/**
* Mathematical and deterministic experimental waveform functions.
*
* These functions run on a finished single-cycle or interpolated frame.
*
* The renderer includes this file in engine.cpp in a controlled order.
* Internal state and ABI remain unchanged during this structural migration.
*/

// New Mod Table shapes, not copies or circuit models of external instruments.
// Each is an explicit deterministic function of normalized cycle phase.
static unsigned mtHash(unsigned x){
    x^=x>>16;
    x*=0x7feb352dU;
    x^=x>>15;
    x*=0x846ca68bU;
    x^=x>>16;
    return x;
}
static double hashUnit(unsigned x){
    return double(mtHash(x)&0xffffffU)/16777215.;
}
static double triangleUnit(double p){
    return 1.-4.*std::fabs(frac(p)-.5);
}
static bool isPrime(int n){
    if(n<2)return false;
    for(int k=2;k*k<=n;++k)if(n%k==0)return false;
    return true;
}
static bool isFibonacci(int n){
    int a=1,b=2;
    while(b<n){
        int c=a+b;
        a=b;
        b=c;
    }
    return n==1||b==n;
}
static double experimentalWave(int family,int variant,double p,double size,double detail,double character,unsigned seed){
    p=frac(p);
    size=clip(size,.05,.95);
    character=clip(character,0,1);
    int count=(int)clip(std::round(detail),2,32);
    double x=std::sin(TAU*p),tri=triangleUnit(p),v=0,sum=0;
    if(family==5){
        switch(variant){
            case 0:return x/(1+(1-size)*7*std::fabs(std::cos(TAU*p)));
            case 1:return .65*x+.35*std::sin(TAU*(2*p+size));
            case 2:{
                double q=p<size?p/(2*size):.5+(p-size)/(2*(1-size));
                return 2*std::floor(q*count)/(count-1)-1;
            }
            case 3:{
                double d=std::fabs(p-.5),width=.006+.25*size;
                return 2*std::exp(-d*d/(width*width))-1;
            }
            case 4:return (x<0?-1:1)*std::exp((.15+size*.8)*std::log(std::max(1e-12,std::fabs(x))));
            case 5:{
                double a=p/size;
                if(p<size)return 2*a*a-1;
                return 1-2*(p-size)/(1-size);
            }
            case 6:return p<size?triangleUnit(p/size):(.3+.7*character)*triangleUnit((p-size)/(1-size));
            case 7:return clip(tri*(1+size*7),-1,.3+.7*character);
        }
    }
    if(family==6 || (family==9&&variant==4)){
        if(family==6&&variant==0){
            double a=1,b=x;
            for(int k=2;k<=count;++k){
                double c=2*x*b-a;
                a=b;
                b=c;
            }
            return (1-size)*x+size*b;
        }
        // Prepare partial coefficients once per source parameter set. Recurrence
        // avoids 32 JS Math imports per sample in dense 64-source WASM renders.
        static int cf=-1,cv=-1,cn=-1;
        static double cs=-1,cc=-1,den=1;
        static unsigned cseed=0;
        static double sineCoeff[33]{
        },
        cosineCoeff[33]{
        };
        if(cf!=family||cv!=variant||cn!=count||cs!=size||cc!=character||cseed!=seed){
            cf=family;
            cv=variant;
            cn=count;
            cs=size;
            cc=character;
            cseed=seed;
            den=0;
            for(int h=1;h<=count;++h){
                double gain=1./std::exp((.4+size*2)*std::log(double(h))),phase=0;
                bool use=true;
                if(family==9){
                    use=hashUnit(seed+h*31)>.3;
                    gain=1./std::exp((.2+size)*std::log(double(h)));
                    phase=TAU*hashUnit(seed+h*73);
                }
                else switch(variant){
                    case 1:use=h==1||isPrime(h);
                    break;
                    case 2:use=isFibonacci(h);
                    break;
                    case 3:use=h%2==1;
                    break;
                    case 4:use=h%2==0;
                    break;
                    case 5:phase=TAU*character*h*h/(count+1);
                    break;
                    case 6:{
                        double d=(h-(1+size*(count-1)))/(1+character*count*.3);
                        gain=std::exp(-.5*d*d);
                        break;
                    }
                    case 7:use=h==1||h%(2+(int)(character*6))==0;
                    break;
                    case 8:{
                        double a=(h-count*size)/(1+character*3),b=(h-count*(1-size))/(1+character*3);
                        gain=std::exp(-a*a)+.7*std::exp(-b*b);
                        break;
                    }
                }
                if(!use)gain=0;
                sineCoeff[h]=gain*std::cos(phase);
                cosineCoeff[h]=gain*std::sin(phase);
                den+=std::fabs(gain);
            }
        }
        double st=std::sin(TAU*p),ct=std::cos(TAU*p),sh=st,ch=ct;
        for(int h=1;h<=count;++h){
            v+=sineCoeff[h]*sh+cosineCoeff[h]*ch;
            double next=ch*ct-sh*st;
            sh=sh*ct+ch*st;
            ch=next;
        }
        return den>0?v/den:0;
    }
    if(family==7){
        switch(variant){
            case 0:return std::sin(TAU*(p+.18*size*std::sin(TAU*p)+.08*character*std::sin(3*TAU*p)));
            case 1:return std::sin(TAU*(1+count*size)*p)*std::sin(PI*p)*std::sin(PI*p);
            case 2:return std::sin(TAU*(p+.15*size*std::sin(TAU*count*p)));
            case 3:{
                double q=p<size?size-p:p;
                return std::sin(TAU*q);
            }
            case 4:return std::sin(TAU*triangleUnit(p*(1+count*size)));
            case 5:{
                double q=frac(p*count);
                return q<size*.5?std::sin(PI*q/(size*.5)):0;
            }
        }
    }
    if(family==8){
        double drive=1+size*7;
        switch(variant){
            case 0:return std::sin(x*drive*PI*.5);
            case 1:return std::sin(tri*drive*PI*.5);
            case 2:return triangleUnit((x*drive+1)*.25);
            case 3:return x>=0?tanhApprox(x*drive):tanhApprox(x*(1+character*2))*.6;
            case 4:return (1-size)*x+size*(4*x*x*x-3*x);
            case 5:return x+(frac(p*count)<size?1:-1)*.25*character;
        }
    }
    if(family==9){
        switch(variant){
            case 0:for(int h=0;h<std::min(count,10);++h){
                double gain=std::exp(-h*(.2+size*1.5));
                v+=gain*triangleUnit(p*(1<<h));
                sum+=gain;
            }
            return v/sum;
            case 1:{
                int cells=count*2,cell=(int)(p*cells);
                unsigned row=mtHash(seed),rule=30U+(unsigned)(character*220);
                for(int k=0;k<1+(int)(size*12);++k){
                    unsigned next=0;
                    for(int j=0;j<32;++j){
                        unsigned code=((row>>((j+31)%32))&1U)*4+((row>>j)&1U)*2+((row>>((j+1)%32))&1U);
                        next|=((rule>>code)&1U)<<j;
                    }
                    row=next;
                }
                return ((row>>(cell%32))&1U)?1:-1;
            }
            case 2:{
                double u=.05+.9*hashUnit(seed+(unsigned)(p*count));
                for(int k=0;k<1+(int)(size*12);++k)u=(3.2+.79*character)*u*(1-u);
                return 2*u-1;
            }
            case 3:{
                double d=p-.5,width=.04+.4*size;
                return std::cos(TAU*count*d)*std::exp(-d*d/(width*width));
            }
            case 4:for(int h=1;h<=count;++h){
                double a=hashUnit(seed+h*31);
                if(a>.3){
                    double g=1./std::exp((.2+size)*std::log(double(h)));
                    v+=g*std::sin(TAU*h*p+TAU*hashUnit(seed+h*73));
                    sum+=g;
                }
            }
            return sum?v/sum:0;
            case 5:{
                double q=p*count;
                int cell=(int)q;
                double t=q-cell;
                t=t*(1-size)+size*t*t*(3-2*t);
                return 2*((1-t)*hashUnit(seed+cell*71)+t*hashUnit(seed+((cell+1)%count)*71))-1;
            }
        }
    }
    return x;
}
