import { parse } from './src'

console.log('=== Testing Decimal Validation Modes ===\n')

// Mode 1: Natural comparison (no precision/scale)
console.log('Mode 1: Natural Comparison')
try {
  const r1: any = parse('~ num: { decimal, min: 10, max: 100 }\n---\n50.00m', null)
  console.log('✅ 50.00 with natural comparison:', r1.num.toString())
} catch (e: any) {
  console.log('❌ Error:', e.message)
}

try {
  const r2: any = parse('~ num: { decimal, min: 10, max: 100 }\n---\n9.99m', null)
  console.log('❌ Should have failed: 9.99 < 10')
} catch (e: any) {
  console.log('✅ Correctly rejected 9.99 < 10')
}

console.log()

// Mode 2: Scale-only validation
console.log('Mode 2: Scale-Only Validation')
try {
  const r3: any = parse('~ amount: { decimal, scale: 2 }\n---\n50.00m', null)
  console.log('✅ 50.00 with scale 2:', r3.amount.toString())
} catch (e: any) {
  console.log('❌ Error:', e.message)
}

try {
  const r4: any = parse('~ amount: { decimal, scale: 2 }\n---\n50.0m', null)
  console.log('❌ Should have failed: scale 1, expected 2')
} catch (e: any) {
  console.log('✅ Correctly rejected wrong scale:', e.message)
}

console.log()

// Mode 3: Precision-only validation
console.log('Mode 3: Precision-Only Validation')
try {
  const r5: any = parse('~ value: { decimal, precision: 5 }\n---\n123.45m', null)
  console.log('✅ 123.45 with precision 5:', r5.value.toString())
} catch (e: any) {
  console.log('❌ Error:', e.message)
}

try {
  const r6: any = parse('~ value: { decimal, precision: 5 }\n---\n123.456m', null)
  console.log('❌ Should have failed: precision 6, max 5')
} catch (e: any) {
  console.log('✅ Correctly rejected exceeding precision:', e.message)
}

console.log()

// Mode 4: Strict validation (both precision and scale)
console.log('Mode 4: Strict Validation (DECIMAL(10,2))')
try {
  const r7: any = parse('~ price: { decimal, precision: 10, scale: 2 }\n---\n1234.56m', null)
  console.log('✅ 1234.56 with DECIMAL(10,2):', r7.price.toString())
} catch (e: any) {
  console.log('❌ Error:', e.message)
}

try {
  const r8: any = parse('~ price: { decimal, precision: 10, scale: 2 }\n---\n1234.5m', null)
  console.log('❌ Should have failed: wrong scale')
} catch (e: any) {
  console.log('✅ Correctly rejected wrong scale:', e.message)
}

try {
  const r9: any = parse('~ price: { decimal, precision: 10, scale: 2 }\n---\n999999999.99m', null)
  console.log('❌ Should have failed: integer part too large')
} catch (e: any) {
  console.log('✅ Correctly rejected exceeding precision:', e.message)
}

console.log()

// Test min/max with scale enforcement
console.log('Min/Max with Scale Enforcement')
try {
  const r10: any = parse('~ amount: { decimal, scale: 2, min: 10.00, max: 100.00 }\n---\n50.00m', null)
  console.log('✅ 50.00 within [10.00, 100.00]:', r10.amount.toString())
} catch (e: any) {
  console.log('❌ Error:', e.message)
}

try {
  const r11: any = parse('~ amount: { decimal, scale: 2, min: 10.00, max: 100.00 }\n---\n9.99m', null)
  console.log('❌ Should have failed: 9.99 < 10.00')
} catch (e: any) {
  console.log('✅ Correctly rejected min violation:', e.message)
}

console.log('\n=== All tests complete ===')
