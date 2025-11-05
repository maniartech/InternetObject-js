import { parse } from '../../src'

console.log('=== Test 1: Inline schema (no ~) ===')
try {
  const result = parse('num: { decimal, scale: 2 }\n---\n50.00m', null)
  console.log('✅ Schema set:', result.header.schema?.name)
  console.log('   Schema names:', result.header.schema?.names)
  console.log('   Data:', result.sections?.[0]?.data)
} catch (e: any) {
  console.log('❌ Failed:', e.message)
}

console.log('\n=== Test 2: Definitions with $schema ===')
try {
  const result = parse('~ $schema: { name, age }\n---\nJohn, 25', null)
  console.log('✅ Schema set:', result.header.schema?.name)
  console.log('   Schema names:', result.header.schema?.names)
  console.log('   Data:', result.sections?.[0]?.data)
} catch (e: any) {
  console.log('❌ Failed:', e.message)
}

console.log('\n=== Test 3: Definitions with @variable ===')
try {
  const result = parse('~ @x: 10\n---\n', null)
  console.log('✅ Variable @x:', result.header.definitions.get('@x'))
  console.log('   Schema:', result.header.schema?.name || 'null')
} catch (e: any) {
  console.log('❌ Failed:', e.message)
}

console.log('\n=== Test 4: Regular key-value definitions (must use @) ===')
try {
  const result = parse('~ @success: T\n~ @errorMessage: N\n~ @recordCount: 102\n---\n', null)
  console.log('✅ @success:', result.header.definitions.get('@success'))
  console.log('   @errorMessage:', result.header.definitions.get('@errorMessage'))
  console.log('   @recordCount:', result.header.definitions.get('@recordCount'))
  console.log('   Schema:', result.header.schema?.name || 'null')
} catch (e: any) {
  console.log('❌ Failed:', e.message)
}

console.log('\n=== Test 5: Mixed definitions ===')
try {
  const result = parse(`
~ @x: 10
~ $schema: { name, age }
~ @success: T
~ @recordCount: 102
---
John, 25
`.trim(), null)
  console.log('✅ Variable @x:', result.header.definitions.get('@x'))
  console.log('   @success:', result.header.definitions.get('@success'))
  console.log('   @recordCount:', result.header.definitions.get('@recordCount'))
  console.log('   Schema:', result.header.schema?.name)
  console.log('   Schema names:', result.header.schema?.names)
  console.log('   Data:', result.sections?.[0]?.data)
} catch (e: any) {
  console.log('❌ Failed:', e.message)
}

console.log('\n=== Test 6: Complex inline schema ===')
try {
  const result = parse('name, age: {number, min: 20}, isActive, address: {street, city}\n---\nJohn, 25, T, Main St, NYC', null)
  console.log('✅ Schema set:', result.header.schema?.name)
  console.log('   Schema names:', result.header.schema?.names)
  console.log('   Data:', result.sections?.[0]?.data)
} catch (e: any) {
  console.log('❌ Failed:', e.message)
}

console.log('\n=== Test 7: API response with @ prefix ===')
try {
  const result = parse(`
~ @success: T
~ @errorMessage: N
~ @recordCount: 102
~ @pageNo: 11
~ @nextPage: /api/v1/products?page=10
~ @prevPage: /api/v1/products?page=12
---
`.trim(), null)
  console.log('✅ @success:', result.header.definitions.get('@success'))
  console.log('   @recordCount:', result.header.definitions.get('@recordCount'))
  console.log('   @pageNo:', result.header.definitions.get('@pageNo'))
  console.log('   @nextPage:', result.header.definitions.get('@nextPage'))
  console.log('   All definitions:', result.header.definitions.keys)
} catch (e: any) {
  console.log('❌ Failed:', e.message)
}

