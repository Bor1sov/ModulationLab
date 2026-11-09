import { runAnalysis } from './analysis';
import { FigureMaker } from './painter';
import type { Panel } from './painter';

async function main(): Promise<void> {
  const fsArg: string | undefined = process.argv[2];
  const durArg: string | undefined = process.argv[3];

  const fsVal: number = fsArg ? parseInt(fsArg, 10) : 1000;
  const dur: number = durArg ? parseFloat(durArg.replace(',', '.')) : 1.0;

  if (!Number.isFinite(fsVal) || fsVal <= 0) {
    throw new Error('fs должно быть положительным целым');
  }
  if (!Number.isFinite(dur) || dur <= 0) {
    throw new Error('duration должно быть положительным числом');
  }

  console.log(`Запуск: fs=${fsVal}, duration=${dur}`);
  const r = runAnalysis(fsVal, dur);

  // ---------- 1) Отдельные PNG (аналог FigureMaker.save_* в Python) ----------
  await FigureMaker.saveSingle(r.tShort, r.amShort, 'АМ сигнал', 'am_sig.png');
  await FigureMaker.saveSingle(r.tShort, r.fmShort, 'ЧМ сигнал', 'fm_sig.png');
  await FigureMaker.saveSingle(r.tShort, r.pmShort, 'ФМ сигнал', 'pm_sig.png');

  await FigureMaker.saveSpec(r.fShow, r.specAm, 'Спектр АМ', 'am_spec.png');
  await FigureMaker.saveSpec(r.fShow, r.specFm, 'Спектр ЧМ', 'fm_spec.png');
  await FigureMaker.saveSpec(r.fShow, r.specPm, 'Спектр ФМ', 'pm_spec.png');

  await FigureMaker.saveSingle(
    r.tShort, r.synthShort,
    'Синтезированный АМ (полоса 15-25 Гц)', 'am_synth.png'
  );

  await FigureMaker.saveCompare(
    r.tShort, r.filteredShort, r.mSigShort,
    'Демодуляция vs модулирующий меандр', 'am_filtered_compare.png'
  );

  // ---------- 2) Сводная фигура 4×3 (аналог окна PyQt5) ----------
  const panels: Panel[] = [
    {
      title: 'Несущая (20 Гц)',
      x: r.tShort,
      datasets: [{ y: r.carrierShort, color: 'black' }],
    },
    {
      title: 'Меандр (2 Гц) — модулирующий',
      x: r.tShort,
      datasets: [{ y: r.mSigShort, color: 'orange' }],
    },
    {
      title: 'АМ сигнал',
      x: r.tShort,
      datasets: [{ y: r.amShort, color: 'blue' }],
    },
    {
      title: 'Спектр АМ',
      x: r.fShow,
      datasets: [{ y: r.specAm, color: 'blue' }],
      xlim: [0, 100],
    },
    {
      title: 'Обрезанный спектр АМ (15-25 Гц)',
      x: r.fShow,
      datasets: [{ y: r.cutSpecMag, color: 'red' }],
      xlim: [0, 100],
    },
    {
      title: 'Синтезированный сигнал (ОБПФ)',
      x: r.tShort,
      datasets: [{ y: r.synthShort, color: 'magenta' }],
    },
    {
      title: 'Огибающая после демодуляции (|x| + ФНЧ)',
      x: r.tShort,
      datasets: [{ y: r.filteredShort, color: 'purple' }],
    },
    {
      title: 'Демодуляция vs модулирующий',
      x: r.tShort,
      showLegend: true,
      datasets: [
        { y: r.filteredShort, color: 'red', label: 'Огибающая после демодуляции' },
        { y: r.mSigShort, color: 'black', label: 'Исходный меандр', dash: [5, 5] },
      ],
    },
    {
      title: 'ЧМ сигнал',
      x: r.tShort,
      datasets: [{ y: r.fmShort, color: 'green' }],
    },
    {
      title: 'Спектр ЧМ',
      x: r.fShow,
      datasets: [{ y: r.specFm, color: 'green' }],
      xlim: [0, 100],
    },
    {
      title: 'ФМ сигнал',
      x: r.tShort,
      datasets: [{ y: r.pmShort, color: 'red' }],
    },
    {
      title: 'Спектр ФМ',
      x: r.fShow,
      datasets: [{ y: r.specPm, color: 'red' }],
      xlim: [0, 100],
    },
  ];

  await FigureMaker.saveGrid(panels, 4, 3, 'all_plots.png');

  console.log('Готово! 12 графиков построены. Картинки сохранены в output/');
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});