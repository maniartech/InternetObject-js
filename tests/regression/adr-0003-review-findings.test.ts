import { describe, test, expect } from 'vitest'
import parse from '../../src/parser/index'
import loadInferred from '../../src/facade/load-inferred'
import { stringifyDocument } from '../../src/facade/stringify-document'
import ErrorCodes from '../../src/errors/io-error-codes'
import ValidationError from '../../src/errors/io-validation-error'
import DateTimeDef from '../../src/schema/types/datetime'

/**
 * ADR 0003 — findings from the five-reviewer read of the specification.
 *
 * Each case here is a defect that was reproduced before it was fixed, and each is the kind that
 * ordinary testing does not catch: the observable output was a plausible *value*, not a crash. Two
 * of them had been recorded in the conformance corpus as CORRECT, because the corpus faithfully
 * records what the implementation does.
 */

/** Every error code the document reports, from both places the implementation puts them. */
function codesOf(src: string): string[] {
  const acc = new Set<string>()
  try {
    const doc: any = parse(src)
    for (const e of (doc?.errors ?? []) as any[]) if (e?.errorCode) acc.add(e.errorCode)
    const walk = (v: any) => {
      if (typeof v === 'string') {
        if (v.startsWith('{') && v.includes('__error')) {
          try { walk(JSON.parse(v)) } catch { /* ordinary text */ }
        }
        return
      }
      if (v && typeof v === 'object') {
        if (v.__error && v.errorCode) acc.add(v.errorCode)
        for (const k of Object.keys(v)) walk(v[k])
      }
    }
    walk(doc?.toObject ? doc.toObject() : doc)
  } catch (e: any) {
    acc.add(e?.errorCode ?? 'thrown')
  }
  return [...acc]
}

const valueOf = (src: string) => (parse(src) as any).toObject()['0']

describe('ADR 0003 §9 — the decimal marker leaked into token text', () => {
  // `rawValue += "f"` marked a decimal internally. The text is not private: a decimal followed by
  // more open-string characters MERGES with them, and the marker left the tokenizer as data.
  test('a doubled decimal suffix keeps the text the author wrote', () => {
    expect(valueOf('123.45mm')).toBe('123.45mm')
    expect(valueOf('1mm')).toBe('1mm')
    expect(valueOf('1.5mx')).toBe('1.5mx')
  })

  test('a valid decimal is unaffected', () => {
    expect(String(valueOf('123.45m'))).toBe('123.45')
  })
})

describe('ADR 0003 §9 — a leading comma was silently dropped', () => {
  // The look-ahead that caught `[a,,c]` and `[a, ]` cannot see backwards, so a comma with an
  // ordinary value after it passed the check and was consumed. `[,a]` loaded as ["a"].
  test('an array cannot begin with a comma', () => {
    expect(codesOf('[,a]')).toContain(ErrorCodes.unexpectedToken)
  })

  test('the neighbouring forms still behave', () => {
    expect(codesOf('[a,,c]')).toContain(ErrorCodes.unexpectedToken)
    expect(codesOf('[ , ]')).toContain(ErrorCodes.unexpectedToken)
    expect(codesOf('[a, b,]')).toContain(ErrorCodes.unexpectedToken)
    expect(codesOf('[a, b]')).toEqual([])
    expect(valueOf('[a, b]')).toEqual(['a', 'b'])
  })
})

describe('ADR 0003 §9 — an unterminated annotated string closed itself at EOF', () => {
  // A regular string reported `unterminated-string`; every ANNOTATED string silently returned the
  // content read so far. A truncated value that parses is indistinguishable from an intended one.
  test.each([
    ["r'Unclosed", 'raw, single quote'],
    ['r"Unclosed', 'raw, double quote'],
    ["b'SGVsbG8=", 'binary'],
    ["dt'2024-01-01", 'datetime'],
  ])('%s (%s) reports unterminated-string', (src) => {
    expect(codesOf(src)).toContain(ErrorCodes.unterminatedString)
  })

  test('a closed annotated string keeps its closing quote in the token text', () => {
    // The same bug truncated the TEXT of a well-formed literal that ended the input.
    const toks = (parse("r'test'") as any)
    expect(JSON.stringify(toks.toObject())).toContain('test')
    expect(valueOf("r'test'")).toBe('test')
  })
})

