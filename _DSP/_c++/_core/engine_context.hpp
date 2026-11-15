/**
* Shared processing context.
*
* Maintains the bounded static buffers and quality settings shared by the
* single-cycle renderer. These arrays are allocated once because the WebAssembly
* runtime has a fixed maximum working size and no dynamic allocation.
*
* The renderer includes this file in engine.cpp in a controlled order.
* Internal state and ABI remain unchanged during this structural migration.
*/

// Mod Table 0.8: variable-resolution periodic renderer, Viscera adapter and final filtering.
// Sources/effects are immutable inputs per call. Audio never waits on this worker.
#include "../_modifiers/vendor/oscillator_modifiers.hpp"
#ifdef MODTABLE_FREESTANDING
extern "C" void* memset(void* d,int c,unsigned long n){
    auto*p=(unsigned char*)d;
    for(unsigned long i=0;i<n;++i)p[i]=(unsigned char)c;
    return d;
}
extern "C" void* memcpy(void* d,const void* s,unsigned long n){
    auto*a=(unsigned char*)d;
    auto*b=(const unsigned char*)s;
    for(unsigned long i=0;i<n;++i)a[i]=b[i];
    return d;
}
#endif
using namespace viscera::modifiers;
namespace {
    constexpr int MAX_N=524288, BASE_N=2048, MAX_FRAME_N=8192;
    int activeN=BASE_N, transitionQuality=4;
    constexpr double PI=3.1415926535897932384626433832795, TAU=2*PI;
    alignas(16) float sources[64*17]{
    },
    effects[16*4]{
    },
    out[MAX_FRAME_N]{
    },
    raw[MAX_FRAME_N]{
    },
    inputA[MAX_FRAME_N]{
    },
    inputB[MAX_FRAME_N]{
    },
    coeff[MAX_FRAME_N*2]{
    };
    alignas(16) float workA[MAX_N]{
    },
    workB[MAX_N]{
    },
    prior[MAX_N]{
    };
    alignas(16) double re[MAX_N]{
    },
    im[MAX_N]{
    },
    re2[MAX_N]{
    },
    im2[MAX_N]{
    };
    float stats[8]{
    };
    int lastN=BASE_N;
