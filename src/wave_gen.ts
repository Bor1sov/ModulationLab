export class WaveBuilder {
  fs: number;
  tEnd: number;
  time: number[];

  constructor(fs = 1000, tEnd = 1.0) {
    this.fs = fs;
    this.tEnd = tEnd;
    this.time = this._makeTime();
  }

  private _makeTime(): number[] {
    const n = Math.floor(this.fs * this.tEnd);
    const dt = 1 / this.fs;
    return Array.from({ length: n }, (_, i) => i * dt);
  }

  rebuild(fs: number, tEnd: number): void {
    this.fs = fs;
    this.tEnd = tEnd;
    this.time = this._makeTime();
  }

  harmonic(freq: number): number[] {
    return this.time.map(t => Math.sin(2 * Math.PI * freq * t));
  }

  square(freq: number): number[] {
    return this.time.map(t => (Math.sin(2 * Math.PI * freq * t) >= 0 ? 1.0 : 0.0));
  }
}