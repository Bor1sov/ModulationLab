import { WaveBuilder } from './wave_gen';
import { SignalModulator } from './modulator';
import { getFFT, cutBand, inverseFFT, applyLowpass } from './spectrum_proc';

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
  envelopeShort: number[];
}

const CUT_LOW = 15;
const CUT_HIGH = 25;

export function runAnalysis(fs: number, dur: number): AnalysisResult {
  const wave = new WaveBuilder(fs, dur);
  wave.rebuild(fs, dur);

  const t = wave.time;
  const carrierF = 20;
  const modF = 2;

  const mSig = wave.square(modF);
  const carrier = wave.harmonic(carrierF);

  const mod = new SignalModulator(fs, t);
  const amSig = mod.am(carrierF, mSig);
  const fmSig = mod.fm(carrierF, mSig);
  const pmSig = mod.pm(carrierF, mSig);

  const fftAm = getFFT(amSig, fs);
  const fftFm = getFFT(fmSig, fs);
  const fftPm = getFFT(pmSig, fs);

  const posIdx: number[] = [];
  for (let i = 0; i < fftAm.freqs.length; i++) {
    const f = fftAm.freqs[i];
    if (f > 0 && f < 100) posIdx.push(i);
  }

  const fShow = posIdx.map(i => fftAm.freqs[i]);
  const specAm = posIdx.map(i => fftAm.magnitude[i]);
  const specFm = posIdx.map(i => fftFm.magnitude[i]);
  const specPm = posIdx.map(i => fftPm.magnitude[i]);

  const cut = cutBand(fftAm, CUT_LOW, CUT_HIGH);
  const synth = inverseFFT(cut.real, cut.imag);

  const cutMag: number[] = posIdx.map(i => Math.hypot(cut.real[i], cut.imag[i]));

  const rectified = synth.map(v => Math.abs(v));

  const envelope = applyLowpass(rectified, fs, 10);

  let envMin = Infinity;
  let envMax = -Infinity;
  for (const v of envelope) {
    if (v < envMin) envMin = v;
    if (v > envMax) envMax = v;
  }
  const envRange = envMax - envMin || 1;
  const envelopeNorm = envelope.map(v => (v - envMin) / envRange);

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
    envelopeShort: sl(envelope),
  };
}