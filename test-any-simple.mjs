import { parse } from './dist/index.js'

// Test 1: Without nullable
try {
  const r1 = parse('val: any\n---\n{name: John}', null).toJSON()
  console.log('Test 1 (no nullable): SUCCESS', JSON.stringify(r1))
} catch(e) {
  console.log('Test 1 (no nullable): FAIL', e.message.substring(0, 100))
}

// Test 2: With nullable  
try {
  const r2 = parse('val*: any\n---\n{name: John}', null).toJSON()
  console.log('Test 2 (nullable): SUCCESS', JSON.stringify(r2))
} catch(e) {
  console.log('Test 2 (nullable): FAIL', e.message.substring(0, 100))
}
