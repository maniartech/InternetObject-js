import { parse } from '../../src'

// Test 1: Should pass
console.log('=== Test 1: Valid scale ===')
try {
  const result = parse('~ num: { decimal, scale: 2 }\n---\n50.00m', null)
  console.log('Schema:', result.header.schema)
  console.log('Schema names:', result.header.schema?.names)
  console.log('Schema defs:', result.header.schema?.defs)
  console.log('✅ Passed: 50.00m has scale 2')
  console.log('Value:', result.sections?.[0]?.data)
} catch (e: any) {
  console.log('❌ Failed:', e.message)
}


