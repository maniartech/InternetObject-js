import IO, { stringify } from '../../src'

describe('Stringify Debug', () => {
  it('shows output format - with $schema definition', () => {
    // With definition format (~ $schema: ...)
    const doc = IO.parse(`
~ $schema: {name: string, age: int}
---
John, 30
`)
    console.log('Document JSON:', JSON.stringify(doc.toJSON(), null, 2))
    console.log('Schema names:', doc.header.schema?.names)
    console.log('Data only:', JSON.stringify(stringify(doc)))
    console.log('With types:', JSON.stringify(stringify(doc, undefined, undefined, { includeTypes: true })))
  })

  it('shows output format - named definition', () => {
    // Named definition (~ $person: ...)
    const doc = IO.parse(`
~ $person: {name: string, age: int}
--- p: $person
John, 30
`)
    console.log('Document JSON:', JSON.stringify(doc.toJSON(), null, 2))
    console.log('Data only:', JSON.stringify(stringify(doc)))
    console.log('With types:', JSON.stringify(stringify(doc, undefined, undefined, { includeTypes: true })))
  })
})
