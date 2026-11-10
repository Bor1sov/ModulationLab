import { WaveBuilder } from './wave_gen';
import { SignalModulator } from './modulator';
import { getFFT, cutBand, inverseFFT, applyLowpass } from './spectrum_proc';

const CARRIER_F = 40;
const MOD_F = 4;

export const CUT_LOW = 5;
export const CUT_HIGH = 2 * CARRIER_F - CUT_LOW;

const LPF_CUTOFF = 36;
const THRESHOLD_RATIO = 0.1;

export interface AnalysisResult {
  fs: number;
  dur: number;
  tShort: number[];
  carrierShort: number[];
  mSigShort: number[];
  amShort: number[];
  fmShort: number[];
  pmShort: number[];
  fShow: number[];
  specAm: number[];
  specFm: number[];
  specPm: number[];
  cutSpecMag: number[];
  synthShort: number[];
  filteredShort: number[];
  envelopeRawShort: number[];
  squareRecovered: number[];
}

export function runAnalysis(fs: number, dur: number): AnalysisResult {
  const wave = new WaveBuilder(fs, dur);
  wave.rebuild(fs, dur);

  const t = wave.time;

  const mSig = wave.square(MOD_F);
  const carrier = wave.harmonic(CARRIER_F);

  const mod = new SignalModulator(fs, t);
  const amSig = mod.am(CARRIER_F, mSig);
  const fmSig = mod.fm(CARRIER_F, mSig);
  const pmSig = mod.pm(CARRIER_F, mSig);

  const fftAm = getFFT(amSig, fs);
  const fftFm = getFFT(fmSig, fs);
  const fftPm = getFFT(pmSig, fs);

  const posIdx: number[] = [];
  for (let i = 0; i < fftAm.freqs.length; i++) {
    const f = fftAm.freqs[i];
    if (f > 0 && f < 200) posIdx.push(i);
  }

  const fShow = posIdx.map(i => fftAm.freqs[i]);
  const specAm = posIdx.map(i => fftAm.magnitude[i]);
  const specFm = posIdx.map(i => fftFm.magnitude[i]);
  const specPm = posIdx.map(i => fftPm.magnitude[i]);

  const cut = cutBand(fftAm, CUT_LOW, CUT_HIGH, THRESHOLD_RATIO);
  const synth = inverseFFT(cut.real, cut.imag);

  const cutMag: number[] = posIdx.map(i => Math.hypot(cut.real[i], cut.imag[i]));

  const rectified = synth.map(v => Math.abs(v));
  const envelope = applyLowpass(rectified, fs, LPF_CUTOFF);

  let envMin = Infinity;
  let envMax = -Infinity;
  const margin = Math.floor(envelope.length * 0.1);
  for (let i = margin; i < envelope.length - margin; i++) {
    const v = envelope[i];
    if (isFinite(v)) {
      if (v < envMin) envMin = v;
      if (v > envMax) envMax = v;
    }
  }
  
  const envRange = (isFinite(envMax) && isFinite(envMin) && envMax > envMin)
    ? envMax - envMin
    : 1;

  const envelopeNorm = envelope.map(v => {
    if (!isFinite(v) || envMax <= envMin) return 0;
    return (v - envMin) / envRange;
  });

  let sum = 0;
  for (const v of envelopeNorm) {
    sum += v;
  }
  const threshold = sum / envelopeNorm.length;

  const squareRecovered = envelopeNorm.map(v => (v > threshold ? 1.0 : 0.0));

  const shortLen = Math.min(fs, t.length);
  const sl = (arr: number[]) => arr.slice(0, shortLen);

  return {
    fs,
    dur,
    tShort: sl(t),
    carrierShort: sl(carrier),
    mSigShort: sl(mSig),
    amShort: sl(amSig),
    fmShort: sl(fmSig),
    pmShort: sl(pmSig),
    fShow,
    specAm,
    specFm,
    specPm,
    cutSpecMag: cutMag,
    synthShort: sl(synth),
    filteredShort: sl(envelopeNorm),
    envelopeRawShort: sl(envelope),
    squareRecovered: sl(squareRecovered),
  };
}