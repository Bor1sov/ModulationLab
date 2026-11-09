export interface FFTResult {
  freqs: number[];
  real: number[];
  imag: number[];
  magnitude: number[];
}

export function dft(signal: number[]): { real: number[]; imag: number[] } {
  const n = signal.length;
  const cosT = new Float64Array(n);
  const sinT = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const a = (-2 * Math.PI * i) / n;
    cosT[i] = Math.cos(a);
    sinT[i] = Math.sin(a);
  }
  const real = new Array(n);
  const imag = new Array(n);
  for (let k = 0; k < n; k++) {
    let re = 0;
    let im = 0;
    let idx = 0;
    for (let i = 0; i < n; i++) {
      re += signal[i] * cosT[idx];
      im += signal[i] * sinT[idx];
      idx = (idx + k) % n;
    }
    real[k] = re;
    imag[k] = im;
  }
  return { real, imag };
}

export function idftReal(real: number[], imag: number[]): number[] {
  const n = real.length;
  const out = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    let re = 0;
    for (let k = 0; k < n; k++) {
      const a = (2 * Math.PI * k * i) / n;
      re += real[k] * Math.cos(a) - imag[k] * Math.sin(a);
    }
    out[i] = re / n;
  }
  return out;
}

export function getFFT(sig: number[], fs: number): FFTResult {
  const n = sig.length;
  const { real, imag } = dft(sig);
  const freqs: number[] = [];
  const mag: number[] = [];
  for (let i = 0; i < n; i++) {
    let f = (i * fs) / n;
    if (f >= fs / 2) f -= fs;
    freqs.push(f);
    mag.push(Math.hypot(real[i], imag[i]));
  }
  return { freqs, real, imag, magnitude: mag };
}

export function cutBand(
  spec: FFTResult,
  fLow: number,
  fHigh: number
): { real: number[]; imag: number[] } {
  const real = [...spec.real];
  const imag = [...spec.imag];
  for (let i = 0; i < spec.freqs.length; i++) {
    const f = Math.abs(spec.freqs[i]);
    if (!(f >= fLow && f <= fHigh)) {
      real[i] = 0;
      imag[i] = 0;
    }
  }
  return { real, imag };
}

export function inverseFFT(real: number[], imag: number[]): number[] {
  return idftReal(real, imag);
}


function biquadLowpass(fc: number, fs: number, q: number) {
  const w0 = (2 * Math.PI * fc) / fs;
  const cosw0 = Math.cos(w0);
  const alpha = Math.sin(w0) / (2 * q);

  const b0 = (1 - cosw0) / 2;
  const b1 = 1 - cosw0;
  const b2 = (1 - cosw0) / 2;
  const a0 = 1 + alpha;
  const a1 = -2 * cosw0;
  const a2 = 1 - alpha;

  return {
    b: [b0 / a0, b1 / a0, b2 / a0],
    a: [1, a1 / a0, a2 / a0],
  };
}

function convolve(x: number[], y: number[]): number[] {
  const r = new Array(x.length + y.length - 1).fill(0);
  for (let i = 0; i < x.length; i++)
    for (let j = 0; j < y.length; j++) r[i + j] += x[i] * y[j];
  return r;
}

function butterLowpass4(fc: number, fs: number): { b: number[]; a: number[] } {
  const s1 = biquadLowpass(fc, fs, 0.54119610);
  const s2 = biquadLowpass(fc, fs, 1.30656296);
  return { b: convolve(s1.b, s2.b), a: convolve(s1.a, s2.a) };
}

function iirFilter(input: number[], b: number[], a: number[]): number[] {
  const out = new Array(input.length);
  let z1 = 0;
  let z2 = 0;
  for (let i = 0; i < input.length; i++) {
    const x = input[i];
    const y = b[0] * x + z1;
    z1 = b[1] * x - a[1] * y + z2;
    z2 = b[2] * x - a[2] * y;
    out[i] = y;
  }
  return out;
}

export function applyLowpass(signal: number[], fs: number, cutoff = 10): number[] {
  const { b, a } = butterLowpass4(cutoff, fs);
  const n = signal.length;
  const padLen = 3 * Math.max(a.length, b.length);

  const padded = new Array(n + 2 * padLen);
  for (let i = 0; i < padLen; i++) padded[i] = 2 * signal[0] - signal[padLen - i];
  for (let i = 0; i < n; i++) padded[padLen + i] = signal[i];
  for (let i = 0; i < padLen; i++)
    padded[padLen + n + i] = 2 * signal[n - 1] - signal[n - 2 - i];

  let y = iirFilter(padded, b, a);
  y.reverse();
  y = iirFilter(y, b, a);
  y.reverse();

  return y.slice(padLen, padLen + n);
}