import * as fs from 'fs';
import * as path from 'path';
import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import { createCanvas, loadImage } from 'canvas';
import { Chart, registerables } from 'chart.js';
import type { ChartConfiguration } from 'chart.js';

Chart.register(...registerables);

const OUT_DIR = path.join(process.cwd(), 'output');
const W = 800;
const H = 400;

function ensureOut(): void {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
}

const renderer = new ChartJSNodeCanvas({
  width: W,
  height: H,
  backgroundColour: 'white',
});

type Pt = { x: number; y: number };
const points = (x: number[], y: number[]): Pt[] =>
  x.map((v, i) => ({ x: v, y: y[i] }));

type LineConfig = ChartConfiguration<'line', Pt[]>;

interface ScaleOpts {
  xLabel: string;
  yLabel: string;
  xlim?: [number, number];
}

interface Dataset {
  y: number[];
  color: string;
  dash?: number[];
  label?: string;
}

export interface Panel {
  title: string;
  x: number[];
  datasets: Dataset[];
  xLabel?: string;
  yLabel?: string;
  xlim?: [number, number];
  showLegend?: boolean;
}

function buildConfig(
  title: string,
  x: number[],
  datasets: Dataset[],
  o: ScaleOpts,
  showLegend = false
): LineConfig {
  const cfg = {
    type: 'line' as const,
    data: {
      datasets: datasets.map(d => ({
        label: d.label ?? '',
        data: points(x, d.y),
        borderColor: d.color,
        ...(d.dash ? { borderDash: d.dash } : {}),
        borderWidth: 1.2,
        pointRadius: 0,
        fill: false,
        tension: 0,
      })),
    },
    options: {
      responsive: false,
      animation: false,
      plugins: {
        title: { display: true, text: title, font: { size: 14 } },
        legend: { display: showLegend, position: 'bottom' },
      },
      scales: {
        x: {
          type: 'linear',
          title: { display: true, text: o.xLabel },
          grid: { color: 'rgba(0,0,0,0.08)' },
          min: o.xlim ? o.xlim[0] : undefined,
          max: o.xlim ? o.xlim[1] : undefined,
        },
        y: {
          title: { display: true, text: o.yLabel },
          grid: { color: 'rgba(0,0,0,0.08)' },
        },
      },
    },
  };
  return cfg as unknown as LineConfig;
}

export class FigureMaker {
  static async saveSingle(
    t: number[],
    sig: number[],
    title: string,
    fname: string,
    color = 'teal'
  ): Promise<void> {
    ensureOut();
    const cfg = buildConfig(
      title,
      t,
      [{ y: sig, color }],
      { xLabel: 'Время (с)', yLabel: 'Амплитуда' }
    );
    fs.writeFileSync(path.join(OUT_DIR, fname), await renderer.renderToBuffer(cfg));
  }

  static async saveSpec(
    freqs: number[],
    spec: number[],
    title: string,
    fname: string,
    xlim: [number, number] = [0, 100]
  ): Promise<void> {
    ensureOut();
    const cfg = buildConfig(
      title,
      freqs,
      [{ y: spec, color: 'purple' }],
      { xLabel: 'Частота (Гц)', yLabel: 'Амплитуда', xlim }
    );
    fs.writeFileSync(path.join(OUT_DIR, fname), await renderer.renderToBuffer(cfg));
  }

  static async saveCompare(
    t: number[],
    sig1: number[],
    sig2: number[],
    title: string,
    fname: string
  ): Promise<void> {
    ensureOut();
    const cfg = buildConfig(
      title,
      t,
      [
        { y: sig1, color: 'red', label: 'Восстановленный' },
        { y: sig2, color: 'black', label: 'Исходный (меандр)', dash: [5, 5] },
      ],
      { xLabel: 'Время (с)', yLabel: 'Амплитуда' },
      true
    );
    fs.writeFileSync(path.join(OUT_DIR, fname), await renderer.renderToBuffer(cfg));
  }

  static async saveGrid(
    panels: Panel[],
    rows: number,
    cols: number,
    fname: string
  ): Promise<void> {
    ensureOut();
    const cellW = 500;
    const cellH = 300;
    const cellRenderer = new ChartJSNodeCanvas({
      width: cellW,
      height: cellH,
      backgroundColour: 'white',
    });

    const buffers = await Promise.all(
      panels.map(p => {
        const cfg = buildConfig(
          p.title,
          p.x,
          p.datasets,
          {
            xLabel: p.xLabel ?? '',
            yLabel: p.yLabel ?? '',
            xlim: p.xlim,
          },
          !!p.showLegend
        );
        return cellRenderer.renderToBuffer(cfg);
      })
    );

    const canvas = createCanvas(cellW * cols, cellH * rows);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, cellW * cols, cellH * rows);

    for (let i = 0; i < buffers.length; i++) {
      const img = await loadImage(buffers[i]);
      const r = Math.floor(i / cols);
      const c = i % cols;
      ctx.drawImage(img, c * cellW, r * cellH);
    }

    fs.writeFileSync(path.join(OUT_DIR, fname), canvas.toBuffer('image/png'));
  }
}