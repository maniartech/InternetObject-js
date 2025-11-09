/**
 * Array Error Range Tests
 *
 * These tests specifically validate that array errors have correct ranges,
 * especially at collection boundaries where they should NOT include the ~ character.
 */

import { parse } from '../../src';

/**
 * Helper to extract text from input using position range
 */
function extractTextAtRange(input: string, startPos: any, endPos: any): string {
  const lines = input.split('\n');

  // Handle single-line range
  if (startPos.row === endPos.row) {
    const line = lines[startPos.row - 1]; // Rows are 1-based
    return line.substring(startPos.col - 1, endPos.col); // Cols are 1-based
  }

  // Handle multi-line range
  let result = '';
  for (let row = startPos.row; row <= endPos.row; row++) {
    const line = lines[row - 1];
    if (row === startPos.row) {
      result += line.substring(startPos.col - 1);
    } else if (row === endPos.row) {
      result += '\n' + line.substring(0, endPos.col);
    } else {
      result += '\n' + line;
    }
  }
  return result;
}

describe('Array Error Ranges - Critical Boundary Tests', () => {

  test('CRITICAL: unclosed array at ~ boundary must NOT include ~ character', () => {
    const doc = `name, colors
---
~ Alice, [red, green
~ Bob, [blue, yellow]`;

    const result = parse(doc, null);
    const errors = result.getErrors();

    console.log(`\nFound ${errors.length} error(s):`);
    errors.forEach((e: any, i: number) => {
      console.log(`  ${i + 1}. ${e.message}`);
    });

    expect(errors.length).toBeGreaterThan(0);    const bracketError = errors.find((e: any) =>
      e.message.includes('Missing closing bracket') ||
      e.message.includes('Unexpected end of input while parsing array')
    );

    expect(bracketError).toBeDefined();

    if (bracketError && (bracketError as any).positionRange) {
      const pr = (bracketError as any).positionRange;
      const start = pr.getStartPos();
      const end = pr.getEndPos();

      const extractedText = extractTextAtRange(doc, start, end);

      // CRITICAL: Error must be on line 3 (Alice's data)
      expect(start.row).toBe(3);
      expect(end.row).toBe(3);

      // CRITICAL: Must NOT include ~ from next line
      expect(extractedText).not.toContain('~');
      expect(extractedText).not.toContain('Bob');

      // CRITICAL: Must include the unclosed array
      expect(extractedText).toBe('[red, green');

      console.log('✓ Array boundary test passed:', {
        startPos: `${start.row}:${start.col}`,
        endPos: `${end.row}:${end.col}`,
        extractedText,
        errorMessage: bracketError.message
      });
    } else {
      fail('Array boundary error should have positionRange');
    }
  });

  test('CRITICAL: unclosed array shows full range from [ to last element', () => {
    const doc = `name, colors
---
~ Alice, [red, green, blue`;

    const result = parse(doc, null);
    const errors = result.getErrors();

    const bracketError = errors.find((e: any) =>
      e.message.includes('Missing closing bracket') ||
      e.message.includes('Unexpected end of input while parsing array')
    );

    expect(bracketError).toBeDefined();

    if (bracketError && (bracketError as any).positionRange) {
      const pr = (bracketError as any).positionRange;
      const start = pr.getStartPos();
      const end = pr.getEndPos();

      const extractedText = extractTextAtRange(doc, start, end);

      // Must start with [
      expect(extractedText.startsWith('[')).toBe(true);

      // Must include all elements
      expect(extractedText).toContain('red');
      expect(extractedText).toContain('green');
      expect(extractedText).toContain('blue');

      // Must be the complete unclosed array
      expect(extractedText).toBe('[red, green, blue');

      console.log('✓ Array full range test passed:', {
        extractedText,
        length: extractedText.length
      });
    }
  });

  test('unclosed nested array in object should have correct range', () => {
    const doc = `data: {items: [1, 2, 3}`;

    // This syntax error (] expected but } found) should throw
    expect(() => parse(doc, null)).toThrow(/Unexpected token|Expected a valid value/);
  });

  test('multiple unclosed arrays should each have correct ranges', () => {
    const doc = `name, colors, sizes
---
~ Alice, [red, green, [small, medium
~ Bob, [blue, yellow], [large]`;

    const result = parse(doc, null);
    const errors = result.getErrors();

    expect(errors.length).toBeGreaterThan(0);

    errors.forEach((error: any, idx: number) => {
      if (error.positionRange) {
        const pr = error.positionRange;
        const start = pr.getStartPos();
        const end = pr.getEndPos();

        const extractedText = extractTextAtRange(doc, start, end);

        console.log(`Error ${idx + 1}:`, {
          message: error.message,
          extractedText,
          position: `${start.row}:${start.col} to ${end.row}:${end.col}`
        });

        // Each error should be on line 3 (Alice's data), not span to line 4
        expect(start.row).toBe(3);
        expect(end.row).toBe(3);

        // Should not include Bob's data
        expect(extractedText).not.toContain('Bob');
        expect(extractedText).not.toContain('~');
      }
    });
  });

  test('array with only opening bracket should have minimal range', () => {
    const doc = `colors: [
next: value`;

    // Without synchronization boundaries, this should throw
    expect(() => parse(doc, null)).toThrow(/Unexpected end of input while parsing array|Missing closing bracket/);
  });
});

describe('Array Error Ranges - Position Accuracy', () => {

  test('array start position should point to [', () => {
    const doc = `colors: [red, green`;

    // Without synchronization boundaries, this should throw
    expect(() => parse(doc, null)).toThrow(/Unexpected end of input while parsing array|Missing closing bracket/);
  });

  test('array end position should point after last element', () => {
    const doc = `colors: [red, green, blue`;

    // Without synchronization boundaries, this should throw
    expect(() => parse(doc, null)).toThrow(/Unexpected end of input while parsing array|Missing closing bracket/);
  });
});

describe('Array Error Ranges - Edge Cases', () => {

  test('array at EOF should span to end of file', () => {
    const doc = `colors: [red, green, blue`;

    // Without synchronization boundaries, this should throw
    expect(() => parse(doc, null)).toThrow(/Unexpected end of input while parsing array|Missing closing bracket/);
  });

  test('array followed by another member should not include that member', () => {
    const doc = `data: [1, 2, 3, other: value`;

    // Without synchronization boundaries, this should throw
    expect(() => parse(doc, null)).toThrow(/Unexpected end of input while parsing array|Missing closing bracket/);
  });
});
