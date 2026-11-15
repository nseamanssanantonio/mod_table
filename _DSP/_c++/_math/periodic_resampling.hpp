/**
 * Periodic Fourier resampling.
 *
 * Removes out-of-band harmonics before decimating a finished single-cycle waveform.
 *
 * The renderer includes this file in engine.cpp in a controlled order.
 * Internal state and ABI remain unchanged during this structural migration.
 */

// Decimates a periodic waveform after retaining only representable harmonics.
void downsample(const float*x,int m,float*y,int n){
 analyse(x,m,re,im);for(int k=0;k<n;++k)re2[k]=im2[k]=0;
 // Retain only representable harmonics. Nyquist deliberately zero, avoiding
 // polarity-sensitive Nyquist terms. Exact periodic FFT decimation, no edge pad.
 double scale=double(n)/m;re2[0]=re[0]*scale;
 for(int k=1;k<std::min(n/2,m/2);++k){re2[k]=re[k]*scale;im2[k]=im[k]*scale;re2[n-k]=re2[k];im2[n-k]=-im2[k];}
 fft(re2,im2,n,true);for(int j=0;j<n;++j)y[j]=(float)safeFinite(re2[j]);
}