describe('ADR 0003 §2 — rule 2: a marker is a claim', () => {
  // `0x`, `0o`, `0b` can only mean "a number follows in this base". A run that makes the claim and
  // does not keep it is an error.
  test.each([
    '0x', '0b', '0o', '0xn', '0bn', '0xGH', '0o89', '0b12', '0xygen',
  ])('%s reports invalid-number', (src) => {
    expect(codesOf(src)).toContain(ErrorCodes.invalidNumber)
  })

  // The same rule at the other end of the run: `m` and `n` claim a decimal and a bigint.
  test.each([
    ['.45m', ErrorCodes.invalidDecimal],
    ['123.m', ErrorCodes.invalidDecimal],
    ['1.2.3m', ErrorCodes.invalidDecimal],
    ['12.3n', ErrorCodes.invalidBigInt],
  ])('%s reports %s', (src, code) => {
    expect(codesOf(src)).toContain(code)
  })
})

describe('ADR 0003 §2 — rule 1: all or nothing', () => {
  // A run with no marker makes no claim, so it is an open string — however numeric it looks.
  // These are the everyday values the earlier, more elaborate rule was rejecting: version
  // strings, IP addresses and dotted dates.
  test.each([
    '1.2.3', '10.0.0.1', '2024.01.15', '1e', '1e+', '1.23ee4',
    '013ABSD', '12mm', '123.45mm', '5em', '3pm', '007th',
  ])('%s is an ordinary open string', (src) => {
    expect(codesOf(src)).toEqual([])
    expect(valueOf(src)).toBe(src)
  })

  // The defect that started this. `parseFloat("1e")` returns 1, so a partial parse used to invent
  // a value the author never wrote. Rule 1 forbids that WITHOUT needing an error: the run simply
  // is not a number, so it stays text.
  test('a partial parse never invents a value', () => {
    expect(valueOf('1e')).toBe('1e')
    expect(typeof valueOf('1e')).toBe('string')
  })

  // The line between a failed number and a word that begins with a digit. Only a base prefix makes
  // the claim; everything else stays an open string.
  test.each(['3pm', '5km', '2cm', '12mm', '5em', '007th'])('%s stays an open string', (src) => {
    expect(codesOf(src)).toEqual([])
    expect(valueOf(src)).toBe(src)
  })

  // The guard requires a digit, or the schema spread reads as a malformed number and every schema
  // using it fails to compile.
  test('the schema spread is not a number', () => {
    // The claim is narrow: `...` must not be READ as a malformed number. Whether this particular
    // document validates is a separate question, so assert the code is absent rather than that
    // nothing at all was reported.
    expect(codesOf('~ $schema: { name: string, ...: number }\n---\n~ Ann'))
      .not.toContain(ErrorCodes.invalidNumber)
  })

  // An open string that merely BEGINS with a prefix and runs on into prose is text.
  test('a prefix followed by prose is not a failed number', () => {
    expect(codesOf('---\n0xFFn) and more words')).toEqual([])
  })
})

describe('a base prefix announces a base; nothing else does', () => {
  // The rule that separates a broken number from a word beginning with a digit. Both halves
  // matter: without the first, `0xGH` loads as a string; without the second, `013ABSD` — an
  // ordinary part code — stops being writable as data.
  test.each([
    ['0x', 'announced hex, delivered nothing'],
    ['0b', 'announced binary, delivered nothing'],
    ['0o', 'announced octal, delivered nothing'],
    ['0b 1010', 'a space does not rescue the promise'],
    ['0xGH', 'G is not a hex digit'],
    ['0o89', '8 and 9 are not octal digits'],
    ['0xygen', 'announced hex; the escape hatch is quoting'],
  ])('%s is invalid-number (%s)', (src) => {
    expect(codesOf(src)).toContain(ErrorCodes.invalidNumber)
  })

  test.each([
    '013ABSD', '12mm', '3pm', '5km', '5em', '007th', '123.45mm',
  ])('%s is an ordinary open string', (src) => {
    expect(codesOf(src)).toEqual([])
    expect(valueOf(src)).toBe(src)
  })

  // A prefix that DID deliver, followed by prose, is text — this is the case that makes the
  // rule "did the prefix deliver?" rather than "does the run contain a prefix?".
  test('a valid prefix followed by prose stays an open string', () => {
    expect(codesOf('---\n0xFFn) and bad-value fallbacks')).toEqual([])
  })

  // Quoting is always available, and is what a writer must emit for such a value.
  test('quoting settles it', () => {
    expect(codesOf('"0x123FG"')).toEqual([])
    expect(valueOf('"0x123FG"')).toBe('0x123FG')
  })
})

