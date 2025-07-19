import { parse } from '../src/index';
import Tokenizer from '../src/parser/tokenizer';
import ASTParser from '../src/parser/ast-parser';

// Use chalk for colored output
let chalk: any;
try {
  chalk = require('chalk');
} catch (e) {
  chalk = { green: (s: string) => s, yellow: (s: string) => s, red: (s: string) => s, cyan: (s: string) => s, bold: (s: string) => s };
}

const perfSummary: Array<{ Test: string; 'Avg Time (ms)': string; 'Total Time (ms)': string; Iterations: number; Status: string }> = [];

/**
 * Simple performance test to measure parsing performance
 */
describe('Performance Tests', () => {
  // Test data for performance benchmarking
  const smallDocument = `
    name: "John Doe",
    age: 30,
    active: true
  `;

  const mediumDocument = `--- users
~ name: "John Doe", age: 30, active: true, email: "john@example.com"
~ name: "Jane Smith", age: 25, active: false, email: "jane@example.com"
~ name: "Bob Johnson", age: 35, active: true, email: "bob@example.com"
~ name: "Alice Brown", age: 28, active: true, email: "alice@example.com"
~ name: "Charlie Wilson", age: 32, active: false, email: "charlie@example.com"

--- products
~ id: 1, name: "Laptop", price: 999.99, category: "Electronics"
~ id: 2, name: "Book", price: 19.99, category: "Education"
~ id: 3, name: "Coffee Mug", price: 12.50, category: "Kitchen"
~ id: 4, name: "Desk Chair", price: 199.99, category: "Furniture"
~ id: 5, name: "Monitor", price: 299.99, category: "Electronics"`;

  const largeDocument = generateLargeDocument(100);

  function generateLargeDocument(itemCount: number): string {
    let doc = '--- data\n';
    for (let i = 0; i < itemCount; i++) {
      doc += `~ id: ${i}, name: "Item ${i}", value: ${Math.random() * 1000}, active: ${i % 2 === 0}\n`;
    }
    return doc;
  }

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

  it('should measure tokenizer performance on small document', () => {
    const iterations = 100000;
    const { avgTime, totalTime } = measureTime(() => {
      const tokenizer = new Tokenizer(smallDocument);
      return tokenizer.tokenize();
    }, iterations);
    let status = avgTime < 1 ? chalk.green('PASS') : chalk.red('FAIL');
    perfSummary.push({
      Test: 'Tokenizer (small)',
      'Avg Time (ms)': avgTime.toFixed(6),
      'Total Time (ms)': totalTime.toFixed(3),
      Iterations: iterations,
      Status: status
    });
    expect(avgTime).toBeLessThan(1); // Less than 1ms average
  });

  it('should measure AST parser performance on small document', () => {
    const tokenizer = new Tokenizer(smallDocument);
    const tokens = tokenizer.tokenize();
    const iterations = 100000;
    const { avgTime, totalTime } = measureTime(() => {
      const parser = new ASTParser(tokens);
      return parser.parse();
    }, iterations);
    let status = avgTime < 1 ? chalk.green('PASS') : chalk.red('FAIL');
    perfSummary.push({
      Test: 'AST Parser (small)',
      'Avg Time (ms)': avgTime.toFixed(6),
      'Total Time (ms)': totalTime.toFixed(3),
      Iterations: iterations,
      Status: status
    });
    expect(avgTime).toBeLessThan(1); // Less than 1ms average
  });

  it('should measure full parser performance on simple object', () => {
    const simpleObject = `{ name: "John", age: 30, active: true }`;
    const iterations = 100000;
    const { avgTime, totalTime } = measureTime(() => {
      return parse(simpleObject, null);
    }, iterations);
    let status = avgTime < 0.01 ? chalk.green('PASS') : chalk.red('FAIL');
    perfSummary.push({
      Test: 'Full Parser (simple object)',
      'Avg Time (ms)': avgTime.toFixed(6),
      'Total Time (ms)': totalTime.toFixed(3),
      Iterations: iterations,
      Status: status
    });
    expect(avgTime).toBeLessThan(0.01); // Less than 0.01ms average (very aggressive target)
  });

  it('should measure full parser performance on array', () => {
    const arrayDocument = `[1, 2, 3, "hello", true, null]`;
    const iterations = 100000;
    const { avgTime, totalTime } = measureTime(() => {
      return parse(arrayDocument, null);
    }, iterations);
    let status = avgTime < 0.01 ? chalk.green('PASS') : chalk.red('FAIL');
    perfSummary.push({
      Test: 'Full Parser (array)',
      'Avg Time (ms)': avgTime.toFixed(6),
      'Total Time (ms)': totalTime.toFixed(3),
      Iterations: iterations,
      Status: status
    });
    expect(avgTime).toBeLessThan(0.01); // Less than 0.01ms average for array (very aggressive target)
  });

  it('should measure regex pattern performance', () => {
    const testString = "0x1234ABCD";
    const iterations = 10000;
    // Test cached regex vs new regex creation
    const hexRegex = /^[0-9a-fA-F]+$/;
    const { avgTime: cachedTime } = measureTime(() => {
      return hexRegex.test(testString.substring(2));
    }, iterations);
    const { avgTime: newRegexTime } = measureTime(() => {
      return /^[0-9a-fA-F]+$/.test(testString.substring(2));
    }, iterations);
    let status = cachedTime <= newRegexTime * 1.1 ? chalk.green('PASS') : chalk.red('FAIL');
    perfSummary.push({
      Test: 'Regex (cached vs new)',
      'Avg Time (ms)': cachedTime.toFixed(6),
      'Total Time (ms)': '-',
      Iterations: iterations,
      Status: status
    });
    // Cached regex should be faster or at least not significantly slower
    expect(cachedTime).toBeLessThanOrEqual(newRegexTime * 1.1);
  });

  afterAll(() => {
    // Print summary table
    if (perfSummary.length > 0) {
      // Use console.table if available, else fallback
      const tableData = perfSummary.map(row => ({
        ...row,
        Status: row.Status // already colored
      }));
      // Print a colored header
      // eslint-disable-next-line no-console
      // Fix for chalk v5+ API: use chalk.bold(chalk.cyan(...))
      console.log('\n' + (chalk.cyan && chalk.bold ? chalk.bold(chalk.cyan('Performance Test Summary:')) : 'Performance Test Summary:'));
      // eslint-disable-next-line no-console
      if (console.table) {
        // eslint-disable-next-line no-console
        console.table(tableData);
      } else {
        // eslint-disable-next-line no-console
        tableData.forEach(row => {
          // eslint-disable-next-line no-console
          console.log(row);
        });
      }
    }
  });
});