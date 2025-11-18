

import { parse } from '../src'
import Tokenizer from '../src/parser/tokenizer'
import ASTParser from '../src/parser/ast-parser'

describe('Trial Debug Playground', () => {

  it('DEBUG: Check structure of result with any type', () => {
    console.log('=== Test 1: Full document parsing ===')
    const doc1 = `val: any\n---\n{items: [1, 2, 3], meta: {count: 3}}`

    // Step 1: Tokenize full document
    const tokenizer = new Tokenizer(doc1)
    const tokens = tokenizer.tokenize()
    console.log('Token count:', tokens.length)

    // Step 2: Parse AST
    const parser = new ASTParser(tokens)
    const ast = parser.parse()
    console.log('AST children (sections):', ast.children.length)
    console.log('Section names:', ast.children.map((s: any) => s.name).join(', '))

    const dataSection = ast.children.find((s: any) => s.name === 'data')
    console.log('Data section found:', !!dataSection)

    // Check all sections
    ast.children.forEach((section: any, i: number) => {
      console.log(`Section ${i}: name="${section.name}", child type=${section.child?.type}`)
      if (section.child?.type === 'object') {
        console.log(`  Object children count: ${section.child.children?.length}`)
        console.log(`  Object debug: ${section.child.toDebugString?.()}`)

        // Test toValue on the AST object
        console.log('  Testing toValue on AST object:')
        const toValueResult = section.child.toValue()
        console.log('  toValue constructor:', toValueResult.constructor.name)
        console.log('  toValue instanceof IOObject:', toValueResult.constructor.name === 'IOObject')
        console.log('  toValue keys (Object.keys):', Object.keys(toValueResult))
        console.log('  toValue internal items array:', (toValueResult as any).items)
        console.log('  toValue.get("items"):', toValueResult.get?.('items'))
        console.log('  toValue.meta:', toValueResult.meta)
      }
    })

    // Step 3: Parse with schema
    const result1 = parse(doc1, null)
    console.log('Full result:', JSON.stringify(result1.toJSON(), null, 2))
    console.log('result.val keys:', Object.keys(result1.toJSON().val))
    console.log('result.val.items:', result1.toJSON().val?.items)
    console.log('result.val.meta:', result1.toJSON().val?.meta)

    console.log('\n=== Test 2: Simple object ===')
    const doc2 = `val: any\n---\n{x: 10, y: 20}`
    const result2 = parse(doc2, null)
    console.log('Full result:', JSON.stringify(result2.toJSON(), null, 2))

    console.log('\n=== Test 3: Array directly ===')
    const doc3 = `val: any\n---\n[1, 2, 3]`
    const result3 = parse(doc3, null)
    console.log('Full result:', JSON.stringify(result3.toJSON(), null, 2))

    expect(true).toBe(true) // Always pass, just for debugging
  })
});