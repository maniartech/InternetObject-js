import { describe, test, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import ErrorCodes from '../../src/errors/io-error-codes';

/**
 * The error-code registry is CLOSED: no code may exist that is not declared in one of the four
 * enum files.
 *
 * This is not a style rule. The conformance corpus asserts codes only, so a code that is not in the
 * registry is one no port can know to expect — CONFORMANCE.md §5.1 forbids inventing one. And a
 * code nothing emits is equally bad: `not-a-number` and `not-an-integer` sat declared-but-unthrown
 * for long enough that a spec table documented them as real.
 *
 * Both halves went wrong at once and neither was caught by review:
 *
 *   - `bigint.ts` and `number.ts` BUILT codes from the declared type name at runtime —
 *     `` `not-a-${memberDef.type}` `` — emitting `not-a-bigint`, `not-a-uint32`, `not-a-int8`
 *     and so on. None appeared in any enum. They survived the ADR 0002 rename precisely because
 *     they are runtime strings rather than `ErrorCodes.*` references, so the compiler had nothing
 *     to point at. Found by generating a corpus suite and reading what came out.
 *   - the same enums carried two codes no site ever threw.
 *
 * So the guard has to work on the SOURCE, not on the type system.
 */

const SRC = join(__dirname, '../../src');
const REGISTERED = new Set<string>(Object.values(ErrorCodes) as string[]);

/** Every `.ts` file under src/, excluding the enum declarations themselves. */
function sourceFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) sourceFiles(p, acc);
    else if (entry.endsWith('.ts') && !entry.endsWith('error-codes.ts')) acc.push(p);
  }
  return acc;
}

/**
 * Does the source reference `ErrorCodes.<member>` as a WHOLE identifier?
 *
 * Word-bounded on purpose. `ErrorCodes.invalidArrayLength` contains `ErrorCodes.invalidArray` as a
 * substring, so a plain `includes` let a longer member mask a shorter dead one: `invalid-array` hid
 * behind `invalid-array-length` and was reported as live until that code was renamed. The mask, not
 * the dead code, was the actual defect in this guard.
 */
function referencesMember(text: string, member: string): boolean {
  const needle = `ErrorCodes.${member}`;
  for (let i = text.indexOf(needle); i !== -1; i = text.indexOf(needle, i + 1)) {
    const after = text[i + needle.length];
    if (after === undefined || !/[A-Za-z0-9_$]/.test(after)) return true;
  }
  return false;
}

describe('error-code registry is closed', () => {
  /**
   * A code assembled at runtime cannot be verified against the registry by any tool, so the
   * construction itself is banned rather than its output. `not-a-${type}` is the shape that
   * actually occurred; the pattern catches any error-code-looking template.
   */
  test('no error code is built from a template', () => {
    const offenders: string[] = [];
    for (const file of sourceFiles(SRC)) {
      const text = readFileSync(file, 'utf8');
      text.split('\n').forEach((line, i) => {
        if (line.trimStart().startsWith('*') || line.trimStart().startsWith('//')) return;
        // A backtick string that looks like a hyphenated code AND interpolates something.
        if (/`[a-z][a-z0-9-]*-\$\{/.test(line) && /ValidationError|SyntaxError|IOError|throwError|errorCode/.test(text)) {
          offenders.push(`${file.replace(SRC, 'src')}:${i + 1}  ${line.trim()}`);
        }
      });
    }
    expect(offenders, `error codes must come from the registry, not be assembled:\n${offenders.join('\n')}`)
      .toEqual([]);
  });

  /**
   * Every hyphenated string literal passed as the FIRST argument to an error constructor must be a
   * registered code. Catches a hand-typed code that bypasses `ErrorCodes.*` — how `'not-an-integer'`
   * outlived the enum entry that once backed it.
   */
  test('no literal error code bypasses the registry', () => {
    const offenders: string[] = [];
    const ctor = /new\s+(?:IO)?(?:Validation|Syntax|Stream)?Error\s*\(\s*'([a-z][a-z0-9-]*-[a-z0-9-]+)'/g;
    const helper = /throwError\s*\(\s*'([a-z][a-z0-9-]*-[a-z0-9-]+)'/g;
    for (const file of sourceFiles(SRC)) {
      const text = readFileSync(file, 'utf8');
      for (const re of [ctor, helper]) {
        re.lastIndex = 0;
        let m: RegExpExecArray | null;
        while ((m = re.exec(text)) !== null) {
          if (!REGISTERED.has(m[1])) offenders.push(`${file.replace(SRC, 'src')}  '${m[1]}'`);
        }
      }
    }
    expect(offenders, `unregistered error codes:\n${offenders.join('\n')}`).toEqual([]);
  });

  /**
   * Every registered code must be reachable from some site. A declared-but-unthrown code is a
   * promise the implementation does not keep, and the corpus and spec both treat the registry as
   * the list of what can actually happen.
   */
  test('every registered code is emitted somewhere', () => {
    const text = sourceFiles(SRC).map(f => readFileSync(f, 'utf8')).join('\n');
    const unreachable = [...REGISTERED].filter(code => {
      const ident = Object.entries(ErrorCodes).find(([, v]) => v === code)?.[0];
      const byIdent = ident !== undefined && referencesMember(text, ident);
      const byString = text.includes(`'${code}'`) || text.includes(`"${code}"`);
      return !byIdent && !byString;
    });
    expect(unreachable, `declared but never emitted:\n${unreachable.join('\n')}`).toEqual([]);
  });

  test('every registered code follows <predicate>-<subject>', () => {
    const PREDICATES = [
      'expected', 'invalid', 'missing', 'undefined', 'unknown', 'reserved', 'duplicate',
      'unexpected', 'unterminated', 'forbidden', 'oversized', 'undersized', 'out-of-range',
      'mismatched', 'empty',
    ];
    const bad = [...REGISTERED].filter(c => !PREDICATES.some(p => c === p || c.startsWith(p + '-')));
    expect(bad, `codes outside the approved predicate vocabulary (ADR 0002 §3):\n${bad.join('\n')}`)
      .toEqual([]);
  });
});
