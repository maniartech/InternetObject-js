import { parse } from './src'

console.log('Testing decimal validation...\n')

// Test 1: Natural comparison with min/max
try {
  const result = parse('num: { decimal, min: 10, max: 100 }\n---\n50m', null)
  console.log('✅ Test 1 passed: 50 within [10,100]')
} catch (e: any) {
  console.log('❌ Test 1 failed:', e.message)
}

try {
  const result = parse('num: { decimal, min: 10, max: 100 }\n---\n9.99m', null)
  console.log('❌ Test 2 should have failed: 9.99 < 10')
} catch (e: any) {
  console.log('✅ Test 2 passed: Correctly rejected 9.99 < 10')
}

// Test 2: Scale validation
try {
  const result = parse('amount: { decimal, scale: 2 }\n---\n50.00m', null)
  console.log('✅ Test 3 passed: 50.00 has scale 2')
} catch (e: any) {
  console.log('❌ Test 3 failed:', e.message)
}

try {
  const result = parse('amount: { decimal, scale: 2 }\n---\n50.0m', null)
  console.log('❌ Test 4 should have failed: scale 1, expected 2')
} catch (e: any) {
  console.log('✅ Test 4 passed:', e.message)
}

// Test 3: Precision validation
try {
  const result = parse('value: { decimal, precision: 5 }\n---\n123.45m', null)
  console.log('✅ Test 5 passed: 123.45 has precision 5')
} catch (e: any) {
  console.log('❌ Test 5 failed:', e.message)
}

try {
  const result = parse('value: { decimal, precision: 5 }\n---\n123.456m', null)
  console.log('❌ Test 6 should have failed: precision 6, max 5')
} catch (e: any) {
  console.log('✅ Test 6 passed:', e.message)
}

// Test 4: Strict validation (both precision and scale)
try {
  const result = parse('price: { decimal, precision: 10, scale: 2 }\n---\n1234.56m', null)
  console.log('✅ Test 7 passed: 1234.56 fits DECIMAL(10,2)')
} catch (e: any) {
  console.log('❌ Test 7 failed:', e.message)
}

try {
  const result = parse('price: { decimal, precision: 10, scale: 2 }\n---\n1234.5m', null)
  console.log('❌ Test 8 should have failed: wrong scale')
} catch (e: any) {
  console.log('✅ Test 8 passed:', e.message)
}

console.log('\nAll manual tests complete!')