describe('a writer quotes a string that would read back as a failed number', () => {
  // Round-trip invariant 2. Without the quote the value does not merely change, it stops parsing.
  test.each(['0x123FG', '0xGH', '1e', '0b', '1.23ee4', '013ABSD', '12mm'])(
    '%s survives a write/read round-trip',
    (value) => {
      const doc: any = loadInferred([{ code: value }])
      const out = stringifyDocument(doc, { includeHeader: false })
      const back: any = parse('---\n' + out)
      expect(((back?.errors ?? []) as any[]).map((e) => e.errorCode)).toEqual([])
      // Written without a header, so the member name is not carried and the value lands in the
      // positional slot "0". Either spelling is a correct round-trip; what matters is the VALUE.
      const row: any = back.toObject()
      const rec = Array.isArray(row) ? row[0] : row
      expect(rec.code ?? rec['0']).toBe(value)
    }
  )
})

describe('ISSUE-25 — two keys never share an inferred schema', () => {
  // `safeName` maps every character outside [A-Za-z0-9_] to `_`, which is not injective: "*",
  // " " and "," all produced `_`. Two unrelated subtrees then resolved to ONE schema name, and
  // the schema built from one was bound to the other's data. The widening rule ("type mismatch
  // -> any") was never at fault; it simply never saw both values, because they were filed apart.
  const body = (v: any) => ({ 'a,b': [{ '3': {} }, { '3': { id: v } }, {}] })
  const head = (v: any) => ({ 'a,b': [{ '3': { id: v } }] })

  test.each([
    ['*', ' '],
    [',', ';'],
    ['x-y', 'x.y'],
  ])('keys %s and %s do not collide', (a, b) => {
    const doc: any = loadInferred([{ [a]: head(true), [b]: body(0) }])
    expect(() => stringifyDocument(doc, { includeHeader: true, includeTypes: true })).not.toThrow()
  })

  // The widening rule itself, which was correct all along.
  test('disagreeing instances under ONE name widen to any', () => {
    const doc: any = loadInferred([{ id: true }, { id: 0 }])
    expect(() => stringifyDocument(doc, { includeHeader: true, includeTypes: true })).not.toThrow()
  })
})

describe('the marker table: one code per claimed type', () => {
  // Every literal code names the TYPE its marker claims. Read as a grid beside the `expected-*`
  // family, a missing cell is visible on sight — which is how `invalid-date`, `invalid-time`
  // and the `invalid-base64` misnomer were each found.
  test.each([
    ["d'2024-13-45'", 'invalid-date'],
    ["t'25:99:99'", 'invalid-time'],
    ["dt'notadate'", 'invalid-datetime'],
    ["b'not@base64'", 'invalid-binary'],
    ['0xGH', 'invalid-number'],
    ['.45m', 'invalid-decimal'],
    ['12.3n', 'invalid-bigint'],
  ])('%s reports %s', (src, code) => {
    expect(codesOf(src)).toContain(code)
  })
})

