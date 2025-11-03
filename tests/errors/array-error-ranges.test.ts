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
      e.message.includes('Missing closing bracket')
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

    const result = parse(doc, null);
    const errors = result.getErrors();

    // Should have error about unclosed array or unexpected }
    expect(errors.length).toBeGreaterThan(0);

    errors.forEach((error: any) => {
      if (error.positionRange) {
        const pr = error.positionRange;
        const start = pr.getStartPos();
        const end = pr.getEndPos();

        const extractedText = extractTextAtRange(doc, start, end);

        console.log('Nested array error:', {
          message: error.message,
          extractedText,
          startPos: `${start.row}:${start.col}`,
          endPos: `${end.row}:${end.col}`
        });

        // Extracted text should be meaningful
        expect(extractedText.length).toBeGreaterThan(0);
      }
    });
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

    const result = parse(doc, null);
    const errors = result.getErrors();

    const bracketError = errors.find((e: any) =>
      e.message.includes('Missing closing bracket') ||
      e.message.includes('array')
    );

    if (bracketError && (bracketError as any).positionRange) {
      const pr = (bracketError as any).positionRange;
      const start = pr.getStartPos();
      const end = pr.getEndPos();

      const extractedText = extractTextAtRange(doc, start, end);

      console.log('Empty array error:', {
        extractedText,
        startPos: `${start.row}:${start.col}`,
        endPos: `${end.row}:${end.col}`
      });

      // Should at minimum include the [
      expect(extractedText.startsWith('[')).toBe(true);

      // Should not span multiple lines unnecessarily
      if (start.row === end.row) {
        expect(extractedText.length).toBeLessThan(20); // Reasonable for empty array
      }
    }
  });
});

describe('Array Error Ranges - Position Accuracy', () => {

  test('array start position should point to [', () => {
    const doc = `colors: [red, green`;

    const result = parse(doc, null);
    const errors = result.getErrors();

    const bracketError = errors.find((e: any) =>
      e.message.includes('Missing closing bracket')
    );

    if (bracketError && (bracketError as any).positionRange) {
      const pr = (bracketError as any).positionRange;
      const start = pr.getStartPos();

      // Column should be at the [ position
      const lines = doc.split('\n');
      const line = lines[start.row - 1];
      const charAtStart = line[start.col - 1];

      expect(charAtStart).toBe('[');

      console.log('✓ Array start position accurate:', {
        row: start.row,
        col: start.col,
        character: charAtStart
      });
    }
  });

  test('array end position should point after last element', () => {
    const doc = `colors: [red, green, blue`;

    const result = parse(doc, null);
    const errors = result.getErrors();

    const bracketError = errors.find((e: any) =>
      e.message.includes('Missing closing bracket')
    );

    if (bracketError && (bracketError as any).positionRange) {
      const pr = (bracketError as any).positionRange;
      const start = pr.getStartPos();
      const end = pr.getEndPos();

      const extractedText = extractTextAtRange(doc, start, end);

      // Should end with 'blue' or include all of it
      expect(extractedText.endsWith('blue') || extractedText.includes('blue')).toBe(true);

      console.log('✓ Array end position accurate:', {
        endCol: end.col,
        extractedText
      });
    }
  });
});

describe('Array Error Ranges - Edge Cases', () => {

  test('array at EOF should span to end of file', () => {
    const doc = `colors: [red, green, blue`;

    const result = parse(doc, null);
    const errors = result.getErrors();

    const bracketError = errors.find((e: any) =>
      e.message.includes('Missing closing bracket')
    );

    if (bracketError && (bracketError as any).positionRange) {
      const pr = (bracketError as any).positionRange;
      const end = pr.getEndPos();

      // End position should be near the end of the input
      expect(end.pos).toBeGreaterThan(doc.length - 10);

      console.log('✓ Array at EOF test passed:', {
        endPos: end.pos,
        docLength: doc.length
      });
    }
  });

  test('array followed by another member should not include that member', () => {
    const doc = `data: [1, 2, 3, other: value`;

    const result = parse(doc, null);
    const errors = result.getErrors();

    if (errors.length > 0) {
      errors.forEach((error: any) => {
        if (error.positionRange) {
          const pr = error.positionRange;
          const start = pr.getStartPos();
          const end = pr.getEndPos();

          const extractedText = extractTextAtRange(doc, start, end);

          console.log('Array with following member:', {
            message: error.message,
            extractedText
          });

          // Should not include 'other: value' if it's an array error
          if (error.message.includes('array') || error.message.includes('bracket')) {
            expect(extractedText).not.toContain('other');
            expect(extractedText).not.toContain('value');
          }
        }
      });
    }
  });
});
