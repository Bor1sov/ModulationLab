export class SignalModulator {
  fs: number;
  time: number[];

  constructor(fs: number, time: number[]) {
    this.fs = fs;
    this.time = time;
  }

  am(fCarrier: number, mSignal: number[], depth = 0.9): number[] {
    return this.time.map(
      (t, i) => (1 + depth * mSignal[i]) * Math.sin(2 * Math.PI * fCarrier * t)
    );
  }

  fm(fCarrier: number, mSignal: number[], deviation = 20): number[] {
    const integral = new Array(mSignal.length);
    let acc = 0;
    for (let i = 0; i < mSignal.length; i++) {
      acc += (mSignal[i] - 0.5) / this.fs;
      integral[i] = acc;
    }
    return this.time.map((t, i) =>
      Math.sin(2 * Math.PI * fCarrier * t + 2 * Math.PI * deviation * integral[i])
    );
  }

  pm(fCarrier: number, mSignal: number[], phaseShift = Math.PI / 2): number[] {
    return this.time.map((t, i) =>
      Math.sin(2 * Math.PI * fCarrier * t + phaseShift * mSignal[i])
    );
  }
}