describe('a writer quotes only what would read back as something else', () => {
  const emit = (v: string) =>
    stringifyDocument(loadInferred([{ code: v }]) as any, { includeHeader: false })

  // QUOTED — the bare text would be a NUMBER (rule 1) or an ERROR (rule 2), never this string.
  test.each(['123', '0001', '-5', '.5', '3.14', '12e5', '0xFF', '0x123FG', '0b', '.45m', '12.3n'])(
    '%s is quoted',
    (v) => expect(emit(v)).toContain('"')
  )

  // BARE — the text reads back as itself, so quoting it is noise. This is the narrowing: the
  // rule used to quote EVERY string beginning with a digit.
  test.each(['013ABSD', '12mm', '3pm', '5km', '1.2.3', '10.0.0.1', '2024.01.15', '1e', '007th'])(
    '%s is emitted bare',
    (v) => expect(emit(v)).not.toContain('"')
  )

  // Whatever the decision, the value must survive the trip. This is the invariant the quoting
  // rule exists to serve, and the only one that may never regress.
  test.each([
    '123', '0001', '-5', '.5', '0xFF', '0x123FG', '0b', '.45m', '12.3n',
    '013ABSD', '12mm', '3pm', '1.2.3', '10.0.0.1', '1e', '007th', '-.j', '5T',
  ])('%s survives a write/read round-trip', (v) => {
    const back: any = parse('---' + String.fromCharCode(10) + emit(v))
    expect(((back?.errors ?? []) as any[]).map((e) => e.errorCode)).toEqual([])
    const row: any = back.toObject()
    const rec = Array.isArray(row) ? row[0] : row
    expect(rec.code ?? rec['0']).toBe(v)
  })
})

describe('two corruptions the over-quoting had been hiding', () => {
  // Both were found only once the writer stopped quoting every digit-leading string: the fuzzer
  // went from clean to failing on every run. Neither is reachable through a quoted value, which is
  // why a broad quoting rule is not the same thing as a correct tokenizer.

  // A sign was consumed and then the parse bailed out WITHOUT rewinding, so the caller resumed
  // past it: `-.j` decoded as ".j", one character short.
  test.each(['-.j', '+.j', '-.', '-.j5'])('%s keeps its sign', (src) => {
    expect(valueOf(src)).toBe(src)
  })

  // A run forced to an open string took its value from what the text PARSED as, not from the text.
  // `T` parses as the boolean true, so `5T` decoded as "5true" — five characters out of two.
  test.each(['5T', '5F', '5N', '1T2', '5Tx'])('%s does not expand a keyword', (src) => {
    expect(valueOf(src)).toBe(src)
  })

  test('a standalone keyword still parses as itself', () => {
    expect(valueOf('T')).toBe(true)
    expect(valueOf('F')).toBe(false)
    expect(valueOf('N')).toBe(null)
  })
})

describe('ADR 0003 §4 — each temporal type names itself', () => {
  test.each([
    ['date', ErrorCodes.expectedDate],
    ['time', ErrorCodes.expectedTime],
    ['datetime', ErrorCodes.expectedDateTime],
  ])('%s reports %s', (type, code) => {
    const def = new DateTimeDef(type)
    expect(() => def.load('not a date', { type, path: 'v' } as any)).toThrow(
      expect.objectContaining({ errorCode: code })
    )
  })
})

describe('ADR 0003 §7 — missing-value carried two meanings in two classes', () => {
  // The syntax sense (a key with nothing after it) is now `expected-value`. `missing-value` keeps
  // the presence sense. A code in two classes means two conformant readers report different
  // streaming categories for the same input.
  test('a key with nothing after it is expected-value', () => {
    expect(codesOf('name:')).toContain(ErrorCodes.expectedValue)
  })

  test('an absent required member is still missing-value', () => {
    expect(codesOf('~ $schema: { a: string, b: string }\n---\n~ onlyA')).toContain(
      ErrorCodes.missingValue
    )
  })
})

describe('ADR 0003 §6 — a code has exactly one class', () => {
  // The catalogue is the authority. These were raised as base errors (streaming category
  // `general`) while catalogued as validation, so the conformance case passed on the streaming
  // path while the ordinary path reported a different category for the same input.
  test.each([
    ['unknown type', '~ $schema: { a: strng }\n---\n~ 1'],
    ['reserved type', '~ $schema: { a: int64 }\n---\n~ 1'],
    ['duplicate member', '~ $schema: { a: int, a: int }\n---\n~ 1'],
  ])('%s is raised as a validation error', (_label, src) => {
    try {
      parse(src)
      throw new Error('expected a throw')
    } catch (e: any) {
      expect(e).toBeInstanceOf(ValidationError)
    }
  })
})
