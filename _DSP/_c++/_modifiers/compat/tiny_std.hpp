#pragma once
// Minimal freestanding subset for the retained Viscera header. No allocator,
// OS imports or fabricated libc. Transcendental functions use explicit JS Math
// imports; all generation, FFT, filtering and processing loops execute in WASM.
extern "C" {
__attribute__((import_module("math"),import_name("sin"))) double mt_sin(double);
__attribute__((import_module("math"),import_name("cos"))) double mt_cos(double);
__attribute__((import_module("math"),import_name("exp"))) double mt_exp(double);
__attribute__((import_module("math"),import_name("log"))) double mt_log(double);
__attribute__((import_module("math"),import_name("tan"))) double mt_tan(double);
__attribute__((import_module("math"),import_name("atan2"))) double mt_atan2(double,double);
}
namespace std {
inline double log(double x){return mt_log(x);}
using uint8_t=unsigned char; using uint32_t=unsigned int; using uint64_t=unsigned long long;
template<class T,unsigned N> struct array { T v[N]; T& operator[](unsigned i){return v[i];} const T& operator[](unsigned i)const{return v[i];} void fill(T x){for(unsigned i=0;i<N;++i)v[i]=x;} T* begin(){return v;} T* end(){return v+N;} };
template<class T> constexpr T min(T a,T b){return a<b?a:b;}
template<class T> constexpr T max(T a,T b){return a>b?a:b;}
inline bool isfinite(float x){return __builtin_isfinite(x);} inline bool isfinite(double x){return __builtin_isfinite(x);}
inline float floor(float x){return __builtin_floorf(x);} inline double floor(double x){return __builtin_floor(x);}
inline float fabs(float x){return __builtin_fabsf(x);} inline double fabs(double x){return __builtin_fabs(x);}
inline float sqrt(float x){return __builtin_sqrtf(x);} inline double sqrt(double x){return __builtin_sqrt(x);}
inline float round(float x){return x<0?-floor(-x+.5f):floor(x+.5f);} inline long lround(float x){return (long)round(x);}
inline double fmod(double x,double y){double q=x/y;return x-__builtin_trunc(q)*y;}
inline float exp(float x){return (float)mt_exp(x);} inline double exp(double x){return mt_exp(x);}
inline float cos(float x){return (float)mt_cos(x);} inline double cos(double x){return mt_cos(x);}
inline float sin(float x){return (float)mt_sin(x);} inline double sin(double x){return mt_sin(x);}
inline float tan(float x){return (float)mt_tan(x);} inline double tan(double x){return mt_tan(x);}
inline double atan2(double y,double x){return mt_atan2(y,x);}
}
