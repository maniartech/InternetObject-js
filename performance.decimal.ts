import Decimal from './src/core/decimal';

let chalk: any;
try {
  chalk = require('chalk');
} catch (e) {
  chalk = { green: (s: string) => s, yellow: (s: string) => s, red: (s: string) => s, cyan: (s: string) => s, bold: (s: string) => s };
}

type Row = { Test: string; 'Avg Time (ms)': string; 'Total Time (ms)': string; Iterations: number; Status: string };
const perfSummary: Row[] = [];

function measureTime<T>(fn: () => T, iterations: number = 1): { result: T; avgTime: number; totalTime: number } {
  const start = performance.now();
  let result: T;
  for (let i = 0; i < iterations; i++) {
    result = fn();
  }
  const end = performance.now();
  const totalTime = end - start;
  const avgTime = totalTime / iterations;
  return { result: result!, avgTime, totalTime };
}

function addRow(Test: string, avg: number, total: number, iterations: number, thresholdMs: number) {
  const status = avg <= thresholdMs ? chalk.green('PASS') : chalk.red('FAIL');
  perfSummary.push({ Test, 'Avg Time (ms)': avg.toFixed(6), 'Total Time (ms)': total.toFixed(3), Iterations: iterations, Status: status });
}

function runDecimalBenchmarks() {
  // Constructor (scale normalization)
  {
    const iterations = 50000;
    const { avgTime, totalTime } = measureTime(() => new Decimal('123456789.12345', 14, 5), iterations);
    addRow('Decimal ctor (p=14,s=5)', avgTime, totalTime, iterations, 0.005);
  }

  // Addition/Subtraction
  {
    const a = new Decimal('123456789.98765');
    const b = new Decimal('98765.4321');
    const iter = 200000;
    const { avgTime: addAvg, totalTime: addTot } = measureTime(() => a.add(b), iter);
    addRow('add (mixed scales)', addAvg, addTot, iter, 0.003);

    const { avgTime: subAvg, totalTime: subTot } = measureTime(() => a.sub(b), iter);
    addRow('sub (mixed scales)', subAvg, subTot, iter, 0.003);
  }

  // Multiplication
  {
    const a = new Decimal('12345.6789');
    const b = new Decimal('9.8765');
    const iter = 100000;
    const { avgTime, totalTime } = measureTime(() => a.mul(b), iter);
    addRow('mul (scale -> max(sA,sB))', avgTime, totalTime, iter, 0.005);
  }

  // Division
  {
    const a = new Decimal('12345.6789');
    const b = new Decimal('9.8765');
    const iter = 100000;
    const { avgTime, totalTime } = measureTime(() => a.div(b), iter);
    addRow("div (scale -> divisor's)", avgTime, totalTime, iter, 0.005);
  }

  // Modulo
  {
    const a = new Decimal('12345.6789');
    const b = new Decimal('9.8765');
    const iter = 100000;
    const { avgTime, totalTime } = measureTime(() => a.mod(b), iter);
    addRow('mod (scale -> max(sA,sB))', avgTime, totalTime, iter, 0.005);
  }

  // Negative rounding edge (sanity)
  {
    const a = new Decimal('-1', 1, 0);
    const b = new Decimal('3', 1, 0);
    const iter = 200000;
    const { avgTime, totalTime } = measureTime(() => a.div(b), iter);
    addRow('div negative rounding (sanity)', avgTime, totalTime, iter, 0.002);
  }
}

function printSummary() {
  if (perfSummary.length > 0) {
    const tableData = perfSummary.map(row => {
      const isFail = typeof row.Status === 'string' && row.Status.toLowerCase().includes('fail');
      if (isFail) {
        return Object.fromEntries(Object.entries(row).map(([k, v]) => [k, chalk.red(String(v))]));
      }
      return row;
    });
    console.log('\n' + (chalk.cyan && chalk.bold ? chalk.bold(chalk.cyan('Decimal Performance Summary:')) : 'Decimal Performance Summary:'));
    if (console.table) {
      console.table(tableData);
    } else {
      tableData.forEach(row => console.log(row));
    }
  }
}

runDecimalBenchmarks();
printSummary();
