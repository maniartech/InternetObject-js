import { describe, test, expect } from 'vitest'
import parse from '../../src/parser/index'
import loadInferred from '../../src/facade/load-inferred'
import { stringifyDocument } from '../../src/facade/stringify-document'

/**
 * A named schema stays NAMED when a document is written, read and written again.
 *
 * Compiling `{object, schema: $address}` replaces the reference with the resolved Schema, so the
 * writer had no `$` left anywhere in the MemberDef and inlined the whole shape instead. Three
 * consequences: the header grew a copy of the shape per use, the definition it came from was left
 * defined-but-unreferenced, and two writes of one document produced different text — which is what
 * the fuzzer reported as the whole `stringify-idempotent` family (8 of its 28 signatures).
 *
 * The resolved object is IDENTICAL (`===`) to the one in definitions, so the name is recovered by
 * identity rather than by testing `schema.name.startsWith('$')` — a member may legitimately be
 * CALLED `$foo` (`{$foo: string}` parses), and an inline schema is named after its member, so a
 * prefix test would mistake one for the other.
 */

const OPTS = { includeHeader: true, includeTypes: true } as any

/** Write, re-read, write again. The two texts must match. */
const rewrite = (io: string): string => stringifyDocument(parse(io, null) as any, OPTS)

describe('a named schema survives a write / read / write cycle', () => {
  test.each([
    ['short form',            '~ $a: {x: number}\n~ $schema: {m: $a}\n---\n{{1}}'],
    ['short form, optional',  '~ $a: {x: number}\n~ $schema: {m?: $a}\n---\n{{1}}'],
    ['LONG form',             '~ $a: {x: number}\n~ $schema: {m: {object, schema: $a}}\n---\n{{1}}'],
    ['long form, optional',   '~ $a: {x: number}\n~ $schema: {m: {object, schema: $a, optional: T}}\n---\n{{1}}'],
    ['long form, quoted name','~ $a: {x: number}\n~ $schema: {"m,n": {object, schema: $a, optional: T}}\n---\n{{1}}'],
    ['array of ref',          '~ $a: {x: number}\n~ $schema: {m: [$a]}\n---\n[{1}]'],
    ['shared by two members', '~ $a: {x: number}\n~ $schema: {p: $a, q: $a}\n---\n{1}, {1}'],
  ])('%s', (_label, io) => {
    const first = rewrite(io)
    expect(first).toContain('$a')          // the name survived, the shape was not inlined
    expect(rewrite(first)).toBe(first)     // and writing again changes nothing
  })

  test('an inferred document is stable on the first re-write', () => {
    // The fuzzer's minimal case: a quoted member name forces the long form, which lost the name.
    const doc: any = loadInferred([{ emoji: { emoji: [{}, { 'code:en': { snake_case: 0 } }] } }])
    const first = stringifyDocument(doc, OPTS)
    expect(rewrite(first)).toBe(first)
  })

  test('an inline shape is still inlined — it has no name to print', () => {
    const io = '~ $schema: {m: {x: number}}\n---\n{{1}}'
    const first = rewrite(io)
    expect(first).toContain('{x: number}')
    expect(rewrite(first)).toBe(first)
  })

  test('a member literally named $foo is not mistaken for a reference', () => {
    // Identity, not a `$` prefix test: this member's inline schema is named after the member.
    const io = '~ $schema: {$foo: {x: number}}\n---\n{{1}}'
    const first = rewrite(io)
    expect(first).toContain('{x: number}')
    expect(rewrite(first)).toBe(first)
  })
})
