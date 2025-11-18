const { parse } = require('./dist/index.js')

console.log('=== Test 1: Nested structures ===')
const r1 = parse('val: any\n---\n{items: [1, 2, 3], meta: {count: 3}}', null)
const j1 = r1.toJSON()
console.log('Full result:', JSON.stringify(j1, null, 2))
console.log('Type of val:', Array.isArray(j1.val) ? 'Array' : typeof j1.val)

console.log('\n=== Test 2: Mixed types without schema ===')
const r2 = parse('data\n---\n{items: [1, hello, T], count: 3}', null)
const j2 = r2.toJSON()
console.log('Full result:', JSON.stringify(j2, null, 2))
console.log('Type of data:', Array.isArray(j2.data) ? 'Array' : typeof j2.data)

console.log('\n=== Test 3: Array with any ===')
const r3 = parse('items: [any]\n---\n[1, hello, T, {x: 10}]', null)
const j3 = r3.toJSON()
console.log('Full result:', JSON.stringify(j3, null, 2))
console.log('Type of items:', Array.isArray(j3.items) ? 'Array' : typeof j3.items)
