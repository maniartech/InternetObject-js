import { describe, test, expect } from 'vitest'
import parse from '../../src/parser/index'
import { compileSchema } from '../../src/schema'
import loadInferred from '../../src/facade/load-inferred'
import { stringifyDocument } from '../../src/facade/stringify-document'

/**
 * OPEN-DECISIONS D1 — `*` is the wildcard only when written BARE.
 *
 * `*` is grammar in a schema (`{ name: string, * }` = "and any other fields"), but it is also an
 * ordinary character that JSON data uses as a key — `{ "rules": { "*": "allow" } }`. The compiler
 * asked only "is this key the text `*`?", so a DATA key named `*` was read as the wildcard and its
 * value checked against the wildcard's rules: `{"*": null}` failed `null-not-allowed`, `{"*": 42}`
 * failed `invalid-object`, and a record holding one re-serialized to a different shape.
 *
 * The rule now matches the one governing the `?` / `*` name suffixes — **quoting means "this,
 * exactly"**:
 *
 *   bare `*`     → the wildcard, stored on `schema.open` (read via `schema.wildcard`)
 *   quoted `"*"` → an ordinary member name, stored in `schema.defs` like any other
 *
 * The wildcard used to be written to BOTH `schema.open` and `schema.defs['*']`. `defs` is keyed by
 * member name, so that copy is precisely what made a member named `*` impossible.
 */

const roundTrips = (v: any) => {
  const io = stringifyDocument(loadInferred(v) as any, { includeHeader: true, includeTypes: true })
  const back: any = parse(io, null)
  expect(back.getErrors()).toEqual([])
  expect(back.toObject()).toEqual(v)
}

describe('D1 — the wildcard lives on `open`, never in `defs`', () => {
  test('a typed wildcard is reachable as schema.wildcard and absent from defs/names', () => {
    const schema: any = compileSchema('W', 'name: string, *: int')
    expect(schema.wildcard).toMatchObject({ type: 'int', path: '*' })
    expect(schema.open).toBe(schema.wildcard)
    expect(schema.defs['*']).toBeUndefined()
    expect(schema.names).toEqual(['name'])
  })

  test('a bare wildcard is `open === true` and has no MemberDef', () => {
    const schema: any = compileSchema('W', 'name: string, *')
    expect(schema.open).toBe(true)
    expect(schema.wildcard).toBeUndefined()
    expect(schema.defs['*']).toBeUndefined()
  })

  test('a closed schema has neither', () => {
    const schema: any = compileSchema('W', 'name: string')
    expect(schema.open).toBe(false)
    expect(schema.wildcard).toBeUndefined()
  })
})

describe('D1 — quoted "*" is an ordinary member name', () => {
  test('it is declared in defs and names, and the schema stays CLOSED', () => {
    const schema: any = compileSchema('S', 'name: string, "*": int')
    expect(schema.names).toEqual(['name', '*'])
    expect(schema.defs['*']).toMatchObject({ type: 'int' })
    expect(schema.open).toBe(false)      // a NAME does not open the schema
    expect(schema.wildcard).toBeUndefined()
  })

  test('data binds to it by name, not positionally', () => {
    const doc: any = parse('~ $schema: {name: string, "*": int}\n---\n~ John, 7', null)
    expect(doc.getErrors()).toEqual([])
    expect(doc.toObject()).toEqual([{ name: 'John', '*': 7 }])
  })

  test('the bare form still opens the schema and absorbs extras', () => {
    const doc: any = parse('~ $schema: {name: string, *}\n---\n~ John, "*": 5', null)
    expect(doc.getErrors()).toEqual([])
    expect(doc.toObject()).toEqual([{ name: 'John', '*': 5 }])
  })
})

describe('D1 — `*` as a data key round-trips', () => {
  // Each of these threw before D1.
  test.each([
    ['null value', { '*': null }],
    ['scalar value', { '*': 42 }],
    ['alongside a normal key', { rules: { '*': 'allow', admin: 'deny' } }],
    ['in a collection', [{ '*': 1 }, { '*': 2 }]],
    ['inside an array', { a: [{ '*': 1 }] }],
    ['holding a record', { '*': { x: 1 } }],
    ['map-shaped container', { m: { k1: { '*': 1 }, k2: { '*': 2 } } }],
  ])('%s', (_label, value) => {
    roundTrips(value)
  })
})

describe('D1 — a quoted name is literal, so suffixes do not apply to it', () => {
  test('"a?" is a member named `a?`, not an optional `a`', () => {
    const schema: any = compileSchema('S', '"a?": int')
    expect(schema.names).toEqual(['a?'])
    expect(schema.defs['a?'].optional).toBeFalsy()
  })

  test('a bare name still reads its suffixes', () => {
    const schema: any = compileSchema('S', 'a?: int, b*: int, c?*: int')
    expect(schema.defs['a']).toMatchObject({ optional: true })
    expect(schema.defs['b']).toMatchObject({ null: true })
    expect(schema.defs['c']).toMatchObject({ optional: true, null: true })
  })
})